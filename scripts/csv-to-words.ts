/**
 * 把 CSV 批次匯入轉成 words.json 條目（合併、去重）。
 * CSV 欄位（首列為標題）：text,ipa,category,weekNo
 * 用法：npm run csv:words -- path/to/words.csv
 * 之後請接著跑 npm run content:phonics 自動補 phonemeMapping。
 */
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { type PhonemeBlock } from '../src/types/content';

const dataDir = join(__dirname, '..', 'prisma', 'data');
const wordsPath = join(dataDir, 'words.json');

interface RawWord {
  text: string;
  ipa?: string;
  category: string;
  weekNo?: number;
  phonemeMapping?: PhonemeBlock[];
}

function parseCsv(content: string): RawWord[] {
  const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];
  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
  const idx = (name: string) => headers.indexOf(name);

  return lines.slice(1).map((line) => {
    const cols = line.split(',').map((c) => c.trim());
    const weekRaw = cols[idx('weekno')];
    return {
      text: cols[idx('text')],
      ipa: cols[idx('ipa')] || undefined,
      category: cols[idx('category')] || 'SHORT_VOWELS',
      weekNo: weekRaw ? Number(weekRaw) : undefined,
    };
  });
}

function main() {
  const csvPath = process.argv[2];
  if (!csvPath) {
    console.error('❌ 請提供 CSV 路徑：npm run csv:words -- path/to/words.csv');
    process.exit(1);
  }

  const incoming = parseCsv(readFileSync(csvPath, 'utf-8')).filter((w) => w.text);
  const existing = JSON.parse(readFileSync(wordsPath, 'utf-8')) as RawWord[];
  const byText = new Map<string, RawWord>(existing.map((w) => [w.text.toLowerCase(), w]));

  let added = 0;
  for (const w of incoming) {
    const key = w.text.toLowerCase();
    if (byText.has(key)) {
      const prev = byText.get(key)!;
      byText.set(key, { ...prev, ...w, phonemeMapping: prev.phonemeMapping });
    } else {
      byText.set(key, w);
      added++;
    }
  }

  const merged = [...byText.values()];
  writeFileSync(wordsPath, JSON.stringify(merged, null, 2) + '\n', 'utf-8');
  console.log(`✅ 匯入完成：新增 ${added} 字，總計 ${merged.length} 字。`);
  console.log('👉 接著請執行：npm run content:phonics 補上 phonemeMapping');
}

main();
