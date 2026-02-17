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
import api from "@/lib/api";
import Cookies from "js-cookie";


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
    const aiSettings = useDataStore((state) => state.aiSettings);
    const addMessage = useDataStore((state) => state.addMessage);
    const t = translations[language];
    const isLoading = useUIStore((state) => state.isLoading);
    const setActiveModal = useUIStore((state) => state.setActiveModal);
    const setIsLoading = useUIStore((state) => state.setIsLoading);
    const scrollRef = useRef<HTMLDivElement>(null);

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
        const loadSessionMessages = async () => {
            if (activeSessionId && chatId) {
                // Find the session to get its chat_id
                const session = sessions.find((s: { id: string }) => s.id === activeSessionId);
                if (session) {
                    const { error, data } = await getChatMessages(Number(chatId));
                    if (!error && data.length > 0) {
                        // Convert backend messages to frontend format
                        const loadedMessages = data.map(msg => [
                            {
                                id: nanoid(),
                                role: 'user' as const,
                                content: msg.prompt,
                                timestamp: new Date(msg.created_at),
                            },
                            {
                                id: nanoid(),
                                role: 'assistant' as const,
                                content: msg.response,
                                timestamp: new Date(msg.created_at),
                            }
                        ]).flat();

                        // Clear and replace messages
                        useDataStore.getState().clearMessages();
                        loadedMessages.forEach(msg => useDataStore.getState().addMessage(msg));
                    }
                }
            } else if (!activeSessionId) {
                // Clear messages when no session is selected
                useDataStore.getState().clearMessages();
            }
        };

        loadSessionMessages();
    }, [activeSessionId, chatId, sessions]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    // Handle quick suggestion click
    const handleSuggestionClick = (index: number) => {
        switch (index) {
            case 0: setActiveModal('quiz'); break;
            case 1: setActiveModal('summarize'); break;
            case 2: setActiveModal('tts'); break;
            default: break;
        }
    };

    // Regenerate last AI response
    const handleRegenerate = async () => {
        const currentMessages = useDataStore.getState().messages;
        
        // Find the last user message
        const lastUserIndex = currentMessages.findLastIndex(m => m.role === 'user');
        if (lastUserIndex === -1) return;
        
        const lastUserMessage = currentMessages[lastUserIndex];
        
        // Remove the last AI response if it exists
        const messagesWithoutLastAI = currentMessages.slice(0, lastUserIndex + 1);
        
        // Clear messages and add up to the last user message
        useDataStore.getState().clearMessages();
        messagesWithoutLastAI.forEach(msg => useDataStore.getState().addMessage(msg));
        
        // Call the API to get a new response
        const guestId = Cookies.get("guest_id");
        const currentChatId = useDataStore.getState().chatId;
        
        setIsLoading(true);
        
        try {
            const res = await api.post("/chat/", {
                prompt: lastUserMessage.content,
                guest_id: guestId,
                chat_id: currentChatId,
                response_style: aiSettings.responseStyle,
            });

            // Store the chat_id from response if not already set
            if (res.data.chat_id && !currentChatId) {
                useDataStore.getState().setChatId(res.data.chat_id);
            }

            // Add new AI response
            addMessage({
                id: nanoid(),
                role: 'assistant',
                content: res.data.response,
                timestamp: new Date(),
            });
        } catch (error) {
            console.error("Regeneration failed:", error);
            addMessage({
                id: nanoid(),
                role: 'assistant',
                content: "Sorry, I couldn't regenerate the response. Please try again.",
                timestamp: new Date(),
            });
        } finally {
            setIsLoading(false);
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
                                timestamp={message.timestamp}
                                type={message.type}
                                metadata={message.metadata}
                                onRegenerate={message.role === 'assistant' ? handleRegenerate : undefined}
                            />
                        ))
                    )}

                    {isLoading && (
                        <div className="flex justify-start mb-6 animate-pulse">
                            <div className="bg-muted w-12 h-8 rounded-2xl" />
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

