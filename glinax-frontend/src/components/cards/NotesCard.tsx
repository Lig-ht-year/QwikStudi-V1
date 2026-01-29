"use client";

import React from "react";
import {
    Mic,
    Clock,
    Calendar,
    MoreVertical,
    Download,
    Share2
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NotesCardProps {
    title: string;
    notes: string[];
    duration?: string;
    date?: string;
}

export function NotesCard({
    title,
    notes,
    duration = "15:20",
    date = new Date().toLocaleDateString()
}: NotesCardProps) {
    return (
        <div className="w-full max-w-2xl bg-card border border-border/50 rounded-3xl overflow-hidden shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="p-5 border-b border-border/50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-red-500 flex items-center justify-center text-white shadow-lg shadow-red-500/20">
                        <Mic className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-base font-bold leading-none">{title}</h3>
                        <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                            <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {duration}
                            </span>
                            <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {date}
                            </span>
                        </div>
                    </div>
                </div>
                <button className="p-2 text-muted-foreground hover:text-foreground rounded-lg transition-colors">
                    <MoreVertical className="w-4 h-4" />
                </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
                <div className="prose prose-sm dark:prose-invert max-w-none">
                    <ul className="space-y-3 m-0 p-0 list-none">
                        {notes.map((note, i) => (
                            <li key={i} className="flex gap-3 text-sm leading-relaxed group">
                                <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-red-500 shrink-0 group-hover:scale-125 transition-transform" />
                                <span className="text-foreground/90 font-medium">{note}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>

            {/* Footer Actions */}
            <div className="px-6 py-4 bg-secondary/20 flex gap-3 border-t border-border/50">
                <button className="flex-1 py-2 rounded-xl bg-background border border-border/50 text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-accent transition-all">
                    <Download className="w-3.5 h-3.5" />
                    Export PDF
                </button>
                <button className="flex-1 py-2 rounded-xl bg-background border border-border/50 text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-accent transition-all">
                    <Share2 className="w-3.5 h-3.5" />
                    Share Notes
                </button>
            </div>
        </div>
    );
}
