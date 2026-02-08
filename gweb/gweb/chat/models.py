from django.db import models
from django.contrib.auth.models import User


class Chat(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='chats')
    title = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)
    is_deleted = models.BooleanField(default=False)
    updated_at = models.DateTimeField(auto_now=True)  # 👈 add this line

    def __str__(self):
        return f"{self.title} ({self.user.username})"


class ChatCollaborator(models.Model):
    chat = models.ForeignKey('Chat', on_delete=models.CASCADE, related_name='collaborators')
    collaborator = models.ForeignKey(User, on_delete=models.CASCADE, related_name='shared_chats')
    added_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='collaborators_added')
    
    access_level = models.CharField(
        max_length=10,
        choices=[("view", "View Only"), ("edit", "Can Edit")],
        default="view"
    )
    
    is_approved = models.BooleanField(default=False)
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('chat', 'collaborator')

    def __str__(self):
        return f"{self.collaborator.username} on {self.chat.title} ({self.access_level})"



class ChatHistory(models.Model):
    chat = models.ForeignKey(Chat, on_delete=models.CASCADE, related_name='messages')
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    prompt = models.TextField()
    response = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    context = models.CharField(max_length=100, default='general')  # general, file, audio, etc.
    file = models.ForeignKey('files.File', null=True, blank=True, on_delete=models.SET_NULL, related_name='chat_references')
    prompt_type = models.CharField(max_length=20, default='text')
    prompt_metadata = models.JSONField(default=dict, blank=True)
    response_type = models.CharField(max_length=20, default='text')
    response_metadata = models.JSONField(default=dict, blank=True)

    def __str__(self):
        return f"ChatMessage {self.id} - {self.user.username}"


class TextToSpeech(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='text_to_speech')
    text = models.TextField()
    audio_file = models.FileField(upload_to='text_to_speech/', blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"TTS {self.id} - {self.user.username}"
