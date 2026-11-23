/** Mirrors the API password policy (8–128 chars, at least one letter and one number). */
export const PASSWORD_POLICY_HINT = 'At least 8 characters, with a letter and a number.';

export function isValidPassword(password: string): boolean {
  return (
    password.length >= 8 &&
    password.length <= 128 &&
    /[A-Za-z]/.test(password) &&
    /\d/.test(password)
  );
}
