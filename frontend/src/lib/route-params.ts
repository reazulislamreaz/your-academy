/**
 * Next.js passes non-ASCII dynamic segments (e.g. Bangla quiz slugs like
 * `চর্যাপদ`) to pages still percent-encoded. Decode once before using the value,
 * otherwise `encodeURIComponent` encodes it a second time and the API sees the
 * literal `%E0%A6…` string → 404. Malformed input is returned unchanged.
 */
export function decodeRouteParam(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
