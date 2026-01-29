import io
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from django.shortcuts import get_object_or_404
from .models import File, Transcription, GeneratedQuestion, Audio, FileSummary, SharedAudio
from rest_framework.permissions import IsAuthenticated, IsAuthenticatedOrReadOnly
from django.contrib.auth.models import User
from django.utils import timezone
import mimetypes
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from .serializers import (
    FileSerializer,
    GeneratedQuestionSerializer,
    FileSummarySerializer,
    TextToSpeechSerializer,
    AudioSerializer,
    SharedAudioSerializer,
)
from .utils import (
    extract_text_from_file,
    extract_text_and_images_from_file,
    generate_questions_from_text,
    generate_questions_from_text_and_images,
    summarize_file_with_vision,
)
from openai import OpenAI
from django.conf import settings
import json
import logging
import tempfile
from django.http import HttpResponse, FileResponse, JsonResponse
import os
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile

logger = logging.getLogger(__name__)
client = OpenAI(api_key=getattr(settings, "OPENAI_API_KEY", None))

class ScoreQuestionsAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        data = request.data
        questions = data.get("questions", [])
        user_answers = data.get("userAnswers", {})
        extracted_text = data.get("context", None)
        extracted_text = extracted_text.strip() if isinstance(extracted_text, str) else ""

        if not questions or not user_answers or not extracted_text:
            return Response(
                {"error": "Missing questions, answers, or extracted text."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            context_snippet = extracted_text[:3000]
            qset = []
            for q in questions:
                q_id = str(q.get("id")) if q.get("id") is not None else ""
                qset.append({
                    "id": q_id,
                    "question": q.get("question") or q.get("text", ""),
                    "correct_answer": q.get("answer") or q.get("correct_answer", ""),
                    "user_answer": user_answers.get(q_id, "") if user_answers is not None else ""
                })
            prompt = self.build_prompt(context_snippet, qset)
            response = client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {
                        "role": "system",
                        "content": "You are an educational AI that scores student answers. Return only valid JSON."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=0.3,
                max_tokens=700
            )
            content = response.choices[0].message.content.strip()
            if content.startswith("```"):
                content = content.strip("`").strip()
                if content.lower().startswith("json"):
                    content = content[4:].strip()
            result = json.loads(content)
            return Response(result, status=status.HTTP_200_OK)
        except Exception as e:
            logger.warning(f"AI scoring failed: {e}")
            return Response({"error": "Scoring failed. Try again."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def build_prompt(self, context: str, qset: list[dict]) -> str:
        return (
            f"Context for the questions:\n"
            f"{context}\n\n"
            f"Here are the questions with student answers. Return JSON ONLY with a score and details.\n\n"
            f"Each item:\n"
            f"- id\n"
            f"- question\n"
            f"- correct_answer\n"
            f"- user_answer\n\n"
            f"Return:\n"
            f'{{\n'
            f'  "score": {{\n'
            f'    "correct": int,\n'
            f'    "total": int,\n'
            f'    "percentage": float\n'
            f'  }},\n'
            f'  "detailed": [\n'
            f'    {{ "id": "...", "correct": true/false, "comment": "why this was marked" }}\n'
            f'  ]\n'
            f'}}\n\n'
            f"Questions:\n{json.dumps(qset, indent=2)}"
        )

class ListGeneratedQuestionsAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]
class GenerateAudioAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = (MultiPartParser, FormParser, JSONParser)

    def post(self, request, *args, **kwargs):
        try:
            client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY", getattr(settings, "OPENAI_API_KEY", None)))
            text_input = None
            user = request.user

            # Improved parsing logic 
            if "text" in request.data and request.data["text"].strip():
                text_input = request.data["text"].strip()
            elif "file" in request.FILES:
                try:
                    uploaded_file = request.FILES["file"]
                    file_content = uploaded_file.read()
                    try:
                        text_input = file_content.decode("utf-8")
                    except UnicodeDecodeError:
                        text_input = file_content.decode("latin1")
                except Exception:
                    return Response({"error": "Unable to read uploaded file as text."}, status=400)
            elif "file_id" in request.data:
                try:
                    file_obj = File.objects.get(id=request.data["file_id"], user=user)
                    with file_obj.file.open("rb") as f:
                        text_input = f.read().decode("utf-8", errors="ignore")
                except File.DoesNotExist:
                    return Response({"error": "File not found."}, status=404)
                except Exception:
                    return Response({"error": "Unable to read file_id as text."}, status=400)

                text_input = request.data["text"].strip()
            elif "file" in request.FILES:
                uploaded_file = request.FILES["file"]
                try:
                    file_content = uploaded_file.read()
                    try:
                        text_input = file_content.decode("utf-8")
                    except UnicodeDecodeError:
                        text_input = file_content.decode("latin1")
                except Exception:
                    return Response({"error": "Unable to read uploaded file as text."}, status=400)
            elif "file_id" in request.data:
                try:
                    file_obj = File.objects.get(id=request.data["file_id"], user=user)
                    text_input = file_obj.file.read().decode("utf-8", errors="ignore")
                except File.DoesNotExist:
                    return Response({"error": "File not found."}, status=404)
                except Exception:
                    return Response({"error": "Unable to read file_id as text."}, status=400)

            if not text_input or not text_input.strip():
                return Response({"error": "No valid text, file, or file_id provided."}, status=400)

            response = client.audio.speech.create(
                model="gpt-4o-mini-tts",
                voice=request.data.get("voice", "verse"),
                input=text_input,
                speed=request.data.get("speed") if "speed" in request.data else 1.0
            )

            audio_bytes = response.read() if hasattr(response, "read") else response.content
            audio_path = default_storage.save("tts_output.mp3", ContentFile(audio_bytes))
            audio_url = default_storage.url(audio_path)

            return Response({"audio_url": audio_url}, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error(f"Audio endpoint error (GenerateAudioAPIView): {e}", exc_info=True)
            return Response({"error": "Audio generation failed. Please try again."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class QuickGenerateAudioAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    """
    POST {"text": "..."} -> returns MP3 audio of the text using gpt-4o-mini-tts & OpenAI's Alloy voice.
    """
    parser_classes = [JSONParser]
    permission_classes = [permissions.IsAuthenticated]

    @method_decorator(csrf_exempt)
    def dispatch(self, *args, **kwargs):
        return super().dispatch(*args, **kwargs)
    def post(self, request):
        try:
            text = request.data.get("text", "").strip()
            if not text:
                return JsonResponse({"error": "No text provided"}, status=400)

            client = OpenAI(api_key=getattr(settings, "OPENAI_API_KEY", None))
            response = client.audio.speech.create(
                model="gpt-4o-mini-tts",
                voice="alloy",
                input=text
        )
            if hasattr(response, "iter_bytes"):
                audio_bytes = b"".join(response.iter_bytes())
            else:
                audio_bytes = response.read()

            return HttpResponse(
                audio_bytes,
                content_type="audio/mpeg",
                headers={
                    "Content-Disposition": 'inline; filename="speech.mp3"'
                }
            )
        except Exception as e:
            logger.exception("Error generating audio")
            return JsonResponse({"error": "Audio generation failed. Please try again."}, status=500)

class FileUploadAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]
    
    # Allowed file extensions for upload
    ALLOWED_EXTENSIONS = ['pdf', 'docx', 'doc', 'txt', 'png', 'jpg', 'jpeg', 'gif', 'mp3', 'wav', 'mp4', 'pptx', 'xlsx']

    def post(self, request):
        try:
            uploaded_file = request.FILES.get("file") if hasattr(request, "FILES") else None
            if not uploaded_file:
                return Response({"error": "No file provided."}, status=status.HTTP_400_BAD_REQUEST)
            
            # Validate file extension
            file_ext = uploaded_file.name.split('.')[-1].lower() if '.' in uploaded_file.name else ''
            if file_ext not in self.ALLOWED_EXTENSIONS:
                return Response(
                    {"error": f"File type not allowed. Allowed types: {', '.join(self.ALLOWED_EXTENSIONS)}"},
                    status=status.HTTP_400_BAD_REQUEST
                )

            file_obj = File.objects.create(user=request.user, file=uploaded_file)
            mime_type, _ = mimetypes.guess_type(file_obj.file.path)
            file_obj.mime_type = mime_type or "application/octet-stream"
            file_obj.save()
            serializer = FileSerializer(file_obj)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except Exception as e:
            logger.error(f"File upload failed: {e}", exc_info=True)
            return Response({"error": "File upload failed. Please try again."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class GenerateQuestionsAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        try:
            user = request.user
            data = request.data
            source_type = data.get('source_type')
            source_id = data.get('source_id')
            source_text = data.get('source_text', '')
            source_text = source_text.strip() if isinstance(source_text, str) else ''
            mode = data.get('mode', 'both').lower()
            visuals = data.get('visuals', False)
            difficulty = data.get('difficulty', 'medium').lower()

            try:
                num_questions = int(data.get('num_questions', 5))
            except Exception:
                num_questions = 5

            text = ""
            questions = []
            warning_msg = None

            try:
                if source_type == 'file':
                    file_obj = get_object_or_404(File, id=source_id, user=user)
                    if visuals:
                        text, image_map = extract_text_and_images_from_file(file_obj.file)
                        questions, warning_msg = generate_questions_from_text_and_images(
                            text=text,
                            image_map=image_map,
                            mode=mode,
                            visuals=visuals,
                            difficulty=difficulty,
                            num_questions=num_questions
                        )
                    else:
                        text = extract_text_from_file(file_obj.file)
                        questions, warning_msg = generate_questions_from_text(
                            text=text,
                            mode=mode,
                            visuals=False,
                            difficulty=difficulty,
                            num_questions=num_questions
                        )

                elif source_type == 'transcript':
                    transcription = get_object_or_404(Transcription, id=source_id, user=user)
                    text = transcription.transcription
                    questions, warning_msg = generate_questions_from_text(
                        text=text,
                        mode=mode,
                        visuals=False,
                        difficulty=difficulty,
                        num_questions=num_questions
                    )

                elif source_type == 'chat':
                    if not source_text or len(source_text) < 10:
                        return Response({"error": "Source text is too short or empty."}, status=400)
                    text = source_text
                    source_id = 0
                    questions, warning_msg = generate_questions_from_text(
                        text=text,
                        mode=mode,
                        visuals=False,
                        difficulty=difficulty,
                        num_questions=num_questions
                    )
                else:
                    return Response({"error": "Unsupported source type."}, status=400)

            except Exception as e_inner:
                logger.error(f"Question generation failed: {e_inner}", exc_info=True)
                return Response({"error": "Failed to process source. Please try again or contact support."}, status=500)

            if not questions:
                return Response({"error": "No questions were generated."}, status=500)

            saved_questions = []
            for q in questions:
                obj = GeneratedQuestion.objects.create(
                    user=user,
                    source_type=source_type,
                    source_id=source_id,
                    question=q.get("question", ""),
                    answer=q.get("answer", ""),
                    options=q.get("options"),
                    visual_aid=q.get("visual_aid"),
                    difficulty=q.get("difficulty", difficulty),
                )
                saved_questions.append({
                    "id": obj.id,
                    "question": obj.question,
                    "answer": obj.answer,
                    "options": obj.options,
                    "visual_aid": obj.visual_aid,
                    "difficulty": obj.difficulty,
                })

            response_data = {
                "questions": saved_questions,
                "context": text
            }
            if warning_msg:
                response_data["warning"] = warning_msg

            return Response(response_data, status=201)

        except Exception as e:
            logger.error(f"GenerateQuestions endpoint error: {e}", exc_info=True)
            return Response({"error": "Unexpected error in question generation. Please try again or contact support."}, status=500)

class DeleteGeneratedQuestionAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, pk):
        question = get_object_or_404(GeneratedQuestion, id=pk, user=request.user)
        question.delete()
        return Response({"success": "Question deleted."}, status=status.HTTP_204_NO_CONTENT)

class FileSummaryAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        file_id = request.data.get("file_id")
        format_choice = request.data.get("format", "text").lower()
        if format_choice not in ("text", "file"):
            return Response({"error": "Invalid format. Must be 'text' or 'file'."}, status=400)
        try:
            file_obj = File.objects.get(id=file_id, user=request.user)
            max_size = 10 * 1024 * 1024
            if file_obj.file.size > max_size:
                return Response({"error": "File too large. Max 10MB."}, status=400)
            from PyPDF2 import PdfReader
            if file_obj.file.name.lower().endswith(".pdf"):
                reader = PdfReader(file_obj.file.path)
                if len(reader.pages) > 20:
                    return Response({"error": "PDF too long (max 20 pages)."}, status=400)
        except File.DoesNotExist:
            return Response({"error": "File not found."}, status=404)
        except Exception as e:
            logger.warning(f"Summary file validation failed: {e}")
            return Response({"error": "Could not analyze file."}, status=400)
        summary_text, warning_msg = summarize_file_with_vision(file_obj)
        if not summary_text:
            return Response(
                {"error": "Failed to generate summary.", "warning": warning_msg},
                status=500
            )
        if format_choice == "file":
            summary = FileSummary.objects.create(
                user=request.user,
                file=file_obj,
                summary_text=summary_text,
                format="file"
            )
            serialized = FileSummarySerializer(summary)
            return Response(
                {"summary": serialized.data, "warning": warning_msg},
                status=201
            )
        return Response(
            {"summary": summary_text, "warning": warning_msg},
            status=200
        )

class RespondSharedAudioAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, share_id):
        action = request.data.get("action")
        obj = get_object_or_404(SharedAudio, id=share_id, shared_with=request.user)
        if obj.status != SharedAudio.STATUS_PENDING:
            return Response({"error": "Already responded."}, status=status.HTTP_400_BAD_REQUEST)
        if action == "accept":
            obj.status = SharedAudio.STATUS_ACCEPTED
        elif action == "reject":
            obj.status = SharedAudio.STATUS_REJECTED
        else:
            return Response({"error": "Invalid action."}, status=status.HTTP_400_BAD_REQUEST)
        obj.responded_at = timezone.now()
        obj.save()
        return Response(SharedAudioSerializer(obj).data, status=status.HTTP_200_OK)

class ListSharedAudioAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        received = SharedAudio.objects.filter(shared_with=request.user, status=SharedAudio.STATUS_ACCEPTED)
        sent = SharedAudio.objects.filter(shared_by=request.user)
        data = {
            "received": SharedAudioSerializer(received, many=True).data,
            "sent": SharedAudioSerializer(sent, many=True).data,
        }
        return Response(data, status=status.HTTP_200_OK)

class TranscribeAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        try:
            if not hasattr(request, "FILES") or not request.FILES.get("file"):
                return Response({"error": "No file provided. Use multipart/form-data upload with 'file'."}, status=400)
            file = request.FILES.get('file')
            try:
                response = client.audio.transcriptions.create(
                    model="whisper-1",
                    file=file,
                    response_format="text"
                )
                transcription_text = response
                transcription_obj = Transcription.objects.create(
                    user=request.user,
                    transcription=transcription_text,
                    source_filename=file.name
                )
                return Response({
                    "success": True,
                    "transcription": transcription_text,
                    "transcription_id": transcription_obj.id
                }, status=status.HTTP_200_OK)
            except Exception as transcribe_e:
                logger.error(f"Transcription failed: {transcribe_e}", exc_info=True)
                return Response({"error": "Failed to transcribe audio file. Please try another or contact support."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        except Exception as e:
            logger.error(f"Transcribe endpoint error: {e}", exc_info=True)
            return Response({"error": "Unexpected error in transcription endpoint."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class ListAudioAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        audio_qs = Audio.objects.filter(user=request.user).order_by("-created_at")
        serializer = AudioSerializer(audio_qs, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

class DeleteAudioAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, audio_id):
        audio = get_object_or_404(Audio, id=audio_id, user=request.user)
        audio.audio.delete(save=False)
        audio.delete()
        return Response({"message": "Audio deleted."}, status=status.HTTP_204_NO_CONTENT)

class ShareAudioAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, audio_id):
        audio = get_object_or_404(Audio, id=audio_id, user=request.user)
        recipient_username = request.data.get("username")
        note = request.data.get("note", "")
        recipient = get_object_or_404(User, username=recipient_username)

        obj, created = SharedAudio.objects.get_or_create(
            audio=audio,
            shared_by=request.user,
            shared_with=recipient,
            defaults={"note": note}
        )
        if not created:
            return Response({"error": "Already shared to this user."},
                            status=status.HTTP_400_BAD_REQUEST)
        serializer = SharedAudioSerializer(obj)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

