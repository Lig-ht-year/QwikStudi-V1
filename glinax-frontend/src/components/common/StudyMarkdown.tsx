"use client";

import React from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { cn } from "@/lib/utils";

const markdownComponents: Components = {
    h1: ({ children }) => <h3 className="text-base font-semibold tracking-tight text-foreground">{children}</h3>,
    h2: ({ children }) => <h3 className="text-base font-semibold tracking-tight text-foreground">{children}</h3>,
    h3: ({ children }) => <h3 className="text-base font-semibold tracking-tight text-foreground">{children}</h3>,
    p: ({ children }) => <p className="whitespace-pre-wrap">{children}</p>,
    blockquote: ({ children }) => (
        <blockquote className="border-l-2 border-primary/40 pl-3 italic text-foreground/85">{children}</blockquote>
    ),
    ul: ({ children }) => <ul className="space-y-2 pl-5 list-disc marker:text-primary/80">{children}</ul>,
    ol: ({ children }) => <ol className="space-y-2 pl-5 list-decimal marker:text-primary/80">{children}</ol>,
    li: ({ children }) => <li className="pl-1">{children}</li>,
    table: ({ children }) => (
        <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="min-w-full text-sm">{children}</table>
        </div>
    ),
    thead: ({ children }) => <thead className="bg-white/5">{children}</thead>,
    tbody: ({ children }) => <tbody>{children}</tbody>,
    tr: ({ children }) => <tr className="border-t border-white/10">{children}</tr>,
    th: ({ children }) => <th className="px-3 py-2 text-left font-semibold">{children}</th>,
    td: ({ children }) => <td className="px-3 py-2 align-top">{children}</td>,
    code: ({ className, children, ...props }) => {
        const isInline = !className;
        if (isInline) {
            return (
                <code className="rounded bg-black/20 px-1.5 py-0.5 text-[13px] text-foreground" {...props}>
                    {children}
                </code>
            );
        }
        return (
            <pre className="overflow-x-auto rounded-2xl border border-white/10 bg-black/70 px-4 py-3 text-[13px] leading-6 text-white whitespace-pre-wrap">
                <code className={className} {...props}>
                    {children}
                </code>
            </pre>
        );
    },
};

export function normalizeMathMarkdown(content: string): string {
    let text = content;

    text = text.replace(/\\\$/g, "$");

    text = text.replace(/\\\[((?:.|\n)*?)\\\]/g, (_m, expr: string) => `\n$$\n${expr.trim()}\n$$\n`);
    text = text.replace(/\\\(((?:.|\n)*?)\\\)/g, (_m, expr: string) => `$${expr.trim()}$`);
    text = text.replace(/\$\$([^\n$][\s\S]*?[^\n$])\$\$/g, (_m, expr: string) => `\n$$\n${expr.trim()}\n$$\n`);
    text = normalizeOrderedListMarkers(text);

    return text;
}

function normalizeOrderedListMarkers(content: string): string {
    const lines = content.split("\n");
    const orderedLineIndexes: number[] = [];
    let topLevelCount = 0;
    let topLevelOnes = 0;
    let inCodeFence = false;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();
        if (/^```/.test(trimmed)) {
            inCodeFence = !inCodeFence;
            continue;
        }
        if (inCodeFence) continue;

        const match = line.match(/^(\s{0,3})(\d+)\.\s+(.+)$/);
        if (!match) continue;

        const number = Number(match[2]);
        if (Number.isNaN(number)) continue;

        topLevelCount += 1;
        if (number === 1) topLevelOnes += 1;
        orderedLineIndexes.push(i);
    }

    const shouldRenumber =
        topLevelCount >= 3 &&
        topLevelOnes / Math.max(1, topLevelCount) >= 0.6;

    if (!shouldRenumber) return content;

    let counter = 1;
    for (const index of orderedLineIndexes) {
        lines[index] = lines[index].replace(/^(\s{0,3})\d+\.\s+/, `$1${counter}. `);
        counter += 1;
    }

    return lines.join("\n");
}

interface StudyMarkdownProps {
    content: string;
    className?: string;
    toneClassName?: string;
}

export function StudyMarkdown({ content, className, toneClassName }: StudyMarkdownProps) {
    const normalized = normalizeMathMarkdown((content || "").replace(/\r\n/g, "\n").trim());

    return (
        <div className={cn("space-y-4 text-[15px] leading-7", toneClassName, className)}>
            <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkMath]}
                rehypePlugins={[rehypeKatex]}
                components={markdownComponents}
            >
                {normalized}
            </ReactMarkdown>
        </div>
    );
}
