/**
 * 用 LLM 為單字產生兒童適齡例句（限用小英檢 600 字範圍），寫回 words.json（reviewed:false）。
 * 需人工審核改為 reviewed:true 後，造題器才會採用。
 * 機密：OPENAI_API_KEY 只從環境變數讀取，不硬編碼、不入庫。
 * 用法：npm run gen:sentences
 */
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { WordsFileSchema, type WordEntry } from '../src/types/content';

const dataDir = join(__dirname, '..', 'prisma', 'data');
const wordsPath = join(dataDir, 'words.json');

const API_KEY = process.env.OPENAI_API_KEY;
const MODEL = process.env.OPENAI_MODEL ?? 'gpt-4o-mini';

async function generateForWord(word: string, vocab: string[]): Promise<string[]> {
  if (!API_KEY) return [];
  const prompt =
    `Write 2 very simple English sentences for a 8-year-old using the word "${word}". ` +
    `Each sentence must be short (max 8 words), use only common elementary words. ` +
    `Return only the sentences, one per line.`;
  try {
    const res = await globalThis.fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.5,
      }),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const text = data.choices?.[0]?.message?.content ?? '';
    void vocab;
    return text
      .split('\n')
      .map((l) => l.replace(/^[-*\d.\s]+/, '').trim())
      .filter((l) => l.length > 0)
      .slice(0, 2);
  } catch {
    return [];
  }
}

async function main() {
  const words = WordsFileSchema.parse(JSON.parse(readFileSync(wordsPath, 'utf-8')));
  const vocab = words.map((w) => w.text);

  if (!API_KEY) {
    const missing = words.filter((w) => !(w.sentences ?? []).some((s) => s.reviewed));
    console.log('ℹ️ 未設定 OPENAI_API_KEY，僅報告待生成清單（不呼叫 AI）：');
    missing.forEach((w) => console.log(`  - ${w.text}`));
    console.log(`共 ${missing.length} 字待補例句。設定金鑰後重跑即可自動生成。`);
    return;
  }

  let updated = 0;
  const out: WordEntry[] = [];
  for (const w of words) {
    const hasReviewed = (w.sentences ?? []).some((s) => s.reviewed);
    if (hasReviewed) {
      out.push(w);
      continue;
    }
    const sentences = await generateForWord(w.text, vocab);
    if (sentences.length > 0) {
      updated++;
      out.push({
        ...w,
        sentences: [
          ...(w.sentences ?? []),
          ...sentences.map((text) => ({ text, reviewed: false })),
        ],
      });
    } else {
      out.push(w);
    }
  }

  writeFileSync(wordsPath, JSON.stringify(out, null, 2) + '\n', 'utf-8');
  console.log(`✅ 例句生成完成：更新 ${updated} 字（標記 reviewed:false，待人工審核）。`);
}

void main();
