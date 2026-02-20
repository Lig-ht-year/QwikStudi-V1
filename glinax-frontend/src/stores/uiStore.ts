import { create } from 'zustand';

/**
 * UI Store - Handles transient UI state
 * NOT persisted to localStorage
 */

type ModalType = 'tts' | 'stt' | 'quiz' | 'summarize' | 'upgrade' | 'deleteConfirm' | null;

interface UIState {
    // Sidebar
    isSidebarOpen: boolean;
    toggleSidebar: () => void;
    setIsSidebarOpen: (isOpen: boolean) => void;

    // Loading
    isLoading: boolean;
    setIsLoading: (isLoading: boolean) => void;

    // Modal
    activeModal: ModalType;
    setActiveModal: (modal: ModalType) => void;

    // Composer quick prompt
    explainPrompt: string;
    setExplainPrompt: (prompt: string) => void;
    clearExplainPrompt: () => void;

    // Mobile Menu
    isMobileMenuOpen: boolean;
    setIsMobileMenuOpen: (isOpen: boolean) => void;
}

export const useUIStore = create<UIState>()((set) => ({
    // Sidebar - default open on desktop
    isSidebarOpen: true,
    toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
    setIsSidebarOpen: (isSidebarOpen) => set({ isSidebarOpen }),

    // Loading
    isLoading: false,
    setIsLoading: (isLoading) => set({ isLoading }),

    // Modal
    activeModal: null,
    setActiveModal: (activeModal) => set({ activeModal }),

    // Composer quick prompt
    explainPrompt: "",
    setExplainPrompt: (explainPrompt) => set({ explainPrompt }),
    clearExplainPrompt: () => set({ explainPrompt: "" }),

    // Mobile Menu
    isMobileMenuOpen: false,
    setIsMobileMenuOpen: (isMobileMenuOpen) => set({ isMobileMenuOpen }),
}));
