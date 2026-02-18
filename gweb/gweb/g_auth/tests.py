from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework import serializers

from .serializers import CustomTokenObtainPairSerializer, RegisterSerializer


class RegisterSerializerTests(TestCase):
    def test_rejects_case_insensitive_duplicate_email(self):
        User.objects.create_user(username="existing", email="User@Test.com", password="Pass1234")
        serializer = RegisterSerializer(
            data={"username": "newuser", "email": "user@test.com", "password": "Pass1234"}
        )
        self.assertFalse(serializer.is_valid())
        self.assertIn("email", serializer.errors)


class LoginSerializerTests(TestCase):
    def test_allows_email_login_when_unique(self):
        user = User.objects.create_user(
            username="uniqueuser", email="unique@test.com", password="StrongPass123"
        )
        serializer = CustomTokenObtainPairSerializer(
            data={"email": "UNIQUE@test.com", "password": "StrongPass123"}
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)
        self.assertEqual(serializer.validated_data["user"]["id"], user.id)
        self.assertIn("access", serializer.validated_data)
        self.assertIn("refresh", serializer.validated_data)

    def test_rejects_duplicate_active_email(self):
        User.objects.create_user(username="user1", email="dup@test.com", password="StrongPass123")
        User.objects.create_user(username="user2", email="dup@test.com", password="StrongPass456")
        serializer = CustomTokenObtainPairSerializer(
            data={"email": "dup@test.com", "password": "StrongPass123"}
        )
        with self.assertRaises(serializers.ValidationError):
            serializer.is_valid(raise_exception=True)
