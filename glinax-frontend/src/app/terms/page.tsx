"use client";

import React from "react";
import { ArrowLeft, FileText, Calendar } from "lucide-react";
import Link from "next/link";

export default function TermsPage() {
    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            {/* Header */}
            <header className="sticky top-0 z-50 bg-background/90 backdrop-blur-xl">
                <div className="max-w-2xl mx-auto px-4 py-4 flex items-center">
                    <Link
                        href="/signup"
                        className="p-2 -ml-2 rounded-xl hover:bg-white/5 transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <h1 className="flex-1 text-lg font-semibold text-center">Terms of Service</h1>
                    {/* Spacer to balance the back button */}
                    <div className="w-9" />
                </div>
            </header>

            <main className="max-w-2xl mx-auto px-4 py-8">
                {/* Last Updated */}
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-8">
                    <Calendar className="w-4 h-4" />
                    <span>Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                </div>

                {/* Content */}
                <div className="prose prose-invert max-w-none space-y-8">
                    <section>
                        <h2 className="text-xl font-semibold mb-4">1. Acceptance of Terms</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            By accessing and using QwikStudi, you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by these terms, please do not use this service.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-4">2. Description of Service</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            QwikStudi is an AI-powered study assistant that provides educational tools including text summarization, quiz generation, speech-to-text transcription, and text-to-speech conversion. The service is designed to enhance learning and studying efficiency.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-4">3. User Accounts</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            You are responsible for maintaining the confidentiality of your account and password. You agree to accept responsibility for all activities that occur under your account. You must notify us immediately of any unauthorized use of your account.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-4">4. Acceptable Use</h2>
                        <p className="text-muted-foreground leading-relaxed mb-3">
                            You agree not to use QwikStudi to:
                        </p>
                        <ul className="list-disc list-inside text-muted-foreground space-y-2">
                            <li>Upload or share content that infringes on intellectual property rights</li>
                            <li>Distribute harmful, offensive, or illegal content</li>
                            <li>Attempt to gain unauthorized access to our systems</li>
                            <li>Use the service for any commercial purpose without authorization</li>
                            <li>Engage in academic dishonesty or plagiarism</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-4">5. Intellectual Property</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            The content, features, and functionality of QwikStudi are owned by us and are protected by international copyright, trademark, and other intellectual property laws. You retain ownership of content you create using our service.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-4">6. Limitation of Liability</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            QwikStudi is provided "as is" without warranties of any kind. We are not liable for any damages arising from your use of the service. AI-generated content may contain errors and should be verified independently.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-4">7. Changes to Terms</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            We reserve the right to modify these terms at any time. We will notify users of significant changes via email or through the service. Continued use after changes constitutes acceptance of the new terms.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-4">8. Contact Us</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            If you have any questions about these Terms of Service, please contact us at glinaxinfo@gmail.com.
                        </p>
                    </section>
                </div>

                {/* Footer */}
                <div className="mt-12 pt-8 border-t border-border/50 text-center text-sm text-muted-foreground">
                    <p>© {new Date().getFullYear()} QwikStudi. All rights reserved.</p>
                </div>
            </main>
        </div>
    );
}
