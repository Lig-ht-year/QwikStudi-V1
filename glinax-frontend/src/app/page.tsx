"use client";

import React, { useEffect } from "react";
import { nanoid } from "nanoid";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { ChatContainer } from "@/components/chat/ChatContainer";
import { TTSModal } from "@/components/modals/TTSModal";
import { STTRecorder } from "@/components/modals/STTRecorder";
import { QuizConfigModal } from "@/components/modals/QuizConfigModal";
import { SummarizeModal } from "@/components/modals/SummarizeModal";
import { useUIStore } from "@/stores/uiStore";
import { useDataStore } from "@/stores/dataStore";
import api from "@/lib/api";
import { useToast } from "@/components/Toast";
import { getChatHistory } from "@/lib/getChatHistory";
import { startNewChat } from "@/lib/startNewChat";

interface QuizConfig {
    file: File | null;
    questionType: string;
    questionCount: number;
    difficulty: string;
}

interface SummaryOptions {
    length: "brief" | "detailed" | "comprehensive";
    format: "bullets" | "paragraphs";
    includeKeyTerms: boolean;
}

export default function Home() {
    const router = useRouter();
    // Use atomic stores directly for proper reactivity
    const activeModal = useUIStore((state) => state.activeModal);
    const setActiveModal = useUIStore((state) => state.setActiveModal);
    const addMessage = useDataStore((state) => state.addMessage);
    const removeMessage = useDataStore((state) => state.removeMessage);
    const isLoggedIn = useDataStore((state) => state.isLoggedIn);
    const sessions = useDataStore((state) => state.sessions);
    const activeSessionId = useDataStore((state) => state.activeSessionId);
    const setChatId = useDataStore((state) => state.setChatId);
    const chatId = useDataStore((state) => state.chatId);
    const createSession = useDataStore((state) => state.createSession);
    const updateSession = useDataStore((state) => state.updateSession);
    const loadChatHistory = useDataStore((state) => state.loadChatHistory);
    const { showToast } = useToast();

    const parseFeatureError = (error: unknown, fallback: string) => {
        const axiosError = error as { response?: { status?: number; data?: { error?: string } } };
        const status = axiosError?.response?.status;
        const backendMessage = axiosError?.response?.data?.error;
        const message = backendMessage || fallback;
        return { status, message };
    };

    const addLoadingAssistantMessage = (content: string) => {
        const id = nanoid();
        addMessage({
            id,
            role: 'assistant',
            content,
            type: 'text',
            metadata: { isLoading: true },
            createdAt: new Date(),
        });
        return id;
    };

    const requireAuthForFeature = () => {
        if (isLoggedIn) return true;
        showToast("Please log in or register to use this feature.", "error");
        setActiveModal(null);
        router.push("/login");
        return false;
    };

    const ensureChatId = async () => {
        if (!isLoggedIn) return null;
        if (chatId) return chatId;
        try {
            const data = await startNewChat();
            const newChatId = data?.chat_id ?? null;
            if (!newChatId) return null;
            if (activeSessionId) {
                updateSession(activeSessionId, { chatId: newChatId });
            } else {
                createSession(data?.title || "New Chat", { chatId: newChatId, resetMessages: false, setActive: true });
            }
            setChatId(newChatId);
            return newChatId;
        } catch {
            return null;
        }
    };

    useEffect(() => {
        let isMounted = true;
        const shouldFetch = isLoggedIn && sessions.length === 0 && typeof window !== "undefined" && !!localStorage.getItem("access");
        if (!shouldFetch) return;

        (async () => {
            const { data, error } = await getChatHistory();
            if (!isMounted || error || data.length === 0) return;
            loadChatHistory(data);
        })();

        return () => {
            isMounted = false;
        };
    }, [isLoggedIn, sessions.length, loadChatHistory]);

    const handleTTSGenerate = async (text: string, voice: string, file?: File | null) => {
        if (!requireAuthForFeature()) return;
        const loadingId = addLoadingAssistantMessage("Converting your text into audio...");

        try {
            const resolvedChatId = await ensureChatId();
            let res;

            if (file) {
                const formData = new FormData();
                formData.append("file", file);
                formData.append("voice", voice);
                if (resolvedChatId) formData.append("chat_id", String(resolvedChatId));
                res = await api.post("/chat/audio/generate/", formData);
            } else {
                res = await api.post("/chat/audio/generate/", {
                    text,
                    voice,
                    chat_id: resolvedChatId,
                });
            }

            removeMessage(loadingId);

            addMessage({
                id: nanoid(),
                role: 'assistant',
                content: `I've generated audio for your text using the ${voice} voice. Click play to listen.`,
                type: 'audio',
                metadata: {
                    tts_id: res.data?.id,
                    title: "Generated Audio",
                    audio_url: res.data?.audio_url,
                    voice,
                    transcript: text || (file ? `Source file: ${file.name}` : ""),
                },
                createdAt: new Date(),
            });
            showToast("Audio generated successfully!", "success");
        } catch (error: unknown) {
            console.error("TTS generation failed:", error);
            removeMessage(loadingId);
            const { message } = parseFeatureError(
                error,
                "Failed to generate audio. Please try again."
            );
            addMessage({
                id: nanoid(),
                role: 'assistant',
                content: message,
                type: 'text',
                createdAt: new Date(),
            });
            showToast(message, "error");
            throw new Error(message);
        }
    };

    const formatDuration = (durationMs?: number) => {
        if (!durationMs) return undefined;
        const totalSeconds = Math.max(0, Math.round(durationMs / 1000));
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
    };

    const buildNotesFromTranscription = (text: string) => {
        const sentences = text
            .split(/(?:\r?\n)+|[.!?]\s+/)
            .map((sentence) => sentence.trim())
            .filter(Boolean);

        if (sentences.length === 0) return [];
        if (sentences.length <= 8) return sentences;
        return sentences.slice(0, 8);
    };

    const handleSTTProcess = async (audioFile: File, durationMs?: number) => {
        if (!requireAuthForFeature()) return;
        const loadingId = addLoadingAssistantMessage("Transcribing your recording and preparing notes...");

        try {
            const formData = new FormData();
            formData.append("file", audioFile);
            const resolvedChatId = await ensureChatId();
            if (resolvedChatId) formData.append("chat_id", String(resolvedChatId));
            if (durationMs) formData.append("duration_ms", String(durationMs));

            const res = await api.post("/transcribe/", formData);

            removeMessage(loadingId);

            const transcription = String(res.data?.transcription || "").trim();
            const notes = buildNotesFromTranscription(transcription);

            addMessage({
                id: nanoid(),
                role: 'assistant',
                content: transcription || "Transcription completed, but no text was returned.",
                type: 'notes',
                metadata: {
                    title: "Lecture Notes",
                    notes: notes.length > 0 ? notes : ["No clear transcript segments were detected."],
                    duration: formatDuration(durationMs),
                },
                createdAt: new Date(),
            });

            showToast("Transcription completed!", "success");
        } catch (error: unknown) {
            console.error("Transcription failed:", error);

            removeMessage(loadingId);

            const { status, message } = parseFeatureError(
                error,
                "Failed to transcribe audio. Please try again."
            );
            const finalMessage = status === 401 ? "Please log in to transcribe audio." : message;

            addMessage({
                id: nanoid(),
                role: 'assistant',
                content: finalMessage,
                type: 'text',
                createdAt: new Date(),
            });

            showToast(finalMessage, "error");
            throw new Error(finalMessage);
        }
    };

    const handleQuizGenerate = async (config: QuizConfig, content?: string) => {
        if (!requireAuthForFeature()) return;
        const sourceFile = config.file || (content ? new File([content], "message.txt", { type: "text/plain" }) : null);
        if (!sourceFile) return;
        
        const loadingId = addLoadingAssistantMessage("Reviewing your material and drafting quiz questions...");

        try {
            const formData = new FormData();
            formData.append('file', sourceFile);
            formData.append('questionType', config.questionType);
            formData.append('questionCount', config.questionCount.toString());
            formData.append('difficulty', config.difficulty);

            const resolvedChatId = await ensureChatId();
            if (resolvedChatId) formData.append("chat_id", String(resolvedChatId));

            const res = await api.post("/chat/quiz/generate/", formData);

            // Replace loading message with actual quiz
            removeMessage(loadingId);

            addMessage({
                id: nanoid(),
                role: 'assistant',
                content: `I've generated ${res.data.count} quiz questions based on your study material. Test your knowledge!`,
                type: 'quiz',
                metadata: {
                    title: "Generated Quiz",
                    questions: res.data.questions,
                    difficulty: res.data.difficulty,
                    type: res.data.type
                },
                createdAt: new Date(),
            });
            
            showToast("Quiz generated successfully!", "success");
        } catch (error: unknown) {
            console.error("Quiz generation failed:", error);

            removeMessage(loadingId);

            const { message } = parseFeatureError(
                error,
                "Sorry, I couldn't generate the quiz. Please try again with a different file."
            );
            addMessage({
                id: nanoid(),
                role: 'assistant',
                content: message,
                type: 'text',
                createdAt: new Date(),
            });

            showToast(message, "error");
            throw new Error(message);
        }
    };

    const handleSummarize = async (file: File | null, options: SummaryOptions, content?: string) => {
        if (!requireAuthForFeature()) return;
        const sourceFile = file || (content ? new File([content], "message.txt", { type: "text/plain" }) : null);
        if (!sourceFile) return;
        
        const loadingId = addLoadingAssistantMessage("Reading your document and building a clear summary...");

        try {
            const formData = new FormData();
            formData.append('file', sourceFile);
            formData.append('length', options.length);
            formData.append('format', options.format);
            formData.append('includeKeyTerms', options.includeKeyTerms.toString());

            const resolvedChatId = await ensureChatId();
            if (resolvedChatId) formData.append("chat_id", String(resolvedChatId));

            const res = await api.post("/chat/summarize/", formData);

            // Replace loading message with actual summary
            removeMessage(loadingId);

            // Ensure summary is a string (handle edge case where it's still an object)
            let summaryContent = res.data.summary;
            if (typeof summaryContent !== 'string') {
                if (typeof summaryContent === 'object' && summaryContent !== null) {
                    // Convert object to formatted string
                    summaryContent = Object.entries(summaryContent)
                        .map(([section, content]) => `## ${section}\n${content}`)
                        .join('\n\n');
                } else {
                    summaryContent = String(summaryContent);
                }
            }

            addMessage({
                id: nanoid(),
                role: 'assistant',
                content: summaryContent,
                type: 'summary',
                metadata: {
                    title: "Document Summary",
                    summary: summaryContent,
                    takeaways: res.data.takeaways || [],
                    keyTerms: res.data.keyTerms || [],
                    length: res.data.length,
                    format: res.data.format
                },
                createdAt: new Date(),
            });
            
            showToast("Summary generated successfully!", "success");
        } catch (error: unknown) {
            console.error("Summarization failed:", error);

            removeMessage(loadingId);

            const { message } = parseFeatureError(
                error,
                "Sorry, I couldn't generate the summary. Please try again with a different file."
            );
            addMessage({
                id: nanoid(),
                role: 'assistant',
                content: message,
                type: 'text',
                createdAt: new Date(),
            });

            showToast(message, "error");
            throw new Error(message);
        }
    };

    return (
        <AppShell>
            <ChatContainer />

            {/* Feature Modals */}
            <TTSModal
                isOpen={activeModal === 'tts'}
                onClose={() => setActiveModal(null)}
                onGenerate={handleTTSGenerate}
            />
            <STTRecorder
                isOpen={activeModal === 'stt'}
                onClose={() => setActiveModal(null)}
                onProcess={handleSTTProcess}
            />
            <QuizConfigModal
                isOpen={activeModal === 'quiz'}
                onClose={() => setActiveModal(null)}
                onGenerate={handleQuizGenerate}
            />
            <SummarizeModal
                isOpen={activeModal === 'summarize'}
                onClose={() => setActiveModal(null)}
                onGenerate={handleSummarize}
            />
        </AppShell>
    );
}
