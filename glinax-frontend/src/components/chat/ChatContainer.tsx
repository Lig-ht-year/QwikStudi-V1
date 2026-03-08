"use client";

import React, { useRef, useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { MessageBubble } from "./MessageBubble";
import { ChatInput } from "./ChatInput";
import { useUIStore } from "@/stores/uiStore";
import { useDataStore } from "@/stores/dataStore";
import { translations } from "@/lib/translations";
import { cn, formatDisplayName } from "@/lib/utils";
import { Brain, FileText, Headphones, Sparkles } from "lucide-react";
import { getChatMessages } from "@/lib/getChatMessages";
import { nanoid } from "nanoid";
import api from "@/lib/api";
import Cookies from "js-cookie";
import { useToast } from "@/components/Toast";
import { getStudyMethodLabel } from "@/lib/studyMethods";
import type { StudyMethod } from "@/stores/dataStore";
import { canRegenerateMessage, getLatestAssistantMessageId } from "@/lib/chatRegenerate";


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

type RichMessageType = 'text' | 'audio' | 'quiz' | 'summary' | 'notes' | 'attachment';

function normalizeMessageType(value: unknown): RichMessageType | undefined {
    if (value === 'text' || value === 'audio' || value === 'quiz' || value === 'summary' || value === 'notes' || value === 'attachment') {
        return value;
    }
    return undefined;
}

function normalizeMetadata(value: unknown): Record<string, unknown> | undefined {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
    return value as Record<string, unknown>;
}

function normalizeStudyMethods(value: unknown): StudyMethod[] {
    if (!Array.isArray(value)) return [];
    const valid: StudyMethod[] = [
        'feynman',
        'active_recall',
        'spaced_repetition',
        'socratic',
        'interleaving',
        'exam_drill',
    ];
    return value
        .map((item) => String(item || "").trim())
        .filter((item): item is StudyMethod => valid.includes(item as StudyMethod));
}

type BackendChatMessage = {
    id: number;
    prompt: string;
    response: string;
    created_at: string;
    prompt_type?: string;
    prompt_metadata?: Record<string, unknown>;
    response_type?: string;
    response_metadata?: Record<string, unknown>;
};

function mapBackendMessages(data: BackendChatMessage[]) {
    let lastStudyMethods: StudyMethod[] | null = null;
    let lastStudyCustomPrompt = "";

    const messages = data.flatMap((msg) => {
        const createdAt = new Date(msg.created_at);
        const mappedMessages: Array<{
            id: string;
            role: 'user' | 'assistant';
            content: string;
            createdAt: Date;
            type?: RichMessageType;
            metadata?: Record<string, unknown>;
        }> = [];

        const promptType = normalizeMessageType(msg.prompt_type);
        const promptMetadata = normalizeMetadata(msg.prompt_metadata);
        const metadataStudyMethods = normalizeStudyMethods(promptMetadata?.study_methods);
        const metadataStudyCustomPrompt =
            typeof promptMetadata?.study_custom_prompt === "string"
                ? promptMetadata.study_custom_prompt.trim()
                : "";

        if (metadataStudyMethods.length > 0 || metadataStudyCustomPrompt) {
            lastStudyMethods = metadataStudyMethods;
            lastStudyCustomPrompt = metadataStudyCustomPrompt;
        }

        const hasAttachmentFiles =
            promptType === 'attachment' &&
            Array.isArray((promptMetadata as { files?: unknown[] } | undefined)?.files) &&
            ((promptMetadata as { files?: unknown[] } | undefined)?.files?.length || 0) > 0;

        if ((msg.prompt && msg.prompt.trim().length > 0) || hasAttachmentFiles) {
            mappedMessages.push({
                id: nanoid(),
                role: 'user',
                content: msg.prompt,
                createdAt,
                type: promptType,
                metadata: promptMetadata,
            });
        }

        mappedMessages.push({
            id: nanoid(),
            role: 'assistant',
            content: msg.response,
            createdAt,
            type: normalizeMessageType(msg.response_type),
            metadata: normalizeMetadata(msg.response_metadata),
        });

        return mappedMessages;
    });

    return {
        messages,
        studyMethods: lastStudyMethods ?? [],
        studyCustomPrompt: lastStudyCustomPrompt,
    };
}

export function ChatContainer() {
    const router = useRouter();
    const { showToast } = useToast();
    // Use atomic stores directly for proper reactivity
    const messages = useDataStore((state) => state.messages);
    const username = useDataStore((state) => state.username);
    const isLoggedIn = useDataStore((state) => state.isLoggedIn);
    const isLimitExceeded = useDataStore((state) => state.isLimitExceeded);
    const hasHydrated = useDataStore((state) => state.hasHydrated);
    const language = useDataStore((state) => state.language);
    const activeSessionId = useDataStore((state) => state.activeSessionId);
    const sessions = useDataStore((state) => state.sessions);
    const chatId = useDataStore((state) => state.chatId);
    const aiSettings = useDataStore((state) => state.aiSettings);
    const addMessage = useDataStore((state) => state.addMessage);
    const setMessages = useDataStore((state) => state.setMessages);
    const updateSession = useDataStore((state) => state.updateSession);
    const t = translations[language];
    const isLoading = useUIStore((state) => state.isLoading);
    const setActiveModal = useUIStore((state) => state.setActiveModal);
    const setExplainPrompt = useUIStore((state) => state.setExplainPrompt);
    const setIsLoading = useUIStore((state) => state.setIsLoading);
    const scrollRef = useRef<HTMLDivElement>(null);
    const previousLastMessageId = useRef<string | null>(null);
    const previousSessionId = useRef<string | null>(null);

    // Dynamic greeting state
    const [greeting, setGreeting] = useState("");
    const [tagline, setTagline] = useState("");
    const [mounted, setMounted] = useState(false);
    const [historyLoadError, setHistoryLoadError] = useState<string | null>(null);
    const [historyLoadVersion, setHistoryLoadVersion] = useState(0);
    const [isSwitchingSession, setIsSwitchingSession] = useState(false);
    const activeSession = activeSessionId
        ? sessions.find((session) => session.id === activeSessionId)
        : null;
    const selectedStudyMethods = activeSession?.studyMethods ?? aiSettings.studyMethods ?? [];
    const studyCustomPrompt = activeSession?.studyCustomPrompt ?? aiSettings.studyCustomPrompt ?? "";

    // Set greeting on mount (client-side only to avoid hydration mismatch)
    useEffect(() => {
        setMounted(true);
        setGreeting(getTimeBasedGreeting());
        setTagline(taglines[Math.floor(Math.random() * taglines.length)]);
    }, []);

    // Get display name
    const displayName = useMemo(() => {
        if (!hasHydrated) return "";
        if (!isLoggedIn) return t.guest || "Guest";
        return formatDisplayName(username, t.guest || "Guest");
    }, [hasHydrated, isLoggedIn, username, t.guest]);

    // Load messages when a session is selected
    useEffect(() => {
        let isMounted = true;
        const switchedSessions = previousSessionId.current !== activeSessionId;
        previousSessionId.current = activeSessionId;

        const loadSessionMessages = async () => {
            if (!activeSessionId) {
                setHistoryLoadError(null);
                setIsSwitchingSession(false);
                return;
            }

            if (switchedSessions) {
                setIsSwitchingSession(true);
            }

            if (!chatId) {
                // Draft sessions can exist locally before they have a persisted backend chat id.
                setHistoryLoadError(null);
                setIsSwitchingSession(false);
                return;
            }

            if (!switchedSessions && useDataStore.getState().messages.length > 0) {
                // Don't clobber an in-flight streamed conversation for the current active session.
                setIsSwitchingSession(false);
                return;
            }

            if (activeSessionId && chatId) {
                const { error, data } = await getChatMessages(Number(chatId));
                if (!isMounted) return;

                if (error) {
                    setHistoryLoadError(error);
                    setIsSwitchingSession(false);
                    showToast(error, "error");
                    return;
                }

                setHistoryLoadError(null);
                if (data.length === 0) {
                    setMessages([]);
                    setIsSwitchingSession(false);
                    return;
                }

                const mapped = mapBackendMessages(data);
                setMessages(mapped.messages);
                if (activeSessionId && (mapped.studyMethods.length > 0 || mapped.studyCustomPrompt)) {
                    updateSession(activeSessionId, {
                        studyMethods: mapped.studyMethods,
                        studyCustomPrompt: mapped.studyCustomPrompt,
                    });
                }
                setIsSwitchingSession(false);
            }
        };

        loadSessionMessages();

        return () => {
            isMounted = false;
        };
    }, [activeSessionId, chatId, historyLoadVersion, setMessages, showToast, updateSession]);

    const scrollToBottom = (behavior: ScrollBehavior = "auto") => {
        if (!scrollRef.current) return;
        scrollRef.current.scrollTo({
            top: scrollRef.current.scrollHeight,
            behavior,
        });
    };

    const isNearBottom = () => {
        if (!scrollRef.current) return false;
        const { scrollHeight, scrollTop, clientHeight } = scrollRef.current;
        return scrollHeight - scrollTop - clientHeight < 160;
    };

    useEffect(() => {
        if (!messages.length) return;

        const lastMessage = messages[messages.length - 1];
        const previousId = previousLastMessageId.current;
        previousLastMessageId.current = lastMessage.id;

        // Avoid jump on initial hydration/history load
        if (!previousId) return;

        if (previousId === lastMessage.id) {
            if (lastMessage.role === "assistant" && isNearBottom()) {
                scrollToBottom("auto");
            }
            return;
        }

        scrollToBottom("smooth");
    }, [messages]);

    // Handle quick suggestion click
    const handleSuggestionClick = (index: number) => {
        if (!isLoggedIn) {
            showToast("Please log in or register to use this feature.", "error");
            router.push("/login");
            return;
        }
        switch (index) {
            case 0: setActiveModal('quiz'); break;
            case 1: setActiveModal('summarize'); break;
            case 2: setActiveModal('tts'); break;
            case 3:
                const methodsText = selectedStudyMethods.length
                    ? ` Use these study methods: ${selectedStudyMethods.map(getStudyMethodLabel).join(", ")}.`
                    : "";
                const customText = studyCustomPrompt
                    ? ` Additional instruction: ${studyCustomPrompt}.`
                    : "";
                setExplainPrompt(
                    `Explain this topic step-by-step in simple terms.${methodsText}${customText} Then add one practical example and 3 quick check questions: `
                );
                showToast("Explain mode ready. Type a topic and send.", "info");
                break;
            default: break;
        }
    };

    const latestAssistantMessageId = useMemo(() => getLatestAssistantMessageId(messages), [messages]);

    // Regenerate the latest AI response only. Older turns would require backend branching support.
    const handleRegenerate = async (assistantMessageId: string) => {
        try {
            const currentMessages = useDataStore.getState().messages;

            if (!canRegenerateMessage(currentMessages, assistantMessageId)) {
                showToast("Only the latest response can be regenerated right now.", "info");
                return;
            }
            
            // Find the last user message
            const lastUserIndex = currentMessages.findLastIndex(m => m.role === 'user');
            if (lastUserIndex === -1) return;
            
            const lastUserMessage = currentMessages[lastUserIndex];

            // File-based prompts require re-uploading files; avoid destructive regeneration.
            if (lastUserMessage.type === 'attachment') {
                showToast("Regeneration for file uploads isn't supported yet. Please resend the file.", "info");
                return;
            }

            const promptForRegeneration = String(lastUserMessage.content || "").trim();
            if (!promptForRegeneration) {
                showToast("Couldn't regenerate because the original prompt is empty.", "error");
                return;
            }
            
            // Call the API to get a new response
            const guestId = Cookies.get("guest_id");
            const currentChatId = useDataStore.getState().chatId;
            
            setIsLoading(true);

            const res = await api.post("/chat/", {
                prompt: promptForRegeneration,
                guest_id: guestId,
                chat_id: currentChatId,
                response_style: aiSettings.responseStyle,
                study_methods: selectedStudyMethods,
                study_custom_prompt: studyCustomPrompt,
            });

            // Store the chat_id from response if not already set
            if (res.data.chat_id && !currentChatId) {
                useDataStore.getState().setChatId(res.data.chat_id);
            }

            const nextChatId = typeof res.data.chat_id === "number" ? res.data.chat_id : currentChatId;
            if (nextChatId) {
                const { error, data } = await getChatMessages(Number(nextChatId));
                if (error) {
                    setHistoryLoadError(error);
                    showToast(error, "error");
                    return;
                }

                const mapped = mapBackendMessages(data);
                setMessages(mapped.messages);
                setHistoryLoadError(null);

                if (activeSessionId) {
                    updateSession(activeSessionId, {
                        ...(typeof res.data.chat_title === "string" && res.data.chat_title.trim()
                            ? { title: res.data.chat_title.trim() }
                            : {}),
                        ...(currentChatId ? {} : { chatId: nextChatId }),
                        lastMessageAt: new Date(),
                    });
                }
            } else {
                addMessage({
                    id: nanoid(),
                    role: 'assistant',
                    content: res.data.response,
                    createdAt: new Date(),
                });
            }
        } catch (error) {
            console.error("Regeneration failed:", error);
            showToast("Sorry, I couldn't regenerate the response. Please try again.", "error");
        } finally {
            setIsLoading(false);
        }
    };

    const hasPendingAssistantMessage = useMemo(
        () =>
            messages.some(
                (message) =>
                    message.role === "assistant" &&
                    typeof message.content === "string" &&
                    message.content.trim().length === 0
            ),
        [messages]
    );

    return (
        <div className="flex flex-col h-full relative">
            {/* Top gradient fade - seamless transition from header */}
            <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-background via-background/80 to-transparent pointer-events-none z-10" />

            {/* Messages Area */}
            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto px-4 custom-scrollbar"
            >
                <div className={cn(
                    "max-w-3xl mx-auto w-full pt-24",
                    isLimitExceeded ? "pb-[22rem]" : "pb-48"
                )}>
                    {historyLoadError && (
                        <div className="mb-6 rounded-2xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-foreground/85">
                            <div className="flex items-center justify-between gap-3">
                                <p>Couldn&apos;t load the full chat history. Showing the latest local state.</p>
                                <button
                                    type="button"
                                    onClick={() => setHistoryLoadVersion((value) => value + 1)}
                                    className="shrink-0 rounded-lg border border-amber-500/25 px-3 py-1.5 text-xs font-medium text-amber-600 transition-colors hover:bg-amber-500/10"
                                >
                                    Retry
                                </button>
                            </div>
                        </div>
                    )}
                    {messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-8 animate-in fade-in zoom-in duration-500">
                            {/* Dynamic Greeting */}
                            <div className="space-y-4">
                                <h2 className="text-3xl md:text-5xl font-bold tracking-tight">
                                    {mounted ? greeting : t.greeting_generic || "Hi, there"},{" "}
                                    <span className="bg-gradient-to-r from-primary via-primary/80 to-primary bg-clip-text text-transparent">
                                        {displayName || "\u00A0"}
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
                        <div className={cn("transition-opacity duration-200", isSwitchingSession && "opacity-35")}>
                            {messages.map((message) => (
                                <div key={message.id}>
                                    <MessageBubble
                                        role={message.role}
                                        content={message.content}
                                        createdAt={message.createdAt}
                                        type={message.type}
                                        metadata={message.metadata}
                                        onRegenerate={
                                            message.role === 'assistant' &&
                                            !isLoading &&
                                            message.id === latestAssistantMessageId
                                                ? () => handleRegenerate(message.id)
                                                : undefined
                                        }
                                    />
                                </div>
                            ))}
                        </div>
                    )}

                    {isSwitchingSession && (
                        <div className="mb-6 flex justify-center animate-in fade-in duration-200">
                            <div className="rounded-xl border border-white/10 bg-card/50 px-3 py-2 text-xs text-muted-foreground">
                                Loading chat...
                            </div>
                        </div>
                    )}

                    {isLoading && !hasPendingAssistantMessage && (
                        <div className="w-full mb-8 animate-in fade-in slide-in-from-bottom-2 duration-300" aria-live="polite" aria-atomic="true">
                            <div className="pl-9">
                                <div className="inline-flex items-center gap-3 rounded-2xl border border-white/10 bg-card/50 px-4 py-3">
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-primary/80 animate-bounce" />
                                        <span className="w-2 h-2 rounded-full bg-primary/70 animate-bounce [animation-delay:120ms]" />
                                        <span className="w-2 h-2 rounded-full bg-primary/60 animate-bounce [animation-delay:240ms]" />
                                    </div>
                                    <span className="text-sm text-muted-foreground">QwikStudi is thinking</span>
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
