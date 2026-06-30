import type { Level, QuestionType, Skill } from '@/types/content';

// 傳給前端的題目（不含 correctAnswer / explanation，避免答案外洩）
export interface ExamQuestionDTO {
  id: string;
  type: QuestionType;
  skill: Skill;
  level: Level;
  weekNo: number | null;
  questionText: string;
  options: unknown[];
  audioUrl: string | null;
  imageUrl: string | null;
}

// 批改後回傳給前端的單題結果
export interface GradeResult {
  questionId: string;
  isCorrect: boolean;
  correctAnswer: string;
  explanation?: string | null;
}

// 配合題的選項與答案結構
export interface MatchPair {
  left: string;
  right: string;
}

// 聽音選圖選項
export interface ImageOption {
  label: string;
  emoji?: string;
  imageUrl?: string;
}
