import { PackageDuration, PlanKey } from '@prisma/client';
import { Type } from 'class-transformer';
import { SELLABLE_PACKAGE_DURATIONS } from '@your-academy/shared';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
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
const DURATION_MSG = {
  message: `duration must be one of ${SELLABLE_PACKAGE_DURATIONS.join(', ')}`,
};

export class CreatePackageDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  /** Legacy MONTHLY can no longer be chosen (DEC-062). */
  @IsIn(SELLABLE_PACKAGE_DURATIONS, DURATION_MSG)
  duration!: PackageDuration;

  /** BDT as a decimal string ("499" / "499.50") — never a float. */
  @IsString()
  @Matches(PRICE_RE, { message: 'priceBdt must be an amount like 499 or 499.50' })
  priceBdt!: string;

  /** Sale price below priceBdt; null removes the discount. */
  @IsOptional()
  @IsString()
  @Matches(PRICE_RE, { message: 'discountedPriceBdt must be an amount like 399 or 399.50' })
  discountedPriceBdt?: string | null;

  @IsOptional()
  @IsBoolean()
  isPopular?: boolean;

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

  /** Legacy MONTHLY may be kept on an old package, never chosen anew (PackagesService). */
  @IsOptional()
  @IsEnum(PackageDuration)
  duration?: PackageDuration;

  @IsOptional()
  @IsString()
  @Matches(PRICE_RE, { message: 'priceBdt must be an amount like 499 or 499.50' })
  priceBdt?: string;

  /** Sale price below priceBdt; null removes the discount. */
  @IsOptional()
  @IsString()
  @Matches(PRICE_RE, { message: 'discountedPriceBdt must be an amount like 399 or 399.50' })
  discountedPriceBdt?: string | null;

  @IsOptional()
  @IsBoolean()
  isPopular?: boolean;

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

/** DEC-062 — learner schedules a downgrade for the next renewal. */
export class ScheduleChangeDto {
  @IsUUID()
  packageId!: string;
}

/** DEC-065 — homepage Free vs Paid comparison rows (display only). */
export class CreatePlanFeatureDto {
  @IsEnum(PlanKey)
  planKey!: PlanKey;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  label!: string;

  @IsOptional()
  @IsBoolean()
  isIncluded?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdatePlanFeatureDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  label?: string;

  @IsOptional()
  @IsBoolean()
  isIncluded?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class ReorderPlanFeaturesDto {
  @IsEnum(PlanKey)
  planKey!: PlanKey;

  @IsArray()
  @ArrayMaxSize(100)
  @IsUUID('all', { each: true })
  ids!: string[];
}

/** Plan 1 — Admin → Packages up/down order. */
export class ReorderPackagesDto {
  @IsArray()
  @ArrayMaxSize(50)
  @IsUUID('all', { each: true })
  ids!: string[];
}
