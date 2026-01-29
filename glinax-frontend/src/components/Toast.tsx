"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { X, CheckCircle, AlertTriangle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastType = "success" | "error" | "warning" | "info";

interface Toast {
    id: string;
    message: string;
    type: ToastType;
}

interface ToastContextType {
    showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error("useToast must be used within a ToastProvider");
    }
    return context;
}

const TOAST_DURATION_MS = 4000;

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const showToast = useCallback((message: string, type: ToastType = "info") => {
        const id = Math.random().toString(36).substring(7);
        setToasts((prev) => [...prev, { id, message, type }]);

        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
        }, TOAST_DURATION_MS);
    }, []);

    const removeToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    const getIcon = (type: ToastType) => {
        switch (type) {
            case "success":
                return <CheckCircle className="w-5 h-5 text-emerald-400" />;
            case "error":
                return <AlertTriangle className="w-5 h-5 text-red-400" />;
            case "warning":
                return <AlertTriangle className="w-5 h-5 text-orange-400" />;
            case "info":
            default:
                return <Info className="w-5 h-5 text-primary" />;
        }
    };

    const getBorderColor = (type: ToastType) => {
        switch (type) {
            case "success":
                return "border-emerald-500/30";
            case "error":
                return "border-red-500/30";
            case "warning":
                return "border-orange-500/30";
            case "info":
            default:
                return "border-primary/30";
        }
    };

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            {/* Toast Container */}
            <div
                className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm"
                role="region"
                aria-label="Notifications"
            >
                {toasts.map((toast) => (
                    <div
                        key={toast.id}
                        role="alert"
                        className={cn(
                            "flex items-start gap-3 p-4 bg-card/95 backdrop-blur-xl border rounded-2xl shadow-2xl animate-in slide-in-from-right-5 fade-in duration-300",
                            getBorderColor(toast.type)
                        )}
                    >
                        {getIcon(toast.type)}
                        <p className="flex-1 text-sm text-foreground">{toast.message}</p>
                        <button
                            onClick={() => removeToast(toast.id)}
                            className="p-1 rounded-full hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"
                            aria-label="Dismiss notification"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}
