import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function formatDisplayName(raw: string | null | undefined, fallback = "Guest"): string {
    const input = (raw || "").trim();
    if (!input) return fallback;
    return input.toLocaleUpperCase();
}
