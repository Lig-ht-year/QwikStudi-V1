"use client";

import { nanoid } from "nanoid";
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
    // Use atomic stores directly for proper reactivity
    const activeModal = useUIStore((state) => state.activeModal);
    const setActiveModal = useUIStore((state) => state.setActiveModal);
    const addMessage = useDataStore((state) => state.addMessage);
    const removeMessage = useDataStore((state) => state.removeMessage);
    const { showToast } = useToast();

    const handleTTSGenerate = (text: string, voice: string) => {
        addMessage({
            id: nanoid(),
            role: 'assistant',
            content: `I've generated audio for your text using the ${voice} voice. Click play to listen.`,
            type: 'audio',
            metadata: { title: "Generated Audio", duration: "02:30" },
            timestamp: new Date(),
        });
    };

    const handleSTTProcess = () => {
        addMessage({
            id: nanoid(),
            role: 'assistant',
            content: "I've transcribed your recording. Here are your lecture notes:",
            type: 'notes',
            metadata: {
                title: "Lecture Notes",
                notes: [
                    "Key concept: Introduction to the topic",
                    "Important point discussed",
                    "Summary of main ideas"
                ],
                duration: "15:30"
            },
            timestamp: new Date(),
        });
    };

    const handleQuizGenerate = async (config: QuizConfig) => {
        if (!config.file) return;
        
        const loadingId = nanoid();
        
        // Add loading message
        addMessage({
            id: loadingId,
            role: 'assistant',
            content: "Analyzing your study material and generating quiz questions...",
            type: 'text',
            timestamp: new Date(),
        });

        try {
            const formData = new FormData();
            formData.append('file', config.file);
            formData.append('questionType', config.questionType);
            formData.append('questionCount', config.questionCount.toString());
            formData.append('difficulty', config.difficulty);

            const res = await api.post("/chat/quiz/generate/", formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

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
                timestamp: new Date(),
            });
            
            showToast("Quiz generated successfully!", "success");
        } catch (error: any) {
            console.error("Quiz generation failed:", error);
            
            // Remove loading message
            removeMessage(loadingId);
            
            addMessage({
                id: nanoid(),
                role: 'assistant',
                content: "Sorry, I couldn't generate the quiz. Please try again with a different file.",
                type: 'text',
                timestamp: new Date(),
            });
            
            showToast(error.response?.data?.error || "Failed to generate quiz", "error");
        }
    };

    const handleSummarize = async (file: File, options: SummaryOptions) => {
        if (!file) return;
        
        const loadingId = nanoid();
        
        // Add loading message
        addMessage({
            id: loadingId,
            role: 'assistant',
            content: "Analyzing your document and creating a summary...",
            type: 'text',
            timestamp: new Date(),
        });

        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('length', options.length);
            formData.append('format', options.format);
            formData.append('includeKeyTerms', options.includeKeyTerms.toString());

            const res = await api.post("/chat/summarize/", formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

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
                timestamp: new Date(),
            });
            
            showToast("Summary generated successfully!", "success");
        } catch (error: any) {
            console.error("Summarization failed:", error);
            
            // Remove loading message
            removeMessage(loadingId);
            
            addMessage({
                id: nanoid(),
                role: 'assistant',
                content: "Sorry, I couldn't generate the summary. Please try again with a different file.",
                type: 'text',
                timestamp: new Date(),
            });
            
            showToast(error.response?.data?.error || "Failed to generate summary", "error");
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
