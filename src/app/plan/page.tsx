'use client';

import { useEffect, useState } from 'react';
import { DEMO_USER_ID, type StudyPlanDTO } from '@/lib/study-plan/curriculum';
import WeekMap from '@/components/plan/WeekMap';
import SkillRadar from '@/components/plan/SkillRadar';

export default function PlanPage() {
  const [plan, setPlan] = useState<StudyPlanDTO | null>(null);
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading');

  useEffect(() => {
    fetch(`/api/study-plan?userId=${DEMO_USER_ID}`)
      .then((r) => {
        if (!r.ok) throw new Error('fetch failed');
        return r.json();
      })
      .then((data: StudyPlanDTO) => {
        setPlan(data);
        setStatus('ok');
      })
      .catch(() => setStatus('error'));
  }, []);

  return (
    <div className="space-y-6">
      <section className="kid-card bg-gradient-to-br from-coral to-rose-300 text-white">
        <h1 className="text-3xl font-extrabold">🗺️ 我的 20 週學習計畫</h1>
        <p className="mt-2 text-lg">
          {plan ? (
            <>連續打卡 <span className="font-extrabold">{plan.streak}</span> 天，繼續加油！🔥</>
          ) : (
            '一週一週闖關，集滿四項能力的太陽 🌞'
          )}
        </p>
      </section>

      {status === 'loading' && (
        <div className="kid-card text-center text-gray-500">載入中…</div>
      )}

      {status === 'error' && (
        <div className="kid-card text-center text-gray-600">
          無法連到學習計畫資料。請先設定 <code>DATABASE_URL</code> 並執行{' '}
          <code>npm run db:migrate</code> 與 <code>npm run db:seed</code>。
        </div>
      )}

      {status === 'ok' && plan && (
        <>
          <section className="kid-card">
            <WeekMap weeks={plan.weeks} />
          </section>
          <section className="kid-card">
            <SkillRadar scores={plan.skillScores} />
          </section>
        </>
      )}
    </div>
  );
}
