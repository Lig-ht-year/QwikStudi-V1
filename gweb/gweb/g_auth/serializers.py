import logging
from django.contrib.auth import authenticate
from django.contrib.auth.models import User, update_last_login
from rest_framework import serializers
from rest_framework import serializers as drf_serializers
from rest_framework_simplejwt.exceptions import InvalidToken
from rest_framework_simplejwt.serializers import (
    TokenObtainPairSerializer,
    TokenRefreshSerializer,
)
from rest_framework_simplejwt.tokens import RefreshToken

logger = logging.getLogger(__name__)
class CustomTokenRefreshSerializer(TokenRefreshSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)

        # Decode refresh token to get user ID
        try:
            refresh = RefreshToken(attrs['refresh'])
            user_id = refresh['user_id']
            user = User.objects.get(id=user_id)
        except Exception:
            raise InvalidToken('Invalid refresh token.')

        # Attach user info to response
        data['user'] = UserSerializer(user).data
        return data


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'last_login']


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    email = drf_serializers.EmailField(required=False, allow_blank=True)

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Allow frontend to authenticate with email + password only.
        if self.username_field in self.fields:
            self.fields[self.username_field].required = False

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['username'] = user.username
        return token

    def validate(self, attrs):
        username = attrs.get("username")
        email = attrs.get("email")
        password = attrs.get("password")

        def resolve_username_from_email(raw_email: str) -> str | None:
            candidates = list(
                User.objects.filter(email__iexact=raw_email, is_active=True).order_by("id")
            )
            if not candidates:
                return None
            if len(candidates) > 1:
                logger.error("Duplicate active email detected during login for: %s", raw_email)
                raise drf_serializers.ValidationError(
                    "Multiple accounts found for this email. Please contact support."
                )
            return candidates[0].username

        if email and not username:
            resolved_username = resolve_username_from_email(email)
            if not resolved_username:
                raise drf_serializers.ValidationError("Invalid email or password.")
            attrs["username"] = resolved_username
        elif username and "@" in username:
            resolved_username = resolve_username_from_email(username)
            if resolved_username:
                attrs["username"] = resolved_username

        if not attrs.get("username"):
            raise drf_serializers.ValidationError("Email or username is required.")
        if not password:
            raise drf_serializers.ValidationError("Password is required.")

        data = super().validate(attrs)

        # Ensure self.user is set and update last_login
        if hasattr(self, "user") and self.user:
            update_last_login(None, self.user)
            data["user"] = {
                "id": self.user.id,
                "username": self.user.username,
                "email": self.user.email,
            }
        else:
            # Fallback to authenticate if needed
            user = authenticate(username=attrs.get("username"), password=password)
            if not user:
                raise drf_serializers.ValidationError("Invalid email or password.")
            data["user"] = {
                "id": user.id,
                "username": user.username,
                "email": user.email,
            }

        return data

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6)

    class Meta:
        model = User
        fields = ['username', 'email', 'password']

    def validate_email(self, value):
        email = (value or "").strip().lower()
        if not email:
            raise serializers.ValidationError("Email is required.")
        if User.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError("An account with this email already exists.")
        return email

    def create(self, validated_data):
        user = User.objects.create_user(
            username=(validated_data.get('username') or "").strip(),
            email=(validated_data.get('email') or "").strip().lower(),
            password=validated_data['password']
        )
        return user
