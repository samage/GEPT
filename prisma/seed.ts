import { PrismaClient, Prisma } from '@prisma/client';
import { createHash } from 'crypto';
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  WordsFileSchema,
  QuestionsFileSchema,
  CurriculumFileSchema,
  QUESTION_TYPE_SKILL,
  type QuestionType,
} from '../src/types/content';

const prisma = new PrismaClient();

// PhonicsCategory 描述（不存在則建立）
const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  SHORT_VOWELS: '短母音',
  LONG_VOWELS: '長母音',
  SPECIAL_RULES: '特殊發音規則（含 -tion / -ture / -ing 等金牌字尾）',
  CONSONANT_BLENDS: '子音群（bl / st / tr 等）',
};

const DEMO_USER_ID = 'demo-user-0001';

// 由 type + questionText 推導穩定 id，確保重跑 seed 不重複建立題目
function questionId(type: string, questionText: string): string {
  return 'q_' + createHash('sha1').update(`${type}|${questionText}`).digest('hex').slice(0, 24);
}

function readJson(file: string): unknown {
  return JSON.parse(readFileSync(join(__dirname, 'data', file), 'utf-8'));
}

async function main() {
  console.log('🌱 開始 seed...');

  // 1) 讀檔 + Zod 驗證（單一真實來源）
  const words = WordsFileSchema.parse(readJson('words.json'));
  const questions = QuestionsFileSchema.parse(readJson('questions.json'));
  const curriculum = CurriculumFileSchema.parse(readJson('curriculum.json'));

  // 2) 分類 upsert
  const categoryNames = new Set<string>(Object.keys(CATEGORY_DESCRIPTIONS));
  words.forEach((w) => categoryNames.add(w.category));
  curriculum.forEach((wk) => wk.categories.forEach((c) => categoryNames.add(c)));

  const categoryIdByName = new Map<string, string>();
  for (const name of categoryNames) {
    const cat = await prisma.phonicsCategory.upsert({
      where: { name },
      update: { description: CATEGORY_DESCRIPTIONS[name] ?? null },
      create: { name, description: CATEGORY_DESCRIPTIONS[name] ?? null },
    });
    categoryIdByName.set(name, cat.id);
  }
  console.log(`  ✓ 分類 ${categoryIdByName.size} 筆`);

  // 3) 單字 upsert
  for (const w of words) {
    const categoryId = categoryIdByName.get(w.category);
    if (!categoryId) continue;
    await prisma.word.upsert({
      where: { text: w.text },
      update: {
        ipa: w.ipa,
        phonemeMapping: w.phonemeMapping,
        sentences: w.sentences ?? undefined,
        imageUrl: w.imageUrl,
        audioUrl: w.audioUrl,
        weekNo: w.weekNo,
        chinese: w.chinese,
        pos: w.pos,
        categoryId,
      },
      create: {
        text: w.text,
        ipa: w.ipa,
        phonemeMapping: w.phonemeMapping,
        sentences: w.sentences ?? undefined,
        imageUrl: w.imageUrl,
        audioUrl: w.audioUrl,
        weekNo: w.weekNo,
        chinese: w.chinese,
        pos: w.pos,
        categoryId,
      },
    });
  }
  console.log(`  ✓ 單字 ${words.length} 筆`);

  // 4) 題目 upsert（穩定 id）
  for (const q of questions) {
    const id = questionId(q.type, q.questionText);
    const skill = QUESTION_TYPE_SKILL[q.type as QuestionType];
    const data = {
      type: q.type,
      skill,
      level: q.level,
      weekNo: q.weekNo,
      questionText: q.questionText,
      options: q.options as unknown as Prisma.InputJsonValue,
      correctAnswer: q.correctAnswer,
      audioUrl: q.audioUrl,
      imageUrl: q.imageUrl,
      explanation: q.explanation,
    };
    await prisma.examQuestion.upsert({ where: { id }, update: data, create: { id, ...data } });
  }
  console.log(`  ✓ 題目 ${questions.length} 筆`);

  // 5) 示範使用者 + 20 週學習計畫
  await prisma.user.upsert({
    where: { id: DEMO_USER_ID },
    update: {},
    create: { id: DEMO_USER_ID, displayName: '示範小學員', level: 'KIDS' },
  });

  const plan = await prisma.studyPlan.upsert({
    where: { userId_level: { userId: DEMO_USER_ID, level: 'KIDS' } },
    update: {},
    create: { userId: DEMO_USER_ID, level: 'KIDS' },
  });

  for (const wk of curriculum) {
    const week = await prisma.studyWeek.upsert({
      where: { planId_weekNo: { planId: plan.id, weekNo: wk.weekNo } },
      update: { title: wk.title, theme: wk.theme ?? null, unlocked: wk.weekNo === 1 },
      create: {
        planId: plan.id,
        weekNo: wk.weekNo,
        title: wk.title,
        theme: wk.theme ?? null,
        unlocked: wk.weekNo === 1,
      },
    });

    for (let ti = 0; ti < wk.tasks.length; ti++) {
      const t = wk.tasks[ti];
      const taskId = `task_${plan.id}_${wk.weekNo}_${ti}`;
      await prisma.weeklyTask.upsert({
        where: { id: taskId },
        update: { skill: t.skill, title: t.title, targetCount: t.targetCount },
        create: {
          id: taskId,
          weekId: week.id,
          skill: t.skill,
          title: t.title,
          targetCount: t.targetCount,
        },
      });

      // 連結符合週次與題型的題目（join table 冪等）
      const matched = await prisma.examQuestion.findMany({
        where: { weekNo: wk.weekNo, type: { in: t.types } },
        select: { id: true },
      });
      if (matched.length > 0) {
        await prisma.weeklyTaskQuestion.createMany({
          data: matched.map((m) => ({ taskId, questionId: m.id })),
          skipDuplicates: true,
        });
      }
    }
  }
  console.log(`  ✓ 課程地圖 ${curriculum.length} 週（示範使用者已建立）`);

  console.log('✅ seed 完成');
}

main()
  .catch((e) => {
    console.error('❌ seed 失敗:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
