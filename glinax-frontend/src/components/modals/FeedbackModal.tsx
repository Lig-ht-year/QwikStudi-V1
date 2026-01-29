"use client";

import React, { useState } from "react";
import { X, MessageSquare, XCircle, Frown, FileText, HelpCircle, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

interface FeedbackModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (feedback: FeedbackData) => void;
}

interface FeedbackData {
    reason: string;
    details?: string;
}

const feedbackReasons = [
    { id: "incorrect", label: "Incorrect information", icon: XCircle, color: "text-red-500" },
    { id: "unhelpful", label: "Not helpful", icon: Frown, color: "text-orange-500" },
    { id: "incomplete", label: "Incomplete response", icon: FileText, color: "text-yellow-500" },
    { id: "confusing", label: "Confusing or unclear", icon: HelpCircle, color: "text-purple-500" },
    { id: "other", label: "Other", icon: MoreHorizontal, color: "text-blue-500" },
];

export function FeedbackModal({ isOpen, onClose, onSubmit }: FeedbackModalProps) {
    const [selectedReason, setSelectedReason] = useState<string | null>(null);
    const [details, setDetails] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = () => {
        if (!selectedReason) return;

        setIsSubmitting(true);

        // Simulate submission - backend will handle actual storage
        setTimeout(() => {
            onSubmit({
                reason: selectedReason,
                details: details.trim() || undefined,
            });
            setIsSubmitting(false);
            setSelectedReason(null);
            setDetails("");
            onClose();
        }, 500);
    };

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={handleBackdropClick}
        >
            <div className="w-full max-w-md mx-4 bg-card border border-border/50 rounded-2xl shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-border/50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                            <MessageSquare className="w-5 h-5 text-red-500" />
                        </div>
                        <div>
                            <h2 className="font-semibold text-foreground">Share Feedback</h2>
                            <p className="text-xs text-muted-foreground">Help us improve QwikStudi</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-white/5 text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-4 space-y-4">
                    <p className="text-sm text-muted-foreground">
                        What was wrong with this response?
                    </p>

                    {/* Feedback Options */}
                    <div className="space-y-2">
                        {feedbackReasons.map((reason) => (
                            <button
                                key={reason.id}
                                onClick={() => setSelectedReason(reason.id)}
                                className={cn(
                                    "w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left group",
                                    selectedReason === reason.id
                                        ? "border-primary bg-primary/10 text-foreground"
                                        : "border-border/50 hover:border-border hover:bg-white/5 text-muted-foreground hover:text-foreground"
                                )}
                            >
                                <div className={cn(
                                    "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
                                    selectedReason === reason.id ? "bg-background shadow-sm" : "bg-white/5 group-hover:bg-white/10"
                                )}>
                                    <reason.icon className={cn("w-4 h-4", reason.color)} />
                                </div>
                                <span className="text-sm font-medium">{reason.label}</span>
                            </button>
                        ))}
                    </div>

                    {/* Optional Details */}
                    {selectedReason && (
                        <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                            <label className="text-xs font-medium text-muted-foreground mb-2 block">
                                Additional details (optional)
                            </label>
                            <textarea
                                value={details}
                                onChange={(e) => setDetails(e.target.value)}
                                placeholder="Tell us more about what went wrong..."
                                className="w-full h-24 p-3 bg-background/50 border border-border/50 rounded-xl text-sm resize-none placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
                            />
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-border/50 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-2.5 rounded-xl border border-border/50 text-sm font-medium hover:bg-white/5 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={!selectedReason || isSubmitting}
                        className={cn(
                            "flex-1 py-2.5 rounded-xl text-sm font-medium transition-all",
                            selectedReason && !isSubmitting
                                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                                : "bg-muted text-muted-foreground cursor-not-allowed"
                        )}
                    >
                        {isSubmitting ? "Submitting..." : "Submit Feedback"}
                    </button>
                </div>
            </div>
        </div>
    );
}
