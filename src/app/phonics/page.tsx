'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import PhonicsBlock from '@/components/phonics/PhonicsBlock';
import { AudioRecorder } from '@/lib/audio/audioRecorder';
import { neighborAudioUrls, preloadAudio } from '@/lib/audio/audioCache';
import { speak } from '@/lib/audio/tts';
import { PhonemeBlockSchema, type PhonemeBlock, type PhonemeScore } from '@/types/content';
import { DEMO_USER_ID } from '@/lib/study-plan/curriculum';

interface WordDTO {
  id: string;
  text: string;
  ipa: string | null;
  phonemeMapping: unknown;
  audioUrl: string | null;
  weekNo: number | null;
}

function parseBlocks(raw: unknown): PhonemeBlock[] {
  const r = PhonemeBlockSchema.array().safeParse(raw);
  return r.success ? r.data : [];
}

export default function PhonicsPage() {
  const [words, setWords] = useState<WordDTO[]>([]);
  const [index, setIndex] = useState(0);
  const [scores, setScores] = useState<PhonemeScore[] | null>(null);
  const [recording, setRecording] = useState(false);
  const [tooQuiet, setTooQuiet] = useState(false);
  const [message, setMessage] = useState<string>('');
  const [busy, setBusy] = useState(false);
  const recorderRef = useRef<AudioRecorder | null>(null);

  useEffect(() => {
    fetch('/api/words')
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data: { words: WordDTO[] }) => setWords(data.words))
      .catch(() => setMessage('無法載入單字，請先設定資料庫並執行 npm run db:seed。'));
  }, []);

  const current = words[index];
  const blocks = useMemo(() => (current ? parseBlocks(current.phonemeMapping) : []), [current]);

  // 預載前後各 3 個示範音（若有音檔），並重置分數
  useEffect(() => {
    setScores(null);
    setMessage('');
    if (words.length > 0) {
      preloadAudio(neighborAudioUrls(words, index, 3));
    }
  }, [index, words]);

  const startRecording = useCallback(async () => {
    setMessage('');
    setScores(null);
    try {
      const recorder = new AudioRecorder({
        onVolume: (_db, isTooQuiet) => setTooQuiet(isTooQuiet),
      });
      recorderRef.current = recorder;
      await recorder.start();
      setRecording(true);
    } catch {
      setMessage('無法存取麥克風，請允許瀏覽器使用麥克風權限。');
    }
  }, []);

  const stopRecording = useCallback(async () => {
    const recorder = recorderRef.current;
    if (!recorder || !current) return;
    setRecording(false);
    setBusy(true);
    setMessage('評測中…');
    try {
      const wav = await recorder.stop();
      const form = new FormData();
      form.append('audio', wav, 'rec.wav');
      form.append('wordText', current.text);
      form.append('userId', DEMO_USER_ID);

      const res = await fetch('/api/assess-pronunciation', { method: 'POST', body: form });
      if (res.status === 429) {
        setMessage('練習得很認真！休息一下再試 🍵');
      } else if (res.status === 503) {
        setMessage('發音評分服務尚未設定（請設定 AZURE_SPEECH_KEY）。');
      } else if (res.ok) {
        const data = await res.json();
        setScores(data.scores ?? null);
        setMessage(`整體發音分數：${data.overall?.pronunciation ?? 0} 分`);
      } else {
        setMessage('評測失敗，請再試一次。');
      }
    } catch {
      setMessage('錄音處理失敗，請再試一次。');
    } finally {
      setBusy(false);
      setTooQuiet(false);
    }
  }, [current]);

  if (words.length === 0) {
    return (
      <div className="kid-card text-center text-gray-600">
        {message || '載入中…'}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="kid-card text-center">
        <h1 className="text-3xl font-extrabold">🧱 發音積木</h1>
        <p className="mt-1 text-gray-500">把單字拆成積木，跟著示範大聲讀！</p>
      </section>

      {/* 單字選擇列 */}
      <div className="flex flex-wrap justify-center gap-2">
        {words.map((w, i) => (
          <button
            key={w.id}
            type="button"
            onClick={() => setIndex(i)}
            className={[
              'rounded-full px-4 py-2 text-lg font-bold transition',
              i === index ? 'bg-grass text-white' : 'bg-white shadow',
            ].join(' ')}
          >
            {w.text}
          </button>
        ))}
      </div>

      <section className="kid-card space-y-5">
        <div className="text-center">
          <span className="text-4xl font-extrabold">{current.text}</span>
          {current.ipa && <span className="ml-2 text-xl text-gray-400">/{current.ipa}/</span>}
        </div>

        <PhonicsBlock blocks={blocks} scores={scores ?? undefined} />

        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => speak(current.text)}
            className="kid-btn bg-sky text-white"
          >
            🔊 聆聽示範
          </button>

          {!recording ? (
            <button
              type="button"
              disabled={busy}
              onClick={startRecording}
              className="kid-btn bg-coral text-white disabled:opacity-40"
            >
              🎤 開始錄音
            </button>
          ) : (
            <button type="button" onClick={stopRecording} className="kid-btn bg-amber-500 text-white">
              ⏹️ 停止並評分
            </button>
          )}
        </div>

        {recording && tooQuiet && (
          <p className="text-center text-lg font-bold text-coral animate-pulse">
            📢 請大聲讀出來！
          </p>
        )}
        {message && <p className="text-center text-lg font-bold text-amber-700">{message}</p>}
      </section>
    </div>
  );
}
