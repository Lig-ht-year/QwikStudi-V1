from django.contrib import admin

# Register your models here.

from .models import Chat, ChatHistory, ChatCollaborator,TextToSpeech

@admin.register(Chat)
class ChatAdmin(admin.ModelAdmin):
    list_display = ('id', 'title', 'user', 'created_at', 'is_deleted')
    list_filter = ('is_deleted', 'created_at')
    search_fields = ('title', 'user__username')
    raw_id_fields = ('user',)

@admin.register(ChatHistory)
class ChatHistoryAdmin(admin.ModelAdmin):
    list_display = ('id', 'chat', 'user', 'created_at', 'context')
    list_filter = ('context', 'created_at')
    search_fields = ('prompt', 'response', 'user__username')
    raw_id_fields = ('chat', 'user')

@admin.register(ChatCollaborator)
class ChatCollaboratorAdmin(admin.ModelAdmin):
    list_display = ('id', 'chat', 'collaborator', 'access_level', 'is_approved')
    list_filter = ('access_level', 'is_approved')
    search_fields = ('chat__title', 'collaborator__username')
    raw_id_fields = ('chat', 'collaborator', 'added_by')



@admin.register(TextToSpeech)
class TextToSpeechAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'created_at', 'audio_file')
    list_filter = ('created_at',)
    search_fields = ('text', 'user__username')
    raw_id_fields = ('user',)
    readonly_fields = ('created_at',)
