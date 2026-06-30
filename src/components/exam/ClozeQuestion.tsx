'use client';

import type { QuestionComponentProps } from './common';

// 寫作日記填空：題目含 ___，下方為單字庫
export default function ClozeQuestion({
  question,
  answer,
  onAnswerChange,
  locked,
  result,
}: QuestionComponentProps) {
  const options = (question.options as string[]) ?? [];
  const filled = question.questionText.replace(/_+/g, answer ? `【${answer}】` : '______');

  return (
    <div className="space-y-4">
      <p className="text-center text-xl font-bold leading-relaxed">📔 {filled}</p>
      <p className="text-center text-sm text-gray-500">選一個字填進空格</p>
      <div className="flex flex-wrap justify-center gap-3">
        {options.map((opt) => {
          const selected = answer === opt;
          const isAnswer = result && opt === result.correctAnswer;
          const wrongPick = result && selected && !result.isCorrect;
          return (
            <button
              key={opt}
              type="button"
              disabled={locked}
              onClick={() => onAnswerChange(opt)}
              className={[
                'kid-btn border-2',
                isAnswer
                  ? 'border-grass bg-grass/20'
                  : wrongPick
                    ? 'border-coral bg-coral/20'
                    : selected
                      ? 'border-sky bg-sky/20'
                      : 'border-gray-200 bg-white',
              ].join(' ')}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}
