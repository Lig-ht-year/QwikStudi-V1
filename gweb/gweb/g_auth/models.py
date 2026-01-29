from django.db import models
from django.contrib.auth.models import User
from django.db import models
from django.contrib.auth.models import User
from django.contrib.postgres.fields import JSONField  # if using PostgreSQL


class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='auth_profile')
    has_paid = models.BooleanField(default=False)
    payment_date = models.DateTimeField(null=True, blank=True)
    paystack_customer_id = models.CharField(max_length=100, null=True, blank=True)
    profile_image = models.ImageField(upload_to='profiles/', null=True, blank=True)
    bio = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.user.username

# g_auth/models.py
import uuid

class GuestChatTracker(models.Model):
    guest_id = models.UUIDField(unique=True, default=uuid.uuid4)
    count = models.PositiveIntegerField(default=1)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Guest {self.guest_id} - {self.count} chats"


class GuestIPTracker(models.Model):
    ip_address = models.GenericIPAddressField(unique=True)
    count = models.PositiveIntegerField(default=1)
    last_seen = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.ip_address} - {self.count} chats"
