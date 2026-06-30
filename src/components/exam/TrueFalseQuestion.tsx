'use client';

import { speak } from '@/lib/audio/tts';
import type { QuestionComponentProps } from './common';

// 是非題：聽力題隱藏文字只播音；閱讀題顯示句子。皆配一張圖片(emoji)，答 Y/N。
export default function TrueFalseQuestion({
  question,
  answer,
  onAnswerChange,
  locked,
  result,
}: QuestionComponentProps) {
  const isListening = question.type === 'LISTENING_TF';
  const picture = (question.options as string[])?.[0] ?? '🖼️';

  const choices: { value: 'Y' | 'N'; label: string; emoji: string }[] = [
    { value: 'Y', label: '一樣', emoji: '⭕' },
    { value: 'N', label: '不一樣', emoji: '❌' },
  ];

  return (
    <div className="space-y-5">
      {isListening ? (
        <button
          type="button"
          onClick={() => speak(question.questionText)}
          className="kid-btn mx-auto block bg-sky text-white"
        >
          🔊 播放句子
        </button>
      ) : (
        <p className="text-center text-2xl font-bold">{question.questionText}</p>
      )}

      <div className="text-center text-7xl">{picture}</div>
      <p className="text-center text-base text-gray-500">圖片和句子一樣嗎？</p>

      <div className="grid grid-cols-2 gap-3">
        {choices.map((c) => {
          const selected = answer === c.value;
          const isAnswer = result && c.value === result.correctAnswer;
          const wrongPick = result && selected && !result.isCorrect;
          return (
            <button
              key={c.value}
              type="button"
              disabled={locked}
              onClick={() => onAnswerChange(c.value)}
              className={[
                'kid-btn border-2 text-2xl',
                isAnswer
                  ? 'border-grass bg-grass/20'
                  : wrongPick
                    ? 'border-coral bg-coral/20'
                    : selected
                      ? 'border-sky bg-sky/20'
                      : 'border-gray-200 bg-white',
              ].join(' ')}
            >
              {c.emoji} {c.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
