'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { QuestionType } from '@/types/content';
import { speak } from '@/lib/audio/tts';
import type { ExamQuestionDTO, GradeResult } from '@/lib/exam/types';
import type { SkillSummary } from '@/lib/scoring/suns';
import { describeSuns } from '@/lib/scoring/suns';
import type { QuestionComponentProps } from './common';
import ListeningImageQuestion from './ListeningImageQuestion';
import TrueFalseQuestion from './TrueFalseQuestion';
import MatchingQuestion from './MatchingQuestion';
import MultipleChoiceQuestion from './MultipleChoiceQuestion';
import SpellingQuestion from './SpellingQuestion';
import ClozeQuestion from './ClozeQuestion';
import ShortAnswerQuestion from './ShortAnswerQuestion';
import ReorderQuestion from './ReorderQuestion';
import SpeakingPromptQuestion from './SpeakingPromptQuestion';

const REGISTRY: Record<QuestionType, React.ComponentType<QuestionComponentProps>> = {
  LISTENING_IMAGE: ListeningImageQuestion,
  LISTENING_TF: TrueFalseQuestion,
  READING_TF: TrueFalseQuestion,
  MATCHING: MatchingQuestion,
  MULTIPLE_CHOICE: MultipleChoiceQuestion,
  SPELLING: SpellingQuestion,
  WRITING_CLOZE: ClozeQuestion,
  SHORT_ANSWER: ShortAnswerQuestion,
  WRITING_REORDER: ReorderQuestion,
  SPEAKING_READ_ALOUD: SpeakingPromptQuestion,
  SPEAKING_PICTURE: SpeakingPromptQuestion,
};

interface ExamRunnerProps {
  questions: ExamQuestionDTO[];
  userId?: string;
  onFinished?: (summary: SkillSummary[]) => void;
}

export default function ExamRunner({ questions, userId, onFinished }: ExamRunnerProps) {
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [result, setResult] = useState<GradeResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [finished, setFinished] = useState(false);
  const [summaries, setSummaries] = useState<SkillSummary[]>([]);

  const current = questions[index];
  const Component = current ? REGISTRY[current.type] : null;
  const locked = result !== null;

  // 聽力題進場自動播放
  useEffect(() => {
    if (current && (current.type === 'LISTENING_IMAGE' || current.type === 'LISTENING_TF')) {
      speak(current.questionText);
    }
  }, [current]);

  const submit = useCallback(async () => {
    if (!current || !answer || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/exam/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, answers: [{ questionId: current.id, answer }] }),
      });
      const data = await res.json();
      const r: GradeResult | undefined = data.results?.[0];
      if (r) {
        setResult(r);
        if (r.isCorrect) {
          setCorrectCount((n) => n + 1);
          speak('Great job!');
        }
      }
      if (Array.isArray(data.skillSummaries) && data.skillSummaries.length > 0) {
        setSummaries(data.skillSummaries);
      }
    } finally {
      setSubmitting(false);
    }
  }, [current, answer, submitting, userId]);

  const next = useCallback(() => {
    if (index + 1 >= questions.length) {
      setFinished(true);
      onFinished?.(summaries);
      return;
    }
    setIndex((i) => i + 1);
    setAnswer('');
    setResult(null);
  }, [index, questions.length, onFinished, summaries]);

  if (questions.length === 0) {
    return (
      <div className="kid-card text-center text-lg text-gray-500">
        這個範圍還沒有題目，先去「發音積木」練習，或稍後再來 🌱
      </div>
    );
  }

  if (finished) {
    const score = Math.round((correctCount / questions.length) * 100);
    return (
      <div className="kid-card space-y-4 text-center">
        <h2 className="text-3xl font-extrabold">🎉 練習完成！</h2>
        <p className="text-2xl">
          答對 <span className="font-extrabold text-grass">{correctCount}</span> / {questions.length}（{score} 分）
        </p>
        {summaries.length > 0 && (
          <div className="space-y-2">
            {summaries.map((s) => (
              <div key={s.skill} className="flex items-center justify-center gap-2 text-lg">
                <span className="font-bold">{skillLabel(s.skill)}</span>
                <span>{'🌞'.repeat(s.suns)}{'·'.repeat(5 - s.suns)}</span>
                <span className="text-sm text-gray-500">{describeSuns(s.suns)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between text-sm font-bold text-gray-500">
        <span>第 {index + 1} / {questions.length} 題</span>
        <span>{skillLabel(current.skill)}・{typeLabel(current.type)}</span>
      </div>

      <div className="h-3 w-full overflow-hidden rounded-full bg-gray-200">
        <div
          className="h-full bg-grass transition-all"
          style={{ width: `${((index + (locked ? 1 : 0)) / questions.length) * 100}%` }}
        />
      </div>

      <div className="kid-card">
        {Component && (
          <Component
            question={current}
            answer={answer}
            onAnswerChange={(a) => !locked && setAnswer(a)}
            locked={locked}
            result={result ?? undefined}
          />
        )}
      </div>

      {result && (
        <div
          className={[
            'kid-card text-center text-xl font-bold',
            result.isCorrect ? 'bg-grass/15 text-green-800' : 'bg-coral/15 text-red-700',
          ].join(' ')}
        >
          {result.isCorrect ? '✅ 答對了！' : '❌ 再接再厲！'}
          {result.explanation && (
            <p className="mt-2 text-base font-normal text-gray-600">{result.explanation}</p>
          )}
        </div>
      )}

      <div className="flex justify-center">
        {!locked ? (
          <button
            type="button"
            disabled={!answer || submitting}
            onClick={submit}
            className="kid-btn bg-sky text-white disabled:opacity-40"
          >
            {submitting ? '批改中…' : '送出答案'}
          </button>
        ) : (
          <button type="button" onClick={next} className="kid-btn bg-grass text-white">
            {index + 1 >= questions.length ? '看成績 🎉' : '下一題 →'}
          </button>
        )}
      </div>
    </div>
  );
}

function skillLabel(skill: string): string {
  return { LISTENING: '聽力', READING: '閱讀', WRITING: '寫作', SPEAKING: '口說' }[skill] ?? skill;
}

function typeLabel(type: string): string {
  const map: Record<string, string> = {
    LISTENING_IMAGE: '聽音選圖',
    LISTENING_TF: '聽力是非',
    READING_TF: '閱讀是非',
    MATCHING: '配合題',
    MULTIPLE_CHOICE: '選擇題',
    SPELLING: '拼字',
    WRITING_CLOZE: '填空',
    SHORT_ANSWER: '短答',
    WRITING_REORDER: '句子重組',
    SPEAKING_READ_ALOUD: '朗讀',
    SPEAKING_PICTURE: '看圖說話',
  };
  return map[type] ?? type;
}
