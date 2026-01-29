import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { nanoid } from 'nanoid';

/**
 * Data Store - Handles persistent user data
 * Persisted to localStorage
 */

export type PlanType = 'free' | 'pro';
export type ResponseStyle = 'concise' | 'balanced' | 'detailed';
export type Language = 'English' | 'French' | 'Twi';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    type?: 'text' | 'audio' | 'quiz' | 'summary' | 'notes';
    metadata?: Record<string, unknown>;
    timestamp: Date;
}

interface ChatSession {
    id: string;
    title: string;
    lastMessageAt: Date;
    chatId: number | null;
}

interface AISettings {
    responseStyle: ResponseStyle;
    saveHistory: boolean;
    quickActionsEnabled: boolean;
}

interface PrivacySettings {
    shareAnalytics: boolean;
    improveAI: boolean;
}

interface DataState {
    // Authentication
    isLoggedIn: boolean;
    login: (username: string) => void;
    logout: () => void;

    // Messages
    messages: Message[];
    addMessage: (message: Message) => void;
    removeMessage: (id: string) => void;
    clearMessages: () => void;

    // Sessions
    sessions: ChatSession[];
    activeSessionId: string | null;
    setActiveSessionId: (id: string | null) => void;
    createSession: (title: string) => void;
    deleteSession: (id: string) => void;
    loadChatHistory: (chats: { id: number; title: string }[]) => void;
    clearSessions: () => void;

    // Active Chat ID (backend persistence)
    chatId: number | null;
    setChatId: (id: number | null) => void;

    // User
    username: string;
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
};

const DEFAULT_PRIVACY_SETTINGS: PrivacySettings = {
    shareAnalytics: false,
    improveAI: true,
};

export const useDataStore = create<DataState>()(
    persist(
        (set, get) => ({
            // Authentication
            isLoggedIn: false,
            login: (username) => set({ isLoggedIn: true, username }),
            logout: () => {
                localStorage.removeItem("access");
                localStorage.removeItem("refresh");
                set({
                    isLoggedIn: false,
                    username: '',
                    profilePicture: null,
                    sessions: [],
                    activeSessionId: null,
                    chatId: null,
                    messages: [],
                });
            },

            // Messages
            messages: [],
            addMessage: (message) => set((state) => ({
                messages: [...state.messages, message]
            })),
            removeMessage: (id: string) => set((state) => ({
                messages: state.messages.filter(m => m.id !== id)
            })),
            clearMessages: () => set({ messages: [] }),

            // Sessions
            sessions: [],
            activeSessionId: null,
            setActiveSessionId: (activeSessionId) => set({ activeSessionId }),
            createSession: (title) => set((state) => {
                const newSession = {
                    id: nanoid(),
                    title,
                    lastMessageAt: new Date(),
                    chatId: null,
                };
                return {
                    sessions: [newSession, ...state.sessions],
                    activeSessionId: newSession.id,
                    messages: [],
                    chatId: null,
                };
            }),
            deleteSession: (id) => set((state) => {
                const newSessions = state.sessions.filter(s => s.id !== id);
                const newActiveId = state.activeSessionId === id
                    ? (newSessions[0]?.id || null)
                    : state.activeSessionId;
                return {
                    sessions: newSessions,
                    activeSessionId: newActiveId,
                };
            }),
            loadChatHistory: (chats: { id: number; title: string }[]) => set(() => {
                const loadedSessions: ChatSession[] = chats.map(chat => ({
                    id: nanoid(),
                    title: chat.title,
                    lastMessageAt: new Date(), // Could be improved to get actual last message time
                    chatId: chat.id,
                }));
                return {
                    sessions: loadedSessions,
                };
            }),
            clearSessions: () => set({ sessions: [], activeSessionId: null }),

            // Active Chat ID (backend persistence)
            chatId: null,
            setChatId: (chatId) => set({ chatId }),

            // User
            username: '',
            setUsername: (username) => set({ username }),
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
                username: '',
                profilePicture: null,
                plan: 'free',
                aiSettings: DEFAULT_AI_SETTINGS,
                privacySettings: DEFAULT_PRIVACY_SETTINGS,
                language: 'English',
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
        }),
        {
            name: 'qwikstudi-data',
            partialize: (state) => ({
                isLoggedIn: state.isLoggedIn,
                username: state.username,
                profilePicture: state.profilePicture,
                sessions: state.sessions,
                messages: state.messages,
                plan: state.plan,
                aiSettings: state.aiSettings,
                privacySettings: state.privacySettings,
                language: state.language,
            }),
        }
    )
);
