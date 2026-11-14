/**
 * Short-lived in-process cache for proxied PDF bytes.
 * Avoids re-fetching Cloudinary on every viewer open (upstream can take 20–40s).
 */

type CacheEntry = {
  buffer: Buffer;
  contentType: string;
  filename: string;
  expiresAt: number;
};

const DEFAULT_TTL_MS = 5 * 60 * 1000;
const MAX_ENTRIES = 24;
const MAX_TOTAL_BYTES = 80 * 1024 * 1024;

export class PdfByteCache {
  private readonly map = new Map<string, CacheEntry>();
  private totalBytes = 0;

  get(key: string): CacheEntry | null {
    const hit = this.map.get(key);
    if (!hit) return null;
    if (Date.now() > hit.expiresAt) {
      this.delete(key);
      return null;
    }
    // Refresh LRU order.
    this.map.delete(key);
    this.map.set(key, hit);
    return hit;
  }

  set(
    key: string,
    value: { buffer: Buffer; contentType: string; filename: string },
    ttlMs = DEFAULT_TTL_MS,
  ): void {
    this.delete(key);
    while (
      (this.map.size >= MAX_ENTRIES || this.totalBytes + value.buffer.length > MAX_TOTAL_BYTES) &&
      this.map.size > 0
    ) {
      const oldest = this.map.keys().next().value as string | undefined;
      if (!oldest) break;
      this.delete(oldest);
    }
    this.map.set(key, {
      ...value,
      expiresAt: Date.now() + ttlMs,
    });
    this.totalBytes += value.buffer.length;
  }

  delete(key: string): void {
    const prev = this.map.get(key);
    if (!prev) return;
    this.totalBytes = Math.max(0, this.totalBytes - prev.buffer.length);
    this.map.delete(key);
  }

  invalidateDocument(documentId: string): void {
    this.delete(`public:${documentId}`);
    this.delete(`auth:${documentId}`);
  }
}

/** Shared singleton — DocumentsService is request-scoped? No, default singleton. */
export const publicPdfByteCache = new PdfByteCache();
