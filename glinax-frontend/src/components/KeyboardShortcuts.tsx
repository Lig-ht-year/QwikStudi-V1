"use client";

import { useEffect } from "react";
import { useChatStore } from "@/stores/chatStore";

interface KeyboardShortcutsProps {
    children: React.ReactNode;
}

/**
 * Global keyboard shortcuts provider
 * Shortcuts:
 * - Ctrl+Q: Open Quiz modal
 * - Ctrl+E: Open Summarize modal
 * - Ctrl+R: Open Record (STT) modal
 * - Ctrl+L: Open Listen (TTS) modal
 * - Escape: Close any open modal
 */
export function KeyboardShortcuts({ children }: KeyboardShortcutsProps) {
    const { activeModal, setActiveModal } = useChatStore();

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Don't trigger shortcuts when typing in input fields
            const target = e.target as HTMLElement;
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
                // Only allow Escape to work in input fields
                if (e.key === 'Escape' && activeModal) {
                    e.preventDefault();
                    setActiveModal(null);
                }
                return;
            }

            // Escape to close modal
            if (e.key === 'Escape' && activeModal) {
                e.preventDefault();
                setActiveModal(null);
                return;
            }

            // Ctrl/Cmd + Key shortcuts
            if (e.ctrlKey || e.metaKey) {
                switch (e.key.toLowerCase()) {
                    case 'q':
                        e.preventDefault();
                        setActiveModal('quiz');
                        break;
                    case 'e':
                        e.preventDefault();
                        setActiveModal('summarize');
                        break;
                    case 'r':
                        e.preventDefault();
                        setActiveModal('stt');
                        break;
                    case 'l':
                        e.preventDefault();
                        setActiveModal('tts');
                        break;
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [activeModal, setActiveModal]);

    return <>{children}</>;
}

// Shortcut hints for display in UI
export const KEYBOARD_SHORTCUTS = {
    quiz: { key: 'Q', modifier: 'Ctrl' },
    summarize: { key: 'E', modifier: 'Ctrl' },
    stt: { key: 'R', modifier: 'Ctrl' },
    tts: { key: 'L', modifier: 'Ctrl' },
    close: { key: 'Esc', modifier: '' },
} as const;
