/**
 * Detect Next.js / webpack chunk load failures that commonly appear after a
 * deploy replaces hashed assets while an old tab still holds the previous HTML.
 */
export function isChunkLoadError(error: unknown): boolean {
  if (!error) return false;
  const message =
    error instanceof Error
      ? `${error.name} ${error.message}`
      : typeof error === 'string'
        ? error
        : String(error);
  return /ChunkLoadError|Loading chunk [\d]+ failed|Failed to fetch dynamically imported module|error loading dynamically imported module/i.test(
    message,
  );
}

const RELOAD_KEY = 'ya-chunk-reload-at';
const RELOAD_COOLDOWN_MS = 15_000;

/** Reload once per cooldown window to pick up the new build assets. */
export function reloadOnceForChunkError(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const last = Number(sessionStorage.getItem(RELOAD_KEY) || '0');
    if (Number.isFinite(last) && Date.now() - last < RELOAD_COOLDOWN_MS) {
      return false;
    }
    sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
  } catch {
    // sessionStorage may be unavailable; still attempt a single reload.
  }
  window.location.reload();
  return true;
}
