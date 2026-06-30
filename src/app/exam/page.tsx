'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import ExamRunner from '@/components/exam/ExamRunner';
import type { ExamQuestionDTO } from '@/lib/exam/types';
import type { Skill } from '@/types/content';
import { DEMO_USER_ID } from '@/lib/study-plan/curriculum';

const SKILL_BUTTONS: { skill?: Skill; label: string; emoji: string }[] = [
  { label: '全部', emoji: '🎯' },
  { skill: 'LISTENING', label: '聽力', emoji: '👂' },
  { skill: 'READING', label: '閱讀', emoji: '📖' },
  { skill: 'WRITING', label: '寫作', emoji: '✏️' },
  { skill: 'SPEAKING', label: '口說', emoji: '🗣️' },
];

function ExamInner() {
  const params = useSearchParams();
  const weekNo = params.get('weekNo');

  const [questions, setQuestions] = useState<ExamQuestionDTO[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [runKey, setRunKey] = useState(0);
  const [error, setError] = useState('');

  const load = useCallback(async (query: string) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/exam/questions?${query}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setQuestions(data.questions ?? []);
      setRunKey((k) => k + 1);
    } catch {
      setError('無法載入題目，請先設定資料庫並執行 npm run db:seed。');
    } finally {
      setLoading(false);
    }
  }, []);

  // 由學習計畫地圖點進來（帶 weekNo）時自動載入該週題目
  useEffect(() => {
    if (weekNo) load(`weekNo=${weekNo}&limit=30`);
  }, [weekNo, load]);

  return (
    <div className="space-y-6">
      <section className="kid-card bg-gradient-to-br from-sky to-blue-300 text-center text-white">
        <h1 className="text-3xl font-extrabold">📝 英檢模擬練習</h1>
        <p className="mt-1 text-lg">
          {weekNo ? `第 ${weekNo} 週課程練習` : '選一個項目開始練習吧！'}
        </p>
      </section>

      {!weekNo && (
        <div className="flex flex-wrap justify-center gap-3">
          {SKILL_BUTTONS.map((b) => (
            <button
              key={b.label}
              type="button"
              onClick={() => load(b.skill ? `skill=${b.skill}&limit=20` : 'limit=20')}
              className="kid-btn bg-white shadow"
            >
              {b.emoji} {b.label}
            </button>
          ))}
        </div>
      )}

      {loading && <div className="kid-card text-center text-gray-500">載入題目中…</div>}
      {error && <div className="kid-card text-center text-gray-600">{error}</div>}

      {questions && !loading && (
        <ExamRunner key={runKey} questions={questions} userId={DEMO_USER_ID} />
      )}
    </div>
  );
}

export default function ExamPage() {
  return (
    <Suspense fallback={<div className="kid-card text-center text-gray-500">載入中…</div>}>
      <ExamInner />
    </Suspense>
  );
}
