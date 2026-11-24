import { PackageDuration } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

const PRICE_RE = /^\d{1,7}(\.\d{1,2})?$/;

export class CreatePackageDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @IsEnum(PackageDuration)
  duration!: PackageDuration;

  /** BDT as a decimal string ("499" / "499.50") — never a float. */
  @IsString()
  @Matches(PRICE_RE, { message: 'priceBdt must be an amount like 499 or 499.50' })
  priceBdt!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string | null;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(200, { each: true })
  features?: string[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10_000)
  sortOrder?: number;
}

export class UpdatePackageDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsEnum(PackageDuration)
  duration?: PackageDuration;

  @IsOptional()
  @IsString()
  @Matches(PRICE_RE, { message: 'priceBdt must be an amount like 499 or 499.50' })
  priceBdt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string | null;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(200, { each: true })
  features?: string[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10_000)
  sortOrder?: number;
}

export class UpdateAccessSettingsDto {
  @IsOptional()
  @IsBoolean()
  paidSystemEnabled?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10_000)
  preliFreeSetCount?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10_000)
  writtenFreeSetCount?: number;
}

export class CheckoutDto {
  @IsUUID()
  packageId!: string;
}

export class ManualGrantDto {
  @IsOptional()
  @IsUUID()
  packageId?: string;

  @IsOptional()
  @IsISO8601()
  endsAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class ExtendSubscriptionDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(3650)
  days!: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class SubscriptionNoteDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
