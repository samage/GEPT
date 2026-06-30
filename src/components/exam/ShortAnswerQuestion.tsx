'use client';

import type { QuestionComponentProps } from './common';

export default function ShortAnswerQuestion({
  question,
  answer,
  onAnswerChange,
  locked,
  result,
}: QuestionComponentProps) {
  return (
    <div className="space-y-4">
      <p className="text-center text-2xl font-bold">{question.questionText}</p>
      <input
        type="text"
        value={answer}
        disabled={locked}
        onChange={(e) => onAnswerChange(e.target.value)}
        placeholder="在這裡打出你的答案"
        className="w-full rounded-kid border-2 border-gray-300 bg-white px-4 py-3 text-xl focus:border-sky focus:outline-none"
      />
      {result && (
        <p className="text-center text-lg">
          參考答案：<span className="font-extrabold text-grass">{result.correctAnswer}</span>
        </p>
      )}
    </div>
  );
}
