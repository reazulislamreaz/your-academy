import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

class AttemptAnswerDto {
  @IsUUID()
  questionId!: string;

  @IsOptional()
  @IsUUID()
  selectedOptionId?: string | null;

  @IsOptional()
  @IsBoolean()
  markedForReview?: boolean;
}

export class SubmitAttemptDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttemptAnswerDto)
  answers!: AttemptAnswerDto[];
}

/** Mid-attempt progress save (does not finalize the attempt). */
export class SaveProgressDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttemptAnswerDto)
  answers!: AttemptAnswerDto[];
}

/** Quick-pick durations shown in the learner prestart UI. */
const TIMER_PRESETS = [15 * 60, 30 * 60, 45 * 60, 60 * 60, 90 * 60, 120 * 60] as const;

/** Absolute bounds for custom learner timers (5–180 minutes, whole minutes). */
export const TIMER_CUSTOM_MIN_SECONDS = 5 * 60;
export const TIMER_CUSTOM_MAX_SECONDS = 180 * 60;

/** Learner start options — timed uses default set duration or a custom/preset duration. */
export class StartAttemptDto {
  @IsOptional()
  @IsBoolean()
  timed?: boolean;

  /**
   * Whole-minute duration in seconds.
   * When provided with timed=true, overrides the default (capped by admin set duration when set).
   */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(TIMER_CUSTOM_MIN_SECONDS)
  @Max(TIMER_CUSTOM_MAX_SECONDS)
  durationSeconds?: number;
}

export { TIMER_PRESETS };

export class CreatePracticeSetDto {
  @IsString()
  @MaxLength(200)
  title!: string;

  @IsString()
  @MaxLength(220)
  slug!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  kind!: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  durationSeconds?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  marksPerCorrect?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  negativeMarkPerWrong?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  passMarkPercent?: number | null;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsUUID()
  subcategoryId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  examTag?: string;

  @IsOptional()
  @IsBoolean()
  isDaily?: boolean;

  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  questionIds!: string[];
}

export class UpdatePracticeSetDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  durationSeconds?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  marksPerCorrect?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  negativeMarkPerWrong?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  passMarkPercent?: number | null;

  @IsOptional()
  @IsUUID()
  categoryId?: string | null;

  @IsOptional()
  @IsUUID()
  subcategoryId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  examTag?: string | null;

  @IsOptional()
  @IsBoolean()
  isDaily?: boolean;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  questionIds?: string[];
}
