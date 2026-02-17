"use client";

import React, { useState } from "react";
import {
    Plus,
    MessageSquare,
    Settings,
    Sun,
    Moon,
    HelpCircle,
    Mic,
    Headphones,
    FileText,
    Brain,
    Crown,
    Menu,
    Search,
    PanelLeftClose,
    X,
    User,
    LogOut,
    LogIn,
    Trash2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDisplayName } from "@/lib/utils";
import { useUIStore } from "@/stores/uiStore";
import { useDataStore } from "@/stores/dataStore";
import { useTheme } from "next-themes";
import Link from "next/link";
import { translations } from "@/lib/translations";

function ThemeToggle() {
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = React.useState(false);

    React.useEffect(() => setMounted(true), []);

    if (!mounted) return <div className="flex-1 p-2" />;

    return (
        <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="flex-1 p-2.5 flex items-center justify-center rounded-xl bg-white/5 hover:bg-yellow-500/20 text-muted-foreground hover:text-yellow-400 transition-all"
        >
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
    );
}

interface SidebarProps {
    isOpen?: boolean;
    onClose?: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
    // Use atomic stores directly for proper reactivity
    const storeIsSidebarOpen = useUIStore((state) => state.isSidebarOpen);
    const storeToggleSidebar = useUIStore((state) => state.toggleSidebar);

    // Determine effective state: prop takes precedence if defined
    const isSidebarOpen = isOpen ?? storeIsSidebarOpen;
    const toggleSidebar = onClose ?? storeToggleSidebar;

    const setActiveModal = useUIStore((state) => state.setActiveModal);

    const isLoggedIn = useDataStore((state) => state.isLoggedIn);
    const logout = useDataStore((state) => state.logout);
    const sessions = useDataStore((state) => state.sessions);
    const activeSessionId = useDataStore((state) => state.activeSessionId);
    const setActiveSessionId = useDataStore((state) => state.setActiveSessionId);
    const setChatId = useDataStore((state) => state.setChatId);
    const deleteSession = useDataStore((state) => state.deleteSession);
    const createSession = useDataStore((state) => state.createSession);
    const username = useDataStore((state) => state.username);
    const profilePicture = useDataStore((state) => state.profilePicture);
    const plan = useDataStore((state) => state.plan);
    const aiSettings = useDataStore((state) => state.aiSettings);
    const language = useDataStore((state) => state.language);

    // Get translations
    const t = translations[language];

    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    // Filter sessions based on search query
    const filteredSessions = sessions.filter((session) =>
        session.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div
            className="relative flex flex-col h-full w-64 bg-background overflow-hidden"
        >
            {/* Header - Collapse Menu & Logo/Search */}
            <div className="p-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => toggleSidebar()}
                        className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-foreground transition-all shrink-0"
                        title={isSidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
                    >
                        {isSidebarOpen ? <PanelLeftClose className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
                    </button>
                    {/* Show QwikStudi title when not logged in */}
                    {!isLoggedIn && isSidebarOpen && (
                        <span className="font-bold text-lg text-foreground">QwikStudi</span>
                    )}
                </div>
                {isLoggedIn && isSidebarOpen && (
                    <button
                        onClick={() => setIsSearchOpen(!isSearchOpen)}
                        className={cn(
                            "p-2 rounded-full hover:bg-white/5 text-muted-foreground hover:text-foreground transition-all",
                            isSearchOpen && "bg-white/5 text-foreground"
                        )}
                        title={t.searchChats}
                    >
                        <Search className="w-4 h-4" />
                    </button>
                )}
            </div>

            {/* Search Input - Shows below header when active */}
            {isLoggedIn && isSidebarOpen && isSearchOpen && (
                <div className="px-4 pb-3 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="flex items-center gap-2 bg-white/5 rounded-xl px-3 py-2.5 border border-white/10">
                        <Search className="w-4 h-4 text-muted-foreground shrink-0" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder={t.searchChats}
                            className="flex-1 bg-transparent border-none outline-none text-sm placeholder:text-muted-foreground/50"
                            autoFocus
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery("")}
                                className="p-1 rounded-full hover:bg-white/10 text-muted-foreground hover:text-foreground transition-all"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Buttons Section - constrained height - Only show when logged in */}
            {isLoggedIn && (
                <div className="px-4 shrink-0">
                    <button
                        onClick={() => createSession("New Study Session")}
                        className={cn(
                            "w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] hover:shadow-primary/30 group mb-3",
                            !isSidebarOpen && "px-3"
                        )}
                    >
                        <Plus className="w-5 h-5 transition-transform group-hover:rotate-90" />
                        {isSidebarOpen && (
                            <span className="font-semibold text-sm">{t.newChat}</span>
                        )}
                    </button>
                </div>
            )}

            {/* Main Scrollable Area - Only show when logged in */}
            {isLoggedIn && (
                <div className="flex-1 min-h-0 flex flex-col px-4 overflow-y-auto custom-scrollbar">

                    {/* Study Tools Section (Moved Here) */}
                    {aiSettings.quickActionsEnabled && (
                        <div className="flex flex-col gap-1 mb-4 mt-1">
                            {isSidebarOpen && (
                                <h3 className="px-3 mb-2 text-xs font-semibold text-muted-foreground/60 uppercase tracking-wider">
                                    {t.studyTools}
                                </h3>
                            )}

                            <button
                                onClick={() => setActiveModal('quiz')}
                                className={cn(
                                    "group flex items-center gap-3 rounded-lg hover:bg-white/5 transition-all duration-200",
                                    isSidebarOpen ? "w-full p-2" : "p-2 justify-center rounded-xl"
                                )}
                                title="Quiz"
                            >
                                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-orange-400 via-orange-500 to-orange-600 flex items-center justify-center shadow-md shadow-orange-500/20 group-hover:shadow-orange-500/40 transition-shadow duration-300 shrink-0">
                                    <Brain className="w-4 h-4 text-white" />
                                </div>
                                {isSidebarOpen && <span className="text-sm font-medium text-foreground/80 group-hover:text-foreground">{t.quiz}</span>}
                            </button>

                            <button
                                onClick={() => setActiveModal('summarize')}
                                className={cn(
                                    "group flex items-center gap-3 rounded-lg hover:bg-white/5 transition-all duration-200",
                                    isSidebarOpen ? "w-full p-2" : "p-2 justify-center rounded-xl"
                                )}
                                title="Summarize"
                            >
                                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-400 via-emerald-500 to-emerald-600 flex items-center justify-center shadow-md shadow-emerald-500/20 group-hover:shadow-emerald-500/40 transition-shadow duration-300 shrink-0">
                                    <FileText className="w-4 h-4 text-white" />
                                </div>
                                {isSidebarOpen && <span className="text-sm font-medium text-foreground/80 group-hover:text-foreground">{t.summarize}</span>}
                            </button>

                            <button
                                onClick={() => setActiveModal('tts')}
                                className={cn(
                                    "group flex items-center gap-3 rounded-lg hover:bg-white/5 transition-all duration-200",
                                    isSidebarOpen ? "w-full p-2" : "p-2 justify-center rounded-xl"
                                )}
                                title="Listen"
                            >
                                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-400 via-violet-500 to-violet-600 flex items-center justify-center shadow-md shadow-violet-500/20 group-hover:shadow-violet-500/40 transition-shadow duration-300 shrink-0">
                                    <Headphones className="w-4 h-4 text-white" />
                                </div>
                                {isSidebarOpen && <span className="text-sm font-medium text-foreground/80 group-hover:text-foreground">{t.listen}</span>}
                            </button>

                            <button
                                onClick={() => setActiveModal('stt')}
                                className={cn(
                                    "group flex items-center gap-3 rounded-lg hover:bg-white/5 transition-all duration-200",
                                    isSidebarOpen ? "w-full p-2" : "p-2 justify-center rounded-xl"
                                )}
                                title="Transcribe"
                            >
                                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-sky-400 via-sky-500 to-sky-600 flex items-center justify-center shadow-md shadow-sky-500/20 group-hover:shadow-sky-500/40 transition-shadow duration-300 shrink-0">
                                    <Mic className="w-4 h-4 text-white" />
                                </div>
                                {isSidebarOpen && <span className="text-sm font-medium text-foreground/80 group-hover:text-foreground">{t.transcribe}</span>}
                            </button>
                        </div>
                    )}
                    {/* Divider */}
                    {isSidebarOpen && (
                        <div className="h-px bg-gradient-to-r from-transparent via-border/50 to-transparent mb-3 shrink-0" />
                    )}

                    {/* Header */}
                    {isSidebarOpen && (
                        <div className="flex items-center justify-between mb-2 shrink-0">
                            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                {searchQuery ? t.searchResults : t.recentActivity}
                            </span>
                            {filteredSessions.length > 0 && (
                                <span className="text-xs text-muted-foreground/50">{filteredSessions.length}</span>
                            )}
                        </div>
                    )}

                    {/* Sessions List */}
                    <div className="">
                        {filteredSessions.length === 0 ? (
                            isSidebarOpen && (
                                <div className="text-center py-8 px-4">
                                    <MessageSquare className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                                    {searchQuery ? (
                                        <>
                                            <p className="text-sm text-muted-foreground/50">{t.noResults}</p>
                                            <p className="text-xs text-muted-foreground/30 mt-1">{t.tryDifferent}</p>
                                        </>
                                    ) : (
                                        <>
                                            <p className="text-sm text-muted-foreground/50">{t.noChats}</p>
                                            <p className="text-xs text-muted-foreground/30 mt-1">{t.startNew}</p>
                                        </>
                                    )}
                                </div>
                            )
                        ) : (
                            <div className="space-y-1 pb-2">
                                {filteredSessions.map((session) => (
                                    <div
                                        key={session.id}
                                        onClick={() => {
                                            setActiveSessionId(session.id);
                                            setChatId(session.chatId);
                                        }}
                                        role="button"
                                        tabIndex={0}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                setActiveSessionId(session.id);
                                                setChatId(session.chatId);
                                            }
                                        }}
                                        className={cn(
                                            "w-full flex items-center gap-3 p-3 rounded-xl transition-all group relative overflow-hidden cursor-pointer",
                                            activeSessionId === session.id
                                                ? "bg-primary/10 text-primary font-medium"
                                                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                                            !isSidebarOpen && "justify-center p-2.5"
                                        )}
                                    >
                                        {activeSessionId === session.id && (
                                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-r-full" />
                                        )}
                                        <MessageSquare className={cn("w-4 h-4 shrink-0 transition-colors", activeSessionId === session.id ? "text-primary" : "text-muted-foreground")} />
                                        {isSidebarOpen && (
                                            <span className="truncate text-sm flex-1 text-left">{session.title}</span>
                                        )}
                                        {/* Delete Button - appears on hover */}
                                        {isSidebarOpen && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    deleteSession(session.id);
                                                }}
                                                className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-500/20 text-muted-foreground hover:text-red-400 transition-all"
                                                title="Delete chat"
                                                aria-label="Delete chat"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Footer / User Profile */}
            <div className="px-4 pb-4 pt-2 shrink-0">
                {isLoggedIn ? (
                    /* Logged in user - Show profile and action buttons */
                    <div className={cn(
                        "rounded-xl p-2 transition-all",
                        isSidebarOpen ? "" : "p-2"
                    )}>
                        {/* Profile Row - Click to go to settings */}
                        <Link
                            href="/settings"
                            className={cn(
                                "flex items-center gap-3 cursor-pointer group",
                                !isSidebarOpen && "justify-center"
                            )}
                            title="Go to Profile Settings"
                        >
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/20 group-hover:border-primary/40 group-hover:bg-primary/10 transition-all overflow-hidden relative">
                                {profilePicture ? (
                                    <img
                                        src={profilePicture}
                                        alt="Profile"
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <User className="w-5 h-5 text-primary" />
                                )}
                            </div>
                            {isSidebarOpen && (
                                <div className="flex-1 overflow-hidden">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-foreground truncate">
                                        {formatDisplayName(username, 'Guest')}
                                    </p>
                                    {plan === 'pro' ? (
                                        <p className="text-xs text-primary truncate font-medium flex items-center gap-1">
                                            <Crown className="w-3 h-3" /> {t.proPlan}
                                        </p>
                                    ) : (
                                        <p className="text-xs text-muted-foreground truncate font-medium">{t.freePlan}</p>
                                    )}
                                </div>
                            )}
                        </Link>

                        {/* Action Buttons */}
                        {isSidebarOpen && (
                            <div className="flex gap-1.5 mt-3 pt-3 border-t border-white/5">
                                <ThemeToggle />
                                <Link
                                    href="/help"
                                    className="flex-1 p-2.5 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-foreground transition-all"
                                    title={t.help}
                                >
                                    <HelpCircle className="w-4 h-4" />
                                </Link>
                                <Link
                                    href="/settings"
                                    className="flex-1 p-2.5 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-foreground transition-all"
                                    title={t.settings}
                                >
                                    <Settings className="w-4 h-4" />
                                </Link>
                                <button
                                    onClick={() => {
                                        logout();
                                        window.location.href = '/login';
                                    }}
                                    className="flex-1 p-2.5 flex items-center justify-center rounded-xl bg-white/5 hover:bg-red-500/20 text-muted-foreground hover:text-red-400 transition-all"
                                    title={t.logout}
                                >
                                    <LogOut className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                    </div>
                ) : (
                    /* Not logged in - Clean minimal footer */
                    <div className="space-y-3">
                        {/* Theme & Help Row */}
                        {isSidebarOpen && (
                            <div className="flex gap-1.5 pb-3 border-b border-white/5">
                                <ThemeToggle />
                                <Link
                                    href="/help"
                                    className="flex-1 p-2 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-foreground transition-all"
                                    title={t.help}
                                >
                                    <HelpCircle className="w-4 h-4" />
                                </Link>
                            </div>
                        )}

                        {/* Sign In / Sign Up Buttons */}
                        <div className="flex gap-2">
                            <Link
                                href="/login"
                                className={cn(
                                    "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium transition-all hover:bg-primary/90",
                                    !isSidebarOpen && "p-2 flex-none"
                                )}
                            >
                                <LogIn className="w-4 h-4" />
                                {isSidebarOpen && <span>Sign In</span>}
                            </Link>
                            {isSidebarOpen && (
                                <Link
                                    href="/signup"
                                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border border-white/10 bg-white/5 text-foreground text-sm font-medium transition-all hover:bg-white/10"
                                >
                                    Sign Up
                                </Link>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div >
    );
}
