// 音訊零延遲快取：用 Cache Storage API 預載示範音檔
// 練習某單字時，異步預載前後各 3 個單字的官方示範音，點「聆聽示範」即時播放

const CACHE_NAME = 'gept-demo-audio-v1';

function supportsCache(): boolean {
  return typeof window !== 'undefined' && 'caches' in window;
}

/** 預載一組音檔（已存在則略過，控制流量） */
export async function preloadAudio(urls: string[]): Promise<void> {
  if (!supportsCache()) return;
  const cache = await caches.open(CACHE_NAME);
  await Promise.all(
    urls
      .filter(Boolean)
      .map(async (url) => {
        const hit = await cache.match(url);
        if (hit) return;
        try {
          const res = await fetch(url, { mode: 'same-origin' });
          if (res.ok) await cache.put(url, res.clone());
        } catch {
          // 預載失敗不致命，點擊時會回退到網路請求
        }
      }),
  );
}

/** 取得可即時播放的 URL：命中快取則回傳 blob URL，否則回原 URL */
export async function getPlayableUrl(url: string): Promise<string> {
  if (!url || !supportsCache()) return url;
  const cache = await caches.open(CACHE_NAME);
  const hit = await cache.match(url);
  if (!hit) return url;
  const blob = await hit.blob();
  return URL.createObjectURL(blob);
}

/** 由單字清單與目前索引，算出前後各 radius 個的示範音 URL */
export function neighborAudioUrls(
  items: Array<{ audioUrl?: string | null }>,
  currentIndex: number,
  radius = 3,
): string[] {
  const urls: string[] = [];
  for (let i = currentIndex - radius; i <= currentIndex + radius; i++) {
    if (i < 0 || i >= items.length) continue;
    const u = items[i]?.audioUrl;
    if (u) urls.push(u);
  }
  return urls;
}
