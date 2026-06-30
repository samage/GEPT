import { z } from 'zod';

// ==========================================
// 5/6/7 章共用的「單一真實來源」型別與驗證 schema
// prisma/data/*.json、seed、題型模組、API 都引用這裡
// ==========================================

export const SKILLS = ['LISTENING', 'READING', 'WRITING', 'SPEAKING'] as const;
export const LEVELS = ['KIDS', 'BEGINNER'] as const;
export const QUESTION_TYPES = [
  'LISTENING_IMAGE',
  'LISTENING_TF',
  'READING_TF',
  'MATCHING',
  'MULTIPLE_CHOICE',
  'SPELLING',
  'WRITING_CLOZE',
  'SHORT_ANSWER',
  'WRITING_REORDER',
  'SPEAKING_READ_ALOUD',
  'SPEAKING_PICTURE',
] as const;

export const SkillSchema = z.enum(SKILLS);
export const LevelSchema = z.enum(LEVELS);
export const QuestionTypeSchema = z.enum(QUESTION_TYPES);

export type Skill = z.infer<typeof SkillSchema>;
export type Level = z.infer<typeof LevelSchema>;
export type QuestionType = z.infer<typeof QuestionTypeSchema>;

// 題型 → 分項能力對照（造題器/批改/統計共用）
export const QUESTION_TYPE_SKILL: Record<QuestionType, Skill> = {
  LISTENING_IMAGE: 'LISTENING',
  LISTENING_TF: 'LISTENING',
  READING_TF: 'READING',
  MATCHING: 'READING',
  MULTIPLE_CHOICE: 'READING',
  SPELLING: 'WRITING',
  WRITING_CLOZE: 'WRITING',
  SHORT_ANSWER: 'WRITING',
  WRITING_REORDER: 'WRITING',
  SPEAKING_READ_ALOUD: 'SPEAKING',
  SPEAKING_PICTURE: 'SPEAKING',
};

// ---------- 發音積木 ----------
export const PhonemeBlockSchema = z.object({
  text: z.string().min(1), // 字母區塊，例如 "st"
  phoneme: z.string(), // 對應音素，例如 "st" / "ʃən"
  isStressed: z.boolean().optional().default(false),
});
export type PhonemeBlock = z.infer<typeof PhonemeBlockSchema>;

// ---------- 例句 ----------
export const SentenceEntrySchema = z.object({
  text: z.string().min(1),
  audioUrl: z.string().optional(),
  imageUrl: z.string().optional(),
  reviewed: z.boolean().default(false), // 人工審核後才會被造題器採用
});
export type SentenceEntry = z.infer<typeof SentenceEntrySchema>;

// ---------- 單字（words.json）----------
export const WordEntrySchema = z.object({
  text: z.string().min(1),
  ipa: z.string().optional(),
  category: z.string().min(1), // PhonicsCategory.name（自然發音分類或主題分類）
  phonemeMapping: z.array(PhonemeBlockSchema).min(1),
  sentences: z.array(SentenceEntrySchema).optional(),
  imageUrl: z.string().optional(),
  audioUrl: z.string().optional(),
  weekNo: z.number().int().min(1).max(20).optional(),
  chinese: z.string().optional(), // 中文釋義（官方字表匯入）
  pos: z.string().optional(), // 詞性（官方字表匯入）
});
export type WordEntry = z.infer<typeof WordEntrySchema>;

// ---------- 題目（questions.json）----------
export const QuestionEntrySchema = z.object({
  type: QuestionTypeSchema,
  level: LevelSchema.default('KIDS'),
  weekNo: z.number().int().min(1).max(20).optional(),
  questionText: z.string().min(1),
  // options 可為字串陣列或配對結構，統一以 unknown 陣列承接，由各題型自行解讀
  options: z.array(z.unknown()).default([]),
  correctAnswer: z.string(), // 寫作/配對題以 JSON 字串表示
  audioUrl: z.string().optional(),
  imageUrl: z.string().optional(),
  explanation: z.string().optional(),
});
export type QuestionEntry = z.infer<typeof QuestionEntrySchema>;

// ---------- 課程地圖（curriculum.json）----------
export const WeeklyTaskDefSchema = z.object({
  skill: SkillSchema,
  title: z.string(),
  targetCount: z.number().int().min(1).default(5),
  types: z.array(QuestionTypeSchema).min(1),
});
export type WeeklyTaskDef = z.infer<typeof WeeklyTaskDefSchema>;

export const CurriculumWeekSchema = z.object({
  weekNo: z.number().int().min(1).max(20),
  title: z.string(),
  theme: z.string().optional(),
  categories: z.array(z.string()).default([]), // PhonicsCategory 名稱
  tasks: z.array(WeeklyTaskDefSchema).default([]),
});
export type CurriculumWeek = z.infer<typeof CurriculumWeekSchema>;

export const PhonicsCategorySchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
});
export type PhonicsCategoryEntry = z.infer<typeof PhonicsCategorySchema>;

// 整份內容資料的容器
export const WordsFileSchema = z.array(WordEntrySchema);
export const QuestionsFileSchema = z.array(QuestionEntrySchema);
export const CurriculumFileSchema = z.array(CurriculumWeekSchema);
export const CategoriesFileSchema = z.array(PhonicsCategorySchema);

// 給前端發音評測使用：單一積木的評分結果
export interface PhonemeScore {
  index: number; // 對應 phonemeMapping 的 index（1:1）
  text: string;
  phoneme: string;
  score: number; // 0-100
}
