import type { QuestionType } from '@/types/content';

// 後端批改邏輯（集中管理，新增題型只需在此加一個分支）

function normalize(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/[.,!?;:'"]/g, '')
    .replace(/\s+/g, ' ');
}

function gradeMatching(correctAnswer: string, userAnswer: string): boolean {
  try {
    const correct = JSON.parse(correctAnswer) as Record<string, string>;
    const user = JSON.parse(userAnswer) as Record<string, string>;
    const keys = Object.keys(correct);
    if (keys.length === 0) return false;
    return keys.every((k) => normalize(user[k] ?? '') === normalize(correct[k]));
  } catch {
    return false;
  }
}

export function gradeAnswer(
  type: QuestionType,
  correctAnswer: string,
  userAnswer: string,
): boolean {
  const ua = userAnswer ?? '';

  switch (type) {
    case 'MATCHING':
      return gradeMatching(correctAnswer, ua);

    case 'WRITING_REORDER':
      return normalize(correctAnswer) === normalize(ua);

    case 'SHORT_ANSWER': {
      // 短句問答：使用者答案包含關鍵答案即視為正確（兒童友善）
      const c = normalize(correctAnswer);
      const u = normalize(ua);
      return u === c || (c.length > 0 && u.includes(c));
    }

    case 'SPEAKING_READ_ALOUD':
    case 'SPEAKING_PICTURE':
      // 口說題以「參與完成」計分（實際發音評分在 /phonics 透過 Azure）
      return normalize(ua) === 'done';

    case 'SPELLING':
    case 'LISTENING_IMAGE':
    case 'LISTENING_TF':
    case 'READING_TF':
    case 'MULTIPLE_CHOICE':
    case 'WRITING_CLOZE':
    default:
      return normalize(correctAnswer) === normalize(ua);
  }
}
