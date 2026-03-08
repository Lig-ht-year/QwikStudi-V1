import type { StudyMethod } from "@/stores/dataStore";

export type StudyMethodOption = {
  id: StudyMethod;
  label: string;
  shortLabel: string;
  description: string;
};

export const STUDY_METHOD_OPTIONS: StudyMethodOption[] = [
  {
    id: "feynman",
    label: "Feynman Technique",
    shortLabel: "Feynman",
    description: "Explain simply, expose gaps, and rebuild understanding.",
  },
  {
    id: "active_recall",
    label: "Active Recall",
    shortLabel: "Active Recall",
    description: "Use memory checks before seeing answers.",
  },
  {
    id: "spaced_repetition",
    label: "Spaced Repetition",
    shortLabel: "Spaced Rep",
    description: "Plan timed review intervals for better retention.",
  },
  {
    id: "socratic",
    label: "Socratic Questioning",
    shortLabel: "Socratic",
    description: "Learn by guided questions and reasoning.",
  },
  {
    id: "interleaving",
    label: "Interleaving",
    shortLabel: "Interleaving",
    description: "Mix related topics and contrast use cases.",
  },
  {
    id: "exam_drill",
    label: "Exam Drill",
    shortLabel: "Exam Drill",
    description: "Practice with exam-style prompts and marking cues.",
  },
];

export function getStudyMethodLabel(id: StudyMethod): string {
  const found = STUDY_METHOD_OPTIONS.find((option) => option.id === id);
  return found?.shortLabel || id;
}
