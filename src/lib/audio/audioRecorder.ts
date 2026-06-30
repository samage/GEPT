// 環境錄音防呆 + 靜音切除
// - Web Audio AnalyserNode 即時音量偵測（低於 -50dB 觸發「請大聲讀出來」）
// - 停止時切除頭尾超過 0.5 秒的靜音，再轉成 16kHz 16-bit 單聲道 WAV 送往後端

export interface AudioRecorderOptions {
  silenceThresholdDb?: number; // 預設 -50
  maxTrimSeconds?: number; // 頭尾保留秒數，預設 0.5
  targetSampleRate?: number; // 預設 16000（Azure 建議）
  onVolume?: (db: number, isTooQuiet: boolean) => void;
}

const SILENCE_AMPLITUDE = 0.012; // 靜音判定的線性振幅門檻

export class AudioRecorder {
  private ctx: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private processor: ScriptProcessorNode | null = null;
  private analyser: AnalyserNode | null = null;
  private chunks: Float32Array[] = [];
  private rafId = 0;
  private recording = false;

  private readonly opts: Required<Omit<AudioRecorderOptions, 'onVolume'>> &
    Pick<AudioRecorderOptions, 'onVolume'>;

  constructor(options: AudioRecorderOptions = {}) {
    this.opts = {
      silenceThresholdDb: options.silenceThresholdDb ?? -50,
      maxTrimSeconds: options.maxTrimSeconds ?? 0.5,
      targetSampleRate: options.targetSampleRate ?? 16000,
      onVolume: options.onVolume,
    };
  }

  async start(): Promise<void> {
    if (this.recording) return;
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new AudioCtx();

    this.source = this.ctx.createMediaStreamSource(this.stream);
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 2048;

    // ScriptProcessorNode 雖被標記為過時，但相容性最佳且足以擷取 PCM
    this.processor = this.ctx.createScriptProcessor(4096, 1, 1);
    this.chunks = [];

    this.processor.onaudioprocess = (e) => {
      const input = e.inputBuffer.getChannelData(0);
      this.chunks.push(new Float32Array(input));
    };

    this.source.connect(this.analyser);
    this.analyser.connect(this.processor);
    this.processor.connect(this.ctx.destination);

    this.recording = true;
    this.monitorVolume();
  }

  private monitorVolume() {
    if (!this.analyser) return;
    const buffer = new Float32Array(this.analyser.fftSize);

    const tick = () => {
      if (!this.recording || !this.analyser) return;
      this.analyser.getFloatTimeDomainData(buffer);

      let sumSq = 0;
      for (let i = 0; i < buffer.length; i++) sumSq += buffer[i] * buffer[i];
      const rms = Math.sqrt(sumSq / buffer.length);
      const db = rms > 0 ? 20 * Math.log10(rms) : -100;

      this.opts.onVolume?.(db, db < this.opts.silenceThresholdDb);
      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  }

  /** 停止錄音，回傳切除靜音、降採樣後的 WAV Blob */
  async stop(): Promise<Blob> {
    if (!this.recording || !this.ctx) {
      throw new Error('Recorder is not active.');
    }
    this.recording = false;
    cancelAnimationFrame(this.rafId);

    const sourceRate = this.ctx.sampleRate;
    const merged = mergeChunks(this.chunks);

    this.cleanup();

    const trimmed = trimSilence(merged, sourceRate, this.opts.maxTrimSeconds);
    const downsampled = downsample(trimmed, sourceRate, this.opts.targetSampleRate);
    return encodeWav(downsampled, this.opts.targetSampleRate);
  }

  private cleanup() {
    try {
      this.processor?.disconnect();
      this.analyser?.disconnect();
      this.source?.disconnect();
      this.stream?.getTracks().forEach((t) => t.stop());
      void this.ctx?.close();
    } catch {
      // 忽略釋放資源時的例外
    }
    this.processor = null;
    this.analyser = null;
    this.source = null;
    this.stream = null;
    this.ctx = null;
    this.chunks = [];
  }
}

function mergeChunks(chunks: Float32Array[]): Float32Array {
  const total = chunks.reduce((n, c) => n + c.length, 0);
  const out = new Float32Array(total);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.length;
  }
  return out;
}

// 切除頭尾「超過 maxTrim 秒」的靜音，保留 maxTrim 秒緩衝避免吃掉字頭字尾
function trimSilence(samples: Float32Array, sampleRate: number, maxTrim: number): Float32Array {
  const len = samples.length;
  let first = 0;
  let last = len - 1;

  while (first < len && Math.abs(samples[first]) < SILENCE_AMPLITUDE) first++;
  while (last > first && Math.abs(samples[last]) < SILENCE_AMPLITUDE) last--;

  if (first >= last) return samples; // 全靜音則原樣回傳，交由後端判定

  const pad = Math.floor(maxTrim * sampleRate);
  const start = Math.max(0, first - pad);
  const end = Math.min(len, last + pad);
  return samples.slice(start, end);
}

function downsample(samples: Float32Array, fromRate: number, toRate: number): Float32Array {
  if (toRate >= fromRate) return samples;
  const ratio = fromRate / toRate;
  const newLen = Math.round(samples.length / ratio);
  const out = new Float32Array(newLen);
  for (let i = 0; i < newLen; i++) {
    const start = Math.floor(i * ratio);
    const end = Math.min(samples.length, Math.floor((i + 1) * ratio));
    let sum = 0;
    let count = 0;
    for (let j = start; j < end; j++) {
      sum += samples[j];
      count++;
    }
    out[i] = count > 0 ? sum / count : 0;
  }
  return out;
}

// 16-bit PCM 單聲道 WAV
function encodeWav(samples: Float32Array, sampleRate: number): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // PCM chunk size
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // byte rate
  view.setUint16(32, 2, true); // block align
  view.setUint16(34, 16, true); // bits per sample
  writeString(36, 'data');
  view.setUint32(40, samples.length * 2, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += 2;
  }

  return new Blob([view], { type: 'audio/wav' });
}
