import io
import wave
import audioop
import math
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
import subprocess
from uuid import uuid4
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
from chat.models import Chat, ChatHistory, ChatCollaborator
import re
from payments.models import UserProfile as PaymentsUserProfile

logger = logging.getLogger(__name__)


def get_openai_client():
    """Lazy initialization of OpenAI client to ensure env vars are loaded."""
    api_key = getattr(settings, "OPENAI_API_KEY", None) or os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise ValueError("OPENAI_API_KEY environment variable is not set")
    return OpenAI(api_key=api_key)

def _get_chat_for_write(user, chat_id):
    if not chat_id:
        return None
    try:
        chat = Chat.objects.get(id=chat_id)
    except Chat.DoesNotExist:
        return None
    if chat.user == user:
        return chat
    collaborator = ChatCollaborator.objects.filter(
        chat=chat, collaborator=user, is_approved=True, access_level="edit"
    ).first()
    return chat if collaborator else None

def _build_notes_from_transcription(text):
    sentences = re.split(r"(?:\r?\n)+|[.!?]\s+", text)
    sentences = [s.strip() for s in sentences if s.strip()]
    if len(sentences) <= 8:
        return sentences
    return sentences[:8]

def _get_payments_profile(user):
    profile, _ = PaymentsUserProfile.objects.get_or_create(user=user)
    today = timezone.now().date()
    if profile.is_premium and profile.premium_expiry and profile.premium_expiry < today:
        profile.is_premium = False
        profile.save(update_fields=["is_premium"])
    return profile

def _is_premium(profile):
    today = timezone.now().date()
    return bool(profile.is_premium and profile.premium_expiry and profile.premium_expiry >= today)

def _estimate_tts_minutes(text: str, speed: float | None = None) -> float:
    words = len(re.findall(r"[A-Za-z0-9']+", text or ""))
    wpm = 150.0
    minutes = words / wpm if wpm else 0.0
    if speed:
        try:
            speed_val = float(speed)
            if speed_val > 0:
                minutes = minutes / speed_val
        except (TypeError, ValueError):
            pass
    return max(minutes, 0.01)


def _is_default_chat_title(title: str) -> bool:
    normalized = str(title or "").strip().lower()
    return normalized in {"", "new chat", "new study session", "untitled chat"}


def _build_feature_chat_title(source_name: str, suffix: str) -> str:
    filename = str(source_name or "").rsplit("/", 1)[-1]
    stem = filename.rsplit(".", 1)[0] if "." in filename else filename
    stem = re.sub(r"[_\\-]+", " ", stem)
    stem = re.sub(r"\s+", " ", stem).strip()
    if not stem:
        stem = "Study Material"
    if len(stem) > 70:
        stem = f"{stem[:67].rstrip()}..."
    title = f"{stem} {suffix}".strip()
    return title[:255]


def _auto_title_feature_chat(chat: Chat | None, source_name: str, suffix: str) -> str | None:
    if not chat:
        return None
    if not _is_default_chat_title(chat.title):
        return chat.title
    new_title = _build_feature_chat_title(source_name, suffix)
    chat.title = new_title
    chat.save()
    return chat.title

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
            client = get_openai_client()
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
            client = get_openai_client()
            text_input = None
            user = request.user
            profile = _get_payments_profile(user)
            premium_active = _is_premium(profile)

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

            estimated_minutes = _estimate_tts_minutes(text_input, request.data.get("speed"))
            if not premium_active and profile.audio_minutes_used + estimated_minutes > 10:
                return Response(
                    {"error": "Free audio limit reached. Upgrade to premium."},
                    status=429
                )

            response = client.audio.speech.create(
                model="gpt-4o-mini-tts",
                voice=request.data.get("voice", "verse"),
                input=text_input,
                speed=request.data.get("speed") if "speed" in request.data else 1.0
            )

            audio_bytes = response.read() if hasattr(response, "read") else response.content
            audio_path = default_storage.save(f"tts_output_{uuid4().hex}.mp3", ContentFile(audio_bytes))
            audio_url = default_storage.url(audio_path)

            if not premium_active:
                profile.audio_minutes_used += estimated_minutes
                profile.save(update_fields=["audio_minutes_used"])

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

            profile = _get_payments_profile(request.user)
            premium_active = _is_premium(profile)
            estimated_minutes = _estimate_tts_minutes(text)
            if not premium_active and profile.audio_minutes_used + estimated_minutes > 10:
                return JsonResponse(
                    {"error": "Free audio limit reached. Upgrade to premium."},
                    status=429
                )

            client = get_openai_client()
            response = client.audio.speech.create(
                model="gpt-4o-mini-tts",
                voice="alloy",
                input=text
            )
            if hasattr(response, "iter_bytes"):
                audio_bytes = b"".join(response.iter_bytes())
            else:
                audio_bytes = response.read()

            if not premium_active:
                profile.audio_minutes_used += estimated_minutes
                profile.save(update_fields=["audio_minutes_used"])

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
            mime_type, _ = mimetypes.guess_type(file_obj.file.name)
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
            profile = _get_payments_profile(user)
            premium_active = _is_premium(profile)
            data = request.data
            source_type = data.get('source_type')
            source_id = data.get('source_id')
            source_text = data.get('source_text', '')
            source_text = source_text.strip() if isinstance(source_text, str) else ''
            mode = data.get('mode', 'both').lower()
            visuals = data.get('visuals', False)
            difficulty = data.get('difficulty', 'medium').lower()
            requested_type = (data.get('question_type') or data.get('type') or "").lower()

            try:
                num_questions = int(data.get('num_questions', 5))
            except Exception:
                num_questions = 5

            text = ""
            questions = []
            warning_msg = None

            if not premium_active:
                if requested_type in {"theory", "true_false", "fill_in"}:
                    return Response({"error": "This question type requires a premium subscription."}, status=403)
                if mode in {"theory", "true_false", "fill_in"}:
                    return Response({"error": "This question type requires a premium subscription."}, status=403)
                if mode == "both":
                    mode = "mcq"
                remaining = 20 - profile.questions_generated
                if remaining <= 0 or num_questions > remaining:
                    return Response(
                        {"error": "You have reached your free question limit. Upgrade to premium to continue."},
                        status=429
                    )

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

            if not premium_active:
                profile.questions_generated += len(saved_questions)
                profile.save(update_fields=["questions_generated"])

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
            profile = _get_payments_profile(request.user)
            premium_active = _is_premium(profile)
            max_size = 10 * 1024 * 1024
            if file_obj.file.size > max_size:
                return Response({"error": "File too large. Max 10MB."}, status=400)
            from PyPDF2 import PdfReader
            if file_obj.file.name.lower().endswith(".pdf"):
                with file_obj.file.open("rb") as pdf_file:
                    reader = PdfReader(pdf_file)
                if len(reader.pages) > 20:
                    return Response({"error": "PDF too long (max 20 pages)."}, status=400)
            is_image_or_pdf = file_obj.file.name.lower().endswith((".png", ".jpg", ".jpeg", ".gif", ".webp", ".pdf"))
            if is_image_or_pdf and not premium_active and profile.image_actions >= 3:
                return Response(
                    {"error": "Free image analysis limit reached. Upgrade to premium."},
                    status=429
                )
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
        if is_image_or_pdf and not premium_active:
            profile.image_actions += 1
            profile.save(update_fields=["image_actions"])
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
            chat_id = request.data.get("chat_id")
            duration_ms = request.data.get("duration_ms")
            try:
                client = get_openai_client()
                # The OpenAI SDK accepts bytes, IOBase, PathLike, or a tuple (filename, contents, media type).
                # Django's InMemoryUploadedFile isn't an IOBase, so wrap it with filename, bytes, and content type.
                try:
                    file.seek(0)
                except Exception:
                    pass
                file_bytes = file.read()
                if not file_bytes:
                    return Response({"error": "Uploaded audio is empty. Please record again."}, status=400)
                content_type = file.content_type or "application/octet-stream"
                filename = file.name

                logger.info(
                    "STT upload: name=%s type=%s size=%s",
                    filename,
                    content_type,
                    len(file_bytes),
                )

                # If webm/ogg, try converting to mono 16k wav for more reliable transcription
                is_webm = content_type.startswith("audio/webm") or content_type.startswith("video/webm") or filename.lower().endswith(".webm")
                is_ogg = content_type.startswith("audio/ogg") or content_type.startswith("audio/oga") or filename.lower().endswith((".ogg", ".oga"))
                if is_webm or is_ogg:
                    try:
                        with tempfile.TemporaryDirectory() as tmpdir:
                            src_path = os.path.join(tmpdir, "input")
                            dst_path = os.path.join(tmpdir, "output.wav")
                            with open(src_path, "wb") as f:
                                f.write(file_bytes)

                            logger.info("STT converting to wav via ffmpeg (type=%s name=%s)", content_type, filename)
                            result = subprocess.run(
                                ["ffmpeg", "-y", "-i", src_path, "-ar", "16000", "-ac", "1", dst_path],
                                stdout=subprocess.PIPE,
                                stderr=subprocess.PIPE,
                                check=False,
                            )

                            if result.returncode == 0 and os.path.exists(dst_path):
                                with open(dst_path, "rb") as f:
                                    file_bytes = f.read()
                                content_type = "audio/wav"
                                filename = os.path.splitext(filename)[0] + ".wav"
                                logger.info("STT converted to wav: size=%s", len(file_bytes))
                            else:
                                logger.warning("STT ffmpeg convert failed: %s", result.stderr[:200])
                    except Exception as convert_e:
                        logger.warning("STT convert exception: %s", convert_e)

                # If we have wav bytes, check for very low volume / silence
                if content_type == "audio/wav":
                    try:
                        with wave.open(io.BytesIO(file_bytes), "rb") as wf:
                            frames = wf.readframes(wf.getnframes())
                            rms = audioop.rms(frames, wf.getsampwidth())
                            if rms == 0:
                                dbfs = -999.0
                            else:
                                dbfs = 20 * math.log10(rms / 32768.0)
                            duration_s = wf.getnframes() / float(wf.getframerate())
                        logger.info("STT wav stats: duration=%.2fs rms=%s dbfs=%.2f", duration_s, rms, dbfs)
                        if duration_s < 2.0 or dbfs < -40.0:
                            return Response(
                                {"error": "No clear speech detected. Please record louder or move closer to the mic."},
                                status=400,
                            )
                    except Exception as audio_check_e:
                        logger.warning("STT wav check failed: %s", audio_check_e)

                file_tuple = (filename, file_bytes, content_type)

                response = client.audio.transcriptions.create(
                    model="whisper-1",
                    file=file_tuple,
                    response_format="text"
                )
                transcription_text = response
                try:
                    file.seek(0)
                except Exception:
                    pass
                audio_obj = Audio.objects.create(
                    user=request.user,
                    audio=file,
                    source_type="transcription",
                    language=None,
                )
                transcription_obj = Transcription.objects.create(
                    user=request.user,
                    audio=audio_obj,
                    transcription=transcription_text,
                    language=None,
                )
                chat = _get_chat_for_write(request.user, chat_id)
                chat_title = None
                if chat:
                    notes = _build_notes_from_transcription(transcription_text)
                    duration_display = None
                    try:
                        if duration_ms is not None:
                            duration_s = max(0, round(float(duration_ms) / 1000))
                            minutes = duration_s // 60
                            seconds = duration_s % 60
                            duration_display = f"{minutes:02d}:{seconds:02d}"
                    except Exception:
                        duration_display = None
                    ChatHistory.objects.create(
                        chat=chat,
                        user=request.user,
                        prompt="",
                        response=transcription_text,
                        prompt_type="text",
                        response_type="notes",
                        response_metadata={
                            "title": "Lecture Notes",
                            "notes": notes if notes else ["No clear transcript segments were detected."],
                            "duration": duration_display,
                        },
                        context="notes",
                    )
                    source_label = filename or "Voice Note"
                    chat_title = _auto_title_feature_chat(chat, source_label, "Notes")
                return Response({
                    "success": True,
                    "transcription": transcription_text,
                    "transcription_id": transcription_obj.id,
                    "chat_title": chat_title,
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
