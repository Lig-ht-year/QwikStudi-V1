from django.db import models
from django.contrib.auth.models import User
# Create your models here.
class File(models.Model):
    FILE_TYPES = [
        ('pdf', 'PDF'),
        ('docx', 'Word Document'),
        ('pptx', 'PowerPoint'),
        ('image', 'Image'),
        ('audio', 'Audio'),
        ('other', 'Other'),
    ]

    PURPOSES = [
        ('summary', 'Summary'),
        ('audio', 'Text-to-Speech'),
        ('qa', 'Question Generation'),
        ('other', 'Other'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='files')
    file = models.FileField(upload_to='uploads/files/')
    file_type = models.CharField(max_length=10, choices=FILE_TYPES)
    purpose = models.CharField(max_length=20, choices=PURPOSES, default='other')
    uploaded_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20, default='pending')

    def __str__(self):
        return f"{self.file.name} ({self.user.username})"



class Audio(models.Model):
    SOURCE_TYPES = [
        ('tts', 'Text-to-Speech'),
        ('transcription', 'Transcription'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='file_audio_files')
    file = models.ForeignKey('File', null=True, blank=True, on_delete=models.SET_NULL, related_name='linked_audio')
    text_input = models.TextField(null=True, blank=True)
    audio = models.FileField(upload_to='uploads/audio/')
    source_type = models.CharField(max_length=20, choices=SOURCE_TYPES)
    language = models.CharField(max_length=20, null=True, blank=True)
    duration = models.PositiveIntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    # New fields for TTS configuration
    voice = models.CharField(max_length=20, null=True, blank=True)
    speed = models.FloatField(default=1.0)  # Playback speed, e.g., 0.8–1.5x

    def __str__(self):
        return f"{self.source_type} by {self.user.username} at {self.created_at.strftime('%Y-%m-%d')}"


class Transcription(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='transcriptions')
    audio = models.ForeignKey(Audio, on_delete=models.CASCADE, related_name='transcription')
    transcription = models.TextField()
    language = models.CharField(max_length=20, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Transcription by {self.user.username} on {self.created_at.strftime('%Y-%m-%d')}"


from django.db import models
from django.contrib.auth.models import User

class GeneratedQuestion(models.Model):
    SOURCE_TYPES = [
        ('file', 'File'),
        ('transcript', 'Transcript'),
        ('chat', 'Chat'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='questions')
    question = models.TextField()
    answer = models.TextField(null=True, blank=True)
    options = models.JSONField(null=True, blank=True)  # New: store MCQ options
    visual_aid = models.TextField(null=True, blank=True)  # New: image/chart suggestion
    source_type = models.CharField(max_length=20, choices=SOURCE_TYPES)
    source_id = models.IntegerField()  # e.g. File ID or Transcription ID
    category = models.CharField(max_length=50, null=True, blank=True)
    difficulty = models.CharField(max_length=20, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Q: {self.question[:30]}... by {self.user.username}"

class FileSummary(models.Model):
    FORMAT_CHOICES = [
        ('text', 'Text'),
        ('file', 'File'),
    ]

    file = models.ForeignKey(File, on_delete=models.CASCADE, related_name='summaries')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='summaries')
    summary_text = models.TextField(null=True, blank=True)  # Only if text format
    summary_file = models.FileField(upload_to='uploads/summaries/', null=True, blank=True)  # Only if file format
    format = models.CharField(max_length=10, choices=FORMAT_CHOICES)
    created_at = models.DateTimeField(auto_now_add=True)
    is_audio_generated = models.BooleanField(default=False)  # ✅ For TTS tracking later

    def __str__(self):
        return f"Summary ({self.format}) for {self.file.file.name} by {self.user.username}"

class SharedAudio(models.Model):
    audio = models.ForeignKey(Audio, on_delete=models.CASCADE, related_name='shared_entries')

    shared_by = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='audio_shared_by'
    )

    shared_with = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='audio_shared_with'
    )

    status = models.CharField(
        max_length=10,
        choices=[('pending', 'Pending'), ('accepted', 'Accepted'), ('rejected', 'Rejected')],
        default='pending'
    )

    note = models.CharField(max_length=255, null=True, blank=True)  # Optional message

    shared_at = models.DateTimeField(auto_now_add=True)
    responded_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ('audio', 'shared_by', 'shared_with')  # Prevent duplicate sharing

    def __str__(self):
        return f"{self.audio.id} from {self.shared_by.username} to {self.shared_with.username} [{self.status}]"




        
