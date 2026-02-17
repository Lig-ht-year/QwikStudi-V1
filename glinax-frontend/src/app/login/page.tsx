"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
    Mail,
    Lock,
    Eye,
    EyeOff,
    ArrowRight,
    Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useDataStore } from "@/stores/dataStore";
import api from "@/lib/api";
import { getChatHistory } from "@/lib/getChatHistory";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");

    const login = useDataStore((state) => state.login);
    const loadChatHistory = useDataStore((state) => state.loadChatHistory);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError("");

        try {
            const normalizedEmail = email.trim().toLowerCase();

            // Call Django JWT authentication endpoint
            const res = await api.post("/auth/login/", {
                email: normalizedEmail,
                password,
            });

            const { access, refresh, user } = res.data;

            // Store tokens in localStorage
            localStorage.setItem("access", access);
            localStorage.setItem("refresh", refresh);

            // Update local state
            login(user.username);

            // Load chat history
            try {
                const { data: chats, error } = await getChatHistory();
                if (!error && chats.length > 0) {
                    loadChatHistory(chats);
                }
            } catch (chatError) {
                console.warn("Failed to load chat history:", chatError);
                // Don't block login if chat history fails
            }

            // Redirect to home
            window.location.href = "/";
        } catch (err: any) {
            console.error("Login error:", err);
            const errorMsg = err.response?.data?.error || 
                           err.response?.data?.detail || 
                           "Login failed. Please check your credentials.";
            setError(errorMsg);
        } finally {
            setIsLoading(false);
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

                <div className="relative z-10 space-y-6">
                    <h1 className="text-5xl font-bold tracking-tight leading-tight">
                        Study Smart.<br />
                        <span className="text-primary">Learn Fast.</span>
                    </h1>
                    <p className="text-lg text-muted-foreground max-w-md">
                        AI-powered learning that transforms how you study. Summarize, quiz yourself, and master any subject.
                    </p>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-primary" />
                            <span>AI-Powered</span>
                        </div>
                        <div className="w-1 h-1 rounded-full bg-border" />
                        <span>Growing Community</span>
                        <div className="w-1 h-1 rounded-full bg-border" />
                        <span>Free to Start</span>
                    </div>
                </div>

                <div className="relative z-10 text-xs text-muted-foreground">
                    © {new Date().getFullYear()} QwikStudi. All rights reserved.
                </div>
            </div>

            {/* Right Panel - Login Form */}
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
                        <h2 className="text-3xl font-bold tracking-tight">Welcome back</h2>
                        <p className="text-muted-foreground">
                            Sign in to continue your learning journey
                        </p>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Email */}
                        <div className="space-y-2">
                            <label htmlFor="login-email" className="text-sm font-medium">Email</label>
                            <div className="relative">
                                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <input
                                    id="login-email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="you@example.com"
                                    autoComplete="email"
                                    className="w-full pl-10 pr-4 py-2.5 bg-secondary/50 border border-border rounded-full focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-sm"
                                    required
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <label htmlFor="login-password" className="text-sm font-medium">Password</label>
                                <Link href="/forgot-password" className="text-sm text-primary hover:underline">
                                    Forgot password?
                                </Link>
                            </div>
                            <div className="relative">
                                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <input
                                    id="login-password"
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    autoComplete="current-password"
                                    className="w-full pl-10 pr-10 py-2.5 bg-secondary/50 border border-border rounded-full focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-sm"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    aria-label={showPassword ? "Hide password" : "Show password"}
                                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className={cn(
                                "w-full max-w-[280px] mx-auto py-2.5 bg-primary text-primary-foreground rounded-xl font-semibold flex items-center justify-center gap-2 transition-all",
                                isLoading ? "opacity-70 cursor-not-allowed" : "hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/20"
                            )}
                        >
                            {isLoading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    Sign In
                                    <ArrowRight className="w-4 h-4" />
                                </>
                            )}
                        </button>
                    </form>

                    {/* Divider */}
                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-border" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-background px-4 text-muted-foreground">Or continue with</span>
                        </div>
                    </div>

                    {/* Social Logins */}
                    <div className="grid grid-cols-2 gap-3 max-w-[320px] mx-auto">
                        <button
                            type="button"
                            aria-label="Sign in with Google"
                            className="flex items-center justify-center gap-2 py-2.5 border border-border rounded-xl hover:bg-secondary/50 transition-all text-sm"
                        >
                            <svg className="w-4 h-4" viewBox="0 0 24 24">
                                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                            </svg>
                            <span className="font-medium">Google</span>
                        </button>
                        <button
                            type="button"
                            aria-label="Sign in with Apple"
                            className="flex items-center justify-center gap-2 py-2.5 border border-border rounded-xl hover:bg-secondary/50 transition-all text-sm"
                        >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                            </svg>
                            <span className="font-medium">Apple</span>
                        </button>
                    </div>

                    {/* Sign Up Link */}
                    <p className="text-center text-sm text-muted-foreground">
                        Don't have an account?{" "}
                        <Link href="/signup" className="text-primary font-medium hover:underline">
                            Sign up for free
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
