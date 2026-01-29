#files/urls.py
from django.urls import path
from .views import (
    GenerateQuestionsAPIView, ListGeneratedQuestionsAPIView, FileSummaryAPIView,
    GenerateAudioAPIView,QuickGenerateAudioAPIView, ListAudioAPIView, DeleteAudioAPIView, ShareAudioAPIView,
    RespondSharedAudioAPIView, ListSharedAudioAPIView,
    FileUploadAPIView, ScoreQuestionsAPIView, DeleteGeneratedQuestionAPIView,
    TranscribeAPIView,
)

urlpatterns = [
    path('questions/generate/', GenerateQuestionsAPIView.as_view(), name='generate-questions'),
    path('files/upload/', FileUploadAPIView.as_view(), name='file-upload'),
    path('questions/', ListGeneratedQuestionsAPIView.as_view(), name='list-questions'),
    path("questions/score/", ScoreQuestionsAPIView.as_view(), name="score-questions"),
    path("questions/<int:pk>/delete/", DeleteGeneratedQuestionAPIView.as_view(), name="delete-question"),
    path("summary/", FileSummaryAPIView.as_view(), name="file-summary"),
    path("audio/generate/", GenerateAudioAPIView.as_view(), name="generate-audio"),
    path("quick-generate-audio/", QuickGenerateAudioAPIView.as_view(), name="quick-generate-audio"),
    path("audio/", ListAudioAPIView.as_view(), name="list-audio"),
    path("audio/<int:audio_id>/delete/", DeleteAudioAPIView.as_view(), name="delete-audio"),
    path('audio/<int:audio_id>/share/', ShareAudioAPIView.as_view(), name='share-audio'),
    path('audio/shared/<int:share_id>/respond/', RespondSharedAudioAPIView.as_view(), name='respond-shared-audio'),
    path('audio/shared/', ListSharedAudioAPIView.as_view(), name='list-shared-audio'),
    path('transcribe/', TranscribeAPIView.as_view(), name='transcribe'),
]

