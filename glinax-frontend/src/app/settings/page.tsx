"use client";

import React, { useState } from "react";
import {
    User,
    Bell,
    Moon,
    Sun,
    Globe,
    Shield,
    HelpCircle,
    ChevronRight,
    ArrowLeft,
    Palette,
    Volume2,
    Trash2,
    Monitor,
    Sparkles,
    MessageSquare,
    Zap,
    Crown,
    ExternalLink,
    Camera,
    Download,
    Check,
    AlertTriangle,
    Loader2
} from "lucide-react";
import { useTheme } from "next-themes";
import { cn, formatDisplayName } from "@/lib/utils";
import Link from "next/link";
import { useChatStore, ResponseStyle } from "@/stores/chatStore";
import { useDataStore, Language } from "@/stores/dataStore";
import { useUIStore } from "@/stores/uiStore";
import { translations } from "@/lib/translations";
import { useToast } from "@/components/Toast";
import { BillingPlan, initiatePayment } from "@/lib/payment";

interface SettingItemProps {
    icon: React.ReactNode;
    title: string;
    description?: string;
    value?: string;
    action?: React.ReactNode;
    onClick?: () => void;
    danger?: boolean;
}

function SettingItem({ icon, title, description, value, action, onClick, danger }: SettingItemProps) {
    const content = (
        <>
            <div className={cn(
                "w-9 h-9 rounded-xl flex items-center justify-center shrink-0",
                danger ? "bg-red-500/10" : "bg-white/5"
            )}>
                {icon}
            </div>
            <div className="flex-1 min-w-0">
                <p className={cn(
                    "font-medium text-[15px]",
                    danger ? "text-red-400" : "text-foreground"
                )}>{title}</p>
                {description && (
                    <p className="text-sm text-muted-foreground mt-0.5 truncate">{description}</p>
                )}
            </div>
            {value && (
                <span className="text-sm text-muted-foreground">{value}</span>
            )}
            {action || (
                <ChevronRight className="w-4 h-4 text-muted-foreground/50 group-hover:text-muted-foreground group-hover:translate-x-0.5 transition-all shrink-0" />
            )}
        </>
    );

    const baseClassName = cn(
        "w-full flex items-center gap-4 px-4 py-4 transition-all text-left group",
        danger ? "hover:bg-red-500/5" : "hover:bg-white/[0.02]"
    );

    // Use div when action is present to avoid nesting buttons
    if (action) {
        return (
            <div className={baseClassName}>
                {content}
            </div>
        );
    }

    return (
        <button onClick={onClick} className={cn(baseClassName, "cursor-pointer")}>
            {content}
        </button>
    );
}

function ThemeOption({
    theme: themeValue,
    currentTheme,
    icon: Icon,
    label,
    onClick
}: {
    theme: string;
    currentTheme: string | undefined;
    icon: React.ElementType;
    label: string;
    onClick: () => void;
}) {
    const isActive = currentTheme === themeValue;
    return (
        <button
            onClick={onClick}
            className={cn(
                "flex-1 flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all",
                isActive
                    ? "border-primary bg-primary/5"
                    : "border-transparent bg-white/[0.02] hover:bg-white/[0.04]"
            )}
        >
            <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center",
                isActive ? "bg-primary" : "bg-white/5 text-muted-foreground"
            )}>
                <Icon className="w-5 h-5" />
            </div>
            <span className={cn(
                "text-sm font-medium",
                isActive ? "text-primary" : "text-muted-foreground"
            )}>{label}</span>
        </button>
    );
}

function ThemeSelector() {
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = React.useState(false);

    React.useEffect(() => setMounted(true), []);

    if (!mounted) return <div className="h-24" />;

    return (
        <div className="flex gap-3 p-2">
            <ThemeOption
                theme="light"
                currentTheme={theme}
                icon={Sun}
                label="Light"
                onClick={() => setTheme("light")}
            />
            <ThemeOption
                theme="dark"
                currentTheme={theme}
                icon={Moon}
                label="Dark"
                onClick={() => setTheme("dark")}
            />
            <ThemeOption
                theme="system"
                currentTheme={theme}
                icon={Monitor}
                label="System"
                onClick={() => setTheme("system")}
            />
        </div>
    );
}

function Toggle({ enabled, onChange }: { enabled: boolean; onChange: (val: boolean) => void }) {
    return (
        <button
            onClick={() => onChange(!enabled)}
            aria-pressed={enabled}
            aria-label={enabled ? "Toggle on" : "Toggle off"}
            className={cn(
                "w-11 h-6 rounded-full transition-all relative shrink-0 border",
                enabled
                    ? "bg-primary border-primary"
                    : "bg-muted border-border"
            )}
        >
            <div className={cn(
                "absolute top-0.5 w-5 h-5 rounded-full shadow-sm transition-all",
                enabled
                    ? "left-[22px] bg-white"
                    : "left-0.5 bg-muted-foreground"
            )} />
        </button>
    );
}

function ResponseStyleSelector({ value, onChange }: { value: ResponseStyle; onChange: (val: ResponseStyle) => void }) {
    const language = useDataStore((state) => state.language);
    const t = translations[language];

    const options: { value: ResponseStyle; label: string }[] = [
        { value: 'concise', label: t.concise },
        { value: 'balanced', label: t.balanced },
        { value: 'detailed', label: t.detailed },
    ];

    return (
        <div className="flex gap-2 p-2">
            {options.map((option) => (
                <button
                    key={option.value}
                    onClick={() => onChange(option.value)}
                    className={cn(
                        "flex-1 py-2 px-3 rounded-xl text-sm font-medium transition-all",
                        value === option.value
                            ? "bg-primary text-primary-foreground"
                            : "bg-white/5 text-muted-foreground hover:bg-white/10"
                    )}
                >
                    {option.label}
                </button>
            ))}
        </div>
    );
}

function UpgradeModal({ isOpen, onClose, showToast }: { isOpen: boolean; onClose: () => void; showToast: (msg: string, type?: "success" | "error" | "warning" | "info") => void }) {
    const language = useDataStore((state) => state.language);
    const t = translations[language];
    const [isProcessing, setIsProcessing] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState<BillingPlan>("annual");

    const monthlyPrice = 30;
    const annualPrice = 300;
    const annualEquivalent = monthlyPrice * 12;
    const savingsPercent = Math.round(((annualEquivalent - annualPrice) / annualEquivalent) * 100);

    const handleUpgrade = async () => {
        setIsProcessing(true);
        try {
            // Initiate payment with Paystack
            const { authorization_url } = await initiatePayment(selectedPlan);
            
            // Redirect to Paystack checkout
            window.location.href = authorization_url;
        } catch (error) {
            console.error('Payment initiation failed:', error);
            showToast(
                error instanceof Error ? error.message : "Failed to initiate payment. Please try again.",
                "error"
            );
            setIsProcessing(false);
        }
    };

    // Explicit return null if not open
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-md bg-background rounded-3xl border border-white/10 shadow-2xl overflow-hidden">
                <div className="p-6 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mx-auto mb-4">
                        <Crown className="w-8 h-8 text-primary" />
                    </div>
                    <h2 className="text-2xl font-bold mb-2">{t.upgradeToPro}</h2>
                    <p className="text-muted-foreground mb-6">
                        {t.upgradeDescription}
                    </p>

                    <div className="bg-white/5 rounded-2xl p-4 mb-6 space-y-3">
                        <button
                            type="button"
                            onClick={() => setSelectedPlan("monthly")}
                            className={cn(
                                "w-full text-left rounded-xl border p-4 transition-colors",
                                selectedPlan === "monthly"
                                    ? "border-primary bg-primary/10"
                                    : "border-white/10 hover:border-white/20"
                            )}
                        >
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <p className="font-semibold">Monthly Pro</p>
                                    <p className="text-sm text-muted-foreground">GHS 30/month</p>
                                </div>
                                {selectedPlan === "monthly" && <Check className="w-5 h-5 text-primary" />}
                            </div>
                        </button>
                        <button
                            type="button"
                            onClick={() => setSelectedPlan("annual")}
                            className={cn(
                                "w-full text-left rounded-xl border p-4 transition-colors",
                                selectedPlan === "annual"
                                    ? "border-primary bg-primary/10"
                                    : "border-white/10 hover:border-white/20"
                            )}
                        >
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <p className="font-semibold">Annual Pro</p>
                                    <p className="text-sm text-muted-foreground">GHS 300/year</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs px-2 py-1 rounded-full bg-primary/20 text-primary font-semibold">
                                        Save {savingsPercent}%
                                    </span>
                                    {selectedPlan === "annual" && <Check className="w-5 h-5 text-primary" />}
                                </div>
                            </div>
                            <p className="text-xs text-muted-foreground mt-2">
                                That is GHS {annualEquivalent}/year if billed monthly.
                            </p>
                        </button>
                        <div className="flex items-baseline justify-center gap-1 pt-1">
                            <span className="text-3xl font-bold">
                                {selectedPlan === "annual" ? "GHS 300" : "GHS 30"}
                            </span>
                            <span className="text-muted-foreground">
                                {selectedPlan === "annual" ? "/year" : "/month"}
                            </span>
                        </div>
                        <ul className="space-y-3 text-left">
                            {[
                                "Unlimited AI messages",
                                "Priority response times",
                                "Advanced summarization",
                                "Unlimited quiz generation",
                                "Premium voice options",
                                "Priority support"
                            ].map((feature, i) => (
                                <li key={i} className="flex items-center gap-3 text-sm">
                                    <Check className="w-4 h-4 text-primary shrink-0" />
                                    <span>{feature}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <button
                        onClick={handleUpgrade}
                        disabled={isProcessing}
                        className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {isProcessing ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                <span>Processing...</span>
                            </>
                        ) : (
                            `${t.subscribe} (${selectedPlan === "annual" ? "GHS 300/yr" : "GHS 30/mo"})`
                        )}
                    </button>
                    <button
                        onClick={onClose}
                        className="w-full py-3 text-muted-foreground hover:text-foreground transition-colors mt-2"
                    >
                        {t.maybeLater}
                    </button>
                </div>
            </div>
        </div>
    );
}

function DeleteConfirmModal({ isOpen, onClose, onConfirm, t }: { isOpen: boolean; onClose: () => void; onConfirm: () => void; t: any }) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-sm bg-background rounded-3xl border border-white/10 shadow-2xl overflow-hidden">
                <div className="p-6 text-center">
                    <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
                        <AlertTriangle className="w-8 h-8 text-red-400" />
                    </div>
                    <h2 className="text-xl font-bold mb-2">{t.deleteConfirmTitle}</h2>
                    <p className="text-muted-foreground mb-6">
                        {t.deleteConfirmDesc}
                    </p>

                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="flex-1 py-3 bg-white/5 text-foreground rounded-xl font-medium hover:bg-white/10 transition-colors"
                        >
                            {t.cancel}
                        </button>
                        <button
                            onClick={onConfirm}
                            className="flex-1 py-3 bg-red-500 rounded-xl font-semibold hover:bg-red-600 transition-colors"
                        >
                            {t.deleteAll}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function LanguageModal({ isOpen, onClose, currentLanguage, onSelect }: { isOpen: boolean; onClose: () => void; currentLanguage: Language; onSelect: (lang: Language) => void }) {
    if (!isOpen) return null;

    const languages: Language[] = ['English', 'French', 'Twi'];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div className="w-full max-w-xs bg-background rounded-3xl border border-white/10 shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="p-4">
                    <h2 className="text-lg font-bold mb-4 text-center">Select Language</h2>
                    <div className="space-y-2">
                        {languages.map((lang) => (
                            <button
                                key={lang}
                                onClick={() => { onSelect(lang); onClose(); }}
                                className={cn(
                                    "w-full flex items-center justify-between p-3 rounded-xl transition-all",
                                    currentLanguage === lang
                                        ? "bg-primary/10 text-primary font-medium border border-primary/20"
                                        : "bg-white/5 text-foreground hover:bg-white/10"
                                )}
                            >
                                <span>{lang}</span>
                                {currentLanguage === lang && <Check className="w-4 h-4" />}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function SettingsPage() {
    const {
        username,
        profilePicture,
        setProfilePicture,
        plan,
        aiSettings,
        setAISettings,
        privacySettings,
        setPrivacySettings,
        clearAllData,
        exportData,
    } = useChatStore();

    const activeModal = useUIStore((state) => state.activeModal);
    const setActiveModal = useUIStore((state) => state.setActiveModal);

    // Use Data Store for Language
    const language = useDataStore((state) => state.language);
    const setLanguage = useDataStore((state) => state.setLanguage);
    const t = translations[language];

    const displayUsername = formatDisplayName(username, t.guest);
    const [notifications, setNotifications] = useState(true);
    const [soundEffects, setSoundEffects] = useState(true);
    const [showLanguageModal, setShowLanguageModal] = useState(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const { showToast } = useToast();

    const handleProfilePictureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setProfilePicture(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleExportData = () => {
        const data = exportData();
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `qwikstudi-data-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleDeleteConfirm = () => {
        clearAllData();
        setActiveModal(null);
        // Redirect to login after clearing
        window.location.href = '/login';
    };

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-background/90 backdrop-blur-xl">
                <div className="max-w-2xl mx-auto px-4 py-4 flex items-center">
                    <Link
                        href="/"
                        className="p-2 -ml-2 rounded-xl hover:bg-white/5 transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <h1 className="flex-1 text-lg font-semibold text-center">{t.settings}</h1>
                    {/* Spacer to balance the back button */}
                    <div className="w-9" />
                </div>
            </header>

            <main className="max-w-2xl mx-auto px-4 pb-12 space-y-6">

                {/* Profile Card */}
                <section className="bg-card/30 rounded-2xl overflow-hidden">
                    <div className="p-5 flex items-center gap-4">
                        {/* Profile Picture with Upload */}
                        <div className="relative group">
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleProfilePictureChange}
                                accept="image/*"
                                className="hidden"
                                id="profile-picture-input"
                            />
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                aria-label={profilePicture ? "Change profile picture" : "Upload profile picture"}
                                className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border-2 border-primary/20 cursor-pointer overflow-hidden group-hover:border-primary/50 transition-all focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
                            >
                                {profilePicture ? (
                                    <img
                                        src={profilePicture}
                                        alt="Profile"
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <User className="w-8 h-8 text-primary" />
                                )}
                            </button>
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                aria-label="Change profile picture"
                                className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-primary flex items-center justify-center shadow-lg hover:bg-primary/90 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
                            >
                                <Camera className="w-3 h-3 text-primary-foreground" />
                            </button>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-lg font-semibold text-foreground truncate">
                                {displayUsername}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                                {plan === 'pro' ? (
                                    <>
                                        <span className="text-sm text-primary font-medium flex items-center gap-1">
                                            <Crown className="w-3 h-3" /> Pro Plan
                                        </span>
                                    </>
                                ) : (
                                    <>
                                        <span className="text-sm text-muted-foreground">Free Plan</span>
                                        <span className="text-xs text-muted-foreground/50">|</span>
                                        <span className="text-xs text-primary font-medium">Limited features</span>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Upgrade Banner - Only show for free users */}
                    {plan === 'free' && (
                        <div className="mx-4 mb-4 p-4 rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/10">
                            <div className="flex items-start gap-3">
                                <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
                                    <Crown className="w-5 h-5 text-primary" />
                                </div>
                                <div className="flex-1">
                                    <p className="font-semibold text-foreground">Upgrade to Pro</p>
                                    <p className="text-sm text-muted-foreground mt-0.5">
                                        GHS 30/month or GHS 300/year (save 17%) for unlimited premium features.
                                    </p>
                                </div>
                                <button
                                    onClick={() => setActiveModal('upgrade')}
                                    className="px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors shrink-0"
                                >
                                    Upgrade
                                </button>
                            </div>
                        </div>
                    )}
                </section>

                {/* Appearance */}
                <section>
                    <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3 px-1 text-center">
                        Appearance
                    </h3>
                    <div className="bg-card/30 rounded-2xl overflow-hidden">
                        <div className="px-4 pt-4 pb-2">
                            <div className="flex items-center gap-3 mb-3">
                                <Palette className="w-5 h-5 text-primary" />
                                <span className="font-medium">{t.theme}</span>
                            </div>
                        </div>
                        <ThemeSelector />
                    </div>
                </section>

                {/* Preferences */}
                <section>
                    <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3 px-1 text-center">
                        {t.preferences}
                    </h3>
                    <div className="bg-card/30 rounded-2xl overflow-hidden divide-y divide-white/[0.02]">
                        <SettingItem
                            icon={<Bell className="w-5 h-5 text-muted-foreground" />}
                            title={t.notifications}
                            description="Push and email notifications"
                            action={<Toggle enabled={notifications} onChange={setNotifications} />}
                        />
                        <SettingItem
                            icon={<Volume2 className="w-5 h-5 text-muted-foreground" />}
                            title={t.soundEffects}
                            description="Play sounds for actions"
                            action={<Toggle enabled={soundEffects} onChange={setSoundEffects} />}
                        />
                        <SettingItem
                            icon={<Globe className="w-5 h-5 text-muted-foreground" />}
                            title={t.language}
                            value={language}
                            onClick={() => setShowLanguageModal(true)}
                        />
                    </div>
                </section>

                {/* AI Settings */}
                <section>
                    <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3 px-1 text-center">
                        AI Settings
                    </h3>
                    <div className="bg-card/30 rounded-2xl overflow-hidden">
                        <div className="px-4 pt-4 pb-2">
                            <div className="flex items-center gap-3 mb-2">
                                <Sparkles className="w-5 h-5 text-primary" />
                                <span className="font-medium">Response Style</span>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">Choose how detailed AI responses should be</p>
                        </div>
                        <ResponseStyleSelector
                            value={aiSettings.responseStyle}
                            onChange={(val) => setAISettings({ responseStyle: val })}
                        />
                        <div className="divide-y divide-white/[0.02]">
                            <SettingItem
                                icon={<MessageSquare className="w-5 h-5 text-muted-foreground" />}
                                title={t.saveHistory}
                                description="Keep your conversations"
                                action={
                                    <Toggle
                                        enabled={aiSettings.saveHistory}
                                        onChange={(val) => setAISettings({ saveHistory: val })}
                                    />
                                }
                            />
                            <SettingItem
                                icon={<Zap className="w-5 h-5 text-muted-foreground" />}
                                title="Quick Actions"
                                description="Show shortcuts in sidebar"
                                action={
                                    <Toggle
                                        enabled={aiSettings.quickActionsEnabled}
                                        onChange={(val) => setAISettings({ quickActionsEnabled: val })}
                                    />
                                }
                            />
                        </div>
                    </div>
                </section>

                {/* Data & Privacy */}
                <section>
                    <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3 px-1 text-center">
                        Data & Privacy
                    </h3>
                    <div className="bg-card/30 rounded-2xl overflow-hidden divide-y divide-white/[0.02]">
                        <SettingItem
                            icon={<Shield className="w-5 h-5 text-muted-foreground" />}
                            title={t.shareAnalytics}
                            description="Help improve QwikStudi"
                            action={
                                <Toggle
                                    enabled={privacySettings.shareAnalytics}
                                    onChange={(val) => setPrivacySettings({ shareAnalytics: val })}
                                />
                            }
                        />
                        <SettingItem
                            icon={<Sparkles className="w-5 h-5 text-muted-foreground" />}
                            title={t.improveAI}
                            description="Help train better responses"
                            action={
                                <Toggle
                                    enabled={privacySettings.improveAI}
                                    onChange={(val) => setPrivacySettings({ improveAI: val })}
                                />
                            }
                        />
                        <SettingItem
                            icon={<Download className="w-5 h-5 text-muted-foreground" />}
                            title={t.exportData}
                            description="Download all your data as JSON"
                            onClick={handleExportData}
                        />
                        <SettingItem
                            icon={<Trash2 className="w-5 h-5 text-red-400" />}
                            title={t.deleteData}
                            description="This action cannot be undone"
                            danger
                            onClick={() => setActiveModal('deleteConfirm')}
                        />
                    </div>
                </section>

                {/* Help */}
                <section>
                    <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3 px-1 text-center">
                        {t.support}
                    </h3>
                    <div className="bg-card/30 rounded-2xl overflow-hidden divide-y divide-white/[0.02]">
                        <SettingItem
                            icon={<HelpCircle className="w-5 h-5 text-muted-foreground" />}
                            title={t.help}
                            action={<ExternalLink className="w-4 h-4 text-muted-foreground/50" />}
                        />
                        <Link href="/terms" className="block">
                            <SettingItem
                                icon={<Shield className="w-5 h-5 text-muted-foreground" />}
                                title={t.terms}
                                action={<ChevronRight className="w-4 h-4 text-muted-foreground/50" />}
                            />
                        </Link>
                        <Link href="/privacy" className="block">
                            <SettingItem
                                icon={<Shield className="w-5 h-5 text-muted-foreground" />}
                                title={t.privacy}
                                action={<ChevronRight className="w-4 h-4 text-muted-foreground/50" />}
                            />
                        </Link>
                    </div>
                </section>

                {/* Footer */}
                <div className="text-center pt-8 pb-4 space-y-1">
                    <p className="text-sm text-muted-foreground/60">QwikStudi v1.0.0</p>
                    <p className="text-xs text-muted-foreground/40">Study Smart, Learn Fast.</p>
                </div>
            </main>

            {/* Modals */}
            <UpgradeModal
                isOpen={activeModal === 'upgrade'}
                onClose={() => setActiveModal(null)}
                showToast={showToast}
            />
            <DeleteConfirmModal
                isOpen={activeModal === 'deleteConfirm'}
                onClose={() => setActiveModal(null)}
                onConfirm={handleDeleteConfirm}
                t={t}
            />
            <LanguageModal
                isOpen={showLanguageModal}
                onClose={() => setShowLanguageModal(false)}
                currentLanguage={language}
                onSelect={setLanguage}
            />
        </div>
    );
}
