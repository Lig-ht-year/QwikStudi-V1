"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
    Mail,
    ArrowRight,
    ArrowLeft,
    CheckCircle2,
    KeyRound
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        // Backend team will implement actual password reset
        setTimeout(() => {
            setIsLoading(false);
            setIsSubmitted(true);
        }, 1500);
    };

    const handleResend = () => {
        setIsLoading(true);
        setTimeout(() => {
            setIsLoading(false);
        }, 1500);
    };

    return (
        <div className="min-h-screen bg-background flex">
            {/* Left Panel - Branding */}
            <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary/20 via-background to-background p-12 flex-col justify-between relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(59,130,246,0.15),transparent_50%)]" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(59,130,246,0.1),transparent_50%)]" />

                {/* Gradient blur edge - seamless transition */}
                <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-r from-transparent via-background/50 to-background pointer-events-none z-20" />

                <div className="relative z-10">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl overflow-hidden">
                            <img src="/logo.jpeg" alt="QwikStudi" className="w-full h-full object-cover" />
                        </div>
                        <span className="text-2xl font-bold tracking-tight">QwikStudi</span>
                    </div>
                </div>

                <div className="relative z-10 space-y-6">
                    <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center">
                        <KeyRound className="w-10 h-10 text-primary" />
                    </div>
                    <h1 className="text-5xl font-bold tracking-tight leading-tight">
                        Reset your<br />
                        <span className="text-primary">password.</span>
                    </h1>
                </div>

                <div className="relative z-10 text-xs text-muted-foreground">
                    © {new Date().getFullYear()} QwikStudi. All rights reserved.
                </div>
            </div>

            {/* Right Panel - Form */}
            <div className="flex-1 flex items-center justify-center p-8">
                <div className="w-full max-w-md space-y-8">
                    {/* Mobile Logo */}
                    <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
                        <div className="w-10 h-10 rounded-xl overflow-hidden">
                            <img src="/logo.jpeg" alt="QwikStudi" className="w-full h-full object-cover" />
                        </div>
                        <span className="text-xl font-bold tracking-tight">QwikStudi</span>
                    </div>

                    {!isSubmitted ? (
                        <>
                            <div className="space-y-2 text-center lg:text-left">
                                <h2 className="text-3xl font-bold tracking-tight">Reset password</h2>
                                <p className="text-muted-foreground">
                                    Enter your email address and we'll send you a link to reset your password.
                                </p>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-6">
                                {/* Email */}
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Email address</label>
                                    <div className="relative">
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="you@example.com"
                                            className="w-full pl-12 pr-4 py-3.5 bg-secondary/50 border border-border rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                                            required
                                        />
                                    </div>
                                </div>

                                {/* Submit */}
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className={cn(
                                        "px-8 py-3 bg-primary text-primary-foreground rounded-xl font-semibold flex items-center justify-center gap-2 transition-all mx-auto lg:mx-0",
                                        isLoading ? "opacity-70 cursor-not-allowed" : "hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/20"
                                    )}
                                >
                                    {isLoading ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            Send Reset Link
                                            <ArrowRight className="w-4 h-4" />
                                        </>
                                    )}
                                </button>
                            </form>
                        </>
                    ) : (
                        <div className="space-y-6 text-center lg:text-left">
                            {/* Success Icon */}
                            <div className="flex justify-center lg:justify-start">
                                <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center">
                                    <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <h2 className="text-3xl font-bold tracking-tight">Check your inbox</h2>
                                <p className="text-muted-foreground">
                                    We've sent a password reset link to{" "}
                                    <span className="font-medium text-foreground">{email}</span>
                                </p>
                            </div>

                            <div className="p-4 bg-secondary/50 rounded-2xl border border-border">
                                <p className="text-sm text-muted-foreground">
                                    Didn't receive the email? Check your spam folder, or{" "}
                                    <button
                                        onClick={handleResend}
                                        disabled={isLoading}
                                        className="text-primary font-medium hover:underline disabled:opacity-50"
                                    >
                                        {isLoading ? "Sending..." : "click here to resend"}
                                    </button>
                                </p>
                            </div>

                            <button
                                onClick={() => {
                                    setIsSubmitted(false);
                                    setEmail("");
                                }}
                                className="text-sm text-primary font-medium hover:underline"
                            >
                                Try a different email
                            </button>
                        </div>
                    )}

                    {/* Back to Login */}
                    <div className="flex items-center justify-center">
                        <Link
                            href="/login"
                            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group"
                        >
                            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                            Back to login
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
