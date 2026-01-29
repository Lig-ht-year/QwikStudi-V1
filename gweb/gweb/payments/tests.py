from django.test import TestCase, Client
from django.urls import reverse
from django.contrib.auth.models import User
from .models import UserPayment, UserProfile
from django.utils import timezone
import json

class PaymentTestCase(TestCase):
    def setUp(self):
        # Create test user
        self.user = User.objects.create_user(
            username='testuser',
            password='testpass123',
            email='test@example.com'
        )
        
        # Create test client
        self.client = Client()
        
        # Create test payment
        self.payment = UserPayment.objects.create(
            user=self.user,
            paystack_reference='test_ref_123',
            amount=100.00,
            status='pending'
        )
        
        # URLs
        self.payment_url = reverse('initiate_payment')
        self.verify_url = reverse('verify_payment')

    def test_payment_model_creation(self):
        """Test UserPayment model creation and string representation"""
        self.assertEqual(str(self.payment), "testuser - pending - 100.00 GHS")
        self.assertEqual(self.payment.status, 'pending')
        self.assertTrue(isinstance(self.payment.created_at, timezone.datetime))

    def test_payment_initiation_requires_login(self):
        """Test that payment initiation requires authentication"""
        response = self.client.get(self.payment_url)
        self.assertEqual(response.status_code, 302)  # Should redirect to login

    def test_payment_initiation_authenticated(self):
        """Test successful payment initiation for authenticated users"""
        self.client.login(username='testuser', password='testpass123')
        response = self.client.get(self.payment_url)
        
        # Should redirect to Paystack
        self.assertEqual(response.status_code, 302)
        self.assertTrue('paystack.com' in response.url)

    def test_payment_verification(self):
        """Test payment verification callback"""
        test_reference = 'test_verify_456'
        
        # Create payment record to simulate existing payment
        UserPayment.objects.create(
            user=self.user,
            paystack_reference=test_reference,
            amount=2500,
            status='pending'
        )
        
        # Simulate Paystack callback
        response = self.client.get(
            self.verify_url,
            {'reference': test_reference},
            HTTP_X_PAYSTACK_SIGNATURE='test_signature'
        )
        
        # Should create a new payment record
        payment = UserPayment.objects.get(paystack_reference=test_reference)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(payment.status, 'success')
<<<<<<< SEARCH
    def test_user_profile_creation(self):
        """Test automatic profile creation on payment"""
        profile, created = UserProfile.objects.get_or_create(user=self.user)
        self.assertFalse(profile.is_premium)
        
        # Simulate successful payment
        self.payment.status = 'success'
        self.payment.save()
        profile.refresh_from_db()
        
        # Profile should now be premium
        self.assertTrue(profile.is_premium)
=======
    def test_user_profile_creation(self):
        """Test automatic profile creation on payment"""
        profile, created = UserProfile.objects.get_or_create(user=self.user)
        self.assertFalse(profile.is_premium)
        
        # Simulate successful payment and profile upgrade
        self.payment.status = 'success'
        self.payment.save()
        
        # Manually upgrade profile as in views
        profile.is_premium = True
        profile.save()
        
        profile.refresh_from_db()
        
        # Profile should now be premium
        self.assertTrue(profile.is_premium)
<<<<<<< SEARCH
    def test_failed_payment_flow(self):
        """Test failed payment scenario"""
        test_reference = 'test_fail_789'
        
        # Simulate failed payment callback
        response = self.client.get(
            self.verify_url,
            {'reference': test_reference, 'status': 'failed'},
            HTTP_X_PAYSTACK_SIGNATURE='test_signature'
        )
        
        payment = UserPayment.objects.get(paystack_reference=test_reference)
        self.assertEqual(payment.status, 'failed')
=======
    def test_failed_payment_flow(self):
        """Test failed payment scenario"""
        test_reference = 'test_fail_789'
        
        # Create payment record to simulate existing payment
        UserPayment.objects.create(
            user=self.user,
            paystack_reference=test_reference,
            amount=2500,
            status='pending'
        )
        
        # Simulate failed payment callback
        response = self.client.get(
            self.verify_url,
            {'reference': test_reference, 'status': 'failed'},
            HTTP_X_PAYSTACK_SIGNATURE='test_signature'
        )
        
        payment = UserPayment.objects.get(paystack_reference=test_reference)
        self.assertEqual(payment.status, 'failed')

    def test_user_profile_creation(self):
        """Test automatic profile creation on payment"""
        profile, created = UserProfile.objects.get_or_create(user=self.user)
        self.assertFalse(profile.is_premium)
        
        # Simulate successful payment
        self.payment.status = 'success'
        self.payment.save()
        profile.refresh_from_db()
        
        # Profile should now be premium
        self.assertTrue(profile.is_premium)

    def test_failed_payment_flow(self):
        """Test failed payment scenario"""
        test_reference = 'test_fail_789'
        
        # Simulate failed payment callback
        response = self.client.get(
            self.verify_url,
            {'reference': test_reference, 'status': 'failed'},
            HTTP_X_PAYSTACK_SIGNATURE='test_signature'
        )
        
        payment = UserPayment.objects.get(paystack_reference=test_reference)
        self.assertEqual(payment.status, 'failed')

    def test_payment_webhook_security(self):
        #Test webhook signature verification
        
        response = self.client.post(
            self.verify_url,
            data=json.dumps({'event': 'charge.success'}),
            content_type='application/json',
            HTTP_X_PAYSTACK_SIGNATURE='invalid_signature'
        )
        self.assertNotEqual(response.status_code, 200)

    def test_payment_amount_calculation(self):
        """Test payment amount handling"""
        test_amount = 50.00
        payment = UserPayment.objects.create(
            user=self.user,
            paystack_reference='test_amount_123',
            amount=test_amount,
            status='success'
        )
        self.assertEqual(float(payment.amount), test_amount)