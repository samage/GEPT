import type { Skill } from '@/types/content';

// 20 週學習計畫的前後端共用 DTO 與純函式（不依賴 DB / fs）

export interface PlanTask {
  id: string;
  skill: Skill;
  title: string;
  targetCount: number;
  doneCount: number;
}

export interface PlanWeek {
  id: string;
  weekNo: number;
  title: string;
  theme: string | null;
  unlocked: boolean;
  completed: boolean;
  progress: number; // 0-1
  tasks: PlanTask[];
}

export interface SkillScoreDTO {
  skill: Skill;
  suns: number;
  achievement: number;
}

export interface StudyPlanDTO {
  userId: string;
  streak: number;
  weeks: PlanWeek[];
  skillScores: SkillScoreDTO[];
}

// 由各任務完成度計算該週進度（0-1）
export function weekProgress(tasks: { doneCount: number; targetCount: number }[]): number {
  if (tasks.length === 0) return 0;
  const ratios = tasks.map((t) => Math.min(1, t.targetCount > 0 ? t.doneCount / t.targetCount : 0));
  return ratios.reduce((a, b) => a + b, 0) / tasks.length;
}

export const DEMO_USER_ID = 'demo-user-0001';

export const SKILL_LABELS: Record<Skill, string> = {
  LISTENING: '聽力',
  READING: '閱讀',
  WRITING: '寫作',
  SPEAKING: '口說',
};
