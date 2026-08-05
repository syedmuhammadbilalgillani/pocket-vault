// In-memory rate limiter. This is a placeholder that enforces the thresholds
// from roadmap ADR-004, but it only works correctly on a single server
// instance and resets on redeploy. Replace with Redis (Upstash) before
// staging/production per the roadmap's tech stack — see roadmap section 4.

type Bucket = { count: number; resetAt: number }

const buckets = new Map<string, Bucket>()

// Sweep occasionally so the map doesn't grow unbounded in a long-lived dev process.
let lastSweep = Date.now()
function sweepIfNeeded() {
  const now = Date.now()
  if (now - lastSweep < 60_000) return
  lastSweep = now
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt < now) buckets.delete(key)
  }
}

export function checkRateLimit(
  key: string,
  { limit, windowMs }: { limit: number; windowMs: number },
): { allowed: boolean; remaining: number } {
  sweepIfNeeded()
  const now = Date.now()
  const bucket = buckets.get(key)

  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, remaining: limit - 1 }
  }

  if (bucket.count >= limit) {
    return { allowed: false, remaining: 0 }
  }

  bucket.count += 1
  return { allowed: true, remaining: limit - bucket.count }
}

// Thresholds from roadmap ADR-004.
export const RATE_LIMITS = {
  loginPerAccount: { limit: 5, windowMs: 15 * 60 * 1000 },
  loginPerIp: { limit: 20, windowMs: 15 * 60 * 1000 },
  passwordResetPerAccount: { limit: 3, windowMs: 60 * 60 * 1000 },
  registrationPerIp: { limit: 5, windowMs: 60 * 60 * 1000 },
} as const
