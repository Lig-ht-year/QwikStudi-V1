# Subscription/Paystack Integration TODO

## Tasks
- [x] 1. Create API utility for payment endpoints (`src/lib/payment.ts`)
- [x] 2. Modify UpgradeModal in settings/page.tsx to integrate Paystack payment flow
- [x] 3. Create payment callback page (`/payment/callback/page.tsx`)
- [x] 4. Update backend verify_payment to redirect to frontend
- [x] 5. Add FRONTEND_CALLBACK_URL setting to Django settings

## Implementation Details

### Backend Endpoints (already exist in gweb):
- POST `/payment/initiate/` - Initiates Paystack payment, returns authorization_url
- GET `/payment/verify/?reference=xxx` - Verifies payment and redirects to frontend callback
- POST `/payment/webhook/` - Paystack webhook for payment confirmation

### Frontend Changes:
1. Created `src/lib/payment.ts` API utility with:
   - `initiatePayment()` - Calls backend to initiate payment
   - `verifyPayment()` - Verifies payment status
   - `checkPremiumStatus()` - Checks if user has premium status

2. Updated `UpgradeModal` in `settings/page.tsx`:
   - Calls `/payment/initiate/` API on subscribe click
   - Redirects to Paystack authorization_url
   - Shows loading spinner during payment initiation

3. Created `/payment/callback/page.tsx`:
   - Handles return from Paystack after payment
   - Shows success/error state
   - Updates local plan state after successful payment

### Payment Flow:
1. User clicks "Subscribe with Paystack" button
2. Frontend calls backend `/payment/initiate/` API
3. Backend calls Paystack API, returns authorization_url
4. Frontend redirects user to Paystack checkout
5. User completes payment on Paystack
6. Paystack redirects user back to `/payment/verify/?reference=xxx`
7. Backend verifies payment, marks user as premium in database
8. Backend redirects to frontend `/payment/callback/?status=success&reference=xxx`
9. Frontend callback page updates local plan state to 'pro'
10. User sees success message and can access premium features

## Environment Variables Needed

### Backend (.env file):
```
PAYSTACK_SECRET_KEY=your_paystack_secret_key
FRONTEND_CALLBACK_URL=http://localhost:3000/payment/callback
# For production:
# FRONTEND_CALLBACK_URL=https://yourdomain.com/payment/callback
```

### Frontend (.env.local):
```
NEXT_PUBLIC_API_URL=http://localhost:8000
# For production:
# NEXT_PUBLIC_API_URL=https://yourdomain.com
```

## Testing
1. Start the backend server on port 8000
2. Start the frontend dev server on port 3000
3. Go to Settings > Upgrade to Pro
4. Click "Subscribe with Paystack"
5. Complete the payment on Paystack test mode
6. After payment, you should be redirected back to the callback page
7. The page should show success and update your plan to Pro


