const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

/**
 * Payment API utilities for Paystack integration
 */

export type BillingPlan = 'monthly' | 'annual';

/**
 * Initiate a payment with Paystack
 * @param plan - Selected billing plan
 * @returns The authorization URL to redirect the user to
 */
export async function initiatePayment(plan: BillingPlan = 'monthly'): Promise<{ authorization_url: string; reference: string }> {
    const access = localStorage.getItem('access');
    
    if (!access) {
        throw new Error('You must be logged in to upgrade');
    }

    const response = await fetch(`${API_URL}/payment/initiate/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${access}`,
        },
        body: JSON.stringify({ plan }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to initiate payment');
    }

    const data = await response.json();
    return {
        authorization_url: data.authorization_url,
        reference: data.reference,
    };
}

/**
 * Verify a payment by reference
 * @param reference - The payment reference from Paystack
 * @returns The payment status and data
 */
export async function verifyPayment(reference: string): Promise<{ success: boolean; message: string }> {
    const access = localStorage.getItem('access');
    
    if (!access) {
        throw new Error('You must be logged in to verify payment');
    }

    const response = await fetch(`${API_URL.replace(/\/api\/?$/, '')}/payment/verify/?reference=${reference}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${access}`,
        },
        redirect: 'manual', // Don't follow redirects automatically
    });

    // Handle redirects from backend
    if (response.status === 0 || response.status > 300) {
        // Check if we were redirected to the frontend callback
        const redirectUrl = response.headers.get('location');
        if (redirectUrl) {
            if (redirectUrl.includes('status=success') || redirectUrl.includes('status=already')) {
                return {
                    success: true,
                    message: 'Payment verified successfully',
                };
            }
            throw new Error('Payment verification failed');
        }
        throw new Error('Failed to verify payment');
    }

    // If we get here with a successful response, parse the JSON
    try {
        const data = await response.json();
        return {
            success: true,
            message: data.message || 'Payment verified successfully',
        };
    } catch {
        return {
            success: true,
            message: 'Payment verified successfully',
        };
    }
}

export async function getPaymentStatus(reference?: string): Promise<{ status: string; is_premium: boolean; premium_expiry: string | null }> {
    const access = localStorage.getItem('access');
    if (!access) {
        throw new Error('You must be logged in to check payment status');
    }
    const url = reference ? `${API_URL}/payment/status/?reference=${reference}` : `${API_URL}/payment/status/`;
    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${access}`,
        },
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to check payment status');
    }
    return await response.json();
}

/**
 * Check if the current user has premium status
 * @returns Whether the user has premium status
 */
export async function checkPremiumStatus(): Promise<boolean> {
    const access = localStorage.getItem('access');
    
    if (!access) {
        return false;
    }

    try {
        const response = await fetch(`${API_URL}/payment/status/`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${access}`,
            },
        });

        if (!response.ok) {
            return false;
        }

        const data = await response.json();
        return !!data.is_premium;
    } catch {
        return false;
    }
}
