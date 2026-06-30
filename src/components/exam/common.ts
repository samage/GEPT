import type { ExamQuestionDTO, GradeResult } from '@/lib/exam/types';

// 所有題型元件共用的 props：答案狀態由 ExamRunner 控管
export interface QuestionComponentProps {
  question: ExamQuestionDTO;
  answer: string;
  onAnswerChange: (answer: string) => void;
  locked: boolean; // 送出後鎖定輸入
  result?: GradeResult; // 送出後的批改結果
}

export type { ExamQuestionDTO, GradeResult };
