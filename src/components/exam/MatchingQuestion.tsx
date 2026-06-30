'use client';

import { useMemo, useState } from 'react';
import type { MatchPair } from '@/lib/exam/types';
import type { QuestionComponentProps } from './common';

function shuffle<T>(arr: T[], seed: string): T[] {
  const a = [...arr];
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  for (let i = a.length - 1; i > 0; i--) {
    h = (h * 1103515245 + 12345) & 0x7fffffff;
    const j = h % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// 配合題：左邊單字，右邊圖片(下拉選)。答案以 JSON {left:right} 表示。
export default function MatchingQuestion({
  question,
  onAnswerChange,
  locked,
  result,
}: QuestionComponentProps) {
  const pairs = (question.options as MatchPair[]) ?? [];
  const rights = useMemo(
    () => shuffle(pairs.map((p) => p.right), question.id),
    [pairs, question.id],
  );
  const [picks, setPicks] = useState<Record<string, string>>({});

  const correctMap = useMemo<Record<string, string>>(() => {
    if (!result) return {};
    try {
      return JSON.parse(result.correctAnswer);
    } catch {
      return {};
    }
  }, [result]);

  const choose = (left: string, right: string) => {
    const next = { ...picks, [left]: right };
    setPicks(next);
    onAnswerChange(JSON.stringify(next));
  };

  return (
    <div className="space-y-4">
      <p className="text-center text-2xl font-bold">{question.questionText}</p>
      <div className="space-y-3">
        {pairs.map((p) => {
          const picked = picks[p.left] ?? '';
          const correct = result && correctMap[p.left] === picked;
          return (
            <div
              key={p.left}
              className={[
                'flex items-center justify-between gap-3 rounded-kid border-2 bg-white px-4 py-3',
                result ? (correct ? 'border-grass' : 'border-coral') : 'border-gray-200',
              ].join(' ')}
            >
              <span className="text-xl font-bold">{p.left}</span>
              <select
                value={picked}
                disabled={locked}
                onChange={(e) => choose(p.left, e.target.value)}
                className="rounded-kid border-2 border-gray-300 bg-white px-3 py-2 text-2xl"
              >
                <option value="">？</option>
                {rights.map((r, i) => (
                  <option key={`${r}-${i}`} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
          );
        })}
      </div>
    </div>
  );
}
