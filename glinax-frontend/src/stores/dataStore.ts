import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { nanoid } from 'nanoid';
import { formatDisplayName } from '@/lib/utils';
import { applyMessagesToSession, getMessagesForSession } from '@/lib/chatSessionState';

/**
 * Data Store - Handles persistent user data
 * Persisted to localStorage
 */

export type PlanType = 'free' | 'pro';
export type ResponseStyle = 'concise' | 'balanced' | 'detailed';
export type Language = 'English' | 'French' | 'Twi';
export type StudyMethod = 'feynman' | 'active_recall' | 'spaced_repetition' | 'socratic' | 'interleaving' | 'exam_drill';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    type?: 'text' | 'audio' | 'quiz' | 'summary' | 'notes' | 'attachment';
    metadata?: Record<string, unknown>;
    createdAt: Date;
}

interface ChatSession {
    id: string;
    title: string;
    lastMessageAt: Date;
    chatId: number | null;
    studyMethods: StudyMethod[];
    studyCustomPrompt: string;
}

interface AISettings {
    responseStyle: ResponseStyle;
    saveHistory: boolean;
    quickActionsEnabled: boolean;
    studyMethods: StudyMethod[];
    studyCustomPrompt: string;
}

interface PrivacySettings {
    shareAnalytics: boolean;
    improveAI: boolean;
}

interface SelectedContent {
    type: 'summarize' | 'quiz' | null;
    content: string;
}

interface DataState {
    hasHydrated: boolean;
    setHasHydrated: (hydrated: boolean) => void;

    // Authentication
    isLoggedIn: boolean;
    login: (username: string) => void;
    logout: () => void;
    syncAuthFromStorage: () => void;
    setAuthUser: (user: { username: string }) => void;

    // Messages
    messages: Message[];
    setMessages: (messages: Message[]) => void;
    setMessagesForSession: (sessionId: string, messages: Message[]) => void;
    addMessage: (message: Message) => void;
    addMessageToSession: (sessionId: string, message: Message) => void;
    appendMessageContent: (id: string, delta: string) => void;
    appendMessageContentInSession: (sessionId: string, id: string, delta: string) => void;
    updateMessage: (id: string, updates: Partial<Message>) => void;
    updateMessageInSession: (sessionId: string, id: string, updates: Partial<Message>) => void;
    removeMessage: (id: string) => void;
    removeMessageFromSession: (sessionId: string, id: string) => void;
    clearMessages: () => void;

    // Selected content for modals (from message bubble actions)
    selectedContent: SelectedContent;
    setSelectedContent: (content: SelectedContent) => void;
    clearSelectedContent: () => void;

    // Limit exceeded state (for guest users)
    isLimitExceeded: boolean;
    setIsLimitExceeded: (exceeded: boolean) => void;

    // Sessions
    sessions: ChatSession[];
    activeSessionId: string | null;
    startDraftSession: () => void;
    setActiveSessionId: (id: string | null) => void;
    createSession: (title: string, options?: { chatId?: number | null; resetMessages?: boolean; setActive?: boolean; }) => void;
    deleteSession: (id: string) => void;
    updateSession: (id: string, updates: Partial<ChatSession>) => void;
    updateSessionByChatId: (chatId: number, updates: Partial<ChatSession>) => void;
    loadChatHistory: (chats: { id: number; title: string }[]) => void;
    clearSessions: () => void;
    sessionMessages: Record<string, Message[]>;
    setSessionMessages: (sessionId: string, messages: Message[]) => void;
    clearSessionMessages: (sessionId: string) => void;

    // Active Chat ID (backend persistence)
    chatId: number | null;
    setChatId: (id: number | null) => void;

    // User
    username: string | null;
    setUsername: (name: string) => void;
    profilePicture: string | null;
    setProfilePicture: (picture: string | null) => void;

    // Subscription
    plan: PlanType;
    setPlan: (plan: PlanType) => void;

    // AI Settings
    aiSettings: AISettings;
    setAISettings: (settings: Partial<AISettings>) => void;

    // Privacy Settings
    privacySettings: PrivacySettings;
    setPrivacySettings: (settings: Partial<PrivacySettings>) => void;

    // Language
    language: Language;
    setLanguage: (lang: Language) => void;

    // Data Management
    clearAllData: () => void;
    exportData: () => string;
}

const DEFAULT_AI_SETTINGS: AISettings = {
    responseStyle: 'balanced',
    saveHistory: true,
    quickActionsEnabled: true,
    studyMethods: [],
    studyCustomPrompt: '',
};

const DEFAULT_PRIVACY_SETTINGS: PrivacySettings = {
    shareAnalytics: false,
    improveAI: true,
};

const normalizeUsername = (value: string | null | undefined): string | null => {
    const input = value?.trim();
    if (!input) return null;
    return formatDisplayName(input, "Guest");
};

export const useDataStore = create<DataState>()(
    persist(
        (set, get) => {
            return ({
            hasHydrated: false,
            setHasHydrated: (hasHydrated) => set({ hasHydrated }),

            // Authentication
            isLoggedIn: false,
            login: (username) => set((state) => {
                const normalizedUsername = normalizeUsername(username);
                const shouldReset = !state.isLoggedIn || state.username !== normalizedUsername;
                return {
                    isLoggedIn: true,
                    username: normalizedUsername,
                    ...(shouldReset
                        ? {
                            profilePicture: null,
                            sessions: [],
                            activeSessionId: null,
                            chatId: null,
                            messages: [],
                            sessionMessages: {},
                            isLimitExceeded: false,
                        }
                        : {}),
                };
            }),
            logout: () => {
                localStorage.removeItem("access");
                localStorage.removeItem("refresh");
                set({
                    isLoggedIn: false,
                    username: null,
                    profilePicture: null,
                    sessions: [],
                    activeSessionId: null,
                    chatId: null,
                    messages: [],
                    sessionMessages: {},
                    isLimitExceeded: false,
                });
            },
            syncAuthFromStorage: () => {
                if (typeof window === "undefined") return;
                const access = localStorage.getItem("access");
                if (!access) {
                    localStorage.removeItem("refresh");
                    set({
                        isLoggedIn: false,
                        username: null,
                        profilePicture: null,
                        sessions: [],
                        activeSessionId: null,
                        chatId: null,
                        messages: [],
                        sessionMessages: {},
                        isLimitExceeded: false,
                    });
                    return;
                }
                // Restore username from persisted state if available
                const storedState = localStorage.getItem('qwikstudi-data');
                let storedUsername: string | null = null;
                try {
                    if (storedState) {
                        const parsed = JSON.parse(storedState);
                        storedUsername = parsed.state?.username || null;
                    }
                } catch {
                    // ignore parse errors
                }
                set((state) => ({
                    isLoggedIn: true,
                    username: normalizeUsername(storedUsername ?? state.username),
                }));
            },
            setAuthUser: (user) => set((state) => {
                const nextUsername = normalizeUsername(user?.username ?? null);
                const shouldReset = !state.isLoggedIn || state.username !== nextUsername;
                return {
                    isLoggedIn: true,
                    username: nextUsername,
                    ...(shouldReset
                        ? {
                            profilePicture: null,
                            sessions: [],
                            activeSessionId: null,
                            chatId: null,
                            messages: [],
                            sessionMessages: {},
                            isLimitExceeded: false,
                        }
                        : {}),
                };
            }),

            // Messages
            messages: [],
            setMessages: (messages) => set((state) => ({
                messages,
                sessionMessages: state.activeSessionId
                    ? {
                        ...state.sessionMessages,
                        [state.activeSessionId]: messages,
                    }
                    : state.sessionMessages,
            })),
            setMessagesForSession: (sessionId, messages) => set((state) => applyMessagesToSession(state, sessionId, messages)),
            addMessage: (message) => set((state) => {
                const messages = [...state.messages, message];
                return {
                    messages,
                    sessionMessages: state.activeSessionId
                        ? {
                            ...state.sessionMessages,
                            [state.activeSessionId]: messages,
                        }
                        : state.sessionMessages,
                };
            }),
            addMessageToSession: (sessionId, message) => set((state) => {
                const currentMessages = getMessagesForSession(state, sessionId);
                return applyMessagesToSession(state, sessionId, [...currentMessages, message]);
            }),
            appendMessageContent: (id, delta) => set((state) => {
                const messages = state.messages.map((message) =>
                    message.id === id
                        ? { ...message, content: `${message.content || ""}${delta}` }
                        : message
                );
                return {
                    messages,
                    sessionMessages: state.activeSessionId
                        ? {
                            ...state.sessionMessages,
                            [state.activeSessionId]: messages,
                        }
                        : state.sessionMessages,
                };
            }),
            appendMessageContentInSession: (sessionId, id, delta) => set((state) => {
                const currentMessages = getMessagesForSession(state, sessionId);
                const messages = currentMessages.map((message) =>
                    message.id === id
                        ? { ...message, content: `${message.content || ""}${delta}` }
                        : message
                );
                return applyMessagesToSession(state, sessionId, messages);
            }),
            updateMessage: (id, updates) => set((state) => {
                const messages = state.messages.map((message) =>
                    message.id === id ? { ...message, ...updates } : message
                );
                return {
                    messages,
                    sessionMessages: state.activeSessionId
                        ? {
                            ...state.sessionMessages,
                            [state.activeSessionId]: messages,
                        }
                        : state.sessionMessages,
                };
            }),
            updateMessageInSession: (sessionId, id, updates) => set((state) => {
                const currentMessages = getMessagesForSession(state, sessionId);
                const messages = currentMessages.map((message) =>
                    message.id === id ? { ...message, ...updates } : message
                );
                return applyMessagesToSession(state, sessionId, messages);
            }),
            removeMessage: (id: string) => set((state) => {
                const messages = state.messages.filter(m => m.id !== id);
                return {
                    messages,
                    sessionMessages: state.activeSessionId
                        ? {
                            ...state.sessionMessages,
                            [state.activeSessionId]: messages,
                        }
                        : state.sessionMessages,
                };
            }),
            removeMessageFromSession: (sessionId: string, id: string) => set((state) => {
                const currentMessages = getMessagesForSession(state, sessionId);
                return applyMessagesToSession(
                    state,
                    sessionId,
                    currentMessages.filter((message) => message.id !== id)
                );
            }),
            clearMessages: () => set((state) => ({
                messages: [],
                sessionMessages: state.activeSessionId
                    ? {
                        ...state.sessionMessages,
                        [state.activeSessionId]: [],
                    }
                    : state.sessionMessages,
            })),

            // Selected content for modals (from message bubble actions)
            selectedContent: { type: null, content: '' },
            setSelectedContent: (content) => set({ selectedContent: content }),
            clearSelectedContent: () => set({ selectedContent: { type: null, content: '' } }),

            // Limit exceeded state (for guest users)
            isLimitExceeded: false,
            setIsLimitExceeded: (exceeded) => set({ isLimitExceeded: exceeded }),

            // Sessions
            sessions: [],
            activeSessionId: null,
            startDraftSession: () => set({
                activeSessionId: null,
                chatId: null,
                messages: [],
            }),
            setActiveSessionId: (activeSessionId) => set((state) => {
                const nextSession = activeSessionId
                    ? state.sessions.find((session) => session.id === activeSessionId)
                    : null;
                return {
                    activeSessionId,
                    chatId: nextSession?.chatId ?? null,
                    messages: activeSessionId ? (state.sessionMessages[activeSessionId] ?? []) : [],
                };
            }),
            createSession: (title, options) => set((state) => {
                const { chatId = null, resetMessages = true, setActive = true } = options || {};
                const newSession = {
                    id: nanoid(),
                    title,
                    lastMessageAt: new Date(),
                    chatId,
                    studyMethods: [...(state.aiSettings.studyMethods || [])],
                    studyCustomPrompt: state.aiSettings.studyCustomPrompt || "",
                };
                return {
                    sessions: [newSession, ...state.sessions],
                    activeSessionId: setActive ? newSession.id : state.activeSessionId,
                    messages: resetMessages ? [] : state.messages,
                    chatId: chatId ?? (resetMessages ? null : state.chatId),
                };
            }),
            deleteSession: (id) => set((state) => {
                const newSessions = state.sessions.filter(s => s.id !== id);
                const newActiveId = state.activeSessionId === id
                    ? (newSessions[0]?.id || null)
                    : state.activeSessionId;
                const newActiveSession = newActiveId
                    ? newSessions.find((session) => session.id === newActiveId)
                    : null;
                return {
                    sessions: newSessions,
                    activeSessionId: newActiveId,
                    chatId: newActiveSession?.chatId ?? null,
                    messages: [],
                    sessionMessages: Object.fromEntries(
                        Object.entries(state.sessionMessages).filter(([sessionId]) => sessionId !== id)
                    ),
                };
            }),
            updateSession: (id, updates) => set((state) => ({
                sessions: state.sessions.map((session) =>
                    session.id === id ? { ...session, ...updates } : session
                ),
            })),
            updateSessionByChatId: (chatId, updates) => set((state) => ({
                sessions: state.sessions.map((session) =>
                    session.chatId === chatId ? { ...session, ...updates } : session
                ),
            })),
            loadChatHistory: (chats: { id: number; title: string }[]) => set(() => {
                const loadedSessions: ChatSession[] = chats.map(chat => ({
                    id: nanoid(),
                    title: chat.title,
                    lastMessageAt: new Date(), // Could be improved to get actual last message time
                    chatId: chat.id,
                    studyMethods: [],
                    studyCustomPrompt: '',
                }));
                const nextActiveId = loadedSessions[0]?.id || null;
                const nextChatId = loadedSessions[0]?.chatId ?? null;
                return {
                    sessions: loadedSessions,
                    activeSessionId: nextActiveId,
                    chatId: nextChatId,
                    messages: [],
                    sessionMessages: {},
                };
            }),
            clearSessions: () => set({ sessions: [], activeSessionId: null, sessionMessages: {} }),
            sessionMessages: {},
            setSessionMessages: (sessionId, messages) => set((state) => ({
                sessionMessages: {
                    ...state.sessionMessages,
                    [sessionId]: messages,
                },
            })),
            clearSessionMessages: (sessionId) => set((state) => {
                if (!state.sessionMessages[sessionId]) return state;
                return {
                    sessionMessages: Object.fromEntries(
                        Object.entries(state.sessionMessages).filter(([id]) => id !== sessionId)
                    ),
                };
            }),

            // Active Chat ID (backend persistence)
            chatId: null,
            setChatId: (chatId) => set({ chatId }),

            // User
            username: null,
            setUsername: (username) => set({ username: normalizeUsername(username) }),
            profilePicture: null,
            setProfilePicture: (profilePicture) => set({ profilePicture }),

            // Subscription
            plan: 'free',
            setPlan: (plan) => set({ plan }),

            // AI Settings
            aiSettings: DEFAULT_AI_SETTINGS,
            setAISettings: (settings) => set((state) => ({
                aiSettings: { ...state.aiSettings, ...settings }
            })),

            // Privacy Settings
            privacySettings: DEFAULT_PRIVACY_SETTINGS,
            setPrivacySettings: (settings) => set((state) => ({
                privacySettings: { ...state.privacySettings, ...settings }
            })),

            // Language
            language: 'English',
            setLanguage: (language) => set({ language }),

            // Data Management
            clearAllData: () => set({
                isLoggedIn: false,
                messages: [],
                sessions: [],
                activeSessionId: null,
                chatId: null,
                username: null,
                profilePicture: null,
                plan: 'free',
                aiSettings: DEFAULT_AI_SETTINGS,
                privacySettings: DEFAULT_PRIVACY_SETTINGS,
                language: 'English',
                isLimitExceeded: false,
            }),
            exportData: () => {
                const state = get();
                return JSON.stringify({
                    username: state.username,
                    plan: state.plan,
                    messages: state.messages,
                    sessions: state.sessions,
                    aiSettings: state.aiSettings,
                    privacySettings: state.privacySettings,
                    exportedAt: new Date().toISOString(),
                }, null, 2);
            },
        });
    },
        {
            name: 'qwikstudi-data',
            onRehydrateStorage: () => (state) => {
                state?.syncAuthFromStorage?.();
                state?.setHasHydrated?.(true);
            },
            partialize: (state) => ({
                isLoggedIn: state.isLoggedIn,
                username: state.username,
                profilePicture: state.profilePicture,
                sessions: state.sessions,
                messages: state.messages,
                sessionMessages: state.sessionMessages,
                activeSessionId: state.activeSessionId,
                chatId: state.chatId,
                plan: state.plan,
                aiSettings: state.aiSettings,
                privacySettings: state.privacySettings,
                language: state.language,
            }),
        }
    )
);
