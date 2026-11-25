/**
 * SEC-3 — the stored MIME type comes from what Cloudinary reports, never from the client.
 * Images: Cloudinary parsed the file, so its `format` is trustworthy. Raw files: Cloudinary
 * keeps the uploaded extension on the public id (it reports no `format`). Anything unknown
 * becomes application/octet-stream, which no upload purpose allows.
 */
const BY_EXTENSION: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  svg: 'image/svg+xml',
  avif: 'image/avif',
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  txt: 'text/plain',
};

export const UNKNOWN_MIME = 'application/octet-stream';

function extensionOf(publicId: string): string | null {
  const last = publicId.split('/').pop() ?? '';
  const dot = last.lastIndexOf('.');
  return dot > 0 ? last.slice(dot + 1).toLowerCase() : null;
}

export function detectUploadedMime(
  resourceType: 'image' | 'raw',
  remote: { format?: string | null; publicId: string },
): string {
  const format =
    resourceType === 'image'
      ? (remote.format ?? extensionOf(remote.publicId))
      : (extensionOf(remote.publicId) ?? remote.format);
  return (format && BY_EXTENSION[format.toLowerCase()]) || UNKNOWN_MIME;
}
