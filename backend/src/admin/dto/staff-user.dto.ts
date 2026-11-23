import { UserRole } from '@prisma/client';
import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  PASSWORD_PATTERN,
  PASSWORD_PATTERN_MESSAGE,
} from '../../common/validation/password';

/** Roles an admin may assign to dashboard accounts (learners self-register). */
export const ASSIGNABLE_STAFF_ROLES = [UserRole.ADMIN, UserRole.MODERATOR] as const;
export type AssignableStaffRole = (typeof ASSIGNABLE_STAFF_ROLES)[number];

export class CreateStaffUserDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(32)
  whatsappNumber!: string;

  @IsString()
  @MinLength(PASSWORD_MIN_LENGTH)
  @MaxLength(PASSWORD_MAX_LENGTH)
  @Matches(PASSWORD_PATTERN, { message: PASSWORD_PATTERN_MESSAGE })
  password!: string;

  @IsIn(ASSIGNABLE_STAFF_ROLES)
  role!: AssignableStaffRole;
}

export class UpdateStaffUserDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(32)
  whatsappNumber?: string;

  /** Pass null or "" to clear. A changed email becomes unverified. */
  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== '')
  @IsEmail()
  @MaxLength(255)
  email?: string | null;
}

export class UpdateUserRoleDto {
  @IsIn(ASSIGNABLE_STAFF_ROLES)
  role!: AssignableStaffRole;
}

export class AdminResetPasswordDto {
  @IsString()
  @MinLength(PASSWORD_MIN_LENGTH)
  @MaxLength(PASSWORD_MAX_LENGTH)
  @Matches(PASSWORD_PATTERN, { message: PASSWORD_PATTERN_MESSAGE })
  newPassword!: string;
}
