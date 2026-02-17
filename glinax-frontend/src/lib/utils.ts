import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function formatDisplayName(raw: string | null | undefined, fallback = "Guest"): string {
    const input = (raw || "").trim();
    if (!input) return fallback;

    // If an email was passed accidentally, use the local-part for display.
    const localPart = input.includes("@") ? input.split("@")[0] : input;
    const normalized = localPart
        .replace(/[._-]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    if (!normalized) return fallback;

    return normalized
        .split(" ")
        .filter(Boolean)
        .map((token) => token.charAt(0).toUpperCase() + token.slice(1).toLowerCase())
        .join(" ");
}
