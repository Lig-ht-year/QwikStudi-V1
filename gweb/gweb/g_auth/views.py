import logging
import re

from django.conf import settings
from django.contrib.auth.models import User, update_last_login
from django.utils.crypto import get_random_string
from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .serializers import (
    CustomTokenObtainPairSerializer,
    CustomTokenRefreshSerializer,
    RegisterSerializer,
    UserSerializer,
)

logger = logging.getLogger(__name__)

class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        try:
            if serializer.is_valid():
                user = serializer.save()
                refresh = RefreshToken.for_user(user)
                return Response({
                    'user': serializer.data,
                    'refresh': str(refresh),
                    'access': str(refresh.access_token),
                }, status=status.HTTP_201_CREATED)
            # Validation failed -- reformat for frontend clarity
            errors = serializer.errors
            error_messages = []
            for field, msgs in errors.items():
                txt = f"{field}: {' '.join(msgs) if isinstance(msgs, list) else msgs}"
                error_messages.append(txt)
            top_error = ". ".join(error_messages)
            return Response({'error': top_error, 'details': errors}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as exc:
            return Response({'error': f"Unexpected error: {str(exc)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


def _normalize_username_seed(value: str) -> str:
    seed = (value or "").strip().replace(" ", ".")
    seed = re.sub(r"[^A-Za-z0-9._-]", "", seed)
    seed = re.sub(r"[._-]{2,}", ".", seed).strip("._-")
    return seed[:150]


def _build_unique_username(email: str, full_name: str) -> str:
    local_part = (email or "").split("@", 1)[0]
    seeds = [
        _normalize_username_seed(full_name),
        _normalize_username_seed(local_part),
        "google.user",
    ]
    base = next((seed for seed in seeds if seed), "google.user")
    username = base[:150]

    while User.objects.filter(username=username).exists():
        suffix = get_random_string(5).lower()
        prefix = base[: max(1, 150 - len(suffix) - 1)]
        username = f"{prefix}.{suffix}"
    return username

class UserProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        return Response({
            "username": user.username,
            "email": user.email,
            "last_login": user.last_login,
            "date_joined": user.date_joined,
        })



class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)

class CustomTokenRefreshView(TokenRefreshView):
    serializer_class = CustomTokenRefreshSerializer


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        return Response(serializer.validated_data)


class GoogleAuthView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        id_token_value = str(
            request.data.get("id_token")
            or request.data.get("credential")
            or ""
        ).strip()
        if not id_token_value:
            return Response({"error": "Google credential is required."}, status=400)

        client_id = str(getattr(settings, "GOOGLE_WEB_CLIENT_ID", "") or "").strip()
        if not client_id:
            logger.error("GOOGLE_WEB_CLIENT_ID is not configured.")
            return Response({"error": "Google authentication is not configured."}, status=500)

        try:
            from google.auth.transport import requests as google_requests
            from google.oauth2 import id_token as google_id_token

            token_info = google_id_token.verify_oauth2_token(
                id_token_value,
                google_requests.Request(),
                client_id,
            )
        except ImportError:
            logger.error("google-auth dependency is not installed.")
            return Response({"error": "Google authentication is not available."}, status=500)
        except Exception as exc:
            logger.warning("Google token verification failed: %s", exc)
            return Response({"error": "Invalid Google credential."}, status=400)

        issuer = str(token_info.get("iss", ""))
        if issuer not in {"accounts.google.com", "https://accounts.google.com"}:
            return Response({"error": "Invalid Google token issuer."}, status=400)

        if not token_info.get("email_verified"):
            return Response({"error": "Google email is not verified."}, status=400)

        email = str(token_info.get("email", "")).strip().lower()
        if not email:
            return Response({"error": "Google account email is missing."}, status=400)

        matching_users = list(User.objects.filter(email__iexact=email).order_by("id"))
        if len(matching_users) > 1:
            logger.error("Duplicate active email detected during Google auth for: %s", email)
            return Response(
                {"error": "Multiple accounts found for this email. Please contact support."},
                status=409,
            )

        full_name = str(token_info.get("name") or "").strip()
        if matching_users:
            user = matching_users[0]
        else:
            username = _build_unique_username(email, full_name)
            user = User.objects.create_user(
                username=username,
                email=email,
                password=get_random_string(32),
            )

        if full_name and not user.first_name and not user.last_name:
            parts = full_name.split()
            user.first_name = parts[0]
            user.last_name = " ".join(parts[1:]) if len(parts) > 1 else ""
            user.save(update_fields=["first_name", "last_name"])

        refresh = RefreshToken.for_user(user)
        update_last_login(None, user)
        return Response(
            {
                "access": str(refresh.access_token),
                "refresh": str(refresh),
                "user": {
                    "id": user.id,
                    "username": user.username,
                    "email": user.email,
                },
            },
            status=200,
        )

class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        # Tokens are managed client-side (e.g., localStorage)
        return Response({'detail': 'Logged out successfully.'}, status=status.HTTP_200_OK)
