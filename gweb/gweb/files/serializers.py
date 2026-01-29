# files/serializers.py

from rest_framework import serializers
from .models import File

class FileSerializer(serializers.ModelSerializer):
    class Meta:
        model = File
        fields = ['id', 'file', 'file_type', 'purpose', 'uploaded_at', 'status']

# files/serializers.py (or questions/serializers.py if you split apps)

from .models import GeneratedQuestion

class GeneratedQuestionSerializer(serializers.ModelSerializer):
    class Meta:
        model = GeneratedQuestion
        fields = [
            'id', 'question', 'answer', 'options', 'visual_aid',
            'source_type', 'source_id', 'category', 'difficulty', 'created_at'
        ]


from rest_framework import serializers
from .models import FileSummary

class FileSummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = FileSummary
        fields = [
            "id", "user", "file", "summary_text", "summary_file",
            "format", "is_audio_generated", "created_at"
        ]
        read_only_fields = ["id", "user", "is_audio_generated", "created_at"]

    def create(self, validated_data):
        validated_data["user"] = self.context["request"].user
        return super().create(validated_data)


# files/serializers.py

from rest_framework import serializers
from .models import Audio, File

class TextToSpeechSerializer(serializers.Serializer):
    text = serializers.CharField(required=False, allow_blank=True)
    file_id = serializers.IntegerField(required=False)
    voice = serializers.ChoiceField(
        choices=[
            'alloy', 'ash', 'ballad', 'coral', 'echo', 
            'fable', 'nova', 'onyx', 'sage', 'shimmer', 'verse'
        ]
    )
    speed = serializers.FloatField(min_value=0.5, max_value=2.0, default=1.0)

    def validate(self, data):
        text = data.get("text")
        file_id = data.get("file_id")

        if not text and not file_id:
            raise serializers.ValidationError("Provide either text or a file to convert.")
        return data


from rest_framework import serializers
from .models import Audio, SharedAudio

class AudioSerializer(serializers.ModelSerializer):
    class Meta:
        model = Audio
        fields = [
            "id", "user", "file", "text_input", "audio",
            "source_type", "voice", "speed", "language", "duration", "created_at"
        ]
        read_only_fields = fields

class SharedAudioSerializer(serializers.ModelSerializer):
    class Meta:
        model = SharedAudio
        fields = [
            "id", "audio", "shared_by", "shared_with",
            "status", "note", "shared_at", "responded_at"
        ]
        read_only_fields = ["shared_by", "shared_at", "responded_at", "status"]
