"use client";

import React, { useState } from "react";
import {
    X,
    Upload,
    Headphones,
    Play,
    Volume2,
    FileText,
    Type
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TTSModalProps {
    isOpen: boolean;
    onClose: () => void;
    onGenerate: (text: string, voice: string) => Promise<void> | void;
}

const voices = [
    { id: "alloy", name: "Alloy", description: "Neutral and balanced" },
    { id: "echo", name: "Echo", description: "Warm and conversational" },
    { id: "fable", name: "Fable", description: "Expressive and dramatic" },
    { id: "onyx", name: "Onyx", description: "Deep and authoritative" },
    { id: "nova", name: "Nova", description: "Friendly and upbeat" },
    { id: "shimmer", name: "Shimmer", description: "Clear and articulate" },
];

export function TTSModal({ isOpen, onClose, onGenerate }: TTSModalProps) {
    const [inputMode, setInputMode] = useState<"text" | "file">("text");
    const [text, setText] = useState("");
    const [selectedVoice, setSelectedVoice] = useState("nova");
    const [uploadedFile, setUploadedFile] = useState<File | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);

    if (!isOpen) return null;

    const handleGenerate = async () => {
        setIsGenerating(true);
        try {
            await onGenerate(text, selectedVoice);
            onClose();
        } finally {
            setIsGenerating(false);
        }
    };

    const handleFileDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (file) setUploadedFile(file);
    };

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
                <div className="flex items-center justify-between px-5 py-4 border-b border-border/50">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shadow-lg shadow-primary/10">
                            <Headphones className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-foreground">Text to Speech</h2>
                            <p className="text-[10px] text-muted-foreground">Convert text to high-quality audio</p>
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
                    {/* Input Mode Toggle */}
                    <div className="flex p-1 bg-muted/50 rounded-lg w-full">
                        <button
                            onClick={() => setInputMode("text")}
                            className={cn(
                                "flex-1 flex items-center justify-center gap-2 py-1.5 rounded-md text-xs font-medium transition-all",
                                inputMode === "text" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <Type className="w-3 h-3" />
                            Type Text
                        </button>
                        <button
                            onClick={() => setInputMode("file")}
                            className={cn(
                                "flex-1 flex items-center justify-center gap-2 py-1.5 rounded-md text-xs font-medium transition-all",
                                inputMode === "file" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <FileText className="w-3 h-3" />
                            Upload File
                        </button>
                    </div>

                    {/* Input Area */}
                    {inputMode === "text" ? (
                        <textarea
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            placeholder="Enter text to convert..."
                            className="w-full h-32 p-3 bg-muted/20 border border-border/50 rounded-xl resize-none focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all text-sm placeholder:text-muted-foreground/50"
                        />
                    ) : (
                        <div
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={handleFileDrop}
                            className={cn(
                                "h-32 border border-dashed border-border/50 rounded-xl flex flex-col items-center justify-center gap-2 cursor-pointer transition-all hover:bg-muted/20 hover:border-primary/30",
                                uploadedFile && "border-primary/50 bg-primary/5"
                            )}
                            onClick={() => document.getElementById("tts-file-input")?.click()}
                        >
                            <input
                                id="tts-file-input"
                                type="file"
                                accept=".txt,.pdf,.doc,.docx"
                                className="hidden"
                                onChange={(e) => e.target.files?.[0] && setUploadedFile(e.target.files[0])}
                            />
                            <Upload className={cn("w-6 h-6", uploadedFile ? "text-primary" : "text-muted-foreground")} />
                            {uploadedFile ? (
                                <span className="text-xs font-medium text-primary">{uploadedFile.name}</span>
                            ) : (
                                <div className="text-center">
                                    <p className="text-xs font-medium text-muted-foreground">Drop file or click to browse</p>
                                    <p className="text-[10px] text-muted-foreground/50 mt-1">TXT, PDF, DOC supported</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Voice Selection */}
                    <div className="space-y-2">
                        <label className="text-xs font-medium flex items-center gap-1.5 text-muted-foreground">
                            <Volume2 className="w-3 h-3" />
                            Select Voice
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                            {voices.map((voice) => (
                                <button
                                    key={voice.id}
                                    onClick={() => setSelectedVoice(voice.id)}
                                    className={cn(
                                        "p-2 rounded-lg border text-left transition-all relative overflow-hidden group",
                                        selectedVoice === voice.id
                                            ? "border-primary/50 bg-primary/10"
                                            : "border-border/50 bg-muted/20 hover:border-border hover:bg-muted/40"
                                    )}
                                >
                                    <div className="flex items-center justify-between mb-0.5">
                                        <span className={cn("text-xs font-medium", selectedVoice === voice.id ? "text-primary" : "text-foreground")}>
                                            {voice.name}
                                        </span>
                                        {selectedVoice === voice.id && (
                                            <Play className="w-2 h-2 text-primary fill-current" />
                                        )}
                                    </div>
                                    <span className="text-[10px] text-muted-foreground/70 truncate block">{voice.description}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-border/50 bg-muted/20 flex items-center justify-between">
                    <div className="text-[10px] text-muted-foreground font-medium pl-1">
                        {text.length > 0 ? `${text.split(/\s+/).filter(Boolean).length} words` : "Ready to generate"}
                    </div>
                    <button
                        onClick={handleGenerate}
                        disabled={!text && !uploadedFile || isGenerating}
                        className={cn(
                            "px-4 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-semibold flex items-center gap-2 transition-all shadow-lg shadow-primary/10",
                            (!text && !uploadedFile) || isGenerating
                                ? "opacity-50 cursor-not-allowed grayscale"
                                : "hover:shadow-primary/25 hover:scale-[1.02]"
                        )}
                    >
                        {isGenerating ? (
                            <>
                                <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Generating...
                            </>
                        ) : (
                            <>
                                <Headphones className="w-3 h-3" />
                                Generate Audio
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
