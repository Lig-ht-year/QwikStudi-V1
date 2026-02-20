"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
    Mail,
    Lock,
    Eye,
    EyeOff,
    ArrowRight,
    User,
    Check,
    X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useDataStore } from "@/stores/dataStore";
import api from "@/lib/api";
import {
    initializeGoogleSignIn,
    loadGoogleIdentityScript,
    promptGoogleSignIn,
} from "@/lib/googleAuth";

export default function SignupPage() {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isGoogleLoading, setIsGoogleLoading] = useState(false);
    const [agreedToTerms, setAgreedToTerms] = useState(false);
    const [error, setError] = useState("");

    const login = useDataStore((state) => state.login);

    const finalizeAuth = (access: string, refresh: string, username: string) => {
        localStorage.setItem("access", access);
        localStorage.setItem("refresh", refresh);
        login(username);
        window.location.href = "/";
    };

    const passwordChecks = {
        length: password.length >= 8,
        uppercase: /[A-Z]/.test(password),
        lowercase: /[a-z]/.test(password),
        number: /[0-9]/.test(password),
    };

    const isPasswordStrong = Object.values(passwordChecks).every(Boolean);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!agreedToTerms || !isPasswordStrong) return;
        setIsLoading(true);
        setError("");

        try {
            const normalizedEmail = email.trim().toLowerCase();
            const username = name
                .trim()
                .replace(/\s+/g, ".")
                .replace(/[^A-Za-z0-9._-]/g, "")
                .replace(/\.+/g, ".")
                .replace(/^\.|\.$/g, "")
                .slice(0, 150);

            if (!username) {
                setError("Please enter a valid username.");
                setIsLoading(false);
                return;
            }

            // Call Django registration endpoint
            const res = await api.post("/auth/register/", {
                username,
                email: normalizedEmail,
                password,
            });

            const { access, refresh, user } = res.data;
            finalizeAuth(access, refresh, user.username);
        } catch (err: any) {
            console.error("Signup error:", err);
            // Log the full response for debugging
            console.log("Full error response:", err.response?.data);
            const errorMsg = err.response?.data?.error || 
                           err.response?.data?.detail ||
                           err.response?.data?.message ||
                           JSON.stringify(err.response?.data) ||
                           "Registration failed. Please try again.";
            setError(errorMsg);
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleCredential = async (idToken: string) => {
        setIsGoogleLoading(true);
        setError("");
        try {
            const res = await api.post("/auth/google/", { id_token: idToken });
            const { access, refresh, user } = res.data;
            finalizeAuth(access, refresh, user.username);
        } catch (err: any) {
            console.error("Google signup error:", err);
            const errorMsg = err.response?.data?.error || "Google sign-in failed. Please try again.";
            setError(errorMsg);
            setIsGoogleLoading(false);
        }
    };

    const handleGoogleSignIn = async () => {
        const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";
        if (!googleClientId) {
            setError("Google sign-in is not configured.");
            return;
        }

        setIsGoogleLoading(true);
        setError("");
        try {
            await loadGoogleIdentityScript();
            initializeGoogleSignIn(googleClientId, handleGoogleCredential);
            promptGoogleSignIn();
            setIsGoogleLoading(false);
        } catch (err) {
            console.error("Google script error:", err);
            setError("Unable to start Google sign-in. Please try again.");
            setIsGoogleLoading(false);
        }
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

                <div className="relative z-10 space-y-8">
                    <h1 className="text-5xl font-bold tracking-tight leading-tight">
                        Start your<br />
                        <span className="text-primary">learning journey.</span>
                    </h1>

                    <div className="space-y-4">
                        {[
                            "Convert lectures to notes instantly",
                            "Generate quizzes from any material",
                            "Summarize documents in seconds",
                            "Listen to your study materials"
                        ].map((feature, i) => (
                            <div key={i} className="flex items-center gap-3 text-muted-foreground">
                                <div className="w-6 h-6 flex-shrink-0 rounded-full bg-primary/20 flex items-center justify-center">
                                    <Check className="w-3 h-3 text-primary" />
                                </div>
                                <span>{feature}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="relative z-10 text-xs text-muted-foreground">
                    © {new Date().getFullYear()} QwikStudi. All rights reserved.
                </div>
            </div>

            {/* Right Panel - Signup Form */}
            <div className="flex-1 flex items-center justify-center p-8">
                <div className="w-full max-w-md space-y-8">
                    {/* Mobile Logo */}
                    <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
                        <div className="w-10 h-10 rounded-xl overflow-hidden">
                            <img src="/logo.jpeg" alt="QwikStudi" className="w-full h-full object-cover" />
                        </div>
                        <span className="text-xl font-bold tracking-tight">QwikStudi</span>
                    </div>

                    <div className="space-y-2 text-center lg:text-left">
                        <h2 className="text-3xl font-bold tracking-tight">Create account</h2>
                        <p className="text-muted-foreground">
                            Start your journey to smarter learning
                        </p>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Name */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Full Name</label>
                            <div className="relative">
                                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Your full name"
                                    className="w-full pl-10 pr-4 py-2.5 bg-secondary/50 border border-border rounded-full focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-sm"
                                    required
                                />
                            </div>
                        </div>

                        {/* Email */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Email</label>
                            <div className="relative">
                                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="you@example.com"
                                    className="w-full pl-10 pr-4 py-2.5 bg-secondary/50 border border-border rounded-full focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-sm"
                                    required
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full pl-10 pr-10 py-2.5 bg-secondary/50 border border-border rounded-full focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-sm"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>

                            {/* Password Strength */}
                            {password && (
                                <div className="grid grid-cols-2 gap-2 mt-3">
                                    {[
                                        { check: passwordChecks.length, label: "8+ characters" },
                                        { check: passwordChecks.uppercase, label: "Uppercase" },
                                        { check: passwordChecks.lowercase, label: "Lowercase" },
                                        { check: passwordChecks.number, label: "Number" },
                                    ].map((item, i) => (
                                        <div key={i} className={cn(
                                            "flex items-center gap-1.5 text-xs",
                                            item.check ? "text-emerald-500" : "text-muted-foreground"
                                        )}>
                                            {item.check ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                                            {item.label}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Terms */}
                        <label className="flex items-start gap-3 cursor-pointer group">
                            <div className={cn(
                                "w-5 h-5 flex-shrink-0 rounded-md border-2 flex items-center justify-center transition-all mt-0.5",
                                agreedToTerms ? "bg-primary border-primary" : "border-border group-hover:border-primary/50"
                            )}>
                                {agreedToTerms && <Check className="w-3 h-3 text-white" />}
                            </div>
                            <input
                                type="checkbox"
                                checked={agreedToTerms}
                                onChange={(e) => setAgreedToTerms(e.target.checked)}
                                className="hidden"
                            />
                            <span className="text-sm text-muted-foreground">
                                I agree to the{" "}
                                <Link href="/terms" className="text-primary hover:underline">Terms of Service</Link>
                                {" "}and{" "}
                                <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>
                            </span>
                        </label>

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={isLoading || !agreedToTerms || !isPasswordStrong}
                            className={cn(
                                "w-full max-w-[280px] mx-auto py-2.5 bg-primary text-primary-foreground rounded-xl font-semibold flex items-center justify-center gap-2 transition-all",
                                (isLoading || !agreedToTerms || !isPasswordStrong)
                                    ? "opacity-50 cursor-not-allowed"
                                    : "hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/20"
                            )}
                        >
                            {isLoading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    Create Account
                                    <ArrowRight className="w-4 h-4" />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-border" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-background px-4 text-muted-foreground">Or continue with</span>
                        </div>
                    </div>

                    <div className="max-w-[280px] mx-auto">
                        <button
                            type="button"
                            onClick={handleGoogleSignIn}
                            disabled={isGoogleLoading}
                            aria-label="Sign up with Google"
                            className="w-full flex items-center justify-center gap-2 py-2.5 border border-border rounded-xl hover:bg-secondary/50 transition-all text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            <svg className="w-4 h-4" viewBox="0 0 24 24">
                                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                            </svg>
                            <span className="font-medium">{isGoogleLoading ? "Loading..." : "Google"}</span>
                        </button>
                    </div>

                    {/* Sign In Link */}
                    <p className="text-center text-sm text-muted-foreground">
                        Already have an account?{" "}
                        <Link href="/login" className="text-primary font-medium hover:underline">
                            Sign in
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
