from django.db import models
from django.contrib.auth.models import User
# Create your models here.


class UserPayment(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('success', 'Success'),
        ('failed', 'Failed'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='payments_profiles')
    paystack_reference = models.CharField(max_length=100, unique=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    raw_response = models.JSONField(null=True, blank=True)  # store full Paystack webhook response

    def __str__(self):
        return f"{self.user.username} - {self.status} - {self.amount:.2f} GHS"

class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    is_premium = models.BooleanField(default=False)
    premium_expiry = models.DateField(null=True, blank=True)
    questions_generated = models.IntegerField(default=0)
    audio_minutes_used = models.FloatField(default=0.0)
    image_actions = models.IntegerField(default=0)

    def __str__(self):
        return f"{self.user.username}'s Profile"