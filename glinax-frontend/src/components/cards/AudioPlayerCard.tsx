"use client";

import React, { useState } from "react";
import {
    Play,
    Pause,
    RotateCcw,
    Volume2,
    FastForward,
    ChevronRight,
    Headphones
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AudioPlayerCardProps {
    title: string;
    duration?: string;
}

export function AudioPlayerCard({ title, duration = "2:45" }: AudioPlayerCardProps) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(1);
    const [progress, setProgress] = useState(35);

    const toggleSpeed = () => {
        if (speed === 1) setSpeed(1.5);
        else if (speed === 1.5) setSpeed(2);
        else setSpeed(1);
    };

    return (
        <div className="w-full max-w-sm bg-card border border-border/50 rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-300">
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
                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden cursor-pointer group">
                        <div
                            className="h-full bg-primary rounded-full transition-all duration-300 relative"
                            style={{ width: `${progress}%` }}
                        >
                            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-background border-2 border-primary rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-sm" />
                        </div>
                    </div>
                    <div className="flex justify-between text-[10px] text-muted-foreground font-medium">
                        <span>1:02</span>
                        <span>{duration}</span>
                    </div>
                </div>

                {/* Controls */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                        <button className="p-2 text-muted-foreground hover:text-foreground transition-colors">
                            <RotateCcw className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setIsPlaying(!isPlaying)}
                            className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-lg shadow-primary/20"
                        >
                            {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 ml-0.5 fill-current" />}
                        </button>
                        <button className="p-2 text-muted-foreground hover:text-foreground transition-colors">
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
                        <button className="p-2 text-muted-foreground hover:text-foreground transition-colors">
                            <Volume2 className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Action Footer */}
            <button className="w-full py-2.5 bg-secondary/50 hover:bg-secondary text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-all flex items-center justify-center gap-1 border-t border-border/50">
                Review Transcripts
                <ChevronRight className="w-3 h-3" />
            </button>
        </div>
    );
}
