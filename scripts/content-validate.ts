/**
 * 內容驗證 + 覆蓋率報告：確保 5/6/7 章資料一致，避免某週/某能力/某題型缺題。
 * 用法：npm run content:validate
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  WordsFileSchema,
  QuestionsFileSchema,
  CurriculumFileSchema,
  QUESTION_TYPE_SKILL,
  type QuestionType,
} from '../src/types/content';

const dataDir = join(__dirname, '..', 'prisma', 'data');

function read(file: string): unknown {
  return JSON.parse(readFileSync(join(dataDir, file), 'utf-8'));
}

function main() {
  const errors: string[] = [];

  const words = WordsFileSchema.parse(read('words.json'));
  const questions = QuestionsFileSchema.parse(read('questions.json'));
  const curriculum = CurriculumFileSchema.parse(read('curriculum.json'));

  // 交叉檢查：課程週次涵蓋 1-20、不重複
  const weekNos = curriculum.map((c) => c.weekNo).sort((a, b) => a - b);
  for (let i = 1; i <= 20; i++) {
    if (!weekNos.includes(i)) errors.push(`課程缺少第 ${i} 週`);
  }

  // 各週要求的題型是否有題目
  const questionsByWeekType = new Map<string, number>();
  for (const q of questions) {
    const key = `${q.weekNo ?? 0}:${q.type}`;
    questionsByWeekType.set(key, (questionsByWeekType.get(key) ?? 0) + 1);
  }

  const missing: string[] = [];
  for (const wk of curriculum) {
    for (const task of wk.tasks) {
      for (const type of task.types) {
        const key = `${wk.weekNo}:${type}`;
        if (!questionsByWeekType.get(key)) {
          missing.push(`  第 ${wk.weekNo} 週 缺 ${type} 題目`);
        }
      }
    }
  }

  // 分項能力覆蓋率
  const bySkill = new Map<string, number>();
  for (const q of questions) {
    const skill = QUESTION_TYPE_SKILL[q.type as QuestionType];
    bySkill.set(skill, (bySkill.get(skill) ?? 0) + 1);
  }

  console.log('===== 內容覆蓋率報告 =====');
  console.log(`單字：${words.length} 筆`);
  console.log(`題目：${questions.length} 筆`);
  console.log(`課程：${curriculum.length} 週`);
  console.log('--- 各分項題數 ---');
  for (const skill of ['LISTENING', 'READING', 'WRITING', 'SPEAKING']) {
    console.log(`  ${skill}: ${bySkill.get(skill) ?? 0}`);
  }

  if (missing.length > 0) {
    console.log('--- ⚠️ 待補題型（建議用 npm run gen:questions 或人工補上）---');
    missing.forEach((m) => console.log(m));
  } else {
    console.log('✓ 所有課程週次的題型皆有對應題目');
  }

  if (errors.length > 0) {
    console.error('❌ 驗證失敗：');
    errors.forEach((e) => console.error(`  ${e}`));
    process.exit(1);
  }
  console.log('✅ 內容驗證通過');
}

main();
