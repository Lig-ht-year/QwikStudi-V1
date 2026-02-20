import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function formatDisplayName(raw: string | null | undefined, fallback = "Guest"): string {
    const input = (raw || "").trim();
    if (!input) return fallback;
    const normalized = input
        .replace(/[._-]+/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .toLocaleLowerCase();
    return normalized.replace(/(^|\s)([a-z\u00C0-\u024F])/g, (match, prefix, char) => {
        return `${prefix}${char.toLocaleUpperCase()}`;
    });
}
