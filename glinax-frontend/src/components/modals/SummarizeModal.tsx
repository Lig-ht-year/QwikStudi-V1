"use client";

import React, { useState, useEffect } from "react";
import {
    X,
    Upload,
    FileText,
    Sparkles,
    Settings2,
    List,
    AlignLeft
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useDataStore } from "@/stores/dataStore";

interface SummarizeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onGenerate: (file: File | null, options: SummaryOptions, content?: string) => void;
    initialContent?: string;
}

interface SummaryOptions {
    length: "brief" | "detailed" | "comprehensive";
    format: "bullets" | "paragraphs";
    includeKeyTerms: boolean;
}

const lengthOptions = [
    { id: "brief", name: "Brief", description: "Key points only", words: "~100 words" },
    { id: "detailed", name: "Detailed", description: "Main concepts + examples", words: "~300 words" },
    { id: "comprehensive", name: "Comprehensive", description: "Full coverage", words: "~500 words" },
];

export function SummarizeModal({ isOpen, onClose, onGenerate, initialContent }: SummarizeModalProps) {
    const [uploadedFile, setUploadedFile] = useState<File | null>(null);
    const [length, setLength] = useState<"brief" | "detailed" | "comprehensive">("detailed");
    const [format, setFormat] = useState<"bullets" | "paragraphs">("bullets");
    const [includeKeyTerms, setIncludeKeyTerms] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);
    const clearSelectedContent = useDataStore((state) => state.clearSelectedContent);

    // Get content from store when modal opens (if no initialContent prop)
    const content = initialContent || useDataStore.getState().selectedContent.content;

    // Clear selected content when modal closes
    useEffect(() => {
        if (!isOpen) {
            clearSelectedContent();
        }
    }, [isOpen, clearSelectedContent]);

    if (!isOpen) return null;

    const handleGenerate = () => {
        setIsGenerating(true);
        // Backend will handle summarization
        setTimeout(() => {
            onGenerate(uploadedFile, { length, format, includeKeyTerms }, content);
            setIsGenerating(false);
            onClose();
        }, 2000);
    };

    // Check if we have content to summarize (either from file or from message)
    const hasContent = uploadedFile || content;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative w-full max-w-lg bg-card/95 backdrop-blur-xl border border-border/50 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-border/50 bg-card/95 backdrop-blur-xl">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shadow-lg shadow-primary/10">
                            <FileText className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-foreground">Summarize Document</h2>
                            <p className="text-[10px] text-muted-foreground">Get concise summaries</p>
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
                <div className="p-5 space-y-5">
                    {/* File Upload */}
                    <div
                        className={cn(
                            "border border-dashed border-border rounded-xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all hover:bg-muted/20 hover:border-primary/30",
                            uploadedFile && "border-primary/50 bg-primary/5"
                        )}
                        onClick={() => document.getElementById("summarize-file-input")?.click()}
                    >
                        <input
                            id="summarize-file-input"
                            type="file"
                            accept=".txt,.pdf,.doc,.docx,.ppt,.pptx"
                            className="hidden"
                            onChange={(e) => e.target.files?.[0] && setUploadedFile(e.target.files[0])}
                        />
                        <Upload className={cn("w-6 h-6", uploadedFile ? "text-primary" : "text-muted-foreground")} />
                        {uploadedFile ? (
                            <div className="text-center">
                                <span className="text-sm font-medium text-primary">{uploadedFile.name}</span>
                                <p className="text-[10px] text-muted-foreground mt-0.5">Click to change</p>
                            </div>
                        ) : (
                            <div className="text-center">
                                <p className="text-xs font-medium text-muted-foreground">Drop file or click to browse</p>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {/* Summary Length */}
                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-foreground/80 flex items-center gap-1.5">
                                <Settings2 className="w-3.5 h-3.5" />
                                Length
                            </label>
                            <div className="flex flex-col gap-1.5">
                                {lengthOptions.map((option) => (
                                    <button
                                        key={option.id}
                                        onClick={() => setLength(option.id as typeof length)}
                                        className={cn(
                                            "px-3 py-2 rounded-lg border text-left transition-all flex items-center justify-between group",
                                            length === option.id
                                                ? "border-primary/50 bg-primary/10"
                                                : "border-border/50 hover:bg-muted/50"
                                        )}
                                    >
                                        <div className="flex flex-col">
                                            <span className={cn("text-xs font-medium", length === option.id ? "text-primary" : "text-foreground")}>
                                                {option.name}
                                            </span>
                                            <span className="text-[10px] text-muted-foreground">{option.words}</span>
                                        </div>
                                        {length === option.id && <div className="w-1.5 h-1.5 rounded-full bg-primary" />}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Format & Key Terms */}
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-foreground/80">Format</label>
                                <div className="flex flex-col gap-1.5">
                                    <button
                                        onClick={() => setFormat("bullets")}
                                        className={cn(
                                            "w-full px-3 py-2 rounded-lg border flex items-center gap-2 transition-all text-xs font-medium",
                                            format === "bullets"
                                                ? "border-primary/50 bg-primary/10 text-primary"
                                                : "border-border/50 hover:bg-muted/50 text-muted-foreground"
                                        )}
                                    >
                                        <List className="w-3.5 h-3.5" />
                                        Bullet Points
                                    </button>
                                    <button
                                        onClick={() => setFormat("paragraphs")}
                                        className={cn(
                                            "w-full px-3 py-2 rounded-lg border flex items-center gap-2 transition-all text-xs font-medium",
                                            format === "paragraphs"
                                                ? "border-primary/50 bg-primary/10 text-primary"
                                                : "border-border/50 hover:bg-muted/50 text-muted-foreground"
                                        )}
                                    >
                                        <AlignLeft className="w-3.5 h-3.5" />
                                        Paragraphs
                                    </button>
                                </div>
                            </div>

                            <label className="flex items-center justify-between p-3 bg-secondary/30 rounded-xl cursor-pointer hover:bg-secondary/50 transition-colors">
                                <div className="flex items-center gap-2">
                                    <Sparkles className="w-3.5 h-3.5 text-primary" />
                                    <span className="text-xs font-medium">Key Terms</span>
                                </div>
                                <div className={cn(
                                    "w-8 h-5 rounded-full transition-all relative",
                                    includeKeyTerms ? "bg-primary" : "bg-muted"
                                )}>
                                    <div className={cn(
                                        "absolute top-1 w-3 h-3 rounded-full bg-white shadow-sm transition-all",
                                        includeKeyTerms ? "right-1" : "left-1"
                                    )} />
                                </div>
                                <input
                                    type="checkbox"
                                    checked={includeKeyTerms}
                                    onChange={(e) => setIncludeKeyTerms(e.target.checked)}
                                    className="hidden"
                                />
                            </label>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-5 border-t border-border/50 flex items-center justify-end bg-muted/20">
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
                                Summarizing...
                            </>
                        ) : (
                            <>
                                <Sparkles className="w-4 h-4" />
                                Generate Summary
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
