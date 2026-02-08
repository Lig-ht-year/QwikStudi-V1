"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle, XCircle, Loader2, Crown } from "lucide-react";
import { useDataStore } from "@/stores/dataStore";
import { getPaymentStatus } from "@/lib/payment";
import Link from "next/link";

export default function PaymentCallbackClient() {
    const searchParams = useSearchParams();
    const setPlan = useDataStore((state) => state.setPlan);

    const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
    const [message, setMessage] = useState("Verifying your payment...");

    useEffect(() => {
        const reference = searchParams.get("reference") || "";
        const callbackStatus = searchParams.get("status");

        if (callbackStatus === "error") {
            setStatus("error");
            setMessage(searchParams.get("message") || "Payment verification failed. Please contact support.");
            return;
        }

        if (!reference) {
            setStatus("error");
            setMessage("No payment reference found.");
            return;
        }

        let active = true;
        let attempts = 0;
        const maxAttempts = 8;

        const poll = async () => {
            attempts += 1;
            try {
                const data = await getPaymentStatus(reference);
                if (!active) return;

                if (data.status === "success" && data.is_premium) {
                    setPlan("pro");
                    setStatus("success");
                    setMessage("Payment successful! You are now a Pro member.");
                    return;
                }

                if (data.status === "failed") {
                    setStatus("error");
                    setMessage("Payment failed. Please try again.");
                    return;
                }
            } catch (error) {
                if (!active) return;
                console.error("Payment status check failed:", error);
            }

            if (attempts < maxAttempts) {
                setTimeout(poll, 2500);
            } else {
                setStatus("error");
                setMessage("We couldn't confirm your payment. Please contact support or try again.");
            }
        };

        poll();
        return () => {
            active = false;
        };
    }, [searchParams, setPlan]);

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div className="bg-card/50 rounded-3xl border border-white/10 p-8 text-center">
                    {status === "loading" && (
                        <>
                            <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-6">
                                <Loader2 className="w-10 h-10 text-primary animate-spin" />
                            </div>
                            <h1 className="text-2xl font-bold mb-2">Processing Payment</h1>
                            <p className="text-muted-foreground">{message}</p>
                        </>
                    )}

                    {status === "success" && (
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

                    {status === "error" && (
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
