import logging
from uuid import UUID, uuid4

from django.conf import settings
from django.contrib.auth.models import User
from django.shortcuts import get_object_or_404
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.utils import timezone

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from rest_framework.permissions import IsAuthenticated
from rest_framework.generics import RetrieveAPIView

from openai import OpenAI

from .models import Chat, ChatHistory, ChatCollaborator
from .serializers import (
    ChatSerializer,
    ChatHistorySerializer,
    ChatListSerializer,
    ChatMessageSerializer,
    ChatCollaboratorSerializer,
)
from django.core.files.base import ContentFile
from.models import TextToSpeech
from .utils import get_client_ip, generate_chat_title_from_openai, get_openai_client

from g_auth.models import GuestChatTracker, GuestIPTracker
from payments.models import UserProfile as PaymentsUserProfile
import re

logger = logging.getLogger(__name__)

def _sanitize_response_text(text: str) -> str:
    if not isinstance(text, str):
        return text
    # Remove markdown symbols the user doesn't want shown.
    return text.replace("#", "").replace("*", "")

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

def _estimate_tts_minutes(text: str) -> float:
    words = len(re.findall(r"[A-Za-z0-9']+", text or ""))
    wpm = 150.0
    minutes = words / wpm if wpm else 0.0
    return max(minutes, 0.01)

class AddCollaboratorAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, chat_id):
        user_ids = request.data.get("user_ids", [])
        access_level = request.data.get("access_level", "view")

        if not isinstance(user_ids, list) or not user_ids:
            return Response({"error": "user_ids must be a non-empty list."}, status=400)

        # Get chat object first
        chat = get_object_or_404(Chat, id=chat_id)

        # ✅ Check ownership before anything else
        if chat.user != request.user:
            return Response({"error": "Only the owner can add collaborators."}, status=403)

        added = []

        for user_id in user_ids:
            try:
                user = User.objects.get(id=user_id)
                if user == request.user:
                    continue  # Skip adding self

                existing = ChatCollaborator.objects.filter(chat=chat, collaborator=user).first()

                if existing:
                    if existing.access_level != access_level:
                        existing.access_level = access_level
                        existing.save()
                    continue  # Already added
                else:
                    ChatCollaborator.objects.create(
                        chat=chat,
                        collaborator=user,
                        access_level=access_level,
                        added_by=request.user,
                        is_approved=False
                    )
                    added.append({"id": user.id, "username": user.username})

            except User.DoesNotExist:
                continue  # Ignore invalid IDs

        return Response({
            "message": f"{len(added)} collaborators added.",
            "collaborators": added
        }, status=200)

class RemoveCollaboratorAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, chat_id):
        username = request.data.get("username")
        if not username:
            return Response({"error": "Username is required."}, status=400)

        try:
            chat = Chat.objects.get(id=chat_id)
            collaborator = User.objects.get(username=username)
            collab = ChatCollaborator.objects.get(chat=chat, collaborator=collaborator)
        except (Chat.DoesNotExist, User.DoesNotExist, ChatCollaborator.DoesNotExist):
            return Response({"error": "Collaboration not found."}, status=404)

        if request.user != chat.user and request.user != collab.added_by:
            return Response({"error": "You are not authorized to remove this collaborator."}, status=403)

        collab.delete()
        return Response({"message": f"{username} removed from collaborators."}, status=200)

class ChatMessagesAPIView(RetrieveAPIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, chat_id):
        try:
            chat = Chat.objects.get(id=chat_id, user=request.user)
        except Chat.DoesNotExist:
            return Response({"error": "Chat not found."}, status=status.HTTP_404_NOT_FOUND)

        messages = ChatHistory.objects.filter(chat=chat).order_by('created_at')
        serializer = ChatMessageSerializer(messages, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class ChatListAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            owned_chats = Chat.objects.filter(
                user=request.user, is_deleted=False
            )
            shared_chats = Chat.objects.filter(
                collaborators__collaborator=request.user,
                collaborators__is_approved=True,
                is_deleted=False
            )

            chats = (owned_chats | shared_chats).distinct().order_by('-updated_at')
            serializer = ChatListSerializer(chats, many=True)
            return Response(serializer.data, status=200)

        except Exception as e:
            logger.error(f"Error fetching chat list: {str(e)}", exc_info=True)
            return Response({"error": "Unable to fetch chat list."}, status=500)




@method_decorator(csrf_exempt, name='dispatch')
class ChatAPIView(APIView):
    def post(self, request):
        user = request.user if request.user.is_authenticated else None
        prompt = request.data.get("prompt")
        chat_id = request.data.get("chat_id")
        guest_id = request.data.get("guest_id")
        ip = get_client_ip(request)

        logger.debug(f"[ChatAPI] Request received - user: {user}, prompt length: {len(prompt) if prompt else 0}, chat_id: {chat_id}, guest_id: {guest_id}")
        logger.debug(f"[ChatAPI] Request data: {dict(request.data)}")

        if not prompt:
            logger.warning(f"[ChatAPI] Missing prompt - request.data: {dict(request.data)}")
            return Response(
                {"error": "Please enter a message to begin."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validate prompt length (prevent DoS and cost abuse)
        MAX_PROMPT_LENGTH = 4000
        if len(prompt) > MAX_PROMPT_LENGTH:
            return Response(
                {"error": f"Message too long. Maximum {MAX_PROMPT_LENGTH} characters allowed."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Guest user flow
        if not user:
            if not guest_id:
                guest_uuid = uuid4()
            else:
                try:
                    guest_uuid = UUID(guest_id)
                except ValueError:
                    guest_uuid = uuid4()

            guest_tracker, _ = GuestChatTracker.objects.get_or_create(guest_id=guest_uuid)
            ip_tracker, _ = GuestIPTracker.objects.get_or_create(ip_address=ip)

            if guest_tracker.count >= 10 or ip_tracker.count >= 10:
                return Response({
                    "limit_exceeded": True,
                    "message": "You've reached your guest chat limit. Please log in to continue."
                }, status=status.HTTP_200_OK)

        # Get or create chat
        try:
            if user:
                if chat_id:
                    chat = Chat.objects.get(id=chat_id)
                    
                    # Ownership or collaborator check
                    if chat.user != user:
                        collaborator = ChatCollaborator.objects.filter(chat=chat, collaborator=user, is_approved=True).first()
                        if not collaborator:
                            return Response({"error": "You do not have access to this chat."}, status=403)
                        if collaborator.access_level != "edit":
                            return Response({"error": "You don't have permission to modify this chat."}, status=403)
                else:
                    chat = Chat.objects.create(user=user, title="New Chat")
            else:
                chat = None  # Guests don't persist chat
        except Chat.DoesNotExist:
            return Response({
                "error": "We couldn't find that chat session."
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"[Chat Init] {e}", exc_info=True)
            return Response({
                "error": "We had trouble starting your chat. Please try again."
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        # Enhanced system prompt for study buddy behavior
        system_prompt = """You are QwikStudi, an AI study buddy created by Glinax Tech Innovations.

## Your Core Identity
- You are a helpful, patient, and encouraging study companion
- You help users learn and understand concepts deeply, not just memorize answers
- When asked for your creator, always answer 'Glinax Tech Innovations'
- When asked for your name, always answer 'QwikStudi'
- Never say you have no name. Never claim to be created by OpenAI or any other organization
- Stay in character as a friendly tutor at all times

## Teaching Approach
1. **Active Learning**: Don't just give answers—guide users to discover solutions themselves
2. **Socratic Method**: Ask follow-up questions that help learners think critically
3. **Multiple Explanations**: If a concept is complex, offer different analogies or perspectives
4. **Examples First**: Use concrete examples before abstract explanations
5. **Check Understanding**: Periodically ask if the user understands or needs clarification

## Response Style
- Be conversational and warm, like a knowledgeable friend helping with homework
- Use clear, simple language—avoid unnecessary jargon
- Break down complex topics into digestible steps
- Highlight key terms and important concepts
- Use formatting (bullet points, bold text) to improve readability
- Keep responses appropriately sized based on the complexity of the question

## When User is Struggling
- Offer to explain differently or more simply
- Provide analogies from everyday life
- Break the problem into smaller parts
- Ask what specifically is confusing

## Study Tips
- Suggest effective study techniques (spaced repetition, active recall, Feynman technique)
- Recommend related topics to explore next
- Encourage curiosity and a growth mindset

## Context Awareness
- You have access to our conversation history
- Reference previous questions when relevant to build continuity
- Help connect new concepts to things we've already discussed

Remember: Your goal is to help users become better learners, not just to answer questions."""
        
        # Build conversation history
        messages = [{"role": "system", "content": system_prompt}]

        # Add conversation history if chat exists and user is authenticated
        if user and chat:
            recent_messages = ChatHistory.objects.filter(chat=chat).order_by('-created_at')[:20]  # Last 20 messages for context
            # Reverse to get chronological order and truncate long messages
            for msg in reversed(recent_messages):
                # Truncate individual messages to preserve token limits (max 500 chars per message)
                prompt_content = msg.prompt[:500] if len(msg.prompt) > 500 else msg.prompt
                response_content = msg.response[:500] if len(msg.response) > 500 else msg.response
                messages.append({"role": "user", "content": prompt_content})
                messages.append({"role": "assistant", "content": response_content})

        # Add current user prompt
        messages.append({"role": "user", "content": prompt})

        # Get response style settings from request
        response_style = request.data.get("response_style", "balanced")

        # Configure OpenAI parameters based on response style
        style_configs = {
            "concise": {
                "temperature": 0.3,
                "max_tokens": 300,
            },
            "balanced": {
                "temperature": 0.5,
                "max_tokens": 600,
            },
            "detailed": {
                "temperature": 0.7,
                "max_tokens": 1000,
            },
        }

        config = style_configs.get(response_style, style_configs["balanced"])

        try:
            client = get_openai_client()
            res = client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=messages,
                temperature=config["temperature"],
                max_tokens=config["max_tokens"],
            )
            bot_reply = _sanitize_response_text(res.choices[0].message.content)
        except Exception as e:
            logger.error(f"[OpenAI Error] {e}", exc_info=True)
            return Response({
                "error": "We're having trouble responding. Please try again shortly."
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        # Save chat history
        if user:
            try:
                ChatHistory.objects.create(
                    chat=chat,
                    user=user,
                    prompt=prompt,
                    response=bot_reply,
                    prompt_type="text",
                    response_type="text",
                    context="general"
                )
            except Exception as e:
                logger.warning(f"[History Save Fail] {e}", exc_info=True)

        # Update guest usage
        if not user:
            guest_tracker.count += 1
            guest_tracker.save()
            ip_tracker.count += 1
            ip_tracker.save()

        response_payload = {
            "chat_id": chat.id if chat else None,
            "response": bot_reply,
            "limit_exceeded": False
        }
        if not user:
            response_payload["guest_id"] = str(guest_uuid)

        return Response(response_payload, status=status.HTTP_200_OK)



class ChatDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, chat_id):
        new_title = request.data.get("title")
        if not new_title:
            return Response({"error": "Title is required."}, status=400)

        try:
            chat = Chat.objects.get(id=chat_id, user=request.user)
        except Chat.DoesNotExist:
            return Response({"error": "Chat not found."}, status=404)

        chat.title = new_title
        chat.save()
        return Response({"message": "Chat title updated successfully.", "title": new_title})

    def delete(self, request, chat_id):
        try:
            chat = Chat.objects.get(id=chat_id, user=request.user)
        except Chat.DoesNotExist:
            return Response({"error": "Chat not found."}, status=404)

        chat.is_deleted = True
        chat.save()
        return Response({"message": "Chat deleted successfully."}, status=204)





class CommitChatView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        chat_id = request.data.get("chat_id")

        if not chat_id:
            return Response({"error": "Chat ID is required."}, status=400)

        try:
            chat = Chat.objects.get(id=chat_id)
        except Chat.DoesNotExist:
            return Response({"error": "Chat not found."}, status=404)

        user = request.user
        is_owner = chat.user == user
        has_edit_access = ChatCollaborator.objects.filter(
            chat=chat,
            collaborator=user,
            is_approved=True,
            access_level="edit"
        ).exists()

        if not is_owner and not has_edit_access:
            return Response({"error": "You do not have permission to modify this chat."}, status=403)

        messages = list(ChatHistory.objects.filter(chat=chat).order_by("created_at")[:2])

        if len(messages) < 2:
            return Response(
                {"error": "At least two messages are required to generate a title."},
                status=400
            )

        title = generate_chat_title_from_openai([
            {"role": "user", "content": messages[0].prompt},
            {"role": "assistant", "content": messages[0].response}
        ]) or "New Chat"

        chat.title = title
        chat.save()

        return Response({"chat_id": chat.id, "title": title}, status=200)


from rest_framework.views import APIView

class UpdateChatTitleAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, chat_id):
        chat = get_object_or_404(Chat, id=chat_id)

        # Owner check
        if chat.user == request.user:
            allowed = True
        else:
            collab = ChatCollaborator.objects.filter(
                chat=chat,
                collaborator=request.user,
                is_approved=True,
                access_level="edit"  # <-- must be edit
            ).first()
            allowed = bool(collab)

        if not allowed:
            return Response({"error": "Permission denied."}, status=403)

        title = request.data.get("title")
        if title:
            chat.title = title
            chat.save()

        return Response({"message": "Chat updated."})

class DeleteChatAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, chat_id):
        user = request.user

        try:
            chat = Chat.objects.get(id=chat_id)
        except Chat.DoesNotExist:
            return Response({"error": "Chat not found."}, status=404)

        # Check ownership or edit-level collaborator
        is_owner = chat.user == user
        has_edit_access = ChatCollaborator.objects.filter(
            chat=chat,
            collaborator=user,
            is_approved=True,
            access_level="edit"
        ).exists()

        if not is_owner and not has_edit_access:
            return Response({"error": "You do not have permission to delete this chat."}, status=403)

        chat.is_deleted = True
        chat.save()
        return Response({"message": "Chat deleted successfully."}, status=200)


class StartNewChatAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        chat = Chat.objects.create(user=request.user, title="New Chat")
        return Response({"chat_id": chat.id, "message": "New chat started."}, status=201)


from django.db.models import Q

class ListUsersAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        query = request.GET.get("q", "").strip()
        users = User.objects.exclude(id=request.user.id)
        if query:
            users = users.filter(Q(username__icontains=query) | Q(email__icontains=query))
        data = [{"id": u.id, "username": u.username, "email": u.email} for u in users]
        return Response(data)


class ShareChatAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, chat_id):
        chat = get_object_or_404(Chat, id=chat_id, user=request.user)
        user_ids = request.data.get("user_ids", [])
        access_level = request.data.get("access_level", "view")

        if access_level not in ["view", "edit"]:
            return Response({"error": "Invalid access level."}, status=status.HTTP_400_BAD_REQUEST)

        added = []
        skipped = []
        for uid in user_ids:
            user = User.objects.filter(id=uid).first()
            if not user:
                skipped.append(uid)
                continue

            obj, created = ChatCollaborator.objects.get_or_create(
                chat=chat, collaborator=user,
                defaults={"added_by": request.user, "access_level": access_level, "is_approved": False}
            )
            if created:
                added.append(user.username)
            else:
                skipped.append(user.username)

        return Response({
            "added": added,
            "skipped": skipped
        })


class ApproveCollaborationAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, chat_id):
        collab = get_object_or_404(
            ChatCollaborator, chat_id=chat_id, collaborator=request.user, is_approved=False
        )
        collab.is_approved = True
        collab.save()
        return Response({"message": "Collaboration approved."})



class EmailShareAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, chat_id):
        email = request.data.get("email")
        access_level = request.data.get("access_level", "view")
        user = User.objects.filter(email=email).first()
        chat = get_object_or_404(Chat, id=chat_id, user=request.user)

        if not user:
            return Response({"error": "User with this email not found."}, status=status.HTTP_404_NOT_FOUND)

        if user == request.user:
            return Response({"error": "You cannot share the chat with yourself."}, status=status.HTTP_400_BAD_REQUEST)

        _, created = ChatCollaborator.objects.get_or_create(
            chat=chat, collaborator=user,
            defaults={"added_by": request.user, "access_level": access_level, "is_approved": False}
        )
        # Replace this with actual email logic if needed.
        return Response({"message": f"Chat shared with {user.username}."})




class ListCollaboratorsAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, chat_id):
        chat = get_object_or_404(Chat, id=chat_id)

        # Check access
        is_owner = chat.user == request.user
        is_collaborator = ChatCollaborator.objects.filter(
            chat=chat, collaborator=request.user, is_approved=True
        ).exists()

        if not is_owner and not is_collaborator:
            return Response({"error": "Not authorized."}, status=403)

        # Get actual collaborators
        collaborators = list(ChatCollaborator.objects.filter(chat=chat))

        # Add the owner as a pseudo-collaborator
        owner_user = chat.user
        owner_data = {
            "id": -1,  # Indicates synthetic collaborator
            "chat": chat.id,
            "collaborator": {
                "id": owner_user.id,
                "username": owner_user.username,
                "email": owner_user.email
            },
            "added_by": {
                "id": owner_user.id,
                "username": owner_user.username,
                "email": owner_user.email
            },
            "access_level": "edit",
            "is_approved": True,
            "added_at": chat.created_at,
            "is_owner": True
        }

        # Serialize real collaborators
        serializer = ChatCollaboratorSerializer(collaborators, many=True)
        data = serializer.data

        # Add synthetic owner entry
        data.insert(0, owner_data)

        return Response(data, status=200)


class PendingCollaborationsAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        collaborations = ChatCollaborator.objects.filter(
            collaborator=request.user,
            is_approved=False
        ).select_related("chat", "chat__user")  # important

        data = [{
            "id": c.chat.id,
            "title": c.chat.title,
            "owner": {
                "id": c.chat.user.id,
                "username": c.chat.user.username,
                "email": c.chat.user.email
            }
        } for c in collaborations]

        return Response(data)

class RejectCollaborationAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, chat_id):
        chat = get_object_or_404(Chat, id=chat_id)

        try:
            collab = ChatCollaborator.objects.get(chat=chat, collaborator=request.user, is_approved=False)
        except ChatCollaborator.DoesNotExist:
            return Response({"error": "No pending invitation found."}, status=404)

        collab.delete()
        return Response({"success": "Collaboration rejected."})


# views.py - Add these new views


class TextToAudioView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        text = request.data.get('text')
        if not text:
            return Response({"error": "No text provided"}, status=400)
        chat_id = request.data.get("chat_id")
        voice = request.data.get("voice", "alloy")
        
        # Validate text length (prevent cost abuse - TTS is priced per character)
        MAX_TTS_LENGTH = 500
        if len(text) > MAX_TTS_LENGTH:
            return Response(
                {"error": f"Text too long. Maximum {MAX_TTS_LENGTH} characters allowed for text-to-speech."},
                status=400
            )

        profile = _get_payments_profile(request.user)
        premium_active = _is_premium(profile)
        estimated_minutes = _estimate_tts_minutes(text)
        if not premium_active and profile.audio_minutes_used + estimated_minutes > 10:
            return Response(
                {"error": "Free audio limit reached. Upgrade to premium."},
                status=429
            )
        
        try:
            # Generate speech using OpenAI TTS
            client = get_openai_client()
            response = client.audio.speech.create(
                model="tts-1",
                voice=voice,
                input=text
            )
            
            # Save the response
            tts_obj = TextToSpeech.objects.create(
                user=request.user,
                text=text
            )
            
            # Save the audio file
            # `audio_file` has upload_to='text_to_speech/', so save only the filename.
            file_name = f"{tts_obj.id}.mp3"
            tts_obj.audio_file.save(file_name, ContentFile(response.content))
            audio_url = request.build_absolute_uri(tts_obj.audio_file.url)

            if not premium_active:
                profile.audio_minutes_used += estimated_minutes
                profile.save(update_fields=["audio_minutes_used"])

            chat = _get_chat_for_write(request.user, chat_id)
            if chat:
                ChatHistory.objects.create(
                    chat=chat,
                    user=request.user,
                    prompt="",
                    response="I've generated audio for your text. Click play to listen.",
                    prompt_type="text",
                    response_type="audio",
                    response_metadata={
                        "title": "Generated Audio",
                        "audio_url": audio_url,
                        "voice": voice,
                        "transcript": text,
                    },
                    context="audio",
                )

            return Response({
                "id": tts_obj.id,
                "audio_url": audio_url
            })
            
        except Exception as e:
            logger.error(f"Text-to-speech failed: {str(e)}")
            return Response({"error": "Text-to-speech conversion failed"}, status=500)


import io
import PyPDF2
from django.core.files.uploadedfile import UploadedFile


def extract_text_from_file(file_obj) -> str:
    """Extract text from uploaded file (PDF, TXT, DOCX, PPTX, etc.)"""
    file_obj.seek(0)
    
    # Get file extension
    name = file_obj.name.lower()
    
    if name.endswith('.pdf'):
        try:
            pdf_reader = PyPDF2.PdfReader(file_obj)
            text = ""
            for page in pdf_reader.pages:
                text += page.extract_text() + "\n"
            return text.strip()
        except Exception as e:
            logger.error(f"PDF extraction failed: {e}")
            return ""
    
    elif name.endswith('.txt') or name.endswith('.md'):
        return file_obj.read().decode('utf-8', errors='ignore')
    
    elif name.endswith('.docx'):
        try:
            from docx import Document
            doc = Document(file_obj)
            text = ""
            for para in doc.paragraphs:
                text += para.text + "\n"
            return text.strip()
        except Exception as e:
            logger.error(f"DOCX extraction failed: {e}")
            return ""
    
    elif name.endswith('.pptx'):
        try:
            from pptx import Presentation
            prs = Presentation(file_obj)
            text = ""
            for slide in prs.slides:
                for shape in slide.shapes:
                    if hasattr(shape, "text"):
                        text += shape.text + "\n"
            return text.strip()
        except Exception as e:
            logger.error(f"PPTX extraction failed: {e}")
            return ""
    
    else:
        # Try to read as plain text
        try:
            content = file_obj.read()
            if isinstance(content, bytes):
                return content.decode('utf-8', errors='ignore')
            return str(content)
        except Exception as e:
            logger.error(f"File reading failed: {e}")
            return ""


class QuizGenerateAPIView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        # Get quiz configuration from request
        question_type = str(request.data.get("questionType", "mcq")).lower()
        if question_type in {"true_false", "true/false"}:
            question_type = "tf"
        elif question_type in {"fill_in", "fill-in", "fillin"}:
            question_type = "fill"
        elif question_type in {"theory"}:
            question_type = "essay"
        try:
            question_count = int(request.data.get("questionCount", 10))
        except Exception:
            question_count = 10
        if question_count < 1:
            question_count = 1
        difficulty = request.data.get("difficulty", "medium")
        chat_id = request.data.get("chat_id")

        profile = _get_payments_profile(request.user)
        premium_active = _is_premium(profile)
        if not premium_active and question_type in {"tf", "fill", "essay"}:
            return Response(
                {"error": "This question type requires a premium subscription."},
                status=403
            )
        if not premium_active:
            remaining = 20 - profile.questions_generated
            if remaining <= 0 or question_count > remaining:
                return Response(
                    {"error": "You have reached your free question limit. Upgrade to premium to continue."},
                    status=429
                )
        
        # Get uploaded file
        if 'file' not in request.FILES:
            return Response({"error": "No file uploaded"}, status=400)
        
        uploaded_file = request.FILES['file']
        
        # Validate file type
        allowed_types = ['pdf', 'txt', 'doc', 'docx', 'md']
        ext = uploaded_file.name.lower().split('.')[-1]
        if ext not in allowed_types:
            return Response(
                {"error": f"Invalid file type. Allowed: {', '.join(allowed_types)}"},
                status=400
            )
        
        # Extract text from file
        text_content = extract_text_from_file(uploaded_file)
        
        if not text_content or len(text_content) < 100:
            return Response(
                {"error": "Could not extract enough content from the file. Please try a different file."},
                status=400
            )
        
        # Limit text length to prevent excessive API costs
        max_chars = 10000
        if len(text_content) > max_chars:
            text_content = text_content[:max_chars]
        
        # Generate quiz using OpenAI
        try:
            # Create quiz generation prompt based on type
            type_instructions = {
                "mcq": "Generate multiple choice questions with 4 options each. Mark the correct answer with the index (0-3).",
                "tf": "Generate true/false questions. Set correctAnswer to 0 for True, 1 for False.",
                "fill": "Generate fill-in-the-blank questions. Set options to empty array [] and correctAnswer to 0.",
                "essay": "Generate essay questions. Set options to empty array [] and correctAnswer to 0."
            }
            
            prompt = f"""
You are a study assistant. Based on the following content, generate {question_count} {difficulty} difficulty questions.

Content:
{text_content}

Question Type: {question_type}
Instructions: {type_instructions.get(question_type, 'Generate questions based on the content')}

IMPORTANT: Return ONLY a valid JSON array with this EXACT structure:
[
    {{
        "id": "q1",
        "question": "Question text here?",
        "options": ["A", "B", "C", "D"],
        "correctAnswer": 0,
        "explanation": "Brief explanation"
    }}
]

For multiple choice: options must be an array of 4 strings, correctAnswer must be the index (0, 1, 2, or 3).
For true/false: options must be ["True", "False"], correctAnswer must be 0 or 1.
For fill/essay: options must be an empty array [], correctAnswer must be 0.

DO NOT include any markdown code blocks, DO NOT include any other text.
Only return valid JSON, nothing else.
"""
            
            client = get_openai_client()
            response = client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": "You are a helpful study assistant that generates quizzes. Always return valid JSON only. Never use markdown code blocks."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                max_tokens=2000
            )
            
            import json
            result = response.choices[0].message.content
            
            logger.info(f"[QuizGen] Raw OpenAI response (first 500 chars): {result[:500]}")
            
            # Try to parse JSON from response
            questions = None
            parse_error = None
            
            try:
                # First try direct parsing
                questions = json.loads(result)
                logger.info(f"[QuizGen] Direct JSON parse succeeded, got {len(questions) if questions else 0} questions")
            except json.JSONDecodeError as e:
                parse_error = f"Direct parse failed: {e}"
                logger.warning(f"[QuizGen] {parse_error}")
                
                # Try to extract JSON from markdown code block
                import re
                json_match = re.search(r'```json?\n(.*?)\n```', result, re.DOTALL)
                if json_match:
                    try:
                        questions = json.loads(json_match.group(1))
                        logger.info(f"[QuizGen] Markdown code block parse succeeded, got {len(questions)} questions")
                    except json.JSONDecodeError as e2:
                        parse_error = f"Markdown parse failed: {e2}"
                        logger.warning(f"[QuizGen] {parse_error}")
                else:
                    logger.warning(f"[QuizGen] No markdown code block found")
            
            # Fallback: try to find JSON array in the text
            if questions is None:
                start = result.find('[')
                end = result.rfind(']') + 1
                if start >= 0 and end > start:
                    try:
                        questions = json.loads(result[start:end])
                        logger.info(f"[QuizGen] Extracted JSON array from text, got {len(questions)} questions")
                    except json.JSONDecodeError as e3:
                        parse_error = f"Text extraction failed: {e3}"
                        logger.error(f"[QuizGen] {parse_error}")
            
            if questions is None:
                logger.error(f"[QuizGen] All parsing methods failed. Last error: {parse_error}")
                return Response(
                    {"error": f"Failed to parse quiz questions. Please try again."},
                    status=500
                )
            
            # Validate and normalize questions to match QuizWidgetCard interface
            normalized_questions = []
            for i, q in enumerate(questions):
                try:
                    # Ensure required fields exist with correct types
                    normalized_q = {
                        "id": q.get("id", f"q{i+1}"),
                        "question": str(q.get("question", f"Question {i+1}")),
                        "options": [],
                        "correctAnswer": 0,
                        "explanation": str(q.get("explanation", ""))
                    }
                    
                    # Handle options based on question type
                    if question_type == "mcq":
                        opts = q.get("options", [])
                        if isinstance(opts, list) and len(opts) >= 2:
                            normalized_q["options"] = [str(opt) for opt in opts[:4]]
                        else:
                            # Fallback options
                            normalized_q["options"] = ["Option A", "Option B", "Option C", "Option D"]
                        
                        # Ensure correctAnswer is valid index
                        if isinstance(q.get("correctAnswer"), int):
                            normalized_q["correctAnswer"] = min(max(q["correctAnswer"], 0), len(normalized_q["options"]) - 1)
                        else:
                            normalized_q["correctAnswer"] = 0
                    
                    elif question_type == "tf":
                        normalized_q["options"] = ["True", "False"]
                        ca = q.get("correctAnswer")
                        if ca in [0, 1, "0", "1", True, False, "True", "False"]:
                            if ca in [0, "0", False, "False"]:
                                normalized_q["correctAnswer"] = 1  # False is index 1
                            else:
                                normalized_q["correctAnswer"] = 0  # True is index 0
                        else:
                            normalized_q["correctAnswer"] = 0
                    
                    else:
                        # fill, essay
                        normalized_q["options"] = []
                        normalized_q["correctAnswer"] = 0
                    
                    normalized_questions.append(normalized_q)
                    logger.debug(f"[QuizGen] Question {i+1}: {normalized_q['question'][:50]}...")
                    
                except Exception as e:
                    logger.warning(f"[QuizGen] Failed to normalize question {i}: {e}")
                    continue
            
            logger.info(f"[QuizGen] Successfully normalized {len(normalized_questions)} questions")
            
            if not normalized_questions:
                return Response(
                    {"error": "Failed to generate valid quiz questions. Please try again."},
                    status=500
                )

            chat = _get_chat_for_write(request.user, chat_id)
            if chat:
                ChatHistory.objects.create(
                    chat=chat,
                    user=request.user,
                    prompt="",
                    response=f"I've generated {len(normalized_questions)} quiz questions based on your study material. Test your knowledge!",
                    prompt_type="text",
                    response_type="quiz",
                    response_metadata={
                        "title": "Generated Quiz",
                        "questions": normalized_questions,
                        "difficulty": difficulty,
                        "type": question_type,
                    },
                    context="quiz",
                )
            
            if not premium_active:
                profile.questions_generated += len(normalized_questions)
                profile.save(update_fields=["questions_generated"])
            
            return Response({
                "questions": normalized_questions,
                "type": question_type,
                "difficulty": difficulty,
                "count": len(normalized_questions)
            }, status=200)
            
        except Exception as e:
            logger.error(f"Quiz generation failed: {str(e)}", exc_info=True)
            return Response(
                {"error": "Failed to generate quiz. Please try again."},
                status=500
            )

class SummarizeAPIView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        # Get summary options from request
        length = request.data.get("length", "detailed")  # brief, detailed, comprehensive
        format_type = request.data.get("format", "bullets")  # bullets, paragraphs
        include_key_terms = request.data.get("includeKeyTerms", True)
        chat_id = request.data.get("chat_id")
        
        # Get uploaded file
        if 'file' not in request.FILES:
            return Response({"error": "No file uploaded"}, status=400)
        
        uploaded_file = request.FILES['file']
        
        # Validate file type
        allowed_types = ['pdf', 'txt', 'doc', 'docx', 'ppt', 'pptx', 'md']
        ext = uploaded_file.name.lower().split('.')[-1]
        if ext not in allowed_types:
            return Response(
                {"error": f"Invalid file type. Allowed: {', '.join(allowed_types)}"},
                status=400
            )
        
        # Extract text from file
        text_content = extract_text_from_file(uploaded_file)
        
        if not text_content or len(text_content) < 100:
            return Response(
                {"error": "Could not extract enough content from the file. Please try a different file."},
                status=400
            )
        
        # Determine word count based on length
        word_counts = {
            "brief": "~100 words",
            "detailed": "~300 words",
            "comprehensive": "~500 words"
        }
        
        # Limit text length to prevent excessive API costs
        max_chars = 15000
        if len(text_content) > max_chars:
            text_content = text_content[:max_chars]
        
        # Generate summary using OpenAI
        try:
            format_instruction = "Use bullet points" if format_type == "bullets" else "Use paragraphs"
            key_terms_instruction = "Include a section for key terms and definitions." if include_key_terms else ""
            
            prompt = f"""
You are a study assistant. Create a {length} summary of the following content.

Content:
{text_content}

Requirements:
- Length: {word_counts.get(length, '~300 words')}
- Format: {format_instruction}
- {key_terms_instruction}
- Make it easy to study from
- Highlight important concepts

Return the response as a JSON object with this structure:
{{
    "summary": "The summary content formatted as requested",
    "takeaways": ["Key point 1", "Key point 2", "Key point 3"],
    "keyTerms": [{{"term": "term name", "definition": "brief definition"}}]  // Only if includeKeyTerms is true
}}
Only return valid JSON, no additional text.
"""
            
            client = get_openai_client()
            response = client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": "You are a helpful study assistant that creates summaries. Always return valid JSON only."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.5,
                max_tokens=1500
            )

            import json
            result = response.choices[0].message.content
            
            # Try to parse JSON from response
            try:
                summary_data = json.loads(result)
            except json.JSONDecodeError:
                # Try to extract JSON from markdown code block
                import re
                json_match = re.search(r'```json?\n(.*?)\n```', result, re.DOTALL)
                if json_match:
                    summary_data = json.loads(json_match.group(1))
                else:
                    # Try to find JSON object in the text
                    start = result.find('{')
                    end = result.rfind('}') + 1
                    if start >= 0 and end > start:
                        summary_data = json.loads(result[start:end])
                    else:
                        raise ValueError("Could not parse summary from response")
            
            # Handle case where summary is returned as an object with section keys
            # (e.g., {"Introduction": "...", "Conclusion": "..."})
            summary_content = summary_data.get("summary", "")
            if isinstance(summary_content, dict):
                # Convert dict to formatted string
                formatted_parts = []
                for section, content in summary_content.items():
                    if content:
                        formatted_parts.append(f"## {section}\n{content}")
                summary_content = "\n\n".join(formatted_parts)
            summary_content = _sanitize_response_text(summary_content)

            chat = _get_chat_for_write(request.user, chat_id)
            if chat:
                ChatHistory.objects.create(
                    chat=chat,
                    user=request.user,
                    prompt="",
                    response=summary_content,
                    prompt_type="text",
                    response_type="summary",
                    response_metadata={
                        "title": "Document Summary",
                        "summary": summary_content,
                        "takeaways": summary_data.get("takeaways", []),
                        "keyTerms": summary_data.get("keyTerms", []),
                        "length": length,
                        "format": format_type,
                    },
                    context="summary",
                )

            return Response({
                "summary": summary_content,
                "takeaways": summary_data.get("takeaways", []),
                "keyTerms": summary_data.get("keyTerms", []),
                "length": length,
                "format": format_type
            }, status=200)
            
        except Exception as e:
            logger.error(f"Summarization failed: {str(e)}", exc_info=True)
            return Response(
                {"error": "Failed to generate summary. Please try again."},
                status=500
            )
