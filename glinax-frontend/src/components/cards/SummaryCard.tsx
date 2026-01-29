"use client";

import React from "react";
import {
    FileText,
    Lightbulb,
    Copy,
    Share2,
    Bookmark
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SummaryCardProps {
    title: string;
    summary: string;
    takeaways: string[];
}

export function SummaryCard({ title, summary, takeaways }: SummaryCardProps) {
    return (
        <div className="w-full max-w-2xl bg-card border border-border/50 rounded-3xl overflow-hidden shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="p-6 border-b border-border/50 flex items-start justify-between bg-primary/5">
                <div className="flex gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground shadow-lg shadow-primary/20">
                        <FileText className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold leading-tight">{title}</h3>
                        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mt-1">AI-Generated Summary</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors">
                        <Copy className="w-4 h-4" />
                    </button>
                    <button className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors">
                        <Bookmark className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Body */}
            <div className="p-6 space-y-6">
                <div className="space-y-4">
                    <h4 className="text-xs font-bold text-primary uppercase tracking-widest flex items-center gap-2">
                        <div className="w-1 h-3 bg-primary rounded-full" />
                        The Gist
                    </h4>
                    <p className="text-sm leading-relaxed text-foreground/80 font-medium">
                        {summary}
                    </p>
                </div>

                <div className="p-6 bg-secondary/40 rounded-2xl border border-border/50 space-y-4">
                    <h4 className="text-xs font-bold text-foreground/60 uppercase tracking-widest flex items-center gap-2">
                        <Lightbulb className="w-3.5 h-3.5" />
                        Key Takeaways
                    </h4>
                    <ul className="space-y-3">
                        {takeaways.map((point, i) => (
                            <li key={i} className="flex gap-3 text-sm">
                                <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0 mt-0.5">
                                    <span className="text-[10px] font-bold">{i + 1}</span>
                                </div>
                                <span className="font-medium">{point}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-secondary/20 flex items-center justify-between border-t border-border/50">
                <div className="flex -space-x-2">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="w-6 h-6 rounded-full border-2 border-background bg-muted flex items-center justify-center text-[8px] font-bold overflow-hidden">
                            <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${i}`} alt="user" />
                        </div>
                    ))}
                    <div className="pl-4 text-[10px] text-muted-foreground font-medium">
                        Shared with 3 classmates
                    </div>
                </div>
                <button className="text-[10px] font-bold text-primary flex items-center gap-1 hover:underline">
                    <Share2 className="w-3 h-3" />
                    Share Summary
                </button>
            </div>
        </div>
    );
}
