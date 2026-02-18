"use client";

import React, { useEffect } from "react";
import { Sidebar } from "./Sidebar";
import { AlignLeft, Plus, User } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/stores/uiStore";
import { useDataStore } from "@/stores/dataStore";
import { KeyboardShortcuts } from "@/components/KeyboardShortcuts";
import { checkPremiumStatus } from "@/lib/payment";
import api from "@/lib/api";

interface AppShellProps {
    children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
    // Use atomic stores directly for proper reactivity
    const isSidebarOpen = useUIStore((state) => state.isSidebarOpen);
    const setIsSidebarOpen = useUIStore((state) => state.setIsSidebarOpen);
    const startDraftSession = useDataStore((state) => state.startDraftSession);
    const profilePicture = useDataStore((state) => state.profilePicture);
    const isLoggedIn = useDataStore((state) => state.isLoggedIn);
    const syncAuthFromStorage = useDataStore((state) => state.syncAuthFromStorage);
    const setAuthUser = useDataStore((state) => state.setAuthUser);
    const logout = useDataStore((state) => state.logout);
    const setPlan = useDataStore((state) => state.setPlan);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

    useEffect(() => {
        syncAuthFromStorage();
    }, [syncAuthFromStorage]);

    useEffect(() => {
        if (typeof window === "undefined") return;
        const access = localStorage.getItem("access");
        if (!access) return;
        (async () => {
            try {
                const res = await api.get("/auth/me/");
                if (res?.data?.username) {
                    setAuthUser({ username: res.data.username });
                }
            } catch (error: unknown) {
                const status = (error as { response?: { status?: number } })?.response?.status;
                if (status === 401 || status === 403) {
                    logout();
                }
            }
        })();
    }, [setAuthUser, logout]);

    useEffect(() => {
        if (!isLoggedIn) return;
        (async () => {
            try {
                const isPremium = await checkPremiumStatus();
                setPlan(isPremium ? "pro" : "free");
            } catch {
                // ignore
            }
        })();
    }, [isLoggedIn, setPlan]);

    return (
        <KeyboardShortcuts>
            <div className="flex h-screen md:h-[100dvh] w-full bg-background overflow-hidden">
                {/* Desktop Sidebar - Completely hidden when closed */}
                {isSidebarOpen && (
                    <div className="hidden md:block border-r border-border/20">
                        <Sidebar />
                    </div>
                )}

                {/* Mobile Sidebar / Drawer - Only render when needed */}
                {isMobileMenuOpen && (
                    <div
                        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm md:hidden"
                        onClick={() => setIsMobileMenuOpen(false)}
                    >
                        <div
                            className="fixed inset-y-0 left-0 w-64 bg-background border-r border-border/20 rounded-r-3xl overflow-hidden shadow-2xl"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <Sidebar
                                isOpen={true}
                                onClose={() => setIsMobileMenuOpen(false)}
                            />
                        </div>
                    </div>
                )}

                {/* Main Content Area */}
                <div className="flex-1 flex flex-col min-w-0">
                    {/* Header - Visible on all screens */}
                    <header className="flex items-center justify-between p-4 sticky top-0 z-40">
                        {/* Menu button - Mobile always, Desktop when sidebar closed */}
                        <button
                            onClick={() => {
                                if (window.innerWidth < 768) {
                                    setIsMobileMenuOpen(true);
                                } else {
                                    setIsSidebarOpen(true);
                                }
                            }}
                            className={cn(
                                "px-4 py-2 rounded-full border border-white/10 bg-white/5 backdrop-blur-md text-muted-foreground hover:text-foreground hover:bg-white/10 transition-all",
                                isSidebarOpen ? "md:hidden" : ""
                            )}
                        >
                            <AlignLeft className="w-5 h-5" />
                        </button>

                        {/* Desktop spacer - only when sidebar is open */}
                        {isSidebarOpen && <div className="hidden md:block" />}

                        {/* Logo Pill */}
                        <div className="px-5 py-2 rounded-full bg-background/50 backdrop-blur-md">
                            <span className="font-bold text-base tracking-tight text-foreground">
                                QwikStudi
                            </span>
                        </div>

                        {/* Actions Pill */}
                        <div className="flex items-center gap-1 px-2 py-1.5 rounded-full border border-white/10 bg-white/5 backdrop-blur-md">
                            <button
                                className="p-2 rounded-full hover:bg-white/10 text-muted-foreground hover:text-primary transition-colors"
                                onClick={startDraftSession}
                            >
                                <Plus className="w-5 h-5" />
                            </button>
                            <Link
                                href="/settings"
                                className="p-2 rounded-full hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors overflow-hidden"
                            >
                                {profilePicture ? (
                                    <div className="w-5 h-5 rounded-full overflow-hidden">
                                        <img src={profilePicture} alt="Profile" className="w-full h-full object-cover" />
                                    </div>
                                ) : (
                                    <User className="w-5 h-5" />
                                )}
                            </Link>
                        </div>
                    </header>

                    <main className="flex-1 relative overflow-hidden">
                        {children}
                    </main>
                </div>
            </div>
        </KeyboardShortcuts>
    );
}
