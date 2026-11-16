import { isValidWhatsapp, normalizeWhatsapp } from '../whatsapp';

describe('whatsapp normalize (BD)', () => {
  const canonical = '+8801712345678';

  it.each([
    '01712345678',
    '+8801712345678',
    '8801712345678',
    '008801712345678',
    '01712-345678',
    '+880 1712 345678',
  ])('normalizes %s to canonical', (input) => {
    expect(normalizeWhatsapp(input)).toBe(canonical);
    expect(isValidWhatsapp(input)).toBe(true);
  });

  it('accepts other valid operators', () => {
    expect(isValidWhatsapp('01312345678')).toBe(true);
    expect(normalizeWhatsapp('01312345678')).toBe('+8801312345678');
    expect(isValidWhatsapp('01912345678')).toBe(true);
  });

  it('rejects invalid numbers', () => {
    expect(isValidWhatsapp('01212345678')).toBe(false);
    expect(isValidWhatsapp('0171234567')).toBe(false);
    expect(isValidWhatsapp('017123456789')).toBe(false);
    expect(isValidWhatsapp('+14155552671')).toBe(false);
    expect(isValidWhatsapp('')).toBe(false);
  });
});
