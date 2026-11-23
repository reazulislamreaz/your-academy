/**
 * Password policy shared by register / change / reset / admin-created accounts:
 * 8–128 characters with at least one letter and one number.
 */
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;
export const PASSWORD_PATTERN = /^(?=.*[A-Za-z])(?=.*\d).+$/;
export const PASSWORD_PATTERN_MESSAGE = 'Password must contain at least one letter and one number';
