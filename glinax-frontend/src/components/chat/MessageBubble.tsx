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
    type?: 'text' | 'audio' | 'quiz' | 'summary' | 'notes' | 'attachment';
    metadata?: Record<string, unknown>;
    onRegenerate?: () => void;
    onRate?: (rating: 'like' | 'dislike' | null) => void;
}

type QuizQuestionPayload = {
    question?: unknown;
    options?: unknown;
    correctAnswer?: unknown;
    correctText?: unknown;
    explanation?: unknown;
    concept?: unknown;
    guidance?: unknown;
};

type SummaryKeyTerm = {
    term: string;
    definition: string;
};

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

export function MessageBubble({ role, content, createdAt, type, metadata, onRegenerate, onRate }: MessageBubbleProps) {
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
    const attachmentFiles = Array.isArray((metadata as { files?: unknown[] } | undefined)?.files)
        ? ((metadata as { files?: Array<{ name?: string; size?: number; ext?: string }> }).files || [])
        : [];
    const createdAtIso = (() => {
        try {
            if (createdAt instanceof Date) return createdAt.toISOString();
            const parsed = new Date(createdAt as unknown as string);
            return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
        } catch {
            return undefined;
        }
    })();

    const summaryKeyTerms: SummaryKeyTerm[] = Array.isArray(metadata?.keyTerms)
        ? metadata.keyTerms
            .filter((item): item is { term?: unknown; definition?: unknown } => !!item && typeof item === "object")
            .map((item) => ({
                term: typeof item.term === "string" ? item.term.trim() : "",
                definition: typeof item.definition === "string" ? item.definition.trim() : "",
            }))
            .filter((item) => item.term.length > 0 && item.definition.length > 0)
        : [];

    const formatFileSize = (bytes?: number) => {
        if (!bytes || bytes <= 0) return "";
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    const handleRate = (newRating: 'like' | 'dislike') => {
        const updatedRating = rating === newRating ? null : newRating;
        setRating(updatedRating);
        onRate?.(updatedRating);

        // Show feedback modal when disliking
        if (newRating === 'dislike' && updatedRating === 'dislike') {
            setShowFeedback(true);
        }
    };

    const handleFeedbackSubmit = (feedback: { reason: string; details?: string }) => {
        // TODO: Backend will handle feedback storage
        void feedback;
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

    const buildQuizContentForChaining = () => {
        const questions = Array.isArray(metadata?.questions) ? metadata.questions as QuizQuestionPayload[] : [];
        if (questions.length === 0) return displayContent;

        const title = typeof metadata?.title === "string" ? metadata.title : "Generated Quiz";
        const lines: string[] = [`${title}`, ""];

        questions.forEach((q, idx) => {
            const questionText = typeof q.question === "string" ? q.question.trim() : "";
            if (!questionText) return;

            lines.push(`Question ${idx + 1}: ${questionText}`);

            const options = Array.isArray(q.options) ? q.options.filter((opt): opt is string => typeof opt === "string") : [];
            if (options.length > 0) {
                lines.push("Options:");
                options.forEach((opt, optIdx) => {
                    const letter = String.fromCharCode(65 + optIdx);
                    lines.push(`${letter}. ${opt}`);
                });
            }

            if (typeof q.correctText === "string" && q.correctText.trim()) {
                lines.push(`Answer: ${q.correctText.trim()}`);
            } else if (typeof q.correctAnswer === "number" && options[q.correctAnswer]) {
                lines.push(`Answer: ${options[q.correctAnswer]}`);
            }

            if (typeof q.explanation === "string" && q.explanation.trim()) {
                lines.push(`Explanation: ${q.explanation.trim()}`);
            }
            if (typeof q.concept === "string" && q.concept.trim()) {
                lines.push(`Concept: ${q.concept.trim()}`);
            }
            if (typeof q.guidance === "string" && q.guidance.trim()) {
                lines.push(`Guidance: ${q.guidance.trim()}`);
            }

            lines.push("");
        });

        const compiled = lines.join("\n").trim();
        return compiled || displayContent;
    };

    const getChainingContent = () => {
        if (type === "quiz") return buildQuizContentForChaining();
        if (type === "summary" && typeof metadata?.summary === "string" && metadata.summary.trim()) {
            return metadata.summary;
        }
        if (type === "notes" && Array.isArray(metadata?.notes)) {
            const notes = metadata.notes.filter((n): n is string => typeof n === "string");
            if (notes.length > 0) return notes.join("\n");
        }
        if (type === "audio" && typeof metadata?.transcript === "string" && metadata.transcript.trim()) {
            return metadata.transcript;
        }
        return displayContent;
    };

    // Feature chaining - use this message content for summarize/quiz
    const handleSummarizeThis = () => {
        const chainingContent = getChainingContent();
        // Store the content for the summarize modal to use
        useDataStore.getState().setSelectedContent({
            type: 'summarize',
            content: chainingContent,
        });
        setActiveModal('summarize');
    };

    const handleGenerateQuiz = () => {
        const chainingContent = getChainingContent();
        // Store the content for the quiz modal to use
        useDataStore.getState().setSelectedContent({
            type: 'quiz',
            content: chainingContent,
        });
        setActiveModal('quiz');
    };

    // User Message - Dark rounded card style (Gemini-inspired)
    if (!isAssistant) {
        return (
            <div
                className="w-full flex justify-end mb-6 animate-in fade-in slide-in-from-bottom-2 duration-300"
                data-created-at={createdAtIso}
            >
                <div className="max-w-[85%] sm:max-w-[70%]">
                    <div className="bg-card/80 backdrop-blur-sm border border-white/10 rounded-2xl p-4 shadow-lg">
                        {type === 'attachment' && attachmentFiles.length > 0 && (
                            <div className="space-y-2 mb-2">
                                {attachmentFiles.map((file, index) => (
                                    <div
                                        key={`${file.name || 'file'}-${file.size || 0}-${index}`}
                                        className="flex items-center gap-2 bg-background/60 border border-white/10 rounded-xl px-2.5 py-2"
                                        title={String(file.name || "Attachment")}
                                    >
                                        <div className="w-7 h-7 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
                                            <FileText className="w-3.5 h-3.5 text-primary" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-xs font-medium truncate">{String(file.name || "Attachment")}</p>
                                            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                                                {String(file.ext || "file")} {formatFileSize(file.size)}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
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
        <div
            className="w-full mb-8 animate-in fade-in slide-in-from-bottom-2 duration-300 group"
            data-created-at={createdAtIso}
        >
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
                                ttsId={typeof metadata.tts_id === 'number' ? metadata.tts_id : undefined}
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
                                keyTerms={summaryKeyTerms}
                                onRetry={handleSummarizeThis}
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
