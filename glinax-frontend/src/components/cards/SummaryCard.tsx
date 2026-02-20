"use client";

import React, { useMemo, useState } from "react";
import {
    FileText,
    Lightbulb,
    Copy,
    Share2,
    Bookmark,
    ChevronDown,
    RotateCcw,
    Check
} from "lucide-react";

interface SummaryCardProps {
    title: string;
    summary: string;
    takeaways: string[];
    keyTerms?: Array<{ term: string; definition: string }>;
    onRetry?: () => void;
}

const BOOKMARK_STORAGE_KEY = "qwikstudi-summary-bookmarks";

export function SummaryCard({ title, summary, takeaways, keyTerms = [], onRetry }: SummaryCardProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [copied, setCopied] = useState(false);
    const [saved, setSaved] = useState(false);

    const summaryText = useMemo(() => summary?.trim() || "", [summary]);
    const isLongSummary = summaryText.length > 320;
    const visibleSummary = isExpanded || !isLongSummary ? summaryText : `${summaryText.slice(0, 320).trim()}...`;
    const visibleTakeaways = isExpanded ? takeaways : takeaways.slice(0, 3);
    const visibleKeyTerms = isExpanded ? keyTerms : keyTerms.slice(0, 4);

    const buildShareText = () => {
        const lines: string[] = [title, "", "Summary", summaryText];
        if (takeaways.length > 0) {
            lines.push("", "Key Takeaways");
            takeaways.forEach((item, idx) => lines.push(`${idx + 1}. ${item}`));
        }
        if (keyTerms.length > 0) {
            lines.push("", "Key Terms");
            keyTerms.forEach((item) => lines.push(`- ${item.term}: ${item.definition}`));
        }
        return lines.join("\n").trim();
    };

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(buildShareText());
            setCopied(true);
            setTimeout(() => setCopied(false), 1800);
        } catch {
            // ignore clipboard failures
        }
    };

    const handleShare = async () => {
        const text = buildShareText();
        try {
            if (navigator.share) {
                await navigator.share({ title, text });
                return;
            }
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 1800);
        } catch {
            // ignore share/clipboard failures
        }
    };

    const handleBookmark = () => {
        try {
            const current = localStorage.getItem(BOOKMARK_STORAGE_KEY);
            const parsed = current ? JSON.parse(current) : [];
            const entries = Array.isArray(parsed) ? parsed : [];
            const entry = {
                id: `${Date.now()}`,
                title,
                summary: summaryText,
                takeaways,
                keyTerms,
                createdAt: new Date().toISOString(),
            };
            const deduped = entries.filter((item: { summary?: string }) => item?.summary !== summaryText);
            localStorage.setItem(BOOKMARK_STORAGE_KEY, JSON.stringify([entry, ...deduped].slice(0, 50)));
            setSaved(true);
            setTimeout(() => setSaved(false), 1800);
        } catch {
            // ignore storage failures
        }
    };

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
                    <button
                        onClick={handleCopy}
                        className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
                        title={copied ? "Copied" : "Copy summary"}
                    >
                        {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                    </button>
                    <button
                        onClick={handleBookmark}
                        className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
                        title={saved ? "Saved" : "Bookmark summary"}
                    >
                        <Bookmark className={`w-4 h-4 ${saved ? "text-primary fill-current" : ""}`} />
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
                        {visibleSummary}
                    </p>
                    {isLongSummary && (
                        <button
                            onClick={() => setIsExpanded((v) => !v)}
                            className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1"
                        >
                            {isExpanded ? "Show less" : "Show more"}
                            <ChevronDown className={`w-3 h-3 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                        </button>
                    )}
                </div>

                <div className="p-6 bg-secondary/40 rounded-2xl border border-border/50 space-y-4">
                    <h4 className="text-xs font-bold text-foreground/60 uppercase tracking-widest flex items-center gap-2">
                        <Lightbulb className="w-3.5 h-3.5" />
                        Key Takeaways
                    </h4>
                    <ul className="space-y-3">
                        {visibleTakeaways.map((point, i) => (
                            <li key={i} className="flex gap-3 text-sm">
                                <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0 mt-0.5">
                                    <span className="text-[10px] font-bold">{i + 1}</span>
                                </div>
                                <span className="font-medium">{point}</span>
                            </li>
                        ))}
                    </ul>
                    {!isExpanded && takeaways.length > visibleTakeaways.length && (
                        <p className="text-xs text-muted-foreground">+{takeaways.length - visibleTakeaways.length} more takeaways</p>
                    )}
                </div>

                {keyTerms.length > 0 && (
                    <div className="p-6 bg-secondary/25 rounded-2xl border border-border/50 space-y-3">
                        <h4 className="text-xs font-bold text-foreground/60 uppercase tracking-widest">
                            Key Terms
                        </h4>
                        <ul className="space-y-2">
                            {visibleKeyTerms.map((item, i) => (
                                <li key={`${item.term}-${i}`} className="text-sm">
                                    <span className="font-semibold">{item.term}:</span>{" "}
                                    <span className="text-foreground/80">{item.definition}</span>
                                </li>
                            ))}
                        </ul>
                        {!isExpanded && keyTerms.length > visibleKeyTerms.length && (
                            <p className="text-xs text-muted-foreground">+{keyTerms.length - visibleKeyTerms.length} more terms</p>
                        )}
                    </div>
                )}
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
                <div className="flex items-center gap-3">
                    {onRetry && (
                        <button
                            onClick={onRetry}
                            className="text-[10px] font-bold text-muted-foreground flex items-center gap-1 hover:text-foreground"
                            title="Retry summary"
                        >
                            <RotateCcw className="w-3 h-3" />
                            Retry
                        </button>
                    )}
                    <button
                        onClick={handleShare}
                        className="text-[10px] font-bold text-primary flex items-center gap-1 hover:underline"
                    >
                    <Share2 className="w-3 h-3" />
                    Share Summary
                    </button>
                </div>
            </div>
        </div>
    );
}
