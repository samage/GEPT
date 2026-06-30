'use client';

import { speak } from '@/lib/audio/tts';
import type { QuestionComponentProps } from './common';

// 口說題：朗讀 / 看圖說故事。以「參與完成」計分；正式發音評分在 /phonics 透過 Azure。
export default function SpeakingPromptQuestion({
  question,
  answer,
  onAnswerChange,
  locked,
}: QuestionComponentProps) {
  const isPicture = question.type === 'SPEAKING_PICTURE';
  const picture = isPicture ? (question.options as string[])?.[0] : null;
  const done = answer === 'done';

  return (
    <div className="space-y-5 text-center">
      <p className="text-2xl font-bold">{question.questionText}</p>

      {picture && <div className="text-8xl">{picture}</div>}

      {!isPicture && (
        <button
          type="button"
          onClick={() => speak(question.questionText.replace(/^.*：/, ''))}
          className="kid-btn mx-auto block bg-sky text-white"
        >
          🔊 聽老師念一次
        </button>
      )}

      <button
        type="button"
        disabled={locked}
        onClick={() => onAnswerChange('done')}
        className={[
          'kid-btn mx-auto block border-2',
          done ? 'border-grass bg-grass/20' : 'border-coral bg-coral/10',
        ].join(' ')}
      >
        🎤 {done ? '已完成朗讀！' : '我念好了'}
      </button>

      <p className="text-sm text-gray-500">
        想要 AI 幫你的發音打分數嗎？到「發音積木」頁面練習單字吧！
      </p>
    </div>
  );
}
