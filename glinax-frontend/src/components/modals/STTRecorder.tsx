"use client";

import React, { useState, useEffect, useRef } from "react";
import {
    X,
    Mic,
    Square,
    FileAudio,
    Pause,
    Play
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AsyncFeatureStatus } from "@/components/AsyncFeatureStatus";

interface STTRecorderProps {
    isOpen: boolean;
    onClose: () => void;
    onProcess: (audioFile: File, durationMs?: number) => Promise<void> | void;
}

export function STTRecorder({ isOpen, onClose, onProcess }: STTRecorderProps) {
    const [isRecording, setIsRecording] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [audioLevel, setAudioLevel] = useState(0);
    const [uploadedFile, setUploadedFile] = useState<File | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const chunksRef = useRef<BlobPart[]>([]);
    const stopResolveRef = useRef<((file: File | null) => void) | null>(null);
    const discardNextStopRef = useRef(false);
    const recordingStartRef = useRef<number | null>(null);
    const recordingDurationRef = useRef<number>(0);
    const waveformBars = 40;

    useEffect(() => {
        if (isRecording && !isPaused) {
            timerRef.current = setInterval(() => {
                setRecordingTime((t) => t + 1000);
                setAudioLevel(Math.random() * 100);
            }, 1000);
        } else {
            if (timerRef.current) clearInterval(timerRef.current);
        }
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [isRecording, isPaused]);

    if (!isOpen) return null;

    const formatTime = (ms: number) => {
        const totalSeconds = Math.floor(ms / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
    };

    const cleanupStream = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
        }
    };

    const resetRecorderState = () => {
        setIsRecording(false);
        setIsPaused(false);
        setRecordingTime(0);
        setAudioLevel(0);
        chunksRef.current = [];
        mediaRecorderRef.current = null;
        cleanupStream();
    };

    const getFileExtension = (mimeType: string) => {
        if (mimeType.includes("webm")) return "webm";
        if (mimeType.includes("ogg")) return "ogg";
        if (mimeType.includes("mp4")) return "mp4";
        if (mimeType.includes("mpeg")) return "mp3";
        return "webm";
    };

    const getSupportedMimeType = () => {
        const candidates = [
            "audio/webm;codecs=opus",
            "audio/webm",
            "audio/ogg;codecs=opus",
            "audio/ogg",
        ];
        for (const type of candidates) {
            if (MediaRecorder.isTypeSupported(type)) {
                return type;
            }
        }
        return "";
    };

    const startRecording = async () => {
        if (isProcessing) return;
        if (!navigator.mediaDevices?.getUserMedia) {
            alert("Audio recording is not supported in this browser.");
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;
            const preferredMime = getSupportedMimeType();
            const recorder = preferredMime
                ? new MediaRecorder(stream, { mimeType: preferredMime, audioBitsPerSecond: 128000 })
                : new MediaRecorder(stream, { audioBitsPerSecond: 128000 });
            mediaRecorderRef.current = recorder;
            chunksRef.current = [];
            recordingStartRef.current = performance.now();
            recordingDurationRef.current = 0;

            recorder.ondataavailable = (event) => {
                if (event.data && event.data.size > 0) {
                    chunksRef.current.push(event.data);
                }
            };

            recorder.onstop = () => {
                const shouldDiscard = discardNextStopRef.current;
                discardNextStopRef.current = false;

                const blob = new Blob(chunksRef.current, {
                    type: recorder.mimeType || "audio/webm",
                });
                chunksRef.current = [];
                cleanupStream();

                if (shouldDiscard) {
                    stopResolveRef.current?.(null);
                    stopResolveRef.current = null;
                    return;
                }

                const durationMs = recordingStartRef.current
                    ? Math.max(0, performance.now() - recordingStartRef.current)
                    : 0;
                recordingDurationRef.current = durationMs;

                if (durationMs < 1000) {
                    alert("Recording is too short. Please record at least 1 second and try again.");
                    stopResolveRef.current?.(null);
                    stopResolveRef.current = null;
                    return;
                }

                const ext = getFileExtension(blob.type || "audio/webm");
                const file = blob.size
                    ? new File([blob], `lecture-recording-${Date.now()}.${ext}`, { type: blob.type || "audio/webm" })
                    : null;

                stopResolveRef.current?.(file);
                stopResolveRef.current = null;
            };

            recorder.start(250);
            setIsRecording(true);
            setIsPaused(false);
            setRecordingTime(0);
            setUploadedFile(null);
        } catch (error) {
            console.error("Failed to start recording:", error);
            cleanupStream();
            alert("Unable to access your microphone. Please allow microphone permissions and try again.");
        }
    };

    const stopRecording = async () => {
        if (!mediaRecorderRef.current || mediaRecorderRef.current.state === "inactive") {
            return;
        }

        discardNextStopRef.current = false;
        setIsProcessing(true);
        setIsRecording(false);
        setIsPaused(false);
        try {
            const recordedFile = await new Promise<File | null>((resolve) => {
                stopResolveRef.current = resolve;
                mediaRecorderRef.current?.stop();
            });

            if (!recordedFile) {
                setIsProcessing(false);
                resetRecorderState();
                return;
            }

            const durationMs = recordingDurationRef.current || recordingTime * 100;
            await onProcess(recordedFile, durationMs);
            setIsProcessing(false);
            resetRecorderState();
            onClose();
        } catch (error) {
            console.error("Recording processing failed:", error);
            setIsProcessing(false);
        }
    };

    const togglePause = () => {
        const recorder = mediaRecorderRef.current;
        if (!recorder) return;

        if (recorder.state === "recording") {
            recorder.pause();
            setIsPaused(true);
        } else if (recorder.state === "paused") {
            recorder.resume();
            setIsPaused(false);
        }
    };

    const handleClose = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
            discardNextStopRef.current = true;
            mediaRecorderRef.current.stop();
        }
        resetRecorderState();
        setUploadedFile(null);
        setIsProcessing(false);
        onClose();
    };

    const handleProcessUpload = async () => {
        if (!uploadedFile) return;
        setIsProcessing(true);
        try {
            await onProcess(uploadedFile);
            setIsProcessing(false);
            setUploadedFile(null);
            resetRecorderState();
            onClose();
        } catch (error) {
            console.error("Upload processing failed:", error);
            setIsProcessing(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={handleClose}
            />

            {/* Modal */}
            <div className="relative w-full max-w-md bg-card/95 backdrop-blur-xl border border-border/50 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-border/50">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shadow-lg shadow-primary/10">
                            <Mic className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-foreground">Record Lecture</h2>
                            <p className="text-[10px] text-muted-foreground">Voice to text</p>
                        </div>
                    </div>
                    <button
                        onClick={handleClose}
                        className="p-1.5 hover:bg-muted/50 rounded-full transition-colors text-muted-foreground hover:text-foreground"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-5 space-y-6">
                    {/* Waveform Visualizer */}
                    <div className="h-16 flex items-center justify-center gap-[3px]">
                        {Array.from({ length: waveformBars }).map((_, i) => {
                            const height = isRecording && !isPaused
                                ? Math.max(20, Math.min(100, audioLevel + (Math.random() * 30 - 15)))
                                : 20;
                            return (
                                <div
                                    key={i}
                                    className={cn(
                                        "w-1 rounded-full transition-all duration-100",
                                        isRecording ? "bg-primary" : "bg-muted-foreground/20"
                                    )}
                                    style={{ height: `${height}%` }}
                                />
                            );
                        })}
                    </div>

                    {/* Timer */}
                    <div className="text-center">
                        <div className="text-4xl font-mono font-bold tracking-tight text-foreground">
                            {formatTime(recordingTime)}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1.5 font-medium">
                            {isRecording ? (isPaused ? "Paused" : "Recording in progress") : "Ready to record"}
                        </div>
                    </div>

                    {/* Controls */}
                    <div className="flex items-center justify-center gap-4">
                        {!isRecording ? (
                            <button
                                onClick={startRecording}
                                className="w-16 h-16 rounded-full bg-primary flex items-center justify-center hover:bg-primary/90 transition-all hover:scale-105 shadow-lg shadow-primary/30"
                            >
                                <Mic className="w-7 h-7 text-primary-foreground" />
                            </button>
                        ) : (
                            <>
                                <button
                                    onClick={togglePause}
                                    className="w-12 h-12 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-all text-foreground"
                                >
                                    {isPaused ? <Play className="w-5 h-5 fill-current" /> : <Pause className="w-5 h-5 fill-current" />}
                                </button>
                                <button
                                    onClick={stopRecording}
                                    disabled={isProcessing}
                                    className={cn(
                                        "w-16 h-16 rounded-full bg-destructive flex items-center justify-center transition-all shadow-lg shadow-destructive/30",
                                        isProcessing ? "opacity-50" : "hover:bg-destructive/90 hover:scale-105"
                                    )}
                                >
                                    {isProcessing ? (
                                        <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <Square className="w-5 h-5 text-white fill-white" />
                                    )}
                                </button>
                            </>
                        )}
                    </div>

                    {/* Divider */}
                    <div className="relative py-2">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-border/50" />
                        </div>
                        <div className="relative flex justify-center text-[10px] uppercase tracking-wider font-semibold">
                            <span className="bg-card px-3 text-muted-foreground/60">Or upload audio</span>
                        </div>
                    </div>

                    {/* File Upload */}
                    <div
                        className={cn(
                            "border border-dashed border-border rounded-xl p-4 flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all hover:bg-muted/20 hover:border-primary/30",
                            uploadedFile && "border-primary/50 bg-primary/5"
                        )}
                        onClick={() => document.getElementById("stt-file-input")?.click()}
                    >
                        <input
                            id="stt-file-input"
                            type="file"
                            accept="audio/*"
                            className="hidden"
                            onChange={(e) => e.target.files?.[0] && setUploadedFile(e.target.files[0])}
                        />
                        <FileAudio className={cn("w-5 h-5", uploadedFile ? "text-primary" : "text-muted-foreground")} />
                        {uploadedFile ? (
                            <span className="text-xs font-medium text-primary">{uploadedFile.name}</span>
                        ) : (
                            <div className="text-center">
                                <p className="text-xs font-medium text-muted-foreground">Drop audio file or click</p>
                            </div>
                        )}
                    </div>

                    {uploadedFile && (
                        <button
                            onClick={handleProcessUpload}
                            disabled={isProcessing}
                            className="w-full py-2.5 bg-primary text-primary-foreground rounded-lg font-semibold flex items-center justify-center gap-2 hover:bg-primary/90 transition-all text-xs shadow-lg shadow-primary/20"
                        >
                            {isProcessing ? (
                                <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <Mic className="w-3 h-3" />
                            )}
                            Generate Notes
                        </button>
                    )}
                    <AsyncFeatureStatus feature="stt" isActive={isProcessing} />
                </div>
            </div>
        </div>
    );
}
