"use client";

import React, { useRef, useEffect, useState, useMemo } from "react";
import { MessageBubble } from "./MessageBubble";
import { ChatInput } from "./ChatInput";
import { useUIStore } from "@/stores/uiStore";
import { useDataStore } from "@/stores/dataStore";
import { translations } from "@/lib/translations";
import { Brain, FileText, Headphones, Sparkles } from "lucide-react";
import { getChatMessages } from "@/lib/getChatMessages";
import { nanoid } from "nanoid";
import Cookies from "js-cookie";
import api from "@/lib/api";


// Calculate Easter date using Computus algorithm (Anonymous Gregorian algorithm)
function getEasterDate(year: number): Date {
    const a = year % 19;
    const b = Math.floor(year / 100);
    const c = year % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31);
    const day = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(year, month - 1, day);
}

// Ghana holidays and special dates
function getGhanaHolidayGreeting(): string | null {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1; // 1-indexed
    const day = now.getDate();

    // Independence Day - March 6
    if (month === 3 && day === 6) return "Happy Independence Day";

    // Republic Day - July 1
    if (month === 7 && day === 1) return "Happy Republic Day";

    // Founders' Day - August 4
    if (month === 8 && day === 4) return "Happy Founders' Day";

    // Kwame Nkrumah Memorial Day - September 21
    if (month === 9 && day === 21) return "Happy Kwame Nkrumah Day";

    // Farmers' Day - First Friday of December
    if (month === 12 && day >= 1 && day <= 7 && now.getDay() === 5) return "Happy Farmers' Day";

    // Christmas
    if (month === 12 && (day === 25 || day === 26)) return "Merry Christmas";

    // New Year
    if (month === 1 && day === 1) return "Happy New Year";

    // Easter (calculated dynamically) - Good Friday, Easter Sunday, Easter Monday
    const easter = getEasterDate(year);
    const goodFriday = new Date(easter);
    goodFriday.setDate(easter.getDate() - 2);
    const easterMonday = new Date(easter);
    easterMonday.setDate(easter.getDate() + 1);

    const isGoodFriday = month === goodFriday.getMonth() + 1 && day === goodFriday.getDate();
    const isEasterSunday = month === easter.getMonth() + 1 && day === easter.getDate();
    const isEasterMonday = month === easterMonday.getMonth() + 1 && day === easterMonday.getDate();

    if (isGoodFriday) return "Happy Good Friday";
    if (isEasterSunday) return "Happy Easter";
    if (isEasterMonday) return "Happy Easter Monday";

    return null;
}

// Dynamic greeting messages based on time of day
function getTimeBasedGreeting(): string {
    // Check for holiday first
    const holidayGreeting = getGhanaHolidayGreeting();
    if (holidayGreeting) return holidayGreeting;

    const hour = new Date().getHours();

    // Time-based greetings with slight variations
    if (hour >= 5 && hour < 12) {
        const morningGreetings = ["Good morning", "Rise and shine", "Morning"];
        return morningGreetings[Math.floor(Math.random() * morningGreetings.length)];
    }
    if (hour >= 12 && hour < 17) {
        const afternoonGreetings = ["Good afternoon", "Hey there", "Hello"];
        return afternoonGreetings[Math.floor(Math.random() * afternoonGreetings.length)];
    }
    if (hour >= 17 && hour < 21) {
        const eveningGreetings = ["Good evening", "Evening", "Hey there"];
        return eveningGreetings[Math.floor(Math.random() * eveningGreetings.length)];
    }

    // Night greetings
    const nightGreetings = ["Burning the midnight oil?", "Late night study session?", "Hey there"];
    return nightGreetings[Math.floor(Math.random() * nightGreetings.length)];
}

// Rotating taglines for variety
const taglines = [
    "What would you like to learn today?",
    "Ready to ace your next exam?",
    "Let's make studying smarter.",
    "What can I help you understand?",
    "Time to level up your knowledge.",
    "What topic should we explore?",
    "Let's turn confusion into clarity.",
    "What are you curious about?",
    "Your personal study assistant is ready.",
    "Let's tackle something new together.",
    "Learning made simple and fun.",
    "Ask me anything academic.",
];

// Quick suggestion prompts
const suggestions = [
    { icon: Brain, text: "Quiz me", gradient: "from-orange-400 to-orange-600" },
    { icon: FileText, text: "Summarize", gradient: "from-emerald-400 to-emerald-600" },
    { icon: Headphones, text: "Listen", gradient: "from-violet-400 to-violet-600" },
    { icon: Sparkles, text: "Explain", gradient: "from-blue-400 to-blue-600" },
];

export function ChatContainer() {
    // Use atomic stores directly for proper reactivity
    const messages = useDataStore((state) => state.messages);
    const username = useDataStore((state) => state.username);
    const isLoggedIn = useDataStore((state) => state.isLoggedIn);
    const language = useDataStore((state) => state.language);
    const sessions = useDataStore((state) => state.sessions);
    const activeSessionId = useDataStore((state) => state.activeSessionId);
    const chatId = useDataStore((state) => state.chatId);
    const setSessionMessages = useDataStore((state) => state.setSessionMessages);
    const t = translations[language];
    const isLoading = useUIStore((state) => state.isLoading);
    const setIsLoading = useUIStore((state) => state.setIsLoading);
    const setActiveModal = useUIStore((state) => state.setActiveModal);
    const scrollRef = useRef<HTMLDivElement>(null);
    const aiSettings = useDataStore((state) => state.aiSettings);
    const previousSessionIdRef = useRef<string | null>(null);
    const inFlightChatIdRef = useRef<number | null>(null);

    const handleRegenerate = async (messageId: string) => {
        const state = useDataStore.getState();
        const currentMessages = state.messages;
        const targetIndex = currentMessages.findIndex((m) => m.id === messageId);
        if (targetIndex === -1) return;

        let prompt: string | null = null;
        for (let i = targetIndex - 1; i >= 0; i -= 1) {
            if (currentMessages[i].role === "user") {
                prompt = currentMessages[i].content;
                break;
            }
        }

        if (!prompt) return;

        setIsLoading(true);
        useDataStore.setState((prev) => ({
            messages: prev.messages.map((m) =>
                m.id === messageId ? { ...m, content: "Regenerating...", createdAt: new Date() } : m
            ),
        }));

        try {
            const guestId = Cookies.get("guest_id");
            const res = await api.post("/chat/", {
                prompt,
                guest_id: guestId,
                chat_id: state.chatId,
                response_style: aiSettings.responseStyle,
            });

            useDataStore.setState((prev) => ({
                messages: prev.messages.map((m) =>
                    m.id === messageId ? { ...m, content: res.data.response, createdAt: new Date() } : m
                ),
            }));
        } catch (error) {
            console.error("Regenerate failed:", error);
            useDataStore.setState((prev) => ({
                messages: prev.messages.map((m) =>
                    m.id === messageId
                        ? { ...m, content: "Sorry, I couldn't regenerate that response. Please try again." }
                        : m
                ),
            }));
        } finally {
            setIsLoading(false);
        }
    };

    // Dynamic greeting state
    const [greeting, setGreeting] = useState("");
    const [tagline, setTagline] = useState("");
    const [mounted, setMounted] = useState(false);

    // Set greeting on mount (client-side only to avoid hydration mismatch)
    useEffect(() => {
        setMounted(true);
        setGreeting(getTimeBasedGreeting());
        setTagline(taglines[Math.floor(Math.random() * taglines.length)]);
    }, []);

    // Get display name
    const displayName = useMemo(() => {
        if (!isLoggedIn) return t.guest || "Guest";
        return username || t.guest || "Guest";
    }, [isLoggedIn, username, t.guest]);

    // Load messages when a session is selected
    useEffect(() => {
        const prevSessionId = previousSessionIdRef.current;
        if (prevSessionId && prevSessionId !== activeSessionId) {
            setSessionMessages(prevSessionId, messages);
        }
        previousSessionIdRef.current = activeSessionId;
    }, [activeSessionId, messages, setSessionMessages]);

    // Keep active session cache hot so local new messages aren't lost on reload effects
    useEffect(() => {
        if (!activeSessionId) return;
        setSessionMessages(activeSessionId, messages);
    }, [activeSessionId, messages, setSessionMessages]);

    useEffect(() => {
        const loadSessionMessages = async () => {
            if (!activeSessionId) {
                // Clear messages when no session is selected
                useDataStore.getState().clearMessages();
                return;
            }

            const session = sessions.find((s: { id: string }) => s.id === activeSessionId);
            if (!session) {
                useDataStore.getState().clearMessages();
                return;
            }

            const sessionChatId = session.chatId ?? null;
            if (sessionChatId !== chatId) {
                useDataStore.getState().setChatId(sessionChatId);
            }

            const allSessionMessages = useDataStore.getState().sessionMessages;
            const hasCached = Object.prototype.hasOwnProperty.call(allSessionMessages, activeSessionId);
            if (hasCached) {
                const cachedMessages = allSessionMessages[activeSessionId];
                useDataStore.setState({ messages: cachedMessages });
                return;
            }

            useDataStore.getState().clearMessages();

            if (!sessionChatId) return;

            if (inFlightChatIdRef.current === sessionChatId) return;

            inFlightChatIdRef.current = sessionChatId;
            const { error, data } = await getChatMessages(Number(sessionChatId));
            inFlightChatIdRef.current = null;
            if (error) return;

            // Convert backend messages to frontend format
            const loadedMessages = data.flatMap(msg => {
                const items: {
                    id: string;
                    role: 'user' | 'assistant';
                    content: string;
                    type?: 'text' | 'audio' | 'quiz' | 'summary' | 'notes';
                    metadata?: Record<string, unknown>;
                    createdAt: Date;
                }[] = [];

                if (msg.prompt && msg.prompt.trim().length > 0) {
                    items.push({
                        id: nanoid(),
                        role: 'user',
                        content: msg.prompt,
                        type: (msg.prompt_type as any) || 'text',
                        metadata: msg.prompt_metadata || undefined,
                        createdAt: new Date(msg.created_at),
                    });
                }

                items.push({
                    id: nanoid(),
                    role: 'assistant',
                    content: msg.response,
                    type: (msg.response_type as any) || 'text',
                    metadata: msg.response_metadata || undefined,
                    createdAt: new Date(msg.created_at),
                });

                return items;
            });

            useDataStore.setState({ messages: loadedMessages });
            setSessionMessages(activeSessionId, loadedMessages);
        };

        loadSessionMessages();
    }, [activeSessionId, chatId, sessions, setSessionMessages]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isLoading]);

    // Handle quick suggestion click
    const handleSuggestionClick = (index: number) => {
        switch (index) {
            case 0: setActiveModal('quiz'); break;
            case 1: setActiveModal('summarize'); break;
            case 2: setActiveModal('tts'); break;
            default: break;
        }
    };

    return (
        <div className="flex flex-col h-full relative">
            {/* Top gradient fade - seamless transition from header */}
            <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-background via-background/80 to-transparent pointer-events-none z-10" />

            {/* Messages Area */}
            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto px-4 custom-scrollbar"
            >
                <div className="max-w-3xl mx-auto w-full pt-24 pb-48">
                    {messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-8 animate-in fade-in zoom-in duration-500">
                            {/* Dynamic Greeting */}
                            <div className="space-y-4">
                                <h2 className="text-3xl md:text-5xl font-bold tracking-tight">
                                    {mounted ? greeting : t.greeting_generic || "Hi, there"},{" "}
                                    <span className="bg-gradient-to-r from-primary via-primary/80 to-primary bg-clip-text text-transparent">
                                        {displayName}
                                    </span>
                                </h2>
                                <p className="text-lg md:text-xl text-muted-foreground max-w-lg mx-auto">
                                    {mounted ? tagline : t.whatToStudy}
                                </p>
                            </div>

                            {/* Quick Action Cards - Only show when logged in */}
                            {isLoggedIn && (
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full max-w-2xl mt-4">
                                    {suggestions.map((suggestion, index) => (
                                        <button
                                            key={index}
                                            onClick={() => handleSuggestionClick(index)}
                                            className="group flex flex-col items-center gap-3 p-4 rounded-2xl bg-card/50 border border-white/5 hover:border-white/10 hover:bg-card/80 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg"
                                        >
                                            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${suggestion.gradient} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                                                <suggestion.icon className="w-5 h-5 text-white" />
                                            </div>
                                            <span className="text-xs md:text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors text-center leading-tight">
                                                {suggestion.text}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Prompt for non-logged in users */}
                            {!isLoggedIn && (
                                <p className="text-sm text-muted-foreground/60 mt-4">
                                    Sign in to unlock all study tools
                                </p>
                            )}
                        </div>
                    ) : (
                        messages.map((message) => (
                            <MessageBubble
                                key={message.id}
                                role={message.role}
                                content={message.content}
                                createdAt={message.createdAt}
                                type={message.type}
                                metadata={message.metadata}
                                onRegenerate={message.role === "assistant" ? () => handleRegenerate(message.id) : undefined}
                            />
                        ))
                    )}

                    {isLoading && (
                        <div className="w-full mb-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div className="flex items-center gap-2 mb-3">
                                <div className="w-7 h-7 rounded-lg bg-white flex items-center justify-center shadow-md">
                                    <span className="text-sm font-bold text-primary">Q</span>
                                </div>
                                <span className="text-sm font-semibold text-foreground">QwikStudi</span>
                            </div>

                            <div className="pl-9">
                                <div className="inline-flex items-center gap-3 rounded-2xl border border-white/10 bg-card/60 backdrop-blur-sm px-4 py-3">
                                    <div className="flex items-end gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-primary/80 animate-bounce" />
                                        <span className="w-1.5 h-1.5 rounded-full bg-primary/80 animate-bounce [animation-delay:120ms]" />
                                        <span className="w-1.5 h-1.5 rounded-full bg-primary/80 animate-bounce [animation-delay:240ms]" />
                                    </div>
                                    <span className="text-sm text-muted-foreground">QwikStudi is thinking...</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Bottom gradient fade - seamless transition to footer */}
            <div className="absolute bottom-0 left-0 right-0 pointer-events-none z-10">
                <div className="h-40 bg-gradient-to-t from-background via-background/90 to-transparent" />
            </div>

            {/* Input Area - Floating at bottom, centered */}
            <div className="absolute bottom-0 left-0 right-0 z-20 flex justify-center px-4 pb-2">
                <div className="w-full max-w-3xl">
                    <ChatInput />
                </div>
            </div>
        </div>
    );
}
