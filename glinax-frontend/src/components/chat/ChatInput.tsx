"use client";

import React, { useState, useRef, useEffect } from "react";
import { nanoid } from "nanoid";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    X,
    PlusCircle,
    ArrowUp,
    Mic,
    Headphones,
    HelpCircle,
    FileText,
    Upload,
    Loader2,
    Wrench
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/stores/uiStore";
import { useDataStore } from "@/stores/dataStore";
import { translations } from "@/lib/translations";
import { useToast } from "@/components/Toast";
import Cookies from "js-cookie";
import api from "@/lib/api";
import { commitChat } from "@/lib/CommitChat";

// Maximum file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_CHAT_FILE_EXTENSIONS = ['pdf', 'txt', 'doc', 'docx', 'md', 'ppt', 'pptx'];

export function ChatInput() {
    const router = useRouter();
    const [input, setInput] = useState("");
    const [files, setFiles] = useState<File[]>([]);
    const [showFeatures, setShowFeatures] = useState(false);
    const [showAttachMenu, setShowAttachMenu] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const recognitionRef = useRef<any>(null);
    const { showToast } = useToast();
    const isLoading = useUIStore((state) => state.isLoading);

    // Use atomic stores directly for proper reactivity
    const addMessage = useDataStore((state) => state.addMessage);
    const aiSettings = useDataStore((state) => state.aiSettings);
    const chatId = useDataStore((state) => state.chatId);
    const setChatId = useDataStore((state) => state.setChatId);
    const createSession = useDataStore((state) => state.createSession);
    const updateSession = useDataStore((state) => state.updateSession);
    const updateSessionByChatId = useDataStore((state) => state.updateSessionByChatId);
    const setActiveModal = useUIStore((state) => state.setActiveModal);
    const explainPrompt = useUIStore((state) => state.explainPrompt);
    const clearExplainPrompt = useUIStore((state) => state.clearExplainPrompt);
    const setIsLoading = useUIStore((state) => state.setIsLoading);
    const language = useDataStore((state) => state.language);
    const t = translations[language];
    const isLimitExceeded = useDataStore((state) => state.isLimitExceeded);
    const setIsLimitExceeded = useDataStore((state) => state.setIsLimitExceeded);
    const isLoggedIn = useDataStore((state) => state.isLoggedIn);

    // Limit message state (kept local since it's transient)
    const [limitMessage, setLimitMessage] = useState("");

    // Speech to Text Implementation
    const [isRecording, setIsRecording] = useState(false);
    const hasInputContent = input.trim().length > 0 || files.length > 0;
    const isBusy = isSending || isLoading;
    const isComposerBlocked = isBusy || isLimitExceeded;

    // Initialize guest_id on mount (use UUID format for Django compatibility)
    useEffect(() => {
        let guestId = Cookies.get("guest_id");
        
        // Validate UUID format (xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        
        if (!guestId || !uuidRegex.test(guestId)) {
            // Generate proper UUID for Django UUIDField compatibility
            guestId = crypto.randomUUID();
            Cookies.set("guest_id", guestId, {
                expires: 7,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'Strict'
            });
        }
    }, []);

    useEffect(() => {
        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
        };
    }, []);

    useEffect(() => {
        if (isBusy) {
            setShowAttachMenu(false);
            setShowFeatures(false);
        }
    }, [isBusy]);

    useEffect(() => {
        if (!isLimitExceeded) return;
        setShowAttachMenu(false);
        setShowFeatures(false);
        setIsRecording(false);
        setFiles([]);
    }, [isLimitExceeded]);

    const toggleRecording = () => {
        if (isComposerBlocked) return;
        if (isRecording) {
            recognitionRef.current?.stop();
            setIsRecording(false);
            if (textareaRef.current) {
                textareaRef.current.focus();
            }
            return;
        }

        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
            alert("Speech recognition is not supported in this browser.");
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
            setIsRecording(true);
        };

        recognition.onresult = (event: any) => {
            let finalTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalTranscript += transcript + ' ';
                }
            }
            if (finalTranscript) {
                setInput(prev => prev + finalTranscript);
            }
        };

        recognition.onerror = (event: any) => {
            console.error('Speech recognition error', event.error);
            setIsRecording(false);

            if (event.error === 'not-allowed') {
                showToast("Microphone access denied. Please enable microphone permissions in your browser settings.", "error");
            } else if (event.error === 'no-speech') {
                // Ignore no-speech errors (silence)
                return;
            } else {
                showToast(`Speech recognition error: ${event.error}`, "error");
            }
        };

        recognition.onend = () => {
            setIsRecording(false);
        };

        recognitionRef.current = recognition;
        recognition.start();
    };

    const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setInput(e.target.value);
        autoResize();
    };

    const autoResize = () => {
        if (textareaRef.current) {
            textareaRef.current.style.height = "auto";
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
        }
    };

    useEffect(() => {
        autoResize();
    }, [input]);

    useEffect(() => {
        if (!explainPrompt) return;
        setInput(explainPrompt);
        clearExplainPrompt();
        requestAnimationFrame(() => {
            textareaRef.current?.focus();
            autoResize();
        });
    }, [explainPrompt, clearExplainPrompt]);

    const handleSubmit = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (isLimitExceeded) {
            showToast("Guest limit reached. Log in to continue chatting.", "info");
            return;
        }
        if (!input.trim() && files.length === 0) return;
        if (isBusy) return;

        const userMessage = input.trim();
        const selectedFiles = [...files];
        const fileNames = selectedFiles.map((file) => file.name);
        const fileSummary = fileNames.length > 0 ? `Attached file${fileNames.length > 1 ? "s" : ""}: ${fileNames.join(", ")}` : "";
        const displayMessage = userMessage || fileSummary;
        const hasFiles = selectedFiles.length > 0;
        const guestId = Cookies.get("guest_id");
        const now = new Date();

        // Guest preflight: if limit is exhausted, block immediately without showing typing/loading.
        if (!isLoggedIn && guestId) {
            try {
                const statusRes = await api.get("/chat/guest/status/", {
                    params: { guest_id: guestId },
                });
                if (statusRes.data?.limit_exceeded) {
                    setIsLimitExceeded(true);
                    setLimitMessage(
                        String(
                            statusRes.data?.message ||
                            "You've reached your guest chat limit. Please log in to continue."
                        )
                    );
                    showToast("Guest limit reached. Log in to continue.", "info");
                    return;
                }
            } catch {
                // Non-blocking: if preflight fails, proceed with normal send flow.
            }
        }

        // Add user message immediately
        if (hasFiles) {
            addMessage({
                id: nanoid(),
                role: 'user',
                content: userMessage,
                type: 'attachment',
                metadata: {
                    files: selectedFiles.map(mapFileMetadata),
                    caption: userMessage,
                    status: 'sent',
                },
                createdAt: now,
            });
        } else {
            addMessage({
                id: nanoid(),
                role: 'user',
                content: displayMessage,
                createdAt: now,
            });
        }

        const titleSource = userMessage || fileSummary || "New Chat";
        const trimmedTitle = titleSource.length > 60 ? `${titleSource.slice(0, 60)}...` : titleSource;

        // Clear composer state immediately after send click.
        setInput("");
        setFiles([]);
        if (textareaRef.current) textareaRef.current.style.height = "auto";

        // Call GLINAX API
        setIsSending(true);
        setIsLoading(true);

        try {
            const res = hasFiles
                ? await (() => {
                    const formData = new FormData();
                    formData.append("prompt", userMessage);
                    if (guestId) formData.append("guest_id", guestId);
                    if (chatId) formData.append("chat_id", String(chatId));
                    formData.append("response_style", aiSettings.responseStyle);
                    selectedFiles.forEach((file) => formData.append("files", file));
                    return api.post("/chat/", formData);
                })()
                : await api.post("/chat/", {
                    prompt: userMessage,
                    guest_id: guestId,
                    chat_id: chatId,  // Pass existing chat_id if available
                    response_style: aiSettings.responseStyle,
                });

            if (res.data?.guest_id && res.data.guest_id !== guestId) {
                Cookies.set("guest_id", res.data.guest_id, {
                    expires: 7,
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: 'Strict'
                });
            }

            // Check for limit exceeded response
            if (res.data.limit_exceeded) {
                setIsLimitExceeded(true);
                setLimitMessage(res.data.message);
                setIsSending(false);
                setIsLoading(false);
                return;
            }

            // Add AI response
            addMessage({
                id: nanoid(),
                role: 'assistant',
                content: res.data.response,
                createdAt: new Date(),
            });

            const responseChatId: number | null = typeof res.data.chat_id === "number" ? res.data.chat_id : null;
            if (responseChatId) {
                setChatId(responseChatId);
            }

            const latestState = useDataStore.getState();
            const latestSessionId = latestState.activeSessionId;
            const latestSession = latestSessionId
                ? latestState.sessions.find((session) => session.id === latestSessionId)
                : null;
            const defaultTitle = latestSession?.title === "New Study Session" || latestSession?.title === "New Chat";

            if (latestSessionId) {
                updateSession(latestSessionId, {
                    ...(defaultTitle || !latestSession?.title ? { title: trimmedTitle } : {}),
                    ...(responseChatId && !latestSession?.chatId ? { chatId: responseChatId } : {}),
                    lastMessageAt: new Date(),
                });
            } else {
                createSession(trimmedTitle || "New Chat", {
                    chatId: responseChatId,
                    resetMessages: false,
                    setActive: true,
                });
            }

            // Auto-generate title from normal chat flow as soon as the first exchange exists.
            const latestAfterReply = useDataStore.getState();
            const commitChatId = responseChatId ?? latestAfterReply.chatId;
            if (commitChatId) {
                commitChat(Number(commitChatId), [])
                    .then((result) => {
                        if (result?.title) {
                            updateSessionByChatId(Number(commitChatId), {
                                title: result.title,
                                lastMessageAt: new Date(),
                            });
                        }
                    })
                    .catch(console.error);
            }
        } catch (error: any) {
            console.error("Chat API error:", error);
            const message = error?.response?.data?.error || "Sorry, I couldn't process your request. Please try again.";
            addMessage({
                id: nanoid(),
                role: 'assistant',
                content: message,
                createdAt: new Date(),
            });
            showToast(message, "error");
        } finally {
            setIsSending(false);
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    const removeFile = (index: number) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
    };

    const getFileExt = (fileName: string) => {
        const ext = fileName.split(".").pop()?.toLowerCase();
        return ext || "file";
    };

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    const mapFileMetadata = (file: File) => ({
        name: file.name,
        size: file.size,
        ext: getFileExt(file.name),
        content_type: file.type || "",
    });

    // Drag and drop handlers
    const handleDragEnter = (e: React.DragEvent) => {
        if (isComposerBlocked) return;
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        if (isComposerBlocked) return;
        e.preventDefault();
        e.stopPropagation();
        // Only set dragging to false if we're leaving the container entirely
        if (e.currentTarget === e.target) {
            setIsDragging(false);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        if (isComposerBlocked) return;
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = (e: React.DragEvent) => {
        if (isComposerBlocked) return;
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        const droppedFiles = Array.from(e.dataTransfer.files);
        if (droppedFiles.length > 0) {
            // Filter for supported file types and size limit
            const supportedFiles = droppedFiles.filter(file => {
                // Check file size (10MB limit)
                if (file.size > MAX_FILE_SIZE) {
                    showToast(`File "${file.name}" exceeds 10MB limit`, "error");
                    return false;
                }
                const ext = file.name.toLowerCase().split('.').pop();
                if (!ALLOWED_CHAT_FILE_EXTENSIONS.includes(ext || '')) {
                    showToast(`"${file.name}" is not supported in chat. Use: ${ALLOWED_CHAT_FILE_EXTENSIONS.join(', ')}`, "error");
                    return false;
                }
                return true;
            });

            if (supportedFiles.length > 0) {
                setFiles(prev => [...prev, ...supportedFiles]);
            }
        }
    };

    const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (isComposerBlocked) return;
        const selectedFiles = e.target.files;
        if (selectedFiles) {
            // Filter files by size limit
            const validFiles = Array.from(selectedFiles).filter(file => {
                if (file.size > MAX_FILE_SIZE) {
                    showToast(`File "${file.name}" exceeds 10MB limit`, "error");
                    return false;
                }
                const ext = file.name.toLowerCase().split('.').pop();
                if (!ALLOWED_CHAT_FILE_EXTENSIONS.includes(ext || '')) {
                    showToast(`"${file.name}" is not supported in chat. Use: ${ALLOWED_CHAT_FILE_EXTENSIONS.join(', ')}`, "error");
                    return false;
                }
                return true;
            });
            setFiles(prev => [...prev, ...validFiles]);
        }
    };

    const openProtectedModal = (modal: 'quiz' | 'summarize' | 'tts' | 'stt') => {
        if (isLimitExceeded) {
            showToast("Guest limit reached. Log in to continue.", "info");
            setShowFeatures(false);
            router.push("/login");
            return;
        }
        if (!isLoggedIn) {
            showToast("Please log in or register to use this feature.", "error");
            setShowFeatures(false);
            router.push("/login");
            return;
        }
        setActiveModal(modal);
        setShowFeatures(false);
    };

    return (
        <div className="w-full pb-4">
            {/* Limit Exceeded Banner */}
            {isLimitExceeded && (
                <div className="mb-3 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 animate-in fade-in slide-in-from-top-2 relative">
                    <button
                        onClick={() => {
                            setIsLimitExceeded(false);
                            setLimitMessage("");
                        }}
                        className="absolute right-3 top-3 p-1.5 rounded-lg hover:bg-amber-500/10 text-amber-500/80 hover:text-amber-500 transition-colors"
                        aria-label="Dismiss limit message"
                    >
                        <X className="w-4 h-4" />
                    </button>
                    <div className="flex items-start gap-3 pr-8">
                        <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                            <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-amber-500 text-sm mb-1">
                                {t.limitExceeded}
                            </h4>
                            <p className="text-sm text-foreground/80 mb-3">
                                {limitMessage || t.limitExceededMessage}
                            </p>
                            <Link
                                href="/login"
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-500 text-sm font-semibold transition-colors"
                            >
                                {t.loginToContinue}
                            </Link>
                        </div>
                    </div>
                </div>
            )}

            {/* Hidden file input */}
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileInputChange}
                accept=".pdf,.txt,.doc,.docx,.md,.ppt,.pptx"
                multiple
                className="hidden"
            />

            {/* Main Input Container - Gemini Style with Drag & Drop */}
            <div
                className={cn(
                    "relative bg-card/60 backdrop-blur-xl rounded-3xl shadow-lg transition-all",
                    isDragging && "ring-2 ring-primary ring-offset-2 ring-offset-background bg-primary/5"
                )}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
            >
                {/* Drag Overlay */}
                {isDragging && (
                    <div className="absolute inset-0 z-20 flex items-center justify-center bg-primary/10 backdrop-blur-sm rounded-3xl border-2 border-dashed border-primary">
                        <div className="flex flex-col items-center gap-2 text-primary">
                            <Upload className="w-8 h-8" />
                            <span className="font-medium text-sm">Drop files here</span>
                            <span className="text-xs text-muted-foreground">PDF, TXT, DOC, DOCX, MD, PPT, PPTX</span>
                        </div>
                    </div>
                )}

                {/* Files Preview */}
                {files.length > 0 && (
                    <div className="px-3 pt-3 pb-2 border-b border-white/5">
                        <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-1">
                        {files.map((file, i) => (
                                <div
                                    key={`${file.name}-${file.size}-${i}`}
                                    className="group flex items-center gap-2 pl-2 pr-1.5 py-1.5 bg-background/70 rounded-full border border-white/10 min-w-0"
                                    title={file.name}
                                >
                                    <div className="w-6 h-6 rounded-full bg-primary/15 text-primary flex items-center justify-center shrink-0">
                                        <FileText className="w-3.5 h-3.5" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-xs font-medium truncate max-w-[150px]">{file.name}</p>
                                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                                            {getFileExt(file.name)} · {formatFileSize(file.size)}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => removeFile(i)}
                                        className="w-5 h-5 rounded-full flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
                                        aria-label={`Remove ${file.name}`}
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </div>
                        ))}
                        </div>
                    </div>
                )}

                {/* Input Row */}
                <div className="flex items-center gap-1 p-2">
                    {/* Mobile: Plus Button opens attachment menu */}
                    <div className="relative md:hidden">
                        <button
                            onClick={() => setShowAttachMenu(!showAttachMenu)}
                            disabled={isComposerBlocked}
                            aria-label="Attach files"
                            className={cn(
                                "p-2.5 rounded-full transition-all duration-200",
                                isComposerBlocked
                                    ? "text-muted-foreground/30 cursor-not-allowed"
                                    : "",
                                showAttachMenu
                                    ? "bg-primary/10 text-primary"
                                    : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                            )}
                        >
                            <PlusCircle className="w-5 h-5" />
                        </button>

                        {/* Mobile Attachment Menu - ChatGPT Style */}
                        {showAttachMenu && (
                            <div className="absolute bottom-full left-0 mb-2 bg-card/98 backdrop-blur-xl border border-white/10 rounded-xl shadow-xl shadow-black/10 p-1.5 min-w-[180px] animate-in slide-in-from-bottom-3 fade-in duration-200 z-30">
                                {/* Document */}
                                <button
                                    onClick={() => { fileInputRef.current?.click(); setShowAttachMenu(false); }}
                                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 text-left transition-colors"
                                >
                                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-sm">
                                        <FileText className="w-4 h-4 text-white" />
                                    </div>
                                    <span className="font-medium text-foreground text-sm">Document</span>
                                </button>

                                {/* Tools */}
                                <button
                                    onClick={() => { setShowFeatures(!showFeatures); setShowAttachMenu(false); }}
                                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 text-left transition-colors"
                                >
                                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center shadow-sm">
                                        <Wrench className="w-4 h-4 text-white" />
                                    </div>
                                    <span className="font-medium text-foreground text-sm">Tools</span>
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Desktop: Plus Button - Opens file picker directly */}
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isComposerBlocked}
                        aria-label="Attach files"
                        className={cn(
                            "hidden md:block p-2.5 rounded-full transition-all duration-200",
                            isComposerBlocked
                                ? "text-muted-foreground/30 cursor-not-allowed"
                                : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                        )}
                    >
                        <PlusCircle className="w-5 h-5" />
                    </button>

                    {/* Tools Button - Desktop only */}
                    <button
                        onClick={() => setShowFeatures(!showFeatures)}
                        disabled={isComposerBlocked}
                        className={cn(
                            "hidden md:flex items-center gap-1.5 px-3 py-2 rounded-full transition-all",
                            isComposerBlocked
                                ? "text-muted-foreground/30 cursor-not-allowed"
                                : "",
                            showFeatures
                                ? "bg-primary/10 text-primary"
                                : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                        )}
                        title="Study Tools"
                        aria-label="Study Tools"
                    >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 3v3m0 12v3M3 12h3m12 0h3M5.64 5.64l2.12 2.12m8.48 8.48l2.12 2.12m-2.12-12.72l2.12 2.12M5.64 18.36l2.12-2.12" />
                        </svg>
                        <span className="text-sm font-medium">Tools</span>
                    </button>

                    {/* Text Input */}
                    <textarea
                        ref={textareaRef}
                        rows={1}
                        value={input}
                        onChange={handleInput}
                        onKeyDown={handleKeyDown}
                        placeholder={
                            isLimitExceeded
                                ? "Chat limit reached. Log in to continue."
                                : isBusy
                                    ? "QwikStudi is responding..."
                                    : (t.messagePlaceholder || "Message QwikStudi...")
                        }
                        disabled={isComposerBlocked}
                        className="flex-1 bg-transparent border-none outline-none focus:ring-0 focus:outline-none resize-none py-2.5 px-2 text-base md:text-sm max-h-[120px] custom-scrollbar placeholder:text-muted-foreground/50 leading-relaxed caret-primary"
                    />

                    {/* Right Side Actions */}
                    <div className="flex items-center gap-1">
                        {/* Mic Button - Visible on all screens */}
                        <button
                            onClick={toggleRecording}
                            disabled={isComposerBlocked}
                            className={cn(
                                "p-2.5 rounded-full transition-all duration-200",
                                isComposerBlocked
                                    ? "text-muted-foreground/30 cursor-not-allowed"
                                    : "",
                                isRecording
                                    ? "bg-red-500/10 text-red-500 animate-pulse"
                                    : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                            )}
                            title={isRecording ? "Stop Recording" : "Record Audio"}
                            aria-label={isRecording ? "Stop recording" : "Record audio"}
                        >
                            <Mic className={cn("w-4 h-4", isRecording && "fill-current")} />
                        </button>



                        {/* Send Button */}
                        <button
                            onClick={handleSubmit}
                            disabled={!hasInputContent || isComposerBlocked}
                            aria-label="Send message"
                            className={cn(
                                "p-2.5 rounded-full transition-all duration-200",
                                hasInputContent && !isComposerBlocked
                                    ? "text-primary hover:bg-primary/10"
                                    : "text-muted-foreground/30 cursor-not-allowed"
                            )}
                        >
                            {isBusy ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <ArrowUp className="w-5 h-5" />
                            )}
                        </button>
                    </div>
                </div>

                {/* Features Popup Menu - Clean Professional Design */}
                {showFeatures && (
                    <div className="absolute bottom-full left-2 right-2 md:left-4 md:right-auto mb-3 bg-card/98 backdrop-blur-xl border border-white/10 rounded-xl shadow-xl shadow-black/10 p-1.5 md:p-2 md:min-w-[240px] animate-in slide-in-from-bottom-3 fade-in duration-200 z-30">
                        {/* Quiz Tool */}
                        <button
                            onClick={() => openProtectedModal('quiz')}
                            className="w-full flex items-center gap-3 px-2.5 py-2 rounded-lg hover:bg-white/5 text-left transition-colors group"
                        >
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center shadow-sm">
                                <HelpCircle className="w-4 h-4 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <span className="font-medium text-foreground text-sm">Generate Quiz</span>
                            </div>
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-orange-500/10 text-orange-500 font-medium">AI</span>
                        </button>

                        {/* Summarize Tool */}
                        <button
                            onClick={() => openProtectedModal('summarize')}
                            className="w-full flex items-center gap-3 px-2.5 py-2 rounded-lg hover:bg-white/5 text-left transition-colors group"
                        >
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-sm">
                                <FileText className="w-4 h-4 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <span className="font-medium text-foreground text-sm">Summarize</span>
                            </div>
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 font-medium">AI</span>
                        </button>

                        {/* Text-to-Speech Tool */}
                        <button
                            onClick={() => openProtectedModal('tts')}
                            className="w-full flex items-center gap-3 px-2.5 py-2 rounded-lg hover:bg-white/5 text-left transition-colors group"
                        >
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-400 to-violet-600 flex items-center justify-center shadow-sm">
                                <Headphones className="w-4 h-4 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <span className="font-medium text-foreground text-sm">Listen</span>
                            </div>
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-violet-500/10 text-violet-500 font-medium">TTS</span>
                        </button>

                        {/* Speech-to-Text Tool */}
                        <button
                            onClick={() => openProtectedModal('stt')}
                            className="w-full flex items-center gap-3 px-2.5 py-2 rounded-lg hover:bg-white/5 text-left transition-colors group"
                        >
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-400 to-sky-600 flex items-center justify-center shadow-sm">
                                <Mic className="w-4 h-4 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <span className="font-medium text-foreground text-sm">Transcribe Audio</span>
                            </div>
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-sky-500/10 text-sky-500 font-medium">STT</span>
                        </button>
                    </div>
                )}
            </div>

            <p className="w-full mt-2 flex justify-center text-[11px] text-muted-foreground/50 font-medium">
                QwikStudi can make mistakes. Please verify important information.
            </p>
        </div>
    );
}
