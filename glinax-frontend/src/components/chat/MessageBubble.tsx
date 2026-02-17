"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { Copy, Check, Volume2, ThumbsUp, ThumbsDown, RefreshCw, FileText, Brain } from "lucide-react";
import { useChatStore } from "@/stores/chatStore";
import { useDataStore } from "@/stores/dataStore";

import { AudioPlayerCard } from "../cards/AudioPlayerCard";
import { QuizWidgetCard, type Question } from "../cards/QuizWidgetCard";
import { SummaryCard } from "../cards/SummaryCard";
import { NotesCard } from "../cards/NotesCard";
import { FeedbackModal } from "../modals/FeedbackModal";

interface MessageBubbleProps {
    role: 'user' | 'assistant';
    content: string;
    createdAt: Date;
    type?: 'text' | 'audio' | 'quiz' | 'summary' | 'notes';
    metadata?: Record<string, unknown>;
    onRegenerate?: () => void;
    onRate?: (rating: 'like' | 'dislike' | null) => void;
}

// Helper function to safely format content for display
function formatContentForDisplay(content: unknown): string {
    if (typeof content === 'string') {
        return content;
    }
    if (typeof content === 'object' && content !== null) {
        // Handle objects with section keys (e.g., {Introduction: "...", Conclusion: "..."})
        const contentObj = content as Record<string, unknown>;
        const entries = Object.entries(contentObj);
        
        // Check if it's a structured content object (sections with string values)
        const isStructuredContent = entries.every(([, value]) => typeof value === 'string' || value === undefined);
        
        if (isStructuredContent && entries.length > 0) {
            return entries
                .map(([section, value]) => {
                    if (value && typeof value === 'string') {
                        return `## ${section}\n${value}`;
                    }
                    return '';
                })
                .filter(Boolean)
                .join('\n\n');
        }
        
        // For other objects, convert to JSON string
        try {
            return JSON.stringify(content, null, 2);
        } catch {
            return String(content);
        }
    }
    return String(content);
}

export function MessageBubble({ role, content, createdAt: _createdAt, type, metadata, onRegenerate, onRate }: MessageBubbleProps) {
    const isAssistant = role === 'assistant';
    const isLoadingPlaceholder = Boolean(type === 'text' && metadata?.isLoading === true);
    const [copied, setCopied] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [rating, setRating] = useState<'like' | 'dislike' | null>(null);
    const [showFeedback, setShowFeedback] = useState(false);
    const { setActiveModal } = useChatStore();
    const isLimitExceeded = useDataStore((state) => state.isLimitExceeded);

    // Ensure content is always a string for rendering
    const displayContent = formatContentForDisplay(content);

    const handleRate = (newRating: 'like' | 'dislike') => {
        const updatedRating = rating === newRating ? null : newRating;
        setRating(updatedRating);
        onRate?.(updatedRating);

        // Show feedback modal when disliking
        if (newRating === 'dislike' && updatedRating === 'dislike') {
            setShowFeedback(true);
        }
    };

    const handleFeedbackSubmit = (_feedback: { reason: string; details?: string }) => {
        // TODO: Backend will handle feedback storage
        if (process.env.NODE_ENV === 'development') {
            // console.log('Feedback submitted:', feedback);
        }
        setShowFeedback(false);
    };

    const handleRegenerate = () => {
        onRegenerate?.();
    };

    const handleCopy = async () => {
        if (!content) return;
        try {
            await navigator.clipboard.writeText(content);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    const handleSpeak = () => {
        if (!content || typeof window === 'undefined') return;

        // Stop if already speaking
        if (isSpeaking) {
            window.speechSynthesis.cancel();
            setIsSpeaking(false);
            return;
        }

        const utterance = new SpeechSynthesisUtterance(content);
        utterance.rate = 1;
        utterance.pitch = 1;

        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);

        window.speechSynthesis.speak(utterance);
    };

    // Feature chaining - use this message content for summarize/quiz
    const handleSummarizeThis = () => {
        // Store the content for the summarize modal to use
        useDataStore.getState().setSelectedContent({
            type: 'summarize',
            content: content,
        });
        setActiveModal('summarize');
    };

    const handleGenerateQuiz = () => {
        // Store the content for the quiz modal to use
        useDataStore.getState().setSelectedContent({
            type: 'quiz',
            content: content,
        });
        setActiveModal('quiz');
    };

    // User Message - Dark rounded card style (Gemini-inspired)
    if (!isAssistant) {
        return (
            <div className="w-full flex justify-end mb-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="max-w-[85%] sm:max-w-[70%]">
                    <div className="bg-card/80 backdrop-blur-sm border border-white/10 rounded-2xl p-4 shadow-lg">
                        {displayContent && (
                            <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">
                                {displayContent}
                            </p>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // AI Message - Clean text with icon (Gemini-inspired)
    return (
        <div className="w-full mb-8 animate-in fade-in slide-in-from-bottom-2 duration-300 group">
            {/* AI Header with Q Icon */}
            <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-white flex items-center justify-center shadow-md">
                    <span className="text-sm font-bold text-primary">Q</span>
                </div>
                <span className="text-sm font-semibold text-foreground">QwikStudi</span>
            </div>

            {/* AI Content - Plain text, no bubble */}
            <div className="pl-9">
                {displayContent && (
                    <p
                        className={cn(
                            "text-[15px] leading-relaxed whitespace-pre-wrap",
                            isLoadingPlaceholder
                                ? "text-foreground/70 italic animate-pulse"
                                : "text-foreground/90"
                        )}
                    >
                        {displayContent}
                    </p>
                )}

                {/* Widget Cards */}
                {(type === 'audio' || type === 'quiz' || type === 'summary' || type === 'notes') && metadata && (
                    <div className="mt-4 space-y-3">
                        {type === 'audio' && (
                            <AudioPlayerCard 
                                title={String(metadata.title || '')} 
                                audioUrl={typeof metadata.audio_url === 'string' ? metadata.audio_url : undefined}
                                duration={String(metadata.duration || '')} 
                                transcript={
                                    typeof metadata.transcript === 'string'
                                        ? metadata.transcript
                                        : typeof metadata.text === 'string'
                                            ? metadata.text
                                            : undefined
                                }
                            />
                        )}
                        {type === 'quiz' && (
                            <QuizWidgetCard 
                                title={String(metadata.title || '')} 
                                questions={Array.isArray(metadata.questions) ? metadata.questions as Question[] : []}
                                quizType={metadata.type as Question['type']}
                            />
                        )}
                        {type === 'summary' && (
                            <SummaryCard 
                                title={String(metadata.title || '')} 
                                summary={typeof metadata.summary === 'string' ? metadata.summary : String(metadata.summary || '')} 
                                takeaways={Array.isArray(metadata.takeaways) ? metadata.takeaways.map(String) : []} 
                            />
                        )}
                        {type === 'notes' && (
                            <NotesCard 
                                title={String(metadata.title || '')} 
                                notes={Array.isArray(metadata.notes) ? metadata.notes.map(String) : []} 
                                duration={String(metadata.duration || '')} 
                            />
                        )}
                    </div>
                )}

                {/* Action Buttons - Like, Dislike, Regenerate, Copy, TTS, Summarize, Quiz */}
                {displayContent && !isLoadingPlaceholder && (
                    <div className="flex items-center justify-center gap-1 mt-4">
                        {/* Like Button */}
                        <button
                            onClick={() => handleRate('like')}
                            className={cn(
                                "p-2 rounded-lg transition-all text-muted-foreground hover:text-foreground hover:bg-white/5",
                                rating === 'like' && "text-green-500 bg-green-500/10"
                            )}
                            title="Good response"
                        >
                            <ThumbsUp className={cn("w-4 h-4", rating === 'like' && "fill-current")} />
                        </button>

                        {/* Dislike Button */}
                        <button
                            onClick={() => handleRate('dislike')}
                            className={cn(
                                "p-2 rounded-lg transition-all text-muted-foreground hover:text-foreground hover:bg-white/5",
                                rating === 'dislike' && "text-red-500 bg-red-500/10"
                            )}
                            title="Bad response"
                        >
                            <ThumbsDown className={cn("w-4 h-4", rating === 'dislike' && "fill-current")} />
                        </button>

                        {/* Regenerate Button */}
                        <button
                            onClick={handleRegenerate}
                            disabled={isLimitExceeded}
                            className={cn(
                                "p-2 rounded-lg transition-all",
                                isLimitExceeded
                                    ? "text-muted-foreground/30 cursor-not-allowed"
                                    : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                            )}
                            title={isLimitExceeded ? "Chat limit reached" : "Regenerate response"}
                        >
                            <RefreshCw className={cn("w-4 h-4", isLimitExceeded && "opacity-50")} />
                        </button>

                        {/* Copy Button */}
                        <button
                            onClick={handleCopy}
                            className={cn(
                                "p-2 rounded-lg transition-all text-muted-foreground hover:text-foreground hover:bg-white/5",
                                copied && "text-green-500"
                            )}
                            title={copied ? "Copied!" : "Copy to clipboard"}
                        >
                            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        </button>

                        {/* Listen Button */}
                        <button
                            onClick={handleSpeak}
                            className={cn(
                                "p-2 rounded-lg transition-all text-muted-foreground hover:text-foreground hover:bg-white/5",
                                isSpeaking && "text-primary bg-primary/10"
                            )}
                            title={isSpeaking ? "Stop speaking" : "Read aloud"}
                        >
                            <Volume2 className="w-4 h-4" />
                        </button>

                        {/* Divider */}
                        <div className="w-px h-4 bg-border/50 mx-1" />

                        {/* Summarize This Button */}
                        <button
                            onClick={handleSummarizeThis}
                            className="p-2 rounded-lg transition-all text-muted-foreground hover:text-emerald-500 hover:bg-emerald-500/10"
                            title="Summarize this response"
                        >
                            <FileText className="w-4 h-4" />
                        </button>

                        {/* Generate Quiz Button */}
                        <button
                            onClick={handleGenerateQuiz}
                            className="p-2 rounded-lg transition-all text-muted-foreground hover:text-orange-500 hover:bg-orange-500/10"
                            title="Generate quiz from this"
                        >
                            <Brain className="w-4 h-4" />
                        </button>
                    </div>
                )}

                {/* Feedback Modal */}
                <FeedbackModal
                    isOpen={showFeedback}
                    onClose={() => setShowFeedback(false)}
                    onSubmit={handleFeedbackSubmit}
                />
            </div>
        </div>
    );
}
