from rest_framework import serializers
from django.contrib.auth.models import User
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.serializers import TokenRefreshSerializer
from rest_framework_simplejwt.settings import api_settings
from rest_framework import serializers
from django.contrib.auth.models import User
from rest_framework_simplejwt.tokens import RefreshToken, AccessToken
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError

from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth.models import update_last_login
from django.contrib.auth import authenticate
from rest_framework import serializers as drf_serializers
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

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['username'] = user.username
        return token

    def validate(self, attrs):
        username = attrs.get("username")
        password = attrs.get("password")
        email = attrs.get("email")

        # Allow login by email
        if email and not username:
            user = User.objects.filter(email__iexact=email).first()
            if not user:
                raise drf_serializers.ValidationError("Invalid email or password.")
            username = user.username
            attrs["username"] = username
        elif username and "@" in username:
            user = User.objects.filter(email__iexact=username).first()
            if user:
                attrs["username"] = user.username

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

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data.get('email'),
            password=validated_data['password']
        )
        return user
