'use client';

import type { PhonemeBlock, PhonemeScore } from '@/types/content';

interface PhonicsBlockProps {
  blocks: PhonemeBlock[];
  scores?: PhonemeScore[]; // 與 blocks 1:1 對齊（任務一回傳）
}

// 依分數決定積木顏色（兒童友善的紅黃綠回饋）
function scoreColor(score: number | undefined): string {
  if (score === undefined) return 'bg-white border-gray-300 text-gray-800';
  if (score >= 80) return 'bg-grass/20 border-grass text-green-800';
  if (score >= 50) return 'bg-sunny/30 border-sunny text-amber-800';
  return 'bg-coral/20 border-coral text-red-700';
}

export default function PhonicsBlock({ blocks, scores }: PhonicsBlockProps) {
  return (
    <div className="flex flex-wrap items-end justify-center gap-2 sm:gap-3">
      {blocks.map((block, i) => {
        const score = scores?.[i]?.score;
        const stressed = block.isStressed;
        return (
          <div key={`${block.text}-${i}`} className="flex flex-col items-center">
            {stressed && (
              <span className="mb-1 text-lg font-extrabold text-coral" aria-label="重音節">
                ★
              </span>
            )}
            <div
              className={[
                'flex flex-col items-center justify-center rounded-kid border-2 px-3 py-2 shadow-sm transition',
                scoreColor(score),
                stressed
                  ? 'border-4 scale-110 px-4 py-3 text-3xl font-extrabold'
                  : 'text-2xl font-bold',
              ].join(' ')}
              title={block.phoneme}
            >
              <span>{block.text}</span>
              <span className="mt-0.5 text-xs font-normal opacity-70">/{block.phoneme}/</span>
            </div>
            {score !== undefined && (
              <span className="mt-1 text-sm font-bold">{score}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
