from openai import OpenAI
import os
import logging
from django.conf import settings
from django.core.files.base import ContentFile
from .models import TextToSpeech
logger = logging.getLogger(__name__)
_OPENAI_CLIENT: OpenAI | None = None


def get_openai_client():
    """Lazy initialization of OpenAI client to ensure env vars are loaded."""
    global _OPENAI_CLIENT
    if _OPENAI_CLIENT is not None:
        return _OPENAI_CLIENT
    api_key = os.getenv('OPENAI_API_KEY')
    if not api_key:
        raise ValueError("OPENAI_API_KEY environment variable is not set")
    timeout = float(getattr(settings, "OPENAI_REQUEST_TIMEOUT_SECONDS", 30.0))
    _OPENAI_CLIENT = OpenAI(api_key=api_key, timeout=timeout)
    return _OPENAI_CLIENT

def generate_chat_title_from_openai(messages: list[str]):
    """
    Generates a short title from the initial 2 messages of a chat.
    :param messages: [{'role': 'user', 'content': '...'}, {'role': 'assistant', 'content': '...'}]
    :return: string title or None
    """
    try:
        client = get_openai_client()
        response = client.chat.completions.create(
            model=getattr(settings, "TITLE_OPENAI_MODEL", "gpt-4o-mini"),
            messages=[
                {
                    "role": "system",
                    "content": "Create a concise, specific chat title (3-6 words). Return only the title text."
                },
                *messages,
            ],
            max_tokens=20,
            temperature=0.4
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        logger.warning(f"OpenAI title generation failed: {e}")
        return None



def get_client_ip(request):
    x_forwarded = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded:
        return x_forwarded.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR')


def text_to_audio(user, text):
    """
    Generate speech from text using OpenAI TTS and save the audio to the database.
    """
    try:
        client = get_openai_client()
        response = client.audio.speech.create(
            model=getattr(settings, "TTS_OPENAI_MODEL", "gpt-4o-mini-tts"),
            voice="alloy",
            input=text
        )

        tts_obj = TextToSpeech.objects.create(
            user=user,
            text=text
        )

        # `audio_file` already prefixes upload_to='text_to_speech/'.
        file_name = f"{tts_obj.id}.mp3"
        tts_obj.audio_file.save(file_name, ContentFile(response.content))

        return tts_obj
    except Exception as e:
        logger.error(f"TTS generation failed: {e}")
        return None
