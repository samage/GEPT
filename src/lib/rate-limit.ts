import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// 防禦型限流：可插拔介面
// - 正式環境：設定 Upstash 環境變數 → 使用 Redis 滑動視窗（多實例共享）
// - 本機/單機：自動退回記憶體滑動視窗
// 預設每分鐘每 key 上限 = RATE_LIMIT_PER_MINUTE（預設 20）

const PER_MINUTE = Number(process.env.RATE_LIMIT_PER_MINUTE ?? 20);
const WINDOW_MS = 60_000;

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
}

// ---------- 記憶體退回方案 ----------
const memoryHits = new Map<string, number[]>();

function memoryLimit(key: string): RateLimitResult {
  const now = Date.now();
  const hits = (memoryHits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);

  if (hits.length >= PER_MINUTE) {
    memoryHits.set(key, hits);
    return { success: false, limit: PER_MINUTE, remaining: 0 };
  }

  hits.push(now);
  memoryHits.set(key, hits);

  // 機會性清理過期 key，避免記憶體成長
  if (memoryHits.size > 5000) {
    for (const [k, ts] of memoryHits) {
      if (ts.every((t) => now - t >= WINDOW_MS)) memoryHits.delete(k);
    }
  }

  return { success: true, limit: PER_MINUTE, remaining: PER_MINUTE - hits.length };
}

// ---------- Upstash 方案（若有設定）----------
let upstash: Ratelimit | null = null;
if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  upstash = new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(PER_MINUTE, '1 m'),
    prefix: 'gept:assess',
    analytics: false,
  });
}

export async function checkRateLimit(key: string): Promise<RateLimitResult> {
  if (upstash) {
    const r = await upstash.limit(key);
    return { success: r.success, limit: r.limit, remaining: r.remaining };
  }
  return memoryLimit(key);
}

// 從請求標頭安全取得用戶端 IP（CDN / 代理友善）
export function getClientIp(headers: Headers): string {
  const xff = headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return headers.get('x-real-ip')?.trim() || 'unknown';
}
