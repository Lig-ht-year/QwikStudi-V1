"use client";

import React from "react";
import { cn } from "@/lib/utils";

export function LoadingSkeleton() {
    return (
        <div className="flex w-full mb-6 animate-in fade-in duration-500">
            <div className="flex max-w-[80%] gap-3">
                {/* Avatar Skeleton */}
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted animate-pulse" />

                {/* Bubble Skeleton */}
                <div className="flex flex-col gap-2 w-full">
                    <div className="px-4 py-3 rounded-2xl bg-card border border-border/50 rounded-tl-sm w-[200px] md:w-[350px] space-y-2">
                        <div className="h-3 bg-muted rounded-full w-full animate-pulse" />
                        <div className="h-3 bg-muted rounded-full w-[90%] animate-pulse" />
                        <div className="h-3 bg-muted rounded-full w-[70%] animate-pulse" />
                    </div>
                    <div className="flex gap-2">
                        <div className="h-1.5 bg-muted rounded-full w-8 animate-pulse" />
                    </div>
                </div>
            </div>
        </div>
    );
}

export function ProcessingSkeleton() {
    return (
        <div className="w-full max-w-sm bg-card border border-border/50 rounded-2xl p-4 space-y-4 animate-in fade-in zoom-in duration-300">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-muted animate-pulse" />
                <div className="flex-1 space-y-2">
                    <div className="h-3 bg-muted rounded-full w-[60%] animate-pulse" />
                    <div className="h-2 bg-muted rounded-full w-[40%] animate-pulse" />
                </div>
            </div>
            <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                <div className="h-full bg-muted-foreground/20 rounded-full w-1/3 animate-[shimmer_2s_infinite]" />
            </div>
        </div>
    );
}
