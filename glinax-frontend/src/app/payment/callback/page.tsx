import React, { Suspense } from "react";
import PaymentCallbackClient from "./PaymentCallbackClient";

function PaymentCallbackFallback() {
    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div className="bg-card/50 rounded-3xl border border-white/10 p-8 text-center">
                    <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-6">
                        <div className="w-10 h-10 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
                    </div>
                    <h1 className="text-2xl font-bold mb-2">Processing Payment</h1>
                    <p className="text-muted-foreground">Verifying your payment...</p>
                </div>
            </div>
        </div>
    );
}

export default function PaymentCallbackPage() {
    return (
        <Suspense fallback={<PaymentCallbackFallback />}>
            <PaymentCallbackClient />
        </Suspense>
    );
}
