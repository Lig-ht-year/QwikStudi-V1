"use client";

import React from "react";
import {
    Headphones,
    Mic,
    HelpCircle,
    FileText,
    MessageSquare
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useChatStore, ActiveMode } from "@/stores/chatStore";

interface Feature {
    id: ActiveMode;
    label: string;
    icon: React.ElementType;
    color: string;
    description: string;
}

const features: Feature[] = [
    {
        id: 'chat',
        label: 'Chat',
        icon: MessageSquare,
        color: 'bg-blue-500',
        description: 'General study assistance'
    },
    {
        id: 'tts',
        label: 'Listen',
        icon: Headphones,
        color: 'bg-purple-500',
        description: 'Convert text to speech'
    },
    {
        id: 'stt',
        label: 'Record',
        icon: Mic,
        color: 'bg-red-500',
        description: 'Transcribe lecture notes'
    },
    {
        id: 'quiz',
        label: 'Quiz',
        icon: HelpCircle,
        color: 'bg-orange-500',
        description: 'Generate practice questions'
    },
    {
        id: 'summarize',
        label: 'Summarize',
        icon: FileText,
        color: 'bg-emerald-500',
        description: 'Condense long documents'
    },
];

export function FeatureSelector() {
    const { activeMode, setActiveMode, setActiveModal } = useChatStore();

    const handleFeatureClick = (featureId: ActiveMode) => {
        setActiveMode(featureId);
        // Open modal for non-chat modes
        if (featureId === 'tts') setActiveModal('tts');
        else if (featureId === 'stt') setActiveModal('stt');
        else if (featureId === 'quiz') setActiveModal('quiz');
        else if (featureId === 'summarize') setActiveModal('summarize');
    };

    return (
        <div className="flex items-center gap-1 p-1.5 bg-black/40 backdrop-blur-2xl rounded-full border border-white/10 w-fit mx-auto shadow-2xl shadow-black/20">
            {features.map((feature) => {
                const isActive = activeMode === feature.id;
                const Icon = feature.icon;

                return (
                    <button
                        key={feature.id}
                        onClick={() => handleFeatureClick(feature.id)}
                        className={cn(
                            "relative flex items-center gap-2 px-4 py-2.5 rounded-full transition-all duration-300 ease-out",
                            isActive
                                ? "bg-primary text-white shadow-lg shadow-primary/30"
                                : "text-white/60 hover:text-white hover:bg-white/10"
                        )}
                        title={feature.description}
                    >
                        <Icon className={cn(
                            "w-5 h-5 transition-all duration-300",
                            isActive ? "text-white" : "text-white/60"
                        )} />
                        {isActive && (
                            <span className="text-sm font-semibold tracking-tight">
                                {feature.label}
                            </span>
                        )}
                    </button>
                );
            })}
        </div>
    );
}
