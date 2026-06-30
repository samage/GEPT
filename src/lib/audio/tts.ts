// 瀏覽器內建語音合成（聽力/口說題的示範發音，無需音檔即可運作）

export function speak(text: string, lang = 'en-US'): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  try {
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = lang;
    utter.rate = 0.9; // 兒童友善，略慢
    window.speechSynthesis.speak(utter);
  } catch {
    // 不支援語音合成時靜默略過
  }
}

export function ttsSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}
