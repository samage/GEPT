import type { PhonemeBlock, PhonemeScore } from '@/types/content';

// 字母索引對齊演算法
// Azure 回傳「音素序列 + 分數」；DB 的 phonemeMapping 是「字母積木陣列」。
// 目標：輸出與前端積木陣列 index 1:1 對齊的分數，讓每塊積木都能上色。

export interface AzurePhonemeScoreInput {
  phoneme: string;
  accuracyScore: number;
}

// 粗估某積木的音素字串包含幾個音素單元（供比例分配）
function countPhonemeUnits(phoneme: string): number {
  if (!phoneme) return 1;
  // 去除重音/長音/送氣等附加符號與空白
  const cleaned = phoneme.replace(/[ˈˌːʰʲʷ\s.]/g, '');
  // 以 Array.from 正確處理代理對與組合字元，至少為 1
  return Math.max(1, Array.from(cleaned).length);
}

/**
 * 將 Azure 音素分數對齊回 phonemeMapping 積木，輸出 1:1 分數陣列。
 *
 * 策略：依各積木的「期望音素單元數」比例，將 Azure 音素序列切段分配，
 * 同一積木分到的多個音素分數取平均；最後一塊吃掉剩餘，確保不漏不重。
 */
export function alignPhonemeScores(
  blocks: PhonemeBlock[],
  azurePhonemes: AzurePhonemeScoreInput[],
): PhonemeScore[] {
  const n = blocks.length;
  if (n === 0) return [];

  const toScore = (i: number, score: number): PhonemeScore => ({
    index: i,
    text: blocks[i].text,
    phoneme: blocks[i].phoneme,
    score: Math.round(Math.max(0, Math.min(100, score))),
  });

  const m = azurePhonemes.length;
  if (m === 0) {
    return blocks.map((_, i) => toScore(i, 0));
  }

  const expected = blocks.map((b) => countPhonemeUnits(b.phoneme));
  const totalExpected = expected.reduce((a, b) => a + b, 0);

  const scores: number[] = new Array(n).fill(0);
  let cursor = 0;

  for (let i = 0; i < n; i++) {
    const target =
      i === n - 1
        ? m - cursor // 最後一塊吃掉剩餘音素
        : Math.round((expected[i] / totalExpected) * m);
    const take = Math.max(0, Math.min(target, m - cursor));

    let sum = 0;
    for (let k = 0; k < take; k++) {
      sum += azurePhonemes[cursor + k]?.accuracyScore ?? 0;
    }

    if (take > 0) {
      scores[i] = sum / take;
    } else {
      // 沒分到音素時，沿用鄰塊分數避免誤判 0 分
      scores[i] = i > 0 ? scores[i - 1] : azurePhonemes[0].accuracyScore;
    }
    cursor += take;
  }

  return scores.map((s, i) => toScore(i, s));
}
