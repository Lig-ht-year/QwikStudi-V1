"use client";

import React, { useState, useEffect } from "react";
import {
    X,
    Upload,
    HelpCircle,
    FileText,
    CheckSquare,
    ToggleLeft,
    PenLine,
    BookOpen,
    Minus,
    Plus,
    Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/Toast";
import { useDataStore } from "@/stores/dataStore";

interface QuizConfigModalProps {
    isOpen: boolean;
    onClose: () => void;
    onGenerate: (config: QuizConfig, content?: string) => void;
    initialContent?: string;
}

interface QuizConfig {
    file: File | null;
    questionType: string;
    questionCount: number;
    difficulty: string;
}

const questionTypes = [
    { id: "mcq", name: "Multiple Choice", icon: CheckSquare, description: "Best for quick revision" },
    { id: "tf", name: "True / False", icon: ToggleLeft, description: "Test core concepts" },
    { id: "fill", name: "Fill in the Blank", icon: PenLine, description: "Recall key terms" },
    { id: "essay", name: "Essay Questions", icon: BookOpen, description: "Deep understanding" },
];

const difficulties = [
    { id: "easy", name: "Easy", color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/30" },
    { id: "medium", name: "Medium", color: "text-orange-500 bg-orange-500/10 border-orange-500/30" },
    { id: "hard", name: "Hard", color: "text-red-500 bg-red-500/10 border-red-500/30" },
];

export function QuizConfigModal({ isOpen, onClose, onGenerate, initialContent }: QuizConfigModalProps) {
    const [uploadedFile, setUploadedFile] = useState<File | null>(null);
    const [questionType, setQuestionType] = useState("mcq");
    const [questionCount, setQuestionCount] = useState(10);
    const [difficulty, setDifficulty] = useState("medium");
    const [isGenerating, setIsGenerating] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const { showToast } = useToast();
    const clearSelectedContent = useDataStore((state) => state.clearSelectedContent);

    // Get content from store when modal opens (if no initialContent prop)
    const content = initialContent || useDataStore.getState().selectedContent.content;

    // Clear selected content when modal closes
    useEffect(() => {
        if (!isOpen) {
            clearSelectedContent();
        }
    }, [isOpen, clearSelectedContent]);

    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

    if (!isOpen) return null;

    const validateFile = (file: File): boolean => {
        // Check file size
        if (file.size > MAX_FILE_SIZE) {
            showToast(`File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`, 'error');
            return false;
        }

        // Check file extension
        const ext = file.name.toLowerCase().split('.').pop();
        const validExtensions = ['txt', 'pdf', 'doc', 'docx', 'ppt', 'pptx', 'jpg', 'jpeg', 'png'];
        if (!ext || !validExtensions.includes(ext)) {
            showToast('Invalid file type. Please upload a document or image.', 'error');
            return false;
        }

        // Check MIME type for extra security
        const validMimeTypes = [
            'text/plain',
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-powerpoint',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'image/jpeg',
            'image/png',
        ];

        if (file.type && !validMimeTypes.includes(file.type)) {
            showToast('Invalid file type detected.', 'error');
            return false;
        }

        return true;
    };

    const handleGenerate = () => {
        // Allow generation with either uploaded file or stored content
        if (!uploadedFile && !content) return;
        setIsGenerating(true);
        // Backend will handle quiz generation
        setTimeout(() => {
            onGenerate({ file: uploadedFile, questionType, questionCount, difficulty }, content);
            setIsGenerating(false);
            onClose();
        }, 2000);
    };

    // Check if we have content to generate quiz from (either from file or from message)
    const hasContent = uploadedFile || content;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative w-full max-w-lg bg-card/95 backdrop-blur-xl border border-border/50 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-border/50 sticky top-0 bg-card/95 backdrop-blur-xl z-20">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shadow-lg shadow-primary/10">
                            <HelpCircle className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-foreground">Generate Quiz</h2>
                            <p className="text-[10px] text-muted-foreground">Create practice questions</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 hover:bg-muted/50 rounded-full transition-colors text-muted-foreground hover:text-foreground"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-5 pb-24 space-y-5">
                    {/* File Upload */}
                    <div className="space-y-2">
                        <label className="text-xs font-semibold flex items-center gap-2 text-foreground/80">
                            <FileText className="w-3.5 h-3.5" />
                            Upload Study Material
                        </label>
                        <button
                            type="button"
                            aria-label={uploadedFile ? `Selected file: ${uploadedFile.name}. Click to change` : "Upload study material"}
                            className={cn(
                                "w-full border border-dashed border-border rounded-xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all hover:bg-muted/20 hover:border-primary/30 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 focus:ring-offset-background",
                                uploadedFile && "border-primary/50 bg-primary/5",
                                isDragging && "border-primary bg-primary/10 scale-[1.02]"
                            )}
                            onClick={() => document.getElementById("quiz-file-input")?.click()}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                    e.preventDefault();
                                    document.getElementById("quiz-file-input")?.click();
                                }
                            }}
                            onDragEnter={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setIsDragging(true);
                            }}
                            onDragLeave={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setIsDragging(false);
                            }}
                            onDragOver={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                            }}
                            onDrop={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setIsDragging(false);
                                const file = e.dataTransfer.files?.[0];
                                if (file && validateFile(file)) {
                                    setUploadedFile(file);
                                }
                            }}
                        >
                            <input
                                id="quiz-file-input"
                                type="file"
                                accept=".txt,.pdf,.doc,.docx,.ppt,.pptx,image/*"
                                className="hidden"
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file && validateFile(file)) {
                                        setUploadedFile(file);
                                    }
                                }}
                            />
                            <Upload className={cn(
                                "w-6 h-6 transition-transform",
                                uploadedFile ? "text-primary" : "text-muted-foreground",
                                isDragging && "scale-110 text-primary"
                            )} />
                            {uploadedFile ? (
                                <div className="text-center">
                                    <span className="text-sm font-medium text-primary">{uploadedFile.name}</span>
                                    <p className="text-[10px] text-muted-foreground mt-0.5">Click to change</p>
                                </div>
                            ) : (
                                <div className="text-center">
                                    <p className="text-xs font-medium text-muted-foreground">
                                        {isDragging ? "Drop file here" : "Drop file or click to browse"}
                                    </p>
                                </div>
                            )}
                        </button>
                    </div>

                    {/* Question Type */}
                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-foreground/80">Question Type</label>
                        <div className="grid grid-cols-2 gap-2">
                            {questionTypes.map((type) => {
                                const Icon = type.icon;
                                return (
                                    <button
                                        key={type.id}
                                        onClick={() => setQuestionType(type.id)}
                                        className={cn(
                                            "p-3 rounded-xl border text-left transition-all group",
                                            questionType === type.id
                                                ? "border-primary/50 bg-primary/10"
                                                : "border-border/50 hover:bg-muted/50"
                                        )}
                                    >
                                        <div className="flex items-center gap-2.5">
                                            <div className={cn(
                                                "w-8 h-8 rounded-lg flex items-center justify-center transition-colors shrink-0",
                                                questionType === type.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground group-hover:text-foreground"
                                            )}>
                                                <Icon className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <div className="font-medium text-sm text-foreground">{type.name}</div>
                                                <div className="text-[10px] text-muted-foreground leading-tight mt-0.5">{type.description}</div>
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Question Count & Difficulty Row */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-foreground/80">Question Count</label>
                            <div className="flex items-center gap-2 bg-secondary/30 rounded-xl p-1 border border-border/50">
                                <button
                                    onClick={() => setQuestionCount(Math.max(5, questionCount - 5))}
                                    className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-background transition-colors text-muted-foreground hover:text-foreground"
                                >
                                    <Minus className="w-3.5 h-3.5" />
                                </button>
                                <div className="flex-1 text-center font-bold text-lg text-primary">
                                    {questionCount}
                                </div>
                                <button
                                    onClick={() => setQuestionCount(Math.min(50, questionCount + 5))}
                                    className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-background transition-colors text-muted-foreground hover:text-foreground"
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-foreground/80">Difficulty</label>
                            <div className="flex gap-1 bg-secondary/30 rounded-xl p-1 border border-border/50 h-[42px]">
                                {difficulties.map((d) => (
                                    <button
                                        key={d.id}
                                        onClick={() => setDifficulty(d.id)}
                                        className={cn(
                                            "flex-1 rounded-lg text-xs font-medium transition-all flex items-center justify-center",
                                            difficulty === d.id ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                                        )}
                                    >
                                        {d.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-5 border-t border-border/50 flex items-center justify-between bg-background sticky bottom-0 z-20">
                    <div className="text-[10px] text-muted-foreground font-medium">
                        {hasContent ? "Ready to generate" : "Upload file or use message content"}
                    </div>
                    <button
                        onClick={handleGenerate}
                        disabled={!hasContent || isGenerating}
                        className={cn(
                            "px-5 py-2.5 bg-primary text-primary-foreground rounded-xl font-semibold flex items-center gap-2 transition-all text-sm shadow-lg shadow-primary/20",
                            !hasContent || isGenerating
                                ? "opacity-50 cursor-not-allowed"
                                : "hover:bg-primary/90 hover:scale-105"
                        )}
                    >
                        {isGenerating ? (
                            <>
                                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Generating...
                            </>
                        ) : (
                            <>
                                <Sparkles className="w-4 h-4" />
                                Generate Quiz
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
