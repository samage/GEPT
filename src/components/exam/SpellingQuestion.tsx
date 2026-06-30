'use client';

import { useMemo, useState } from 'react';
import type { QuestionComponentProps } from './common';

// 簡單洗牌（以題目 id 為種子，渲染穩定）
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

export default function SpellingQuestion({
  question,
  onAnswerChange,
  locked,
  result,
}: QuestionComponentProps) {
  const letters = useMemo(
    () => shuffle((question.options as string[]) ?? [], question.id),
    [question.id, question.options],
  );
  const [used, setUsed] = useState<number[]>([]);

  const built = used.map((i) => letters[i]).join('');

  const sync = (next: number[]) => {
    setUsed(next);
    onAnswerChange(next.map((i) => letters[i]).join(''));
  };

  return (
    <div className="space-y-5">
      <p className="text-center text-2xl font-bold">{question.questionText}</p>

      <div className="mx-auto flex min-h-[3.5rem] max-w-md flex-wrap items-center justify-center gap-1 rounded-kid border-2 border-dashed border-gray-300 bg-white p-3 text-3xl font-extrabold tracking-widest">
        {built || <span className="text-base font-normal text-gray-400">點下方字母拼出單字</span>}
      </div>

      {result && (
        <p className="text-center text-lg">
          正確拼法：<span className="font-extrabold text-grass">{result.correctAnswer}</span>
        </p>
      )}

      <div className="flex flex-wrap justify-center gap-2">
        {letters.map((ch, i) => (
          <button
            key={`${ch}-${i}`}
            type="button"
            disabled={locked || used.includes(i)}
            onClick={() => sync([...used, i])}
            className={[
              'h-12 w-12 rounded-kid border-2 text-2xl font-extrabold shadow-sm transition active:scale-95',
              used.includes(i)
                ? 'border-gray-200 bg-gray-100 text-gray-300'
                : 'border-sunny bg-sunny/20',
            ].join(' ')}
          >
            {ch}
          </button>
        ))}
      </div>

      {!locked && used.length > 0 && (
        <button
          type="button"
          onClick={() => sync(used.slice(0, -1))}
          className="kid-btn mx-auto block bg-gray-200 text-base"
        >
          ⌫ 刪除一個
        </button>
      )}
    </div>
  );
}
