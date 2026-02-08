from django.shortcuts import render, redirect
from django.conf import settings
import requests
from django.contrib.auth.decorators import login_required
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse, HttpResponseBadRequest
from .models import UserPayment, UserProfile
from django.utils import timezone
from django.contrib.auth.models import User
import hashlib
import hmac
import json
from django.db import transaction
import logging
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from datetime import timedelta
from uuid import uuid4

logger = logging.getLogger(__name__)

# Frontend callback URL for payment completion
FRONTEND_CALLBACK_URL = getattr(settings, 'FRONTEND_CALLBACK_URL', 'http://localhost:3000/payment/callback')

# ========== PAYMENT VIEWS ==========

def _extend_premium(user, paid_date):
    profile, _ = UserProfile.objects.get_or_create(user=user)
    today = paid_date
    if profile.premium_expiry and profile.premium_expiry >= today:
        profile.premium_expiry = profile.premium_expiry + timedelta(days=30)
    else:
        profile.premium_expiry = today + timedelta(days=30)
    profile.is_premium = True
    profile.save()
    return profile

def _initiate_paystack(user, reference):
    return requests.post(
        "https://api.paystack.co/transaction/initialize",
        headers={
            "Authorization": f"Bearer {settings.PAYSTACK_SECRET_KEY}",
            "Content-Type": "application/json",
        },
        json={
            "email": user.email,
            "amount": "3000",  # 30.00 GHS
            "currency": "GHS",
            "reference": reference,
            "callback_url": settings.FRONTEND_CALLBACK_URL,
            "metadata": {
                "user_id": user.id,
                "custom_fields": [{
                    "display_name": "Payment For",
                    "variable_name": "payment_for",
                    "value": "Premium Upgrade"
                }]
            }
        },
        timeout=10
    )

@login_required
def initiate_payment(request):
    """Session-based initiation (used by server-side only)."""
    return initiate_payment_api(request)

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def initiate_payment_api(request):
    """API-friendly payment initiation using token auth (no CSRF)."""
    try:
        profile = UserProfile.objects.filter(user=request.user).first()
        if profile and profile.is_premium and profile.premium_expiry and profile.premium_expiry >= timezone.now().date():
            return JsonResponse({"error": "You already have a premium account"}, status=400)

        reference = f"pay_{uuid4().hex}"
        UserPayment.objects.create(
            user=request.user,
            paystack_reference=reference,
            amount=30.00,
            currency="GHS",
            status="pending",
        )

        response = _initiate_paystack(request.user, reference)

        if response.status_code == 200:
            return JsonResponse({
                "authorization_url": response.json()['data']['authorization_url'],
                "reference": reference,
            })
        else:
            error_data = response.json()
            logger.error(f"Paystack error: {error_data.get('message')}")
            UserPayment.objects.filter(paystack_reference=reference).update(status="failed")
            return JsonResponse({"error": error_data.get('message', 'Payment failed')}, status=400)
    except requests.exceptions.RequestException as e:
        logger.error(f"Payment initiation failed: {str(e)}")
        return JsonResponse({"error": "Payment service unavailable. Please try again later."}, status=503)

@login_required
@transaction.atomic
def verify_payment(request):
    """Transaction-protected payment verification with frontend redirect"""
    reference = request.GET.get('reference')
    if not reference:
        return redirect(f"{FRONTEND_CALLBACK_URL}?status=error&message=Missing reference")

    existing = UserPayment.objects.filter(paystack_reference=reference).first()
    if existing and existing.status == "success":
        return redirect(f"{FRONTEND_CALLBACK_URL}?reference={reference}&status=already")
    
    try:
        response = requests.get(
            f"https://api.paystack.co/transaction/verify/{reference}",
            headers={"Authorization": f"Bearer {settings.PAYSTACK_SECRET_KEY}"},
            timeout=10
        )

        if response.status_code == 200:
            data = response.json()
            if data['data']['status'] == 'success':
                UserPayment.objects.update_or_create(
                    paystack_reference=reference,
                    defaults={
                        "user": request.user,
                        "amount": data['data']['amount'] / 100,
                        "currency": data['data']['currency'],
                        "payment_method": data['data']['channel'],
                        "status": "success",
                        "completed_at": timezone.now(),
                        "raw_response": data,
                    },
                )
                _extend_premium(request.user, timezone.now().date())
                return redirect(f"{FRONTEND_CALLBACK_URL}?reference={reference}&status=success")

    except requests.exceptions.RequestException as e:
        logger.error(f"Payment verification failed: {str(e)}")

    return redirect(f"{FRONTEND_CALLBACK_URL}?status=error&message=Payment verification failed")

@csrf_exempt
def paystack_webhook(request):
    """Secure webhook handler with duplicate check"""
    if request.method != 'POST':
        return JsonResponse({"status": "failed"}, status=400)

    paystack_signature = request.headers.get('x-paystack-signature')
    if not paystack_signature:
        return JsonResponse({"status": "missing signature"}, status=403)
    
    body = request.body.decode('utf-8')
    computed_signature = hmac.new(
        settings.PAYSTACK_SECRET_KEY.encode('utf-8'),
        body.encode('utf-8'),
        digestmod=hashlib.sha512
    ).hexdigest()
    
    if not hmac.compare_digest(computed_signature, paystack_signature):
        return JsonResponse({"status": "invalid signature"}, status=403)
    
    try:
        payload = json.loads(body)
        if payload.get('event') == 'charge.success':
            data = payload['data']
            reference = data['reference']

            if not UserPayment.objects.filter(paystack_reference=reference).exists():
                with transaction.atomic():
                    user = User.objects.get(id=data['metadata']['user_id'])
                    UserPayment.objects.update_or_create(
                        paystack_reference=reference,
                        defaults={
                            "user": user,
                            "amount": data['amount'] / 100,
                            "currency": data['currency'],
                            "payment_method": data['channel'],
                            "status": "success",
                            "completed_at": timezone.now(),
                            "raw_response": payload,
                        },
                    )
                    _extend_premium(user, timezone.now().date())
    except Exception as e:
        logger.error(f"Webhook processing failed: {e}")
        return JsonResponse({"status": "failed"}, status=400)

    return JsonResponse({"status": "success"})

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def payment_status(request):
    reference = request.query_params.get("reference")
    today = timezone.now().date()

    profile = UserProfile.objects.filter(user=request.user).first()
    if profile and profile.premium_expiry and profile.premium_expiry < today:
        profile.is_premium = False
        profile.save()

    if reference:
        payment = UserPayment.objects.filter(user=request.user, paystack_reference=reference).first()
        if not payment:
            return JsonResponse({"error": "Payment reference not found"}, status=404)
        return JsonResponse({
            "status": payment.status,
            "is_premium": bool(profile and profile.is_premium and profile.premium_expiry and profile.premium_expiry >= today),
            "premium_expiry": profile.premium_expiry.isoformat() if profile and profile.premium_expiry else None,
        })

    return JsonResponse({
        "status": "ok",
        "is_premium": bool(profile and profile.is_premium and profile.premium_expiry and profile.premium_expiry >= today),
        "premium_expiry": profile.premium_expiry.isoformat() if profile and profile.premium_expiry else None,
    })

# ========== USAGE TRACKING ==========

@login_required
def generate_question(request):
    """Improved usage tracking with rate limiting and clear error messages"""
    profile = request.user.userprofile
    question_type = request.GET.get('type', 'mcq').lower()

    app_logger = logging.getLogger('django')

    # Block premium types first for free users
    if not profile.is_premium and question_type in ['theory', 'true_false', 'fill_in']:
        app_logger.info(f"User {getattr(profile, 'user_id', 'unknown')} attempted premium question type '{question_type}' without premium.")
        return JsonResponse(
            {'error': 'This question type requires a premium subscription.'},
            status=403
        )

    # Then enforce usage limits for free users
    if not profile.is_premium and profile.questions_generated >= 20:
        app_logger.info(f"User {getattr(profile, 'user_id', 'unknown')} hit free question generation limit.")
    return JsonResponse(
            {'error': 'You have reached your free question limit. Upgrade to premium to continue.'},
            status=429
        )

    # Generate question (placeholder)
    question = f"Sample {question_type} question."

    # Only update usage counter for free users and successful generate
    if not profile.is_premium:
        profile.questions_generated += 1
        profile.save()

    return JsonResponse({'question': question})

@login_required
def generate_audio(request):
    """Audio generation with usage tracking"""
    profile = request.user.userprofile
    
    try:
        minutes = min(float(request.GET.get('minutes', 1.0)), 30)
    except ValueError:
        return JsonResponse({'error': 'Invalid minutes value'}, status=400)

    if not profile.is_premium:
        if profile.audio_minutes_used + minutes > 10:
            return JsonResponse(
                {'error': 'Free audio limit reached. Upgrade to premium.'},
                status=429
            )
    audio_url = "https://example.com/audio/output.mp3"

    if not profile.is_premium:
        profile.audio_minutes_used += minutes
        profile.save()

    return JsonResponse({'audio_url': audio_url})

def reset_usage():
    """Optimized monthly reset using bulk update"""
    UserProfile.objects.filter(is_premium=False).update(
        questions_generated=0,
        audio_minutes_used=0,
        image_actions=0
    )

# Added the following line as suggested for integrating react-paystack (npm dependency)
# npm install react-paystack
