/**
 * 用 Azure Speech TTS 為單字產生美式發音示範音檔，存到 public/audio/words/<word>.wav。
 * 重用既有 Azure 相依；機密只從環境變數讀取。增量生成：已有檔案則略過。
 * 用法：npm run gen:audio
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import * as sdk from 'microsoft-cognitiveservices-speech-sdk';
import { WordsFileSchema, type WordEntry } from '../src/types/content';

const dataDir = join(__dirname, '..', 'prisma', 'data');
const wordsPath = join(dataDir, 'words.json');
const audioDir = join(__dirname, '..', 'public', 'audio', 'words');

const KEY = process.env.AZURE_SPEECH_KEY;
const REGION = process.env.AZURE_SPEECH_REGION;

function synth(text: string, outPath: string): Promise<boolean> {
  return new Promise((resolve) => {
    if (!KEY || !REGION) return resolve(false);
    const speechConfig = sdk.SpeechConfig.fromSubscription(KEY, REGION);
    speechConfig.speechSynthesisVoiceName = 'en-US-JennyNeural';
    const audioConfig = sdk.AudioConfig.fromAudioFileOutput(outPath);
    const synthesizer = new sdk.SpeechSynthesizer(speechConfig, audioConfig);
    synthesizer.speakTextAsync(
      text,
      (result) => {
        synthesizer.close();
        resolve(result.reason === sdk.ResultReason.SynthesizingAudioCompleted);
      },
      () => {
        synthesizer.close();
        resolve(false);
      },
    );
  });
}

async function main() {
  const words = WordsFileSchema.parse(JSON.parse(readFileSync(wordsPath, 'utf-8')));

  if (!KEY || !REGION) {
    const missing = words.filter((w) => !w.audioUrl);
    console.log('ℹ️ 未設定 AZURE_SPEECH_KEY / REGION，僅報告待生成清單（不呼叫 Azure）：');
    missing.forEach((w) => console.log(`  - ${w.text}`));
    console.log(`共 ${missing.length} 字待補示範音。設定金鑰後重跑即可自動生成。`);
    return;
  }

  mkdirSync(audioDir, { recursive: true });
  let updated = 0;
  const out: WordEntry[] = [];
  for (const w of words) {
    const rel = `/audio/words/${w.text}.wav`;
    const filePath = join(audioDir, `${w.text}.wav`);
    if (w.audioUrl || existsSync(filePath)) {
      out.push({ ...w, audioUrl: w.audioUrl ?? rel });
      continue;
    }
    const ok = await synth(w.text, filePath);
    if (ok) {
      updated++;
      out.push({ ...w, audioUrl: rel });
    } else {
      out.push(w);
    }
  }

  writeFileSync(wordsPath, JSON.stringify(out, null, 2) + '\n', 'utf-8');
  console.log(`✅ 示範音生成完成：新增 ${updated} 檔，存於 public/audio/words。`);
}

void main();
