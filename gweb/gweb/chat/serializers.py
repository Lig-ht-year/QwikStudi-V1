from rest_framework import serializers
from .models import Chat, ChatHistory
from .models import TextToSpeech

class ChatHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = ChatHistory
        fields = [
            'id', 'chat', 'user', 'prompt', 'response',
            'created_at', 'context', 'file',
            'prompt_type', 'prompt_metadata', 'response_type', 'response_metadata'
        ]
        read_only_fields = ['id', 'created_at']


class ChatSerializer(serializers.ModelSerializer):
    messages = ChatHistorySerializer(many=True, read_only=True, source='messages')

    class Meta:
        model = Chat
        fields = ['id', 'user', 'title', 'created_at', 'is_deleted', 'messages']
        read_only_fields = ['id', 'created_at']

# chat/serializers.py
from rest_framework import serializers
from .models import Chat

class ChatListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Chat
        fields = ['id', 'title', 'updated_at']

# chat/serializers.py
from .models import ChatHistory

class ChatMessageSerializer(serializers.ModelSerializer):
    created_at = serializers.DateTimeField(read_only=True)

    class Meta:
        model = ChatHistory
        fields = [
            'id', 'prompt', 'response', 'created_at',
            'prompt_type', 'prompt_metadata', 'response_type', 'response_metadata'
        ]
 
# chat/serializers.py

from .models import ChatCollaborator
from django.contrib.auth.models import User

class UserBasicSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email']


class ChatCollaboratorSerializer(serializers.ModelSerializer):
    collaborator = UserBasicSerializer(read_only=True)
    added_by = UserBasicSerializer(read_only=True)
    is_owner = serializers.SerializerMethodField()

    class Meta:
        model = ChatCollaborator
        fields = [
            'id', 'chat', 'collaborator', 'added_by',
            'access_level', 'is_approved', 'added_at', 'is_owner'
        ]
        read_only_fields = ['id', 'added_at', 'added_by', 'collaborator', 'is_owner']

    def get_is_owner(self, obj):
        return obj.collaborator == obj.chat.user


class AddCollaboratorSerializer(serializers.Serializer):
    email = serializers.EmailField(required=False)
    user_id = serializers.IntegerField(required=False)
    access_level = serializers.ChoiceField(choices=['view', 'edit'])

    def validate(self, attrs):
        if not attrs.get('email') and not attrs.get('user_id'):
            raise serializers.ValidationError("Either email or user_id is required.")
        return attrs

class ApproveCollaboratorSerializer(serializers.Serializer):
    chat_id = serializers.IntegerField()


# serializers
class TextToSpeechSerializer(serializers.ModelSerializer):
    class Meta:
        model = TextToSpeech
        fields = ['id', 'text', 'audio_file', 'created_at']
        read_only_fields = ['id', 'created_at', 'audio_file']
