import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useUIStore } from './uiStore';
import { useDataStore } from './dataStore';

/**
 * Legacy Chat Store - Facade for backward compatibility
 * 
 * ⚠️ IMPORTANT: This facade pattern has reactivity limitations!
 * 
 * Components using `useChatStore()` may not re-render when data changes
 * in the underlying `useUIStore` or `useDataStore` because JavaScript
 * getters don't properly integrate with Zustand's subscription system.
 * 
 * **Migration Recommended**: Update components to use atomic stores directly:
 * ```tsx
 * // ❌ Old (may not re-render)
 * const { messages } = useChatStore();
 * 
 * // ✅ New (properly reactive)
 * import { useDataStore } from '@/stores';
 * const messages = useDataStore((state) => state.messages);
 * ```
 * 
 * @deprecated Consider migrating to useUIStore and useDataStore directly.
 */

export type ActiveMode = 'chat' | 'tts' | 'stt' | 'quiz' | 'summarize';
export type PlanType = 'free' | 'pro';
export type ResponseStyle = 'concise' | 'balanced' | 'detailed';

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

interface ChatState {
    // Messages (delegates to useDataStore)
    messages: Message[];
    addMessage: (message: Message) => void;
    clearMessages: () => void;

    // Active mode
    activeMode: ActiveMode;
    setActiveMode: (mode: ActiveMode) => void;

    // Sessions (delegates to useDataStore)
    sessions: ChatSession[];
    activeSessionId: string | null;
    setActiveSessionId: (id: string | null) => void;
    createSession: (title: string, options?: { chatId?: number | null; resetMessages?: boolean; setActive?: boolean; }) => void;
    clearSessions: () => void;

    // UI State (delegates to useUIStore)
    isSidebarOpen: boolean;
    toggleSidebar: () => void;
    setIsSidebarOpen: (isOpen: boolean) => void;
    isLoading: boolean;
    setIsLoading: (isLoading: boolean) => void;
    activeModal: 'tts' | 'stt' | 'quiz' | 'summarize' | 'upgrade' | 'deleteConfirm' | null;
    setActiveModal: (modal: 'tts' | 'stt' | 'quiz' | 'summarize' | 'upgrade' | 'deleteConfirm' | null) => void;

    // User (delegates to useDataStore)
    username: string | null;
    setUsername: (name: string) => void;
    profilePicture: string | null;
    setProfilePicture: (picture: string | null) => void;

    // Subscription (delegates to useDataStore)
    plan: PlanType;
    setPlan: (plan: PlanType) => void;

    // AI Settings (delegates to useDataStore)
    aiSettings: AISettings;
    setAISettings: (settings: Partial<AISettings>) => void;

    // Privacy Settings (delegates to useDataStore)
    privacySettings: PrivacySettings;
    setPrivacySettings: (settings: Partial<PrivacySettings>) => void;

    // Data Management (delegates to useDataStore)
    clearAllData: () => void;
    exportData: () => string;
}

export const useChatStore = create<ChatState>()(
    persist(
        (set) => ({
            // Messages - delegate to useDataStore
            get messages() { return useDataStore.getState().messages; },
            addMessage: (message) => {
                useDataStore.getState().addMessage(message);
                set({}); // Trigger re-render
            },
            clearMessages: () => {
                useDataStore.getState().clearMessages();
                set({});
            },

            // Active mode - local to this store
            activeMode: 'chat',
            setActiveMode: (activeMode) => set({ activeMode }),

            // Sessions - delegate to useDataStore
            get sessions() { return useDataStore.getState().sessions; },
            get activeSessionId() { return useDataStore.getState().activeSessionId; },
            setActiveSessionId: (id) => {
                useDataStore.getState().setActiveSessionId(id);
                set({});
            },
            createSession: (title) => {
                useDataStore.getState().createSession(title);
                set({});
            },
            clearSessions: () => {
                useDataStore.getState().clearSessions();
                set({});
            },

            // UI State - delegate to useUIStore
            get isSidebarOpen() { return useUIStore.getState().isSidebarOpen; },
            toggleSidebar: () => {
                useUIStore.getState().toggleSidebar();
                set({});
            },
            setIsSidebarOpen: (isOpen) => {
                useUIStore.getState().setIsSidebarOpen(isOpen);
                set({});
            },
            get isLoading() { return useUIStore.getState().isLoading; },
            setIsLoading: (isLoading) => {
                useUIStore.getState().setIsLoading(isLoading);
                set({});
            },
            get activeModal() { return useUIStore.getState().activeModal; },
            setActiveModal: (modal) => {
                useUIStore.getState().setActiveModal(modal);
                set({});
            },

            // User - delegate to useDataStore
            get username() { return useDataStore.getState().username; },
            setUsername: (name) => {
                useDataStore.getState().setUsername(name);
                set({});
            },
            get profilePicture() { return useDataStore.getState().profilePicture; },
            setProfilePicture: (picture) => {
                useDataStore.getState().setProfilePicture(picture);
                set({});
            },

            // Subscription - delegate to useDataStore
            get plan() { return useDataStore.getState().plan; },
            setPlan: (plan) => {
                useDataStore.getState().setPlan(plan);
                set({});
            },

            // AI Settings - delegate to useDataStore
            get aiSettings() { return useDataStore.getState().aiSettings; },
            setAISettings: (settings) => {
                useDataStore.getState().setAISettings(settings);
                set({});
            },

            // Privacy Settings - delegate to useDataStore
            get privacySettings() { return useDataStore.getState().privacySettings; },
            setPrivacySettings: (settings) => {
                useDataStore.getState().setPrivacySettings(settings);
                set({});
            },

            // Data Management - delegate to useDataStore
            clearAllData: () => {
                useDataStore.getState().clearAllData();
                set({});
            },
            exportData: () => useDataStore.getState().exportData(),
        }),
        {
            name: 'qwikstudi-storage',
            // Only persist activeMode locally; everything else is in other stores
            partialize: (state) => ({
                activeMode: state.activeMode,
            }),
        }
    )
);
