'use client';

import { speak } from '@/lib/audio/tts';
import type { ImageOption } from '@/lib/exam/types';
import type { QuestionComponentProps } from './common';

// 聽音選圖：隱藏文字，按鈕播放題目語音，選出對應圖片
export default function ListeningImageQuestion({
  question,
  answer,
  onAnswerChange,
  locked,
  result,
}: QuestionComponentProps) {
  const options = (question.options as ImageOption[]) ?? [];

  return (
    <div className="space-y-5">
      <button
        type="button"
        onClick={() => speak(question.questionText)}
        className="kid-btn mx-auto block bg-sky text-white"
      >
        🔊 再聽一次
      </button>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {options.map((opt) => {
          const selected = answer === opt.label;
          const isAnswer = result && opt.label === result.correctAnswer;
          const wrongPick = result && selected && !result.isCorrect;
          return (
            <button
              key={opt.label}
              type="button"
              disabled={locked}
              onClick={() => onAnswerChange(opt.label)}
              className={[
                'flex aspect-square flex-col items-center justify-center rounded-kid border-4 text-6xl shadow-md transition active:scale-95',
                isAnswer
                  ? 'border-grass bg-grass/20'
                  : wrongPick
                    ? 'border-coral bg-coral/20'
                    : selected
                      ? 'border-sky bg-sky/20'
                      : 'border-gray-200 bg-white',
              ].join(' ')}
            >
              <span>{opt.emoji ?? '🖼️'}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
