"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";

type FeatureType = "summarize" | "quiz" | "tts" | "stt";

interface AsyncFeatureStatusProps {
    feature: FeatureType;
    isActive: boolean;
}

const STATUS_STEPS: Record<FeatureType, string[]> = {
    summarize: [
        "Preparing your summary...",
        "Analyzing your content...",
        "Drafting key points...",
        "Polishing the final output..."
    ],
    quiz: [
        "Preparing your quiz...",
        "Analyzing study material...",
        "Drafting questions...",
        "Finalizing question set..."
    ],
    tts: [
        "Preparing audio generation...",
        "Processing your text...",
        "Synthesizing voice output...",
        "Finalizing audio..."
    ],
    stt: [
        "Preparing transcription...",
        "Analyzing your audio...",
        "Building notes from transcript...",
        "Finalizing your notes..."
    ],
};

const STEP_DURATION_MS = 2200;

const formatElapsed = (elapsedMs: number) => {
    const seconds = Math.max(0, Math.floor(elapsedMs / 1000));
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
};

export function AsyncFeatureStatus({ feature, isActive }: AsyncFeatureStatusProps) {
    const [elapsedMs, setElapsedMs] = useState(0);

    useEffect(() => {
        if (!isActive) {
            setElapsedMs(0);
            return;
        }
        const start = Date.now();
        const timer = window.setInterval(() => {
            setElapsedMs(Date.now() - start);
        }, 300);

        return () => {
            window.clearInterval(timer);
        };
    }, [isActive]);

    const status = useMemo(() => {
        const steps = STATUS_STEPS[feature];
        const index = Math.min(Math.floor(elapsedMs / STEP_DURATION_MS), steps.length - 1);
        return steps[index];
    }, [elapsedMs, feature]);

    if (!isActive) return null;

    return (
        <div
            className="mt-2 flex items-center justify-between rounded-lg border border-border/50 bg-background/60 px-3 py-2"
            role="status"
            aria-live="polite"
            aria-busy={isActive}
        >
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                <span>{status}</span>
            </div>
            <span className="text-[11px] font-medium text-muted-foreground/80">{formatElapsed(elapsedMs)}</span>
        </div>
    );
}
