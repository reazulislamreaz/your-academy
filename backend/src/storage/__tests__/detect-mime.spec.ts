import { detectUploadedMime, UNKNOWN_MIME } from '../detect-mime';

/** SEC-3 — the client-declared type is never used. */
describe('detectUploadedMime', () => {
  it('uses the image format Cloudinary parsed', () => {
    expect(detectUploadedMime('image', { format: 'jpg', publicId: 'a/b' })).toBe('image/jpeg');
    expect(detectUploadedMime('image', { format: 'png', publicId: 'a/b' })).toBe('image/png');
    expect(detectUploadedMime('image', { format: 'svg', publicId: 'a/b' })).toBe('image/svg+xml');
  });

  it('uses the extension Cloudinary keeps on raw public ids', () => {
    expect(detectUploadedMime('raw', { publicId: 'support/x/abc.pdf' })).toBe('application/pdf');
    expect(detectUploadedMime('raw', { publicId: 'support/x/n.jpeg' })).toBe('image/jpeg');
    expect(detectUploadedMime('raw', { publicId: 'support/x/notes.TXT' })).toBe('text/plain');
    expect(detectUploadedMime('raw', { publicId: 'seed/placeholder', format: 'pdf' })).toBe(
      'application/pdf',
    );
  });

  it('treats anything else as unknown (rejected by every purpose)', () => {
    expect(detectUploadedMime('raw', { publicId: 'support/x/evil.html' })).toBe(UNKNOWN_MIME);
    expect(detectUploadedMime('raw', { publicId: 'support/x/run.exe' })).toBe(UNKNOWN_MIME);
    expect(detectUploadedMime('raw', { publicId: 'support/x/noext' })).toBe(UNKNOWN_MIME);
    // A raw HTML file renamed to look like a PDF in the folder path is still HTML.
    expect(detectUploadedMime('raw', { publicId: 'support/file.pdf/evil.html' })).toBe(
      UNKNOWN_MIME,
    );
  });
});
