/**
 * 由已審核的單字/例句批次造題，合併進 questions.json（依 type+questionText 去重）。
 * 用法：npm run gen:questions [-- TYPE1 TYPE2 ...]
 *   未指定題型時，產生所有支援的題型。
 */
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import {
  WordsFileSchema,
  QuestionsFileSchema,
  QuestionTypeSchema,
  type QuestionEntry,
  type QuestionType,
} from '../src/types/content';
import { generateQuestions, SUPPORTED_GENERATOR_TYPES } from '../src/lib/exam/generators';

const dataDir = join(__dirname, '..', 'prisma', 'data');
const wordsPath = join(dataDir, 'words.json');
const questionsPath = join(dataDir, 'questions.json');

function main() {
  const cliTypes = process.argv
    .slice(2)
    .map((t) => QuestionTypeSchema.safeParse(t))
    .filter((r) => r.success)
    .map((r) => (r as { data: QuestionType }).data);

  const types = cliTypes.length > 0 ? cliTypes : SUPPORTED_GENERATOR_TYPES;

  const words = WordsFileSchema.parse(JSON.parse(readFileSync(wordsPath, 'utf-8')));
  const existing = QuestionsFileSchema.parse(JSON.parse(readFileSync(questionsPath, 'utf-8')));

  const seen = new Set(existing.map((q) => `${q.type}|${q.questionText}`));
  const generated = generateQuestions(words, types);

  let added = 0;
  const merged: QuestionEntry[] = [...existing];
  for (const q of generated) {
    const key = `${q.type}|${q.questionText}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(q);
    added++;
  }

  writeFileSync(questionsPath, JSON.stringify(merged, null, 2) + '\n', 'utf-8');
  console.log(`✅ 造題完成：新增 ${added} 題（題型：${types.join(', ')}），總計 ${merged.length} 題。`);
}

main();
