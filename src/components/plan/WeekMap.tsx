'use client';

import Link from 'next/link';
import type { PlanWeek } from '@/lib/study-plan/curriculum';

export default function WeekMap({ weeks }: { weeks: PlanWeek[] }) {
  if (weeks.length === 0) {
    return (
      <div className="kid-card text-center text-gray-500">
        還沒有學習計畫，請先設定資料庫並執行 <code>npm run db:seed</code> 建立 20 週課程。
      </div>
    );
  }

  return (
    <div>
      <h3 className="mb-3 text-xl font-extrabold">🗺️ 20 週闖關地圖</h3>
      <div className="grid grid-cols-4 gap-3 sm:grid-cols-5">
        {weeks.map((w) => {
          const state = w.completed ? 'done' : w.unlocked ? 'open' : 'locked';
          const inner = (
            <div
              className={[
                'flex aspect-square flex-col items-center justify-center rounded-kid border-2 p-2 text-center shadow-sm transition',
                state === 'done'
                  ? 'border-grass bg-grass/20'
                  : state === 'open'
                    ? 'border-sky bg-white hover:-translate-y-1'
                    : 'border-gray-200 bg-gray-100 opacity-60',
              ].join(' ')}
            >
              <span className="text-2xl">
                {state === 'done' ? '✅' : state === 'open' ? '⭐' : '🔒'}
              </span>
              <span className="text-sm font-bold">第 {w.weekNo} 週</span>
              {state !== 'locked' && (
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
                  <div
                    className="h-full bg-sunny"
                    style={{ width: `${Math.round(w.progress * 100)}%` }}
                  />
                </div>
              )}
            </div>
          );

          return state === 'locked' ? (
            <div key={w.id} title={w.title}>
              {inner}
            </div>
          ) : (
            <Link key={w.id} href={`/exam?weekNo=${w.weekNo}`} title={w.title}>
              {inner}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
