/**
 * 從官方「小學英檢」參考字表 API 匯入單字。
 * 來源：https://api.geptkids.org.tw/api/alphabeticalOrder?val=A..Z
 * 著作權屬財團法人語言訓練測驗中心，僅供個人學習使用，請勿原樣公開散布或商用。
 *
 * 產出：
 *   1) prisma/data/gept-wordlist.json   — 原始參考字表（voc/中文/詞性/主題/音檔連結）
 *   2) 併入 prisma/data/words.json       — 新增 text + 主題 category + audioUrl + chinese + pos
 *
 * 用法：npm run import:geptkids
 * 之後請接著：npm run content:phonics（補 phonemeMapping）→ content:validate → db:seed
 */
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const dataDir = join(__dirname, '..', 'prisma', 'data');
const wordsPath = join(dataDir, 'words.json');
const rawPath = join(dataDir, 'gept-wordlist.json');

const API = 'https://api.geptkids.org.tw/api/alphabeticalOrder?val=';
const BLOB = 'https://lttcblob.blob.core.windows.net/kidsgeptwordlistmp3/';
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

interface ApiWord {
  voc: string;
  category_E: string;
  category_C: string;
  POS: string;
  Chinese: string;
  remarks: string | null;
  mp3_file: string;
  category_type: string;
}

interface RawWord {
  text: string;
  ipa?: string;
  category: string;
  weekNo?: number;
  phonemeMapping?: unknown;
  sentences?: unknown;
  imageUrl?: string;
  audioUrl?: string;
  chinese?: string;
  pos?: string;
}

async function fetchLetter(letter: string): Promise<ApiWord[]> {
  const res = await fetch(API + letter, { headers: { accept: 'application/json' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = (await res.json()) as ApiWord[];
  return Array.isArray(data) ? data : [];
}

async function main() {
  console.log('🌐 開始抓取官方字表 A–Z …');
  const all: ApiWord[] = [];
  for (const letter of LETTERS) {
    try {
      const arr = await fetchLetter(letter);
      all.push(...arr);
      console.log(`  ${letter}: ${arr.length} 字`);
    } catch (e) {
      console.error(`  ${letter} 失敗：${(e as Error).message}`);
    }
    await new Promise((r) => setTimeout(r, 150)); // 禮貌性間隔
  }

  // 以 voc（小寫）去重
  const byVoc = new Map<string, ApiWord>();
  for (const w of all) {
    const key = (w.voc ?? '').trim().toLowerCase();
    if (!key) continue;
    if (!byVoc.has(key)) byVoc.set(key, w);
  }
  const unique = [...byVoc.values()];

  // 1) 原始參考字表
  const raw = unique.map((w) => ({
    voc: w.voc,
    chinese: w.Chinese,
    pos: w.POS,
    categoryE: w.category_E,
    categoryC: w.category_C,
    categoryType: w.category_type,
    audioUrl: BLOB + w.mp3_file,
    remarks: w.remarks ?? undefined,
  }));
  writeFileSync(rawPath, JSON.stringify(raw, null, 2) + '\n', 'utf-8');
  console.log(`📦 原始字表已存：data/gept-wordlist.json（${raw.length} 字）`);

  // 2) 併入 words.json（保留既有人工成果）
  const existing = JSON.parse(readFileSync(wordsPath, 'utf-8')) as RawWord[];
  const byText = new Map<string, RawWord>(existing.map((w) => [w.text.toLowerCase(), w]));

  let added = 0;
  let enriched = 0;
  for (const w of unique) {
    const key = w.voc.trim().toLowerCase();
    const audioUrl = BLOB + w.mp3_file;
    if (byText.has(key)) {
      const prev = byText.get(key)!;
      const next: RawWord = {
        ...prev,
        chinese: prev.chinese ?? w.Chinese,
        pos: prev.pos ?? w.POS,
        audioUrl: prev.audioUrl ?? audioUrl,
      };
      byText.set(key, next);
      enriched++;
    } else {
      byText.set(key, {
        text: w.voc,
        category: w.category_E, // 主題分類（seed 會自動建立對應 PhonicsCategory）
        chinese: w.Chinese,
        pos: w.POS,
        audioUrl,
        // phonemeMapping 留給 content:phonics 自動補
      });
      added++;
    }
  }

  const merged = [...byText.values()];
  writeFileSync(wordsPath, JSON.stringify(merged, null, 2) + '\n', 'utf-8');
  console.log(`✅ 併入 words.json：新增 ${added} 字、補充 ${enriched} 字，總計 ${merged.length} 字。`);
  console.log('👉 接著執行：npm run content:phonics → npm run content:validate');
}

main().catch((e) => {
  console.error('❌ 匯入失敗：', e);
  process.exit(1);
});
