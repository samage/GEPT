/**
 * 用生圖模型為單字產生插畫，存到 public/images/words/<word>.png，並把路徑寫回 words.json。
 * 機密：OPENAI_IMAGE_API_KEY 只從環境變數讀取。增量生成：已有 imageUrl 則略過。
 * 用法：npm run gen:images
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { WordsFileSchema, type WordEntry } from '../src/types/content';

const dataDir = join(__dirname, '..', 'prisma', 'data');
const wordsPath = join(dataDir, 'words.json');
const imagesDir = join(__dirname, '..', 'public', 'images', 'words');

const API_KEY = process.env.OPENAI_IMAGE_API_KEY;

async function generateImage(word: string): Promise<Buffer | null> {
  if (!API_KEY) return null;
  const prompt = `A cute, simple, colorful flat illustration of "${word}" for a children's English flashcard, white background, no text.`;
  try {
    const res = await globalThis.fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({ model: 'gpt-image-1', prompt, size: '512x512', n: 1 }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { data?: { b64_json?: string; url?: string }[] };
    const item = data.data?.[0];
    if (item?.b64_json) return Buffer.from(item.b64_json, 'base64');
    if (item?.url) {
      const img = await globalThis.fetch(item.url);
      return Buffer.from(await img.arrayBuffer());
    }
    return null;
  } catch {
    return null;
  }
}

async function main() {
  const words = WordsFileSchema.parse(JSON.parse(readFileSync(wordsPath, 'utf-8')));

  if (!API_KEY) {
    const missing = words.filter((w) => !w.imageUrl);
    console.log('ℹ️ 未設定 OPENAI_IMAGE_API_KEY，僅報告待生成清單（不呼叫 AI）：');
    missing.forEach((w) => console.log(`  - ${w.text}`));
    console.log(`共 ${missing.length} 字待補插畫。設定金鑰後重跑即可自動生成。`);
    return;
  }

  mkdirSync(imagesDir, { recursive: true });
  let updated = 0;
  const out: WordEntry[] = [];
  for (const w of words) {
    const rel = `/images/words/${w.text}.png`;
    if (w.imageUrl || existsSync(join(imagesDir, `${w.text}.png`))) {
      out.push({ ...w, imageUrl: w.imageUrl ?? rel });
      continue;
    }
    const buf = await generateImage(w.text);
    if (buf) {
      writeFileSync(join(imagesDir, `${w.text}.png`), buf);
      updated++;
      out.push({ ...w, imageUrl: rel });
    } else {
      out.push(w);
    }
  }

  writeFileSync(wordsPath, JSON.stringify(out, null, 2) + '\n', 'utf-8');
  console.log(`✅ 插畫生成完成：新增 ${updated} 張，存於 public/images/words。`);
}

void main();
