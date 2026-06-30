/**
 * 絞肉機批次工具：為 words.json 中尚未切片的單字自動產生 phonemeMapping。
 * 已有 phonemeMapping 的單字會被保留（不覆蓋人工成果）。
 * 用法：npm run content:phonics
 */
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { sliceWord } from '../src/lib/phonics/slicer';
import { WordsFileSchema, type PhonemeBlock } from '../src/types/content';

const dataDir = join(__dirname, '..', 'prisma', 'data');
const wordsPath = join(dataDir, 'words.json');
const overridesPath = join(dataDir, 'phonics-overrides.json');

interface RawWord {
  text: string;
  ipa?: string;
  category: string;
  weekNo?: number;
  phonemeMapping?: PhonemeBlock[];
  sentences?: unknown;
  imageUrl?: string;
  audioUrl?: string;
}

const raw = JSON.parse(readFileSync(wordsPath, 'utf-8')) as RawWord[];
const overrides = JSON.parse(readFileSync(overridesPath, 'utf-8')) as Record<string, PhonemeBlock[]>;

let filled = 0;
const out = raw.map((w) => {
  if (w.phonemeMapping && w.phonemeMapping.length > 0) return w;
  const override = overrides[w.text.toLowerCase()];
  const phonemeMapping = sliceWord(w.text, { ipa: w.ipa, override });
  filled++;
  return { ...w, phonemeMapping };
});

// 補完後仍須通過正式 schema 驗證
const validated = WordsFileSchema.parse(out);
writeFileSync(wordsPath, JSON.stringify(validated, null, 2) + '\n', 'utf-8');

console.log(`✅ slicer 完成：共 ${validated.length} 字，新切片 ${filled} 筆。`);
