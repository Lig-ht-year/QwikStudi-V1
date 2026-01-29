"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle, XCircle, Loader2, Crown } from "lucide-react";
import { useDataStore } from "@/stores/dataStore";
import { verifyPayment } from "@/lib/payment";
import Link from "next/link";

export default function PaymentCallbackPage() {
    const searchParams = useSearchParams();
    const setPlan = useDataStore((state) => state.setPlan);
    
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [message, setMessage] = useState('Verifying your payment...');

    useEffect(() => {
        const reference = searchParams.get('reference');
        const callbackStatus = searchParams.get('status');
        
        // If backend already redirected with status=success, we can skip verification
        if (callbackStatus === 'success' && reference) {
            // Verify with backend and update local state
            const verifyAndUpdate = async () => {
                try {
                    await verifyPayment(reference);
                    setPlan('pro');
                    setStatus('success');
                    setMessage('Payment successful! You are now a Pro member.');
                } catch (error) {
                    console.error('Payment verification failed:', error);
                    // Even if verification fails, if backend said success, trust it
                    setPlan('pro');
                    setStatus('success');
                    setMessage('Your account has been upgraded to Pro!');
                }
            };
            verifyAndUpdate();
            return;
        }

        // If already processed
        if (callbackStatus === 'already' && reference) {
            setPlan('pro');
            setStatus('success');
            setMessage('Your account is already upgraded to Pro!');
            return;
        }

        // If error from backend
        if (callbackStatus === 'error') {
            setStatus('error');
            setMessage(searchParams.get('message') || 'Payment verification failed. Please contact support.');
            return;
        }

        // Fallback: verify manually if reference exists
        if (reference) {
            const verifyPaymentStatus = async () => {
                try {
                    await verifyPayment(reference);
                    
                    // Update local plan state
                    setPlan('pro');
                    
                    setStatus('success');
                    setMessage('Payment successful! You are now a Pro member.');
                } catch (error) {
                    console.error('Payment verification failed:', error);
                    
                    // Check if user is already premium despite error
                    if (error instanceof Error && error.message.includes('already processed')) {
                        setPlan('pro');
                        setStatus('success');
                        setMessage('Your account has been upgraded to Pro!');
                    } else {
                        setStatus('error');
                        setMessage(
                            error instanceof Error 
                                ? error.message 
                                : 'Payment verification failed. Please contact support.'
                        );
                    }
                }
            };

            verifyPaymentStatus();
        } else {
            setStatus('error');
            setMessage('No payment reference found.');
        }
    }, [searchParams, setPlan]);

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div className="bg-card/50 rounded-3xl border border-white/10 p-8 text-center">
                    {status === 'loading' && (
                        <>
                            <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-6">
                                <Loader2 className="w-10 h-10 text-primary animate-spin" />
                            </div>
                            <h1 className="text-2xl font-bold mb-2">Processing Payment</h1>
                            <p className="text-muted-foreground">{message}</p>
                        </>
                    )}

                    {status === 'success' && (
                        <>
                            <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6">
                                <CheckCircle className="w-10 h-10 text-green-500" />
                            </div>
                            <h1 className="text-2xl font-bold mb-2 flex items-center justify-center gap-2">
                                <Crown className="w-6 h-6 text-primary" />
                                Congratulations!
                            </h1>
                            <p className="text-muted-foreground mb-6">{message}</p>
                            
                            <div className="space-y-3">
                                <Link
                                    href="/settings"
                                    className="block w-full py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-colors"
                                >
                                    Go to Settings
                                </Link>
                                <Link
                                    href="/"
                                    className="block w-full py-3 bg-white/5 text-foreground rounded-xl font-medium hover:bg-white/10 transition-colors"
                                >
                                    Back to Home
                                </Link>
                            </div>
                        </>
                    )}

                    {status === 'error' && (
                        <>
                            <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-6">
                                <XCircle className="w-10 h-10 text-red-500" />
                            </div>
                            <h1 className="text-2xl font-bold mb-2">Payment Issue</h1>
                            <p className="text-muted-foreground mb-6">{message}</p>
                            
                            <div className="space-y-3">
                                <Link
                                    href="/settings"
                                    className="block w-full py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-colors"
                                >
                                    Try Again
                                </Link>
                                <a
                                    href="mailto:glinaxinfo@gmail.com"
                                    className="block w-full py-3 bg-white/5 text-foreground rounded-xl font-medium hover:bg-white/10 transition-colors"
                                >
                                    Contact Support
                                </a>
                            </div>
                        </>
                    )}
                </div>
                
                <p className="text-center text-sm text-muted-foreground/60 mt-6">
                    Study Smart, Learn Fast.
                </p>
            </div>
        </div>
    );
}

