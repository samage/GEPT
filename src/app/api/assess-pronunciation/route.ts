import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import {
  assessPronunciation,
  AzureNotConfiguredError,
  isAzureConfigured,
} from '@/lib/azure/speech';
import { alignPhonemeScores } from '@/lib/azure/phoneme-align';
import { PhonemeBlockSchema, type PhonemeBlock, type PhonemeScore } from '@/types/content';

// Speech SDK 需要 Node.js runtime
export const runtime = 'nodejs';

const MAX_AUDIO_BYTES = 2_000_000; // 2MB 上限，避免濫用
const InputSchema = z.object({
  wordText: z.string().min(1).max(64),
  userId: z.string().max(128).optional(),
});

export async function POST(req: NextRequest) {
  // 1) 解析輸入（multipart/form-data: audio + wordText + userId）
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid form data.' }, { status: 400 });
  }

  const parsed = InputSchema.safeParse({
    wordText: form.get('wordText'),
    userId: form.get('userId') ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input.' }, { status: 400 });
  }
  const { wordText, userId } = parsed.data;

  // 2) 防禦型限流：每分鐘每 User/IP 最多 20 次
  const limitKey = userId || getClientIp(req.headers);
  const limit = await checkRateLimit(`assess:${limitKey}`);
  if (!limit.success) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429, headers: { 'Retry-After': '60' } },
    );
  }

  // 3) 取得音訊檔
  const audio = form.get('audio');
  if (!(audio instanceof Blob)) {
    return NextResponse.json({ error: 'Missing audio file.' }, { status: 400 });
  }
  if (audio.size === 0 || audio.size > MAX_AUDIO_BYTES) {
    return NextResponse.json({ error: 'Audio size out of range.' }, { status: 400 });
  }

  // 4) 查單字取得 phonemeMapping（參數化查詢，無字串拼接）
  const word = await prisma.word.findUnique({ where: { text: wordText } });
  if (!word) {
    return NextResponse.json({ error: 'Word not found.' }, { status: 404 });
  }

  const blocksResult = z.array(PhonemeBlockSchema).safeParse(word.phonemeMapping);
  const blocks: PhonemeBlock[] = blocksResult.success ? blocksResult.data : [];

  // 5) Azure 未設定時，回傳明確 503（前端顯示友善訊息）
  if (!isAzureConfigured()) {
    return NextResponse.json(
      {
        error: 'Pronunciation service is not configured.',
        code: 'AZURE_SPEECH_NOT_CONFIGURED',
        blocks,
      },
      { status: 503 },
    );
  }

  // 6) 呼叫 Azure 評測並做字母索引對齊
  try {
    const buffer = Buffer.from(await audio.arrayBuffer());
    const result = await assessPronunciation(buffer, word.text);
    const scores: PhonemeScore[] = alignPhonemeScores(blocks, result.phonemes);

    // 記錄一次口說作答（若有 userId）
    if (userId) {
      await prisma.attempt
        .create({
          data: {
            userId,
            skill: 'SPEAKING',
            isCorrect: result.pronunciationScore >= 60,
            score: result.pronunciationScore,
            detail: { wordText, scores } as unknown as Prisma.InputJsonValue,
          },
        })
        .catch(() => undefined); // 紀錄失敗不影響評測回傳
    }

    return NextResponse.json({
      word: word.text,
      recognizedText: result.recognizedText,
      overall: {
        accuracy: Math.round(result.accuracyScore),
        fluency: Math.round(result.fluencyScore),
        completeness: Math.round(result.completenessScore),
        pronunciation: Math.round(result.pronunciationScore),
      },
      scores, // 與前端積木陣列 index 1:1 對齊
      remaining: limit.remaining,
    });
  } catch (err) {
    if (err instanceof AzureNotConfiguredError) {
      return NextResponse.json(
        { error: 'Pronunciation service is not configured.', blocks },
        { status: 503 },
      );
    }
    return NextResponse.json(
      { error: 'Pronunciation assessment failed.' },
      { status: 502 },
    );
  }
}
