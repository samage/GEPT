'use client';

import type { QuestionComponentProps } from './common';

export default function MultipleChoiceQuestion({
  question,
  answer,
  onAnswerChange,
  locked,
  result,
}: QuestionComponentProps) {
  const options = (question.options as string[]) ?? [];

  return (
    <div className="space-y-4">
      <p className="text-center text-2xl font-bold">{question.questionText}</p>
      <div className="grid gap-3 sm:grid-cols-2">
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
                'kid-btn border-2 text-left',
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
