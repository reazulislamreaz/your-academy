/**
 * AUD-1 — caps how many rows one noisy source can add to `audit_logs` in a window (e.g. a
 * password-guessing run writes one AUTH_LOGIN_FAILED row per attempt). In-memory and per
 * process, like the throttler. Suppressed events are counted and reported on the next row
 * that is written for the same key, so nothing silently disappears.
 */
export class AuditFloodGuard {
  private readonly windows = new Map<
    string,
    { start: number; count: number; suppressed: number }
  >();

  constructor(
    private readonly maxPerWindow: number,
    private readonly windowMs: number,
    private readonly maxKeys = 10_000,
  ) {}

  /** null = do not write; otherwise how many events were suppressed before this one. */
  admit(key: string, now = Date.now()): number | null {
    let w = this.windows.get(key);
    if (!w || now - w.start >= this.windowMs) {
      const carried = w?.suppressed ?? 0;
      if (!w && this.windows.size >= this.maxKeys) this.evictExpired(now);
      w = { start: now, count: 0, suppressed: 0 };
      this.windows.set(key, w);
      w.count += 1;
      return carried;
    }
    if (w.count >= this.maxPerWindow) {
      w.suppressed += 1;
      return null;
    }
    w.count += 1;
    const carried = w.suppressed;
    w.suppressed = 0;
    return carried;
  }

  private evictExpired(now: number): void {
    for (const [k, w] of this.windows) {
      if (now - w.start >= this.windowMs) this.windows.delete(k);
    }
    // Still full (sustained attack from many sources): drop the oldest half.
    if (this.windows.size >= this.maxKeys) {
      let n = Math.floor(this.maxKeys / 2);
      for (const k of this.windows.keys()) {
        if (n-- <= 0) break;
        this.windows.delete(k);
      }
    }
  }
}
