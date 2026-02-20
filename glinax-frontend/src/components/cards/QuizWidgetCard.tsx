"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
    CheckCircle2,
    XCircle,
    ArrowRight,
    HelpCircle,
    Trophy,
    RefreshCcw,
    BookOpen,
    Target,
    TrendingUp,
    PenLine
} from "lucide-react";
import { cn } from "@/lib/utils";
import api from "@/lib/api";

// Question types
export type QuestionType = 'mcq' | 'tf' | 'fill' | 'essay';

export interface Question {
    id: string;
    question: string;
    options: string[];
    correctAnswer: number;
    correctText?: string; // For fill-in-the-blank and essay questions
    explanation?: string;
    concept?: string;
    guidance?: string;
    type?: QuestionType; // Optional type field for frontend rendering
}

interface QuizWidgetCardProps {
    title: string;
    questions: Question[];
    difficulty?: string;
    quizType?: QuestionType; // Quiz type for rendering questions
}

export function QuizWidgetCard({ title, questions, difficulty = "medium", quizType }: QuizWidgetCardProps) {
    const [currentIdx, setCurrentIdx] = useState(0);
    const [selectedOption, setSelectedOption] = useState<number | null>(null);
    const [textAnswer, setTextAnswer] = useState("");
    const [showResult, setShowResult] = useState(false);
    const [isFinished, setIsFinished] = useState(false);
    const [questionResults, setQuestionResults] = useState<Map<number, boolean>>(new Map());
    const [userTextAnswers, setUserTextAnswers] = useState<Map<number, string>>(new Map());
    const [textFeedback, setTextFeedback] = useState<Map<number, { concept: string; guidance: string; feedback: string; score: number }>>(new Map());
    const [isGradingText, setIsGradingText] = useState(false);
    const [viewMode, setViewMode] = useState<'quiz' | 'review'>('quiz');

    const currentQuestion = questions[currentIdx];
    const progress = ((currentIdx + 1) / questions.length) * 100;
    const score = useMemo(
        () => Array.from(questionResults.values()).filter(Boolean).length,
        [questionResults]
    );

    // Calculate stats
    const correctCount = score;
    const incorrectCount = questionResults.size - score;
    const unansweredCount = questions.length - questionResults.size;
    const percentage = questions.length > 0 ? Math.round((score / questions.length) * 100) : 0;

    // Get performance rating
    const performanceRating = useMemo(() => {
        if (percentage >= 90) return { text: "Outstanding!", color: "text-emerald-500" };
        if (percentage >= 70) return { text: "Great Job!", color: "text-blue-500" };
        if (percentage >= 50) return { text: "Good Effort!", color: "text-yellow-500" };
        return { text: "Keep Practicing!", color: "text-orange-500" };
    }, [percentage]);

    // Find first incorrect answer for review mode
    const firstIncorrectIdx = useMemo(() => {
        return Array.from(questionResults.entries()).find(([, isCorrect]) => !isCorrect)?.[0];
    }, [questionResults]);

    // Review mode effect
    useEffect(() => {
        if (viewMode === 'review' && incorrectCount > 0 && firstIncorrectIdx !== undefined) {
            setCurrentIdx(firstIncorrectIdx);
        }
    }, [viewMode, incorrectCount, firstIncorrectIdx]);

    // Get current question type (from question, quiz type prop, or inferred from options)
    const getQuestionType = (): QuestionType => {
        if (currentQuestion.type) return currentQuestion.type;
        if (quizType) return quizType;
        if (currentQuestion.options.length === 0) return 'fill';
        if (currentQuestion.options.length === 2 && 
            (currentQuestion.options.includes('True') || currentQuestion.options.includes('False'))) {
            return 'tf';
        }
        if (currentQuestion.options.length === 4) return 'mcq';
        return 'mcq';
    };

    const getConceptLabel = (q: Question): string => {
        if (q.concept && q.concept.trim()) return q.concept.trim();
        const words = q.question.replace(/[^\w\s]/g, " ").split(/\s+/).filter(Boolean);
        return words.slice(0, 2).join(" ") || "Core Concept";
    };

    const evaluateTextAnswer = (q: Question, answer: string, isEssay: boolean) => {
        const normalizedAnswer = answer.trim().toLowerCase();
        const answerWordCount = normalizedAnswer.split(/\s+/).filter(Boolean).length;
        const reference = `${q.correctText || ""} ${q.explanation || ""}`.toLowerCase().trim();
        const keywordPool = reference
            .replace(/[^\w\s]/g, " ")
            .split(/\s+/)
            .filter((w) => w.length >= 4);
        const uniqueKeywords = Array.from(new Set(keywordPool)).slice(0, 10);
        const matched = uniqueKeywords.filter((kw) => normalizedAnswer.includes(kw)).length;
        const overlap = uniqueKeywords.length > 0 ? matched / uniqueKeywords.length : 0;

        if (isEssay) {
            const isCorrect = answerWordCount >= 12 && (overlap >= 0.25 || uniqueKeywords.length === 0);
            const guidance = isCorrect
                ? `Good direction. Keep grounding your answer in ${getConceptLabel(q)} with concrete reasoning.`
                : `Focus on ${getConceptLabel(q)}: define it first, then connect it to a concrete example from the topic.`;
            return { isCorrect, guidance };
        }

        const isCorrect = answerWordCount >= 1 && (overlap >= 0.2 || uniqueKeywords.length === 0);
        const guidance = isCorrect
            ? `Correct direction. You captured the key idea in ${getConceptLabel(q)}.`
            : `Revisit ${getConceptLabel(q)} and look for the exact term used in the material.`;
        return { isCorrect, guidance };
    };

    const handleOptionSelect = (idx: number) => {
        if (showResult) return;
        setSelectedOption(idx);
        setShowResult(true);
        
        const newResults = new Map(questionResults);
        newResults.set(currentIdx, idx === currentQuestion.correctAnswer);
        setQuestionResults(newResults);
    };

    const handleTextAnswerSubmit = async () => {
        if (showResult || !textAnswer.trim()) return;
        setShowResult(true);
        
        const newTextAnswers = new Map(userTextAnswers);
        newTextAnswers.set(currentIdx, textAnswer.trim());
        setUserTextAnswers(newTextAnswers);
        const qType = getQuestionType();
        const fallback = evaluateTextAnswer(currentQuestion, textAnswer, qType === 'essay');

        try {
            setIsGradingText(true);
            const res = await api.post("/chat/quiz/grade-text/", {
                question: currentQuestion.question,
                answer: textAnswer.trim(),
                questionType: qType,
                difficulty,
                expectedAnswer: currentQuestion.correctText || "",
                explanation: currentQuestion.explanation || "",
                concept: currentQuestion.concept || "",
            });
            const isCorrect = Boolean(res.data?.is_correct);
            const score = Number(res.data?.score ?? (isCorrect ? 1 : 0));
            const concept = String(res.data?.concept || getConceptLabel(currentQuestion));
            const guidance = String(res.data?.guidance || fallback.guidance);
            const feedback = String(res.data?.feedback || "");

            const newResults = new Map(questionResults);
            newResults.set(currentIdx, isCorrect);
            setQuestionResults(newResults);

            const newFeedback = new Map(textFeedback);
            newFeedback.set(currentIdx, { concept, guidance, feedback, score: Math.max(0, Math.min(1, score)) });
            setTextFeedback(newFeedback);
        } catch {
            const newResults = new Map(questionResults);
            newResults.set(currentIdx, fallback.isCorrect);
            setQuestionResults(newResults);

            const newFeedback = new Map(textFeedback);
            newFeedback.set(currentIdx, {
                concept: getConceptLabel(currentQuestion),
                guidance: fallback.guidance,
                feedback: fallback.isCorrect ? "Good answer quality." : "Answer needs more precision.",
                score: fallback.isCorrect ? 0.7 : 0.35,
            });
            setTextFeedback(newFeedback);
        } finally {
            setIsGradingText(false);
        }
    };

    const nextQuestion = () => {
        if (currentIdx < questions.length - 1) {
            setCurrentIdx(prev => prev + 1);
            setSelectedOption(null);
            setTextAnswer("");
            setShowResult(false);
        } else {
            setIsFinished(true);
        }
    };

    const resetQuiz = () => {
        setCurrentIdx(0);
        setSelectedOption(null);
        setTextAnswer("");
        setShowResult(false);
        setIsFinished(false);
        setQuestionResults(new Map());
        setUserTextAnswers(new Map());
        setTextFeedback(new Map());
        setViewMode('quiz');
    };

    const goToQuestion = (idx: number) => {
        setCurrentIdx(idx);
        setSelectedOption(null);
        setTextAnswer("");
        setShowResult(false);
    };

    if (isFinished) {
        return (
            <div className="w-full max-w-md bg-card border border-border/50 rounded-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-500">
                {/* Header */}
                <div className="bg-gradient-to-r from-primary to-primary/80 p-6 text-primary-foreground">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <Trophy className="w-6 h-6" />
                            <span className="font-bold text-lg">Quiz Complete!</span>
                        </div>
                        <span className="text-xs font-bold bg-white/20 px-3 py-1 rounded-full">
                            {difficulty} • {questions.length} Qs
                        </span>
                    </div>
                    
                    {/* Score Circle */}
                    <div className="flex justify-center mb-4">
                        <div className="relative w-28 h-28">
                            <svg className="w-full h-full transform -rotate-90">
                                <circle
                                    cx="56"
                                    cy="56"
                                    r="50"
                                    stroke="currentColor"
                                    strokeWidth="8"
                                    fill="transparent"
                                    className="text-white/20"
                                />
                                <circle
                                    cx="56"
                                    cy="56"
                                    r="50"
                                    stroke="currentColor"
                                    strokeWidth="8"
                                    fill="transparent"
                                    strokeDasharray={`${percentage * 3.14} 314`}
                                    className={cn(
                                        "transition-all duration-1000 ease-out",
                                        percentage >= 70 ? "text-emerald-400" : 
                                        percentage >= 50 ? "text-yellow-400" : "text-orange-400"
                                    )}
                                />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-3xl font-bold">{percentage}%</span>
                                <span className="text-xs text-white/80">{score}/{questions.length}</span>
                            </div>
                        </div>
                    </div>
                    
                    <p className={cn("text-center font-semibold text-lg", performanceRating.color)}>
                        {performanceRating.text}
                    </p>
                </div>

                {/* Stats Breakdown */}
                <div className="p-6 space-y-4">
                    <div className="grid grid-cols-3 gap-3">
                        <div className="bg-emerald-500/10 rounded-2xl p-3 text-center">
                            <div className="flex items-center justify-center gap-1 mb-1">
                                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{correctCount}</span>
                            </div>
                            <span className="text-xs text-muted-foreground">Correct</span>
                        </div>
                        <div className="bg-destructive/10 rounded-2xl p-3 text-center">
                            <div className="flex items-center justify-center gap-1 mb-1">
                                <XCircle className="w-4 h-4 text-destructive" />
                                <span className="text-lg font-bold text-destructive">{incorrectCount}</span>
                            </div>
                            <span className="text-xs text-muted-foreground">Incorrect</span>
                        </div>
                        <div className="bg-muted rounded-2xl p-3 text-center">
                            <div className="flex items-center justify-center gap-1 mb-1">
                                <BookOpen className="w-4 h-4 text-muted-foreground" />
                                <span className="text-lg font-bold text-muted-foreground">{unansweredCount}</span>
                            </div>
                            <span className="text-xs text-muted-foreground">Missed</span>
                        </div>
                    </div>

                    {/* Review Button */}
                    {incorrectCount > 0 && (
                        <button
                            onClick={() => {
                                setViewMode('review');
                                setIsFinished(false);
                                setCurrentIdx(0);
                                setShowResult(false);
                            }}
                            className="w-full py-3 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl font-semibold hover:bg-blue-500/20 transition-all flex items-center justify-center gap-2"
                        >
                            <Target className="w-4 h-4" />
                            Review Incorrect Answers
                        </button>
                    )}

                    {/* Question Navigator */}
                    <div className="border-t pt-4">
                        <p className="text-xs font-semibold text-muted-foreground mb-3">QUESTION NAVIGATOR</p>
                        <div className="flex flex-wrap gap-2">
                            {questions.map((q, idx) => {
                                const isAnswered = questionResults.has(idx);
                                const isCorrect = questionResults.get(idx) === true;
                                
                                return (
                                    <button
                                        key={idx}
                                        onClick={() => {
                                            setViewMode('quiz');
                                            goToQuestion(idx);
                                        }}
                                        className={cn(
                                            "w-8 h-8 rounded-lg text-xs font-bold transition-all",
                                            !isAnswered && "bg-muted text-muted-foreground hover:bg-muted/80",
                                            isAnswered && isCorrect && "bg-emerald-500 text-white",
                                            isAnswered && !isCorrect && "bg-destructive text-white"
                                        )}
                                    >
                                        {idx + 1}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="grid grid-cols-2 gap-3 pt-2">
                        <button
                            onClick={resetQuiz}
                            className="py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
                        >
                            <RefreshCcw className="w-4 h-4" />
                            Try Again
                        </button>
                        <button
                            onClick={() => {
                                setViewMode('quiz');
                                goToQuestion(0);
                                setIsFinished(false);
                            }}
                            className="py-3 bg-secondary text-secondary-foreground rounded-xl font-semibold hover:bg-secondary/80 transition-all flex items-center justify-center gap-2"
                        >
                            <TrendingUp className="w-4 h-4" />
                            Replay
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full max-w-md bg-card border border-border/50 rounded-3xl overflow-hidden shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Progress Bar */}
            <div className="h-1 bg-muted">
                <div 
                    className="h-full bg-gradient-to-r from-primary to-primary/60 transition-all duration-300"
                    style={{ width: `${progress}%` }}
                />
            </div>

            {/* Header */}
            <div className="bg-primary p-4 flex items-center justify-between text-primary-foreground">
                <div className="flex items-center gap-2">
                    <HelpCircle className="w-5 h-5" />
                    <span className="text-sm font-bold truncate max-w-[180px]">{title}</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-xs font-bold bg-primary-foreground/20 px-2 py-1 rounded-lg">
                        {currentIdx + 1} / {questions.length}
                    </span>
                    {viewMode === 'review' && (
                        <span className="text-xs font-bold bg-blue-400/80 px-2 py-1 rounded-lg text-primary-foreground">
                            Review
                        </span>
                    )}
                </div>
            </div>

            <div className="p-6 space-y-6">
                {/* Question */}
                <h4 className="text-lg font-bold leading-tight">
                    {currentQuestion.question}
                </h4>

                {/* Options or Input based on question type */}
                {(() => {
                    const qType = getQuestionType();
                    
                    // Fill-in-the-blank and Essay questions
                    if (qType === 'fill' || qType === 'essay') {
                        const isFill = qType === 'fill';
                        const userAnswer = userTextAnswers.get(currentIdx);
                        const isCorrect = questionResults.get(currentIdx) === true;
                        const evaluated = evaluateTextAnswer(currentQuestion, userAnswer || "", qType === 'essay');
                        const graded = textFeedback.get(currentIdx);
                        
                        return (
                            <div className="space-y-4">
                                {/* Input Field */}
                                <div className={cn(
                                    "w-full border-2 rounded-2xl transition-all",
                                    showResult 
                                        ? isCorrect 
                                            ? "border-emerald-500 bg-emerald-500/10" 
                                            : "border-border bg-secondary/10 opacity-50"
                                        : "border-border bg-secondary/30 focus:border-primary/50 focus:ring-2 focus:ring-primary/20",
                                    isFill ? "p-4" : "p-4 min-h-[150px]"
                                )}>
                                    {isFill ? (
                                        <input
                                            type="text"
                                            value={textAnswer}
                                            onChange={(e) => setTextAnswer(e.target.value)}
                                            placeholder="Type your answer here..."
                                            disabled={showResult}
                                            className="w-full bg-transparent outline-none text-foreground placeholder:text-muted-foreground"
                                        />
                                    ) : (
                                        <textarea
                                            value={textAnswer}
                                            onChange={(e) => setTextAnswer(e.target.value)}
                                            placeholder="Write your essay answer here..."
                                            disabled={showResult}
                                            className="w-full h-32 bg-transparent outline-none text-foreground placeholder:text-muted-foreground resize-none"
                                        />
                                    )}
                                </div>

                                {/* Show Answer */}
                                {showResult && (
                                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4 animate-in fade-in slide-in-from-top-2">
                                        <div className="flex items-start gap-2">
                                            <BookOpen className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                                            <div>
                                                <p className="text-[11px] font-bold text-blue-500 mb-1">
                                                    Concept: {graded?.concept || getConceptLabel(currentQuestion)}
                                                </p>
                                                <p className="text-xs font-bold text-blue-600 dark:text-blue-400 mb-1">
                                                    {isFill ? "Answer" : "Guidance"}
                                                </p>
                                                <p className="text-sm text-muted-foreground">
                                                    {graded?.guidance || currentQuestion.guidance || evaluated.guidance}
                                                </p>
                                                {graded?.feedback && (
                                                    <p className="text-xs text-muted-foreground mt-2">
                                                        Feedback: {graded.feedback}
                                                    </p>
                                                )}
                                                {typeof graded?.score === "number" && (
                                                    <p className="text-xs text-muted-foreground mt-1">
                                                        Score: {Math.round(graded.score * 100)}%
                                                    </p>
                                                )}
                                                {(currentQuestion.correctText || currentQuestion.explanation) && (
                                                    <p className="text-sm text-muted-foreground mt-2">
                                                        {currentQuestion.correctText || currentQuestion.explanation}
                                                    </p>
                                                )}
                                                <p className={cn(
                                                    "text-xs font-semibold mt-2",
                                                    isCorrect ? "text-emerald-500" : "text-yellow-500"
                                                )}>
                                                    {isCorrect ? "Marked correct" : "Needs improvement"}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Submit Button */}
                                {!showResult && (
                                    <button
                                        onClick={handleTextAnswerSubmit}
                                        disabled={!textAnswer.trim() || isGradingText}
                                        className={cn(
                                            "w-full py-4 rounded-2xl font-bold transition-all flex items-center justify-center gap-2",
                                            textAnswer.trim() && !isGradingText
                                                ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20"
                                                : "bg-muted text-muted-foreground cursor-not-allowed"
                                        )}
                                    >
                                        <PenLine className="w-5 h-5" />
                                        {isGradingText ? "Grading..." : (isFill ? "Submit Answer" : "Submit Essay")}
                                    </button>
                                )}
                            </div>
                        );
                    }
                    
                    // MCQ and True/False - original options rendering
                    return (
                        <div className="space-y-3">
                            {currentQuestion.options.map((option, i) => {
                                const isCorrect = i === currentQuestion.correctAnswer;
                                const isSelected = i === selectedOption;

                                return (
                                    <button
                                        key={i}
                                        onClick={() => handleOptionSelect(i)}
                                        disabled={showResult}
                                        className={cn(
                                            "w-full p-4 rounded-2xl text-left border-2 transition-all duration-200 group flex items-center justify-between",
                                            !showResult && "border-border hover:border-primary/50 hover:bg-primary/5 bg-secondary/30",
                                            showResult && isCorrect && "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
                                            showResult && isSelected && !isCorrect && "border-destructive bg-destructive/10 text-destructive-700 dark:text-destructive-400",
                                            showResult && !isCorrect && !isSelected && "border-border opacity-50 bg-secondary/10"
                                        )}
                                    >
                                        <span className="font-medium">{option}</span>
                                        {showResult && isCorrect && <CheckCircle2 className="w-5 h-5 shrink-0" />}
                                        {showResult && isSelected && !isCorrect && <XCircle className="w-5 h-5 shrink-0" />}
                                    </button>
                                );
                            })}
                        </div>
                    );
                })()}

                {/* Explanation */}
                {showResult && currentQuestion.explanation && (
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4 animate-in fade-in slide-in-from-top-2">
                        <div className="flex items-start gap-2">
                            <BookOpen className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                            <div>
                                <p className="text-[11px] font-bold text-blue-500 mb-1">
                                    Concept: {getConceptLabel(currentQuestion)}
                                </p>
                                {currentQuestion.guidance && (
                                    <p className="text-sm text-muted-foreground mb-2">{currentQuestion.guidance}</p>
                                )}
                                <p className="text-xs font-bold text-blue-600 dark:text-blue-400 mb-1">Explanation</p>
                                <p className="text-sm text-muted-foreground">{currentQuestion.explanation}</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Next Button */}
                {showResult && (
                    <button
                        onClick={nextQuestion}
                        className="w-full py-4 bg-primary text-primary-foreground rounded-2xl font-bold hover:bg-primary/90 transition-all flex items-center justify-center gap-2 group shadow-lg shadow-primary/20"
                    >
                        {currentIdx === questions.length - 1 ? (
                            <>
                                <Trophy className="w-5 h-5" />
                                Finish Quiz
                            </>
                        ) : (
                            <>
                                {viewMode === 'review' && currentIdx < questions.length - 1 ? (
                                    <>
                                        Next Review
                                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                    </>
                                ) : (
                                    <>
                                        Next Question
                                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                    </>
                                )}
                            </>
                        )}
                    </button>
                )}
            </div>
        </div>
    );
}
