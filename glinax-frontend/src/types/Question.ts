// src/components/questions/types.ts

export interface Question {
  id: number;
  question: string;
  answer?: string;
  difficulty?: string;
  category?: string;
  image_url?: string; // for consistency with actual data
  type?: "mcq" | "theory";
  options?: string[];
}
