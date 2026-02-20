"use client";

import React, { useState } from "react";
import {
    Play,
    Pause,
    RotateCcw,
    Volume2,
    FastForward,
    ChevronRight,
    Headphones,
    Download
} from "lucide-react";
import { cn } from "@/lib/utils";
import api from "@/lib/api";
import { useDataStore } from "@/stores/dataStore";
import { useToast } from "@/components/Toast";

interface AudioPlayerCardProps {
    title: string;
    audioUrl?: string;
    duration?: string;
    transcript?: string;
    ttsId?: number;
}

export function AudioPlayerCard({ title, audioUrl, duration = "2:45", transcript, ttsId }: AudioPlayerCardProps) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(1);
    const [progress, setProgress] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [durationSeconds, setDurationSeconds] = useState(0);
    const [showTranscript, setShowTranscript] = useState(false);
    const [audioSrc, setAudioSrc] = useState<string | undefined>(audioUrl);
    const [candidateIndex, setCandidateIndex] = useState(0);
    const [isDownloading, setIsDownloading] = useState(false);
    const isScrubbingRef = React.useRef(false);
    const audioRef = React.useRef<HTMLAudioElement | null>(null);
    const progressRef = React.useRef<HTMLDivElement | null>(null);
    const plan = useDataStore((state) => state.plan);
    const canDownload = plan === "pro";
    const { showToast } = useToast();

    const buildAudioCandidates = React.useCallback((rawUrl?: string) => {
        if (!rawUrl) return [] as string[];
        const candidates = new Set<string>();
        candidates.add(rawUrl);

        // Legacy malformed path: /media/text_to_speech/text_to_speech/<id>.mp3
        const deduped = rawUrl.replace("/media/text_to_speech/text_to_speech/", "/media/text_to_speech/");
        candidates.add(deduped);

        // Legacy alternate path variant
        if (rawUrl.includes("/media/text_to_speech/") && !rawUrl.includes("/media/text_to_speech/text_to_speech/")) {
            candidates.add(rawUrl.replace("/media/text_to_speech/", "/media/text_to_speech/text_to_speech/"));
        }

        const idMatch = rawUrl.match(/\/(\d+)\.mp3(?:\?|$)/);
        if (idMatch) {
            const id = idMatch[1];
            try {
                const base = new URL(rawUrl, typeof window !== "undefined" ? window.location.origin : undefined);
                candidates.add(`${base.origin}/api/chat/audio/${id}/`);
            } catch {
                // ignore malformed URLs
            }
        }

        return Array.from(candidates);
    }, []);

    const candidates = React.useMemo(() => buildAudioCandidates(audioUrl), [audioUrl, buildAudioCandidates]);

    React.useEffect(() => {
        setCandidateIndex(0);
        setAudioSrc(candidates[0]);
        setIsPlaying(false);
        setProgress(0);
        setCurrentTime(0);
        setDurationSeconds(0);
    }, [candidates]);

    const parseDurationToSeconds = React.useCallback((raw?: string) => {
        if (!raw) return 0;
        const trimmed = raw.trim();
        if (!trimmed) return 0;
        const parts = trimmed.split(":").map((v) => Number(v));
        if (parts.some((v) => Number.isNaN(v) || v < 0)) return 0;
        if (parts.length === 1) return parts[0];
        if (parts.length === 2) return (parts[0] * 60) + parts[1];
        if (parts.length === 3) return (parts[0] * 3600) + (parts[1] * 60) + parts[2];
        return 0;
    }, []);

    const fallbackDurationSeconds = React.useMemo(() => parseDurationToSeconds(duration), [duration, parseDurationToSeconds]);

    const toggleSpeed = () => {
        const next = speed === 1 ? 1.5 : speed === 1.5 ? 2 : 1;
        setSpeed(next);
        if (audioRef.current) {
            audioRef.current.playbackRate = next;
        }
    };

    const togglePlay = async () => {
        if (!audioRef.current) return;
        try {
            if (audioRef.current.paused) {
                await audioRef.current.play();
                setIsPlaying(true);
            } else {
                audioRef.current.pause();
                setIsPlaying(false);
            }
        } catch {
            setIsPlaying(false);
        }
    };

    const handleTimeUpdate = () => {
        if (!audioRef.current || !audioRef.current.duration) return;
        const pct = (audioRef.current.currentTime / audioRef.current.duration) * 100;
        setProgress(Number.isFinite(pct) ? pct : 0);
        setCurrentTime(audioRef.current.currentTime);
    };

    const handleLoadedMetadata = () => {
        if (!audioRef.current) return;
        const d = audioRef.current.duration;
        if (Number.isFinite(d) && d > 0) {
            setDurationSeconds(d);
            const pct = (audioRef.current.currentTime / d) * 100;
            setProgress(Number.isFinite(pct) ? pct : 0);
            setCurrentTime(audioRef.current.currentTime);
        }
    };

    const handleDurationChange = () => {
        if (!audioRef.current) return;
        const d = audioRef.current.duration;
        if (Number.isFinite(d) && d > 0) {
            setDurationSeconds(d);
        }
    };

    const handleEnded = () => {
        setIsPlaying(false);
        setProgress(100);
        const total = durationSeconds || fallbackDurationSeconds;
        if (total > 0) setCurrentTime(total);
    };

    const handleAudioError = () => {
        if (candidateIndex >= candidates.length - 1) {
            setIsPlaying(false);
            return;
        }
        const nextIndex = candidateIndex + 1;
        setCandidateIndex(nextIndex);
        setAudioSrc(candidates[nextIndex]);
    };

    const handleSeek = React.useCallback((clientX: number) => {
        if (!audioRef.current || !progressRef.current || !audioRef.current.duration) return;
        const rect = progressRef.current.getBoundingClientRect();
        const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
        const nextTime = ratio * audioRef.current.duration;
        audioRef.current.currentTime = nextTime;
        setCurrentTime(nextTime);
        setProgress(ratio * 100);
    }, []);

    const stopScrubbing = React.useCallback(() => {
        isScrubbingRef.current = false;
    }, []);

    const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
        handleSeek(e.clientX);
    };

    const handleProgressPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!audioRef.current || !audioRef.current.duration) return;
        isScrubbingRef.current = true;
        e.currentTarget.setPointerCapture(e.pointerId);
        handleSeek(e.clientX);
    };

    const handleProgressPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!isScrubbingRef.current) return;
        handleSeek(e.clientX);
    };

    const handleProgressPointerUp = () => {
        stopScrubbing();
    };

    React.useEffect(() => {
        const onGlobalPointerMove = (e: PointerEvent) => {
            if (!isScrubbingRef.current) return;
            handleSeek(e.clientX);
        };
        const onGlobalPointerEnd = () => {
            stopScrubbing();
        };

        window.addEventListener("pointermove", onGlobalPointerMove);
        window.addEventListener("pointerup", onGlobalPointerEnd);
        window.addEventListener("pointercancel", onGlobalPointerEnd);

        return () => {
            window.removeEventListener("pointermove", onGlobalPointerMove);
            window.removeEventListener("pointerup", onGlobalPointerEnd);
            window.removeEventListener("pointercancel", onGlobalPointerEnd);
        };
    }, [handleSeek, stopScrubbing]);

    const handleProgressKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (!audioRef.current || !audioRef.current.duration) return;
        if (e.key === "ArrowRight") {
            const nextTime = Math.min(audioRef.current.duration, audioRef.current.currentTime + 5);
            audioRef.current.currentTime = nextTime;
            setCurrentTime(nextTime);
            setProgress((nextTime / audioRef.current.duration) * 100);
        } else if (e.key === "ArrowLeft") {
            const nextTime = Math.max(0, audioRef.current.currentTime - 5);
            audioRef.current.currentTime = nextTime;
            setCurrentTime(nextTime);
            setProgress((nextTime / audioRef.current.duration) * 100);
        }
    };

    const handleRewind = () => {
        if (!audioRef.current || !audioRef.current.duration) return;
        const nextTime = Math.max(0, audioRef.current.currentTime - 10);
        audioRef.current.currentTime = nextTime;
        setCurrentTime(nextTime);
        setProgress((nextTime / audioRef.current.duration) * 100);
    };

    const handleForward = () => {
        if (!audioRef.current || !audioRef.current.duration) return;
        const nextTime = Math.min(audioRef.current.duration, audioRef.current.currentTime + 10);
        audioRef.current.currentTime = nextTime;
        setCurrentTime(nextTime);
        setProgress((nextTime / audioRef.current.duration) * 100);
    };

    const formatTime = (seconds: number) => {
        const s = Math.max(0, Math.floor(seconds));
        const m = Math.floor(s / 60);
        const r = s % 60;
        return `${m}:${r.toString().padStart(2, "0")}`;
    };

    const displayDurationSeconds = durationSeconds > 0 ? durationSeconds : fallbackDurationSeconds;

    const handleDownload = async () => {
        if (!canDownload) {
            showToast("Upgrade to Pro to download audio.", "info");
            return;
        }
        if (!ttsId || isDownloading) return;
        setIsDownloading(true);
        try {
            const res = await api.get(`/chat/audio/${ttsId}/download/`, { responseType: "blob" });
            const blob = new Blob([res.data], { type: "audio/mpeg" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `${title || "audio"}.mp3`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } finally {
            setIsDownloading(false);
        }
    };

    return (
        <div className="w-full max-w-sm bg-card border border-border/50 rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-300">
            {audioSrc && (
                <audio
                    ref={audioRef}
                    src={audioSrc}
                    preload="metadata"
                    onTimeUpdate={handleTimeUpdate}
                    onLoadedMetadata={handleLoadedMetadata}
                    onDurationChange={handleDurationChange}
                    onEnded={handleEnded}
                    onError={handleAudioError}
                />
            )}
            <div className="p-4 flex flex-col gap-4">
                {/* Header */}
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground shadow-lg shadow-primary/20">
                        <Headphones className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-semibold truncate">{title}</h4>
                        <p className="text-[10px] text-muted-foreground">Text-to-Speech Generation</p>
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1">
                    <div
                        ref={progressRef}
                        role="slider"
                        tabIndex={0}
                        aria-label="Seek audio"
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={Math.round(progress)}
                        onClick={handleProgressClick}
                        onPointerDown={handleProgressPointerDown}
                        onPointerMove={handleProgressPointerMove}
                        onPointerUp={handleProgressPointerUp}
                        onPointerCancel={handleProgressPointerUp}
                        onKeyDown={handleProgressKey}
                        className={cn(
                            "h-1.5 w-full bg-muted rounded-full overflow-hidden cursor-pointer group touch-none",
                            !audioSrc && "opacity-50 cursor-not-allowed"
                        )}
                    >
                        <div
                            className="h-full bg-primary rounded-full transition-all duration-300 relative"
                            style={{ width: `${progress}%` }}
                        >
                            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-background border-2 border-primary rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-sm" />
                        </div>
                    </div>
                    <div className="flex justify-between text-[10px] text-muted-foreground font-medium">
                        <span>{formatTime(currentTime)}</span>
                        <span>{displayDurationSeconds > 0 ? formatTime(displayDurationSeconds) : "--:--"}</span>
                    </div>
                </div>

                {/* Controls */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                        <button
                            onClick={handleRewind}
                            disabled={!audioSrc}
                            className="p-2 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                        >
                            <RotateCcw className="w-4 h-4" />
                        </button>
                        <button
                            onClick={togglePlay}
                            disabled={!audioSrc}
                            className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
                        >
                            {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 ml-0.5 fill-current" />}
                        </button>
                        <button
                            onClick={handleForward}
                            disabled={!audioSrc}
                            className="p-2 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                        >
                            <FastForward className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={toggleSpeed}
                            className="text-[10px] font-bold px-2 py-1 bg-secondary rounded-md hover:bg-muted transition-colors min-w-[32px]"
                        >
                            {speed}x
                        </button>
                        <button
                            onClick={handleDownload}
                            disabled={!ttsId || isDownloading}
                            title={canDownload ? "Download audio" : "Pro only"}
                            className="p-2 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                        >
                            <Download className="w-4 h-4" />
                        </button>
                        <button className="p-2 text-muted-foreground hover:text-foreground transition-colors">
                            <Volume2 className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Action Footer */}
            <button
                onClick={() => transcript && setShowTranscript((v) => !v)}
                disabled={!transcript}
                className={cn(
                    "w-full py-2.5 bg-secondary/50 hover:bg-secondary text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-all flex items-center justify-center gap-1 border-t border-border/50",
                    !transcript && "opacity-50 cursor-not-allowed"
                )}
            >
                Review Transcript
                <ChevronRight className={cn("w-3 h-3 transition-transform", showTranscript && "rotate-90")} />
            </button>

            {showTranscript && transcript && (
                <div className="px-4 py-3 text-xs text-muted-foreground border-t border-border/50 bg-secondary/20">
                    <p className="whitespace-pre-wrap">{transcript}</p>
                </div>
            )}
        </div>
    );
}
