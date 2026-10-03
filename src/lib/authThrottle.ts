// Brute-force throttling for auth-sensitive endpoints (in-memory, per IP).
type Attempt = { count: number; firstAt: number };
const attempts = new Map<string, Attempt>();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 8;

export function isThrottled(ip: string): boolean {
  const a = attempts.get(ip);
  if (!a) return false;
  if (Date.now() - a.firstAt > WINDOW_MS) {
    attempts.delete(ip);
    return false;
  }
  return a.count >= MAX_ATTEMPTS;
}

export function recordFailure(ip: string): void {
  const a = attempts.get(ip);
  if (!a || Date.now() - a.firstAt > WINDOW_MS) {
    attempts.set(ip, { count: 1, firstAt: Date.now() });
    return;
  }
  a.count += 1;
}

export function clearFailures(ip: string): void {
  attempts.delete(ip);
}
