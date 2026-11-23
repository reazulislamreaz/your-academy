import { IsEmail, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  PASSWORD_PATTERN,
  PASSWORD_PATTERN_MESSAGE,
} from '../../common/validation/password';

export class AdminResetByEmailDto {
  /** Omit to use the account's current email; a different value replaces it. */
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;
}

export class AdminTemporaryPasswordDto {
  /** Omit to let the server generate one. */
  @IsOptional()
  @IsString()
  @MinLength(PASSWORD_MIN_LENGTH)
  @MaxLength(PASSWORD_MAX_LENGTH)
  @Matches(PASSWORD_PATTERN, { message: PASSWORD_PATTERN_MESSAGE })
  password?: string;
}
