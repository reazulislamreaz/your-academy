import {
  createDefaultHomepagePayload,
  homepagePayloadSchema,
  isUnsafeHref,
} from '@your-academy/shared';

/** SEC-6 — older CMS link fields neutralise script / protocol-relative links, never reject. */
describe('CMS href safety', () => {
  it.each([
    'javascript:alert(1)',
    ' JavaScript:alert(1)',
    'java\tscript:alert(1)',
    'data:text/html;base64,PHNjcmlwdD4=',
    'vbscript:msgbox(1)',
    '//evil.example/login',
    '\\\\evil.example',
    '/\\evil.example',
  ])('flags %p as unsafe', (href) => expect(isUnsafeHref(href)).toBe(true));

  it.each([
    '/packages',
    '/#faq',
    '#faq',
    'https://wa.me/8801',
    'mailto:help@example.com',
    'tel:+8801',
  ])('keeps %p', (href) => expect(isUnsafeHref(href)).toBe(false));

  it('a stored payload with an unsafe hero CTA still parses, with the link neutralised', () => {
    const stored = createDefaultHomepagePayload();
    stored.hero.primaryCta = { label: 'Go', href: 'javascript:alert(1)', visible: true };
    const parsed = homepagePayloadSchema.safeParse(stored);
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.hero.primaryCta.href).toBe('/');
  });
});
