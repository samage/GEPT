import * as sdk from 'microsoft-cognitiveservices-speech-sdk';

// Azure 發音評測封裝（Pronunciation Assessment）
// 機密來自 process.env，絕不硬編碼

export interface AzurePhonemeScore {
  phoneme: string;
  accuracyScore: number;
}

export interface AzureAssessmentResult {
  recognizedText: string;
  accuracyScore: number;
  fluencyScore: number;
  completenessScore: number;
  pronunciationScore: number;
  phonemes: AzurePhonemeScore[];
}

export class AzureNotConfiguredError extends Error {
  constructor() {
    super('AZURE_SPEECH_NOT_CONFIGURED');
    this.name = 'AzureNotConfiguredError';
  }
}

export function isAzureConfigured(): boolean {
  return Boolean(process.env.AZURE_SPEECH_KEY && process.env.AZURE_SPEECH_REGION);
}

/**
 * 對單字/短句執行發音評測。
 * @param wavAudio 16-bit PCM WAV 音訊（前端 audioRecorder 已轉檔並切除靜音）
 * @param referenceText 參考文本（資料庫中的單字或句子）
 */
export function assessPronunciation(
  wavAudio: Buffer,
  referenceText: string,
): Promise<AzureAssessmentResult> {
  const key = process.env.AZURE_SPEECH_KEY;
  const region = process.env.AZURE_SPEECH_REGION;
  if (!key || !region) {
    return Promise.reject(new AzureNotConfiguredError());
  }

  const speechConfig = sdk.SpeechConfig.fromSubscription(key, region);
  speechConfig.speechRecognitionLanguage = 'en-US';

  const audioConfig = sdk.AudioConfig.fromWavFileInput(wavAudio);

  const paConfig = new sdk.PronunciationAssessmentConfig(
    referenceText,
    sdk.PronunciationAssessmentGradingSystem.HundredMark,
    sdk.PronunciationAssessmentGranularity.Phoneme,
    true,
  );

  const recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);
  paConfig.applyTo(recognizer);

  return new Promise<AzureAssessmentResult>((resolve, reject) => {
    recognizer.recognizeOnceAsync(
      (result) => {
        try {
          if (result.reason === sdk.ResultReason.NoMatch) {
            resolve({
              recognizedText: '',
              accuracyScore: 0,
              fluencyScore: 0,
              completenessScore: 0,
              pronunciationScore: 0,
              phonemes: [],
            });
            return;
          }

          const pa = sdk.PronunciationAssessmentResult.fromResult(result);
          const raw = result.properties.getProperty(
            sdk.PropertyId.SpeechServiceResponse_JsonResult,
          );
          const json = raw ? JSON.parse(raw) : {};
          const words = json?.NBest?.[0]?.Words ?? [];

          const phonemes: AzurePhonemeScore[] = [];
          for (const w of words) {
            for (const p of w?.Phonemes ?? []) {
              phonemes.push({
                phoneme: String(p.Phoneme ?? ''),
                accuracyScore: Number(p?.PronunciationAssessment?.AccuracyScore ?? 0),
              });
            }
          }

          resolve({
            recognizedText: result.text ?? '',
            accuracyScore: pa.accuracyScore,
            fluencyScore: pa.fluencyScore,
            completenessScore: pa.completenessScore,
            pronunciationScore: pa.pronunciationScore,
            phonemes,
          });
        } catch (err) {
          reject(err);
        } finally {
          recognizer.close();
        }
      },
      (err) => {
        recognizer.close();
        reject(new Error(typeof err === 'string' ? err : 'AZURE_RECOGNIZE_FAILED'));
      },
    );
  });
}
