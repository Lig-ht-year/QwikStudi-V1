"use client";

import React, { useMemo, useState } from "react";
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
    const [menuOpen, setMenuOpen] = useState(false);

    const notesText = useMemo(() => {
        const lines = notes.length > 0 ? notes.map((note, i) => `${i + 1}. ${note}`) : ["(No notes)"];
        return `${title}\n${date} • ${duration}\n\n${lines.join("\n")}\n`;
    }, [title, date, duration, notes]);

    const handleExportPdf = () => {
        const win = window.open("", "_blank", "noopener,noreferrer,width=800,height=600");
        if (!win) return;
        const escaped = notes.map((n) => `<li>${n.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</li>`).join("");
        win.document.write(`
            <html>
                <head>
                    <title>${title}</title>
                    <style>
                        body { font-family: Arial, sans-serif; padding: 24px; }
                        h1 { font-size: 20px; margin-bottom: 6px; }
                        .meta { color: #666; font-size: 12px; margin-bottom: 16px; }
                        ul { padding-left: 18px; }
                        li { margin-bottom: 8px; }
                    </style>
                </head>
                <body>
                    <h1>${title}</h1>
                    <div class="meta">${date} • ${duration}</div>
                    <ul>${escaped}</ul>
                </body>
            </html>
        `);
        win.document.close();
        win.focus();
        win.print();
    };

    const handleShare = async () => {
        try {
            if (navigator.share) {
                await navigator.share({ title, text: notesText });
                return;
            }
            if (navigator.clipboard) {
                await navigator.clipboard.writeText(notesText);
                alert("Notes copied to clipboard.");
            }
        } catch {
            alert("Unable to share notes. Please try again.");
        }
    };

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(notesText);
            alert("Notes copied to clipboard.");
        } catch {
            alert("Unable to copy notes. Please try again.");
        }
    };

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
                <div className="relative">
                    <button
                        onClick={() => setMenuOpen((v) => !v)}
                        className="p-2 text-muted-foreground hover:text-foreground rounded-lg transition-colors"
                        aria-label="Notes options"
                    >
                        <MoreVertical className="w-4 h-4" />
                    </button>
                    {menuOpen && (
                        <div className="absolute right-0 mt-2 w-40 rounded-lg border border-border/50 bg-card shadow-lg z-10">
                            <button
                                onClick={() => {
                                    setMenuOpen(false);
                                    handleCopy();
                                }}
                                className="w-full text-left px-3 py-2 text-xs hover:bg-muted/50"
                            >
                                Copy notes
                            </button>
                            <button
                                onClick={() => {
                                    setMenuOpen(false);
                                    handleExportPdf();
                                }}
                                className="w-full text-left px-3 py-2 text-xs hover:bg-muted/50"
                            >
                                Export PDF
                            </button>
                            <button
                                onClick={() => {
                                    setMenuOpen(false);
                                    handleShare();
                                }}
                                className="w-full text-left px-3 py-2 text-xs hover:bg-muted/50"
                            >
                                Share notes
                            </button>
                        </div>
                    )}
                </div>
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
                <button
                    onClick={handleExportPdf}
                    className="flex-1 py-2 rounded-xl bg-background border border-border/50 text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-accent transition-all"
                >
                    <Download className="w-3.5 h-3.5" />
                    Export PDF
                </button>
                <button
                    onClick={handleShare}
                    className="flex-1 py-2 rounded-xl bg-background border border-border/50 text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-accent transition-all"
                >
                    <Share2 className="w-3.5 h-3.5" />
                    Share Notes
                </button>
            </div>
        </div>
    );
}
