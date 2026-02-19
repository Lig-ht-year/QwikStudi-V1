"use client";

import React, { useState } from "react";
import {
    ArrowLeft,
    HelpCircle,
    MessageSquare,
    Brain,
    FileText,
    Mic,
    Headphones,
    ChevronDown,
    Mail,
    ExternalLink,
    Sparkles,
    Shield,
    Zap,
    BookOpen
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface FAQItem {
    question: string;
    answer: string;
}

const faqs: FAQItem[] = [
    {
        question: "What is QwikStudi?",
        answer: "QwikStudi is an AI-powered study assistant that helps you learn smarter and faster. It offers features like AI chat for answering questions, quiz generation, document summarization, voice recording for notes, and text-to-speech for listening to content."
    },
    {
        question: "How do I start a new chat?",
        answer: "Click the 'New Chat' button in the sidebar to start a fresh conversation with the AI. You can ask questions, get explanations, or request help with any study topic."
    },
    {
        question: "How does the Quiz feature work?",
        answer: "Click the Quiz button in the sidebar or toolbar, upload or paste your study material, and QwikStudi will generate interactive quizzes to test your knowledge. You can customize the number of questions and difficulty level."
    },
    {
        question: "Can I summarize documents?",
        answer: "Yes! Use the Summarize feature to upload PDFs, paste text, or provide URLs. QwikStudi will create concise summaries with key takeaways to help you understand the main points quickly."
    },
    {
        question: "What is the Record feature?",
        answer: "The Record feature allows you to capture audio from lectures or your own voice notes. QwikStudi transcribes the audio and can generate organized notes from your recordings."
    },
    {
        question: "How do I use Text-to-Speech?",
        answer: "Click the Listen (headphones) button, enter or paste text, and choose a voice. QwikStudi will read the content aloud, perfect for auditory learners or reviewing while multitasking."
    },
    {
        question: "What's the difference between Free and Pro plans?",
        answer: "Free plan includes limited AI messages per day and basic features. Pro plan offers monthly billing at GHS 30/month or annual billing at GHS 300/year (save about 17% vs GHS 360/year billed monthly), plus unlimited messages, priority response times, advanced summarization, unlimited quiz generation, premium voices, and priority support."
    },
    {
        question: "How do I upgrade to Pro?",
        answer: "Go to Settings, find the 'Upgrade to Pro' section, and click the Upgrade button. Payment is processed securely via Paystack."
    },
    {
        question: "Is my data secure?",
        answer: "Yes, we take privacy seriously. Your conversations and data are encrypted. You can control privacy settings and export or delete your data anytime from Settings > Data & Privacy."
    },
    {
        question: "How do I change the app theme?",
        answer: "Go to Settings > Appearance and choose between Light, Dark, or System theme to match your preference."
    }
];

const features = [
    {
        icon: MessageSquare,
        title: "AI Chat",
        description: "Ask questions and get instant, helpful answers on any study topic",
        color: "from-primary to-primary/70"
    },
    {
        icon: Brain,
        title: "Quiz Generator",
        description: "Create interactive quizzes from your study materials",
        color: "from-orange-400 to-orange-600"
    },
    {
        icon: FileText,
        title: "Summarizer",
        description: "Get concise summaries of documents and articles",
        color: "from-emerald-400 to-emerald-600"
    },
    {
        icon: Mic,
        title: "Voice Recording",
        description: "Record lectures and convert them to organized notes",
        color: "from-rose-400 to-rose-600"
    },
    {
        icon: Headphones,
        title: "Text-to-Speech",
        description: "Listen to your study content with natural voices",
        color: "from-violet-400 to-violet-600"
    }
];

function FAQAccordion({ item, isOpen, onToggle }: { item: FAQItem; isOpen: boolean; onToggle: () => void }) {
    return (
        <div className="border-b border-border/50 last:border-0">
            <button
                onClick={onToggle}
                className="w-full flex items-center justify-between py-4 text-left group"
            >
                <span className="font-medium text-foreground group-hover:text-primary transition-colors pr-4">
                    {item.question}
                </span>
                <ChevronDown className={cn(
                    "w-5 h-5 text-muted-foreground shrink-0 transition-transform duration-200",
                    isOpen && "rotate-180"
                )} />
            </button>
            <div className={cn(
                "overflow-hidden transition-all duration-200",
                isOpen ? "max-h-96 pb-4" : "max-h-0"
            )}>
                <p className="text-muted-foreground leading-relaxed">
                    {item.answer}
                </p>
            </div>
        </div>
    );
}

export default function HelpPage() {
    const [openFAQ, setOpenFAQ] = useState<number | null>(0);

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            {/* Header */}
            <header className="sticky top-0 z-50 bg-background/90 backdrop-blur-xl">
                <div className="max-w-2xl mx-auto px-4 py-4 flex items-center">
                    <Link
                        href="/"
                        className="p-2 -ml-2 rounded-xl hover:bg-white/5 transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <h1 className="flex-1 text-lg font-semibold text-center">Help Center</h1>
                    {/* Spacer to balance the back button */}
                    <div className="w-9" />
                </div>
            </header>

            <main className="max-w-2xl mx-auto px-4 py-8 space-y-12">
                {/* Hero Section */}
                <section className="text-center space-y-4">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mx-auto border border-primary/20">
                        <BookOpen className="w-8 h-8 text-primary" />
                    </div>
                    <h2 className="text-3xl font-bold">How can we help?</h2>
                    <p className="text-muted-foreground max-w-md mx-auto">
                        Find answers to common questions and learn how to get the most out of QwikStudi.
                    </p>
                </section>

                {/* Features Overview */}
                <section>
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-primary" />
                        Features
                    </h3>
                    <div className="grid gap-3 sm:grid-cols-2">
                        {features.map((feature, i) => (
                            <div
                                key={i}
                                className="flex items-start gap-3 p-4 rounded-xl bg-card/50 border border-border/50 hover:border-primary/30 transition-colors"
                            >
                                <div className={cn(
                                    "w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center shrink-0 shadow-lg",
                                    feature.color
                                )}>
                                    <feature.icon className="w-5 h-5" />
                                </div>
                                <div>
                                    <h4 className="font-medium text-foreground">{feature.title}</h4>
                                    <p className="text-sm text-muted-foreground mt-0.5">{feature.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* FAQ Section */}
                <section>
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <HelpCircle className="w-5 h-5 text-primary" />
                        Frequently Asked Questions
                    </h3>
                    <div className="bg-card/50 rounded-2xl border border-border/50 px-5">
                        {faqs.map((faq, i) => (
                            <FAQAccordion
                                key={i}
                                item={faq}
                                isOpen={openFAQ === i}
                                onToggle={() => setOpenFAQ(openFAQ === i ? null : i)}
                            />
                        ))}
                    </div>
                </section>

                {/* Quick Tips */}
                <section>
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <Zap className="w-5 h-5 text-primary" />
                        Quick Tips
                    </h3>
                    <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl border border-primary/20 p-5 space-y-3">
                        <div className="flex items-start gap-3">
                            <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                                <span className="text-xs font-bold text-primary">1</span>
                            </div>
                            <p className="text-sm text-foreground/80">Press <kbd className="px-1.5 py-0.5 bg-background/50 rounded text-xs font-mono">Enter</kbd> to send a message, <kbd className="px-1.5 py-0.5 bg-background/50 rounded text-xs font-mono">Shift+Enter</kbd> for a new line.</p>
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                                <span className="text-xs font-bold text-primary">2</span>
                            </div>
                            <p className="text-sm text-foreground/80">Use the sidebar quick actions for fast access to Quiz, Summarize, Record, and Listen features.</p>
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                                <span className="text-xs font-bold text-primary">3</span>
                            </div>
                            <p className="text-sm text-foreground/80">Export your data anytime from Settings for backup or to use elsewhere.</p>
                        </div>
                    </div>
                </section>

                {/* Contact Section */}
                <section>
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <Mail className="w-5 h-5 text-primary" />
                        Still need help?
                    </h3>
                    <div className="bg-card/50 rounded-2xl border border-border/50 p-5 flex flex-col sm:flex-row items-center gap-4">
                        <div className="flex-1 text-center sm:text-left">
                            <p className="font-medium text-foreground">Contact our support team</p>
                            <p className="text-sm text-muted-foreground mt-1">We're here to help you succeed in your studies.</p>
                        </div>
                        <a
                            href="mailto:glinaxinfo@gmail.com"
                            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors"
                        >
                            <Mail className="w-4 h-4" />
                            Email Support
                        </a>
                    </div>
                </section>

                {/* Footer Links */}
                <section className="flex flex-wrap justify-center gap-4 pt-4 border-t border-border/50">
                    <Link href="/terms" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
                        <Shield className="w-4 h-4" />
                        Terms of Service
                    </Link>
                    <Link href="/privacy" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
                        <Shield className="w-4 h-4" />
                        Privacy Policy
                    </Link>
                    <Link href="/settings" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
                        <ExternalLink className="w-4 h-4" />
                        Settings
                    </Link>
                </section>

                {/* Version Footer */}
                <div className="text-center pt-4 pb-8">
                    <p className="text-sm text-muted-foreground/60">QwikStudi v1.0.0</p>
                    <p className="text-xs text-muted-foreground/40">Study Smart, Learn Fast.</p>
                </div>
            </main>
        </div>
    );
}
