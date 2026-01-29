"use client";

import React from "react";
import { ArrowLeft, Shield, Calendar } from "lucide-react";
import Link from "next/link";

export default function PrivacyPage() {
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
                    <h1 className="flex-1 text-lg font-semibold text-center">Privacy Policy</h1>
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
                        <h2 className="text-xl font-semibold mb-4">1. Information We Collect</h2>
                        <p className="text-muted-foreground leading-relaxed mb-3">
                            We collect information you provide directly to us, including:
                        </p>
                        <ul className="list-disc list-inside text-muted-foreground space-y-2">
                            <li>Account information (name, email address)</li>
                            <li>Content you upload or create using our service</li>
                            <li>Communications with us</li>
                            <li>Usage data and preferences</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-4">2. How We Use Your Information</h2>
                        <p className="text-muted-foreground leading-relaxed mb-3">
                            We use the information we collect to:
                        </p>
                        <ul className="list-disc list-inside text-muted-foreground space-y-2">
                            <li>Provide, maintain, and improve our services</li>
                            <li>Process your requests and transactions</li>
                            <li>Send you technical notices and support messages</li>
                            <li>Respond to your comments and questions</li>
                            <li>Personalize your experience</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-4">3. Data Storage and Security</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            We implement appropriate security measures to protect your personal information. Your data is stored securely and we use encryption for sensitive information. However, no method of transmission over the Internet is 100% secure.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-4">4. Data Sharing</h2>
                        <p className="text-muted-foreground leading-relaxed mb-3">
                            We do not sell your personal information. We may share your information only in the following circumstances:
                        </p>
                        <ul className="list-disc list-inside text-muted-foreground space-y-2">
                            <li>With your consent</li>
                            <li>To comply with legal obligations</li>
                            <li>To protect our rights and prevent fraud</li>
                            <li>With service providers who assist in our operations</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-4">5. Your Rights</h2>
                        <p className="text-muted-foreground leading-relaxed mb-3">
                            You have the right to:
                        </p>
                        <ul className="list-disc list-inside text-muted-foreground space-y-2">
                            <li>Access your personal data</li>
                            <li>Correct inaccurate data</li>
                            <li>Request deletion of your data</li>
                            <li>Export your data</li>
                            <li>Opt-out of marketing communications</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-4">6. Cookies and Tracking</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            We use cookies and similar technologies to enhance your experience, analyze usage patterns, and deliver personalized content. You can control cookie preferences through your browser settings.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-4">7. Children's Privacy</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            Our service is not directed to children under 13. We do not knowingly collect personal information from children under 13. If we become aware of such collection, we will delete the information promptly.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-4">8. Changes to This Policy</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            We may update this privacy policy from time to time. We will notify you of any changes by posting the new policy on this page and updating the "Last updated" date.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-4">9. Contact Us</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            If you have any questions about this Privacy Policy, please contact us at glinaxinfo@gmail.com.
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
