// 太陽數 (0-5) 與能力達成率：對應簡章「個人化分項能力診斷」，非及格制

export function sunsFromRate(rate: number): number {
  const clamped = Math.max(0, Math.min(1, rate));
  return Math.round(clamped * 5);
}

// 太陽數對應的鼓勵語（參考簡章口說 0-5 的表現分級）
export function describeSuns(suns: number): string {
  if (suns >= 4) return '表現優異 🌟';
  if (suns === 3) return '表現良好 👍';
  if (suns >= 1) return '加油，下次表現會更好 💪';
  return '一起開始練習吧 🌱';
}

export interface SkillSummary {
  skill: string;
  suns: number;
  achievement: number; // 0-1
  totalAttempts: number;
  correctCount: number;
}
