import type { QuestionEntry, QuestionType, WordEntry } from '@/types/content';

// 題目自動造題器：由已審核的單字 / 例句衍生題目。
// 新增題型時，在這裡加一個 generator 並註冊到 GENERATORS。
// 註：部分題型（聽音選圖、配合題）需要 imageUrl 素材；無素材時自動略過。

type Generator = (words: WordEntry[]) => QuestionEntry[];

function reviewedSentences(words: WordEntry[]): { word: WordEntry; text: string }[] {
  const out: { word: WordEntry; text: string }[] = [];
  for (const w of words) {
    for (const s of w.sentences ?? []) {
      if (s.reviewed) out.push({ word: w, text: s.text });
    }
  }
  return out;
}

const genSpelling: Generator = (words) =>
  words.map((w) => ({
    type: 'SPELLING' as QuestionType,
    level: 'KIDS' as const,
    weekNo: w.weekNo,
    questionText: w.ipa ? `根據提示拼出單字 /${w.ipa}/` : `拼出單字`,
    options: w.text.split(''),
    correctAnswer: w.text,
    explanation: `正確拼法：${w.text}`,
  }));

const genReorder: Generator = (words) =>
  reviewedSentences(words).map(({ word, text }) => {
    const tokens = text.replace(/[.?!]+$/, '').split(/\s+/);
    return {
      type: 'WRITING_REORDER' as QuestionType,
      level: 'KIDS' as const,
      weekNo: word.weekNo,
      questionText: '把單字排成正確的句子',
      options: tokens,
      correctAnswer: tokens.join(' '),
      explanation: `正確句子：${tokens.join(' ')}`,
    };
  });

const genReadAloud: Generator = (words) =>
  reviewedSentences(words).map(({ word, text }) => ({
    type: 'SPEAKING_READ_ALOUD' as QuestionType,
    level: 'KIDS' as const,
    weekNo: word.weekNo,
    questionText: `請大聲朗讀：${text}`,
    options: [],
    correctAnswer: text,
    explanation: '念清楚每個字，注意單字重音。',
  }));

const genMatching: Generator = (words) => {
  const withImage = words.filter((w) => w.imageUrl);
  const out: QuestionEntry[] = [];
  for (let i = 0; i < withImage.length; i += 3) {
    const group = withImage.slice(i, i + 3);
    if (group.length < 2) break;
    const map: Record<string, string> = {};
    group.forEach((w) => (map[w.text] = w.imageUrl as string));
    out.push({
      type: 'MATCHING',
      level: 'KIDS',
      weekNo: group[0].weekNo,
      questionText: '把單字和圖片配對起來',
      options: group.map((w) => ({ left: w.text, right: w.imageUrl })),
      correctAnswer: JSON.stringify(map),
    });
  }
  return out;
};

const genListeningImage: Generator = (words) => {
  const withImage = words.filter((w) => w.imageUrl);
  const out: QuestionEntry[] = [];
  for (const target of withImage) {
    const distractors = withImage.filter((w) => w.text !== target.text).slice(0, 2);
    if (distractors.length < 1) continue;
    const options = [target, ...distractors].map((w) => ({ label: w.text, imageUrl: w.imageUrl }));
    out.push({
      type: 'LISTENING_IMAGE',
      level: 'KIDS',
      weekNo: target.weekNo,
      questionText: `Listen and choose the picture: ${target.text}`,
      options,
      correctAnswer: target.text,
    });
  }
  return out;
};

const GENERATORS: Partial<Record<QuestionType, Generator>> = {
  SPELLING: genSpelling,
  WRITING_REORDER: genReorder,
  SPEAKING_READ_ALOUD: genReadAloud,
  MATCHING: genMatching,
  LISTENING_IMAGE: genListeningImage,
};

/** 依指定題型由單字庫造題；未列入的題型需人工撰寫。 */
export function generateQuestions(words: WordEntry[], types: QuestionType[]): QuestionEntry[] {
  const out: QuestionEntry[] = [];
  for (const type of types) {
    const gen = GENERATORS[type];
    if (gen) out.push(...gen(words));
  }
  return out;
}

export const SUPPORTED_GENERATOR_TYPES = Object.keys(GENERATORS) as QuestionType[];
