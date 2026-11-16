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

const TIMER_PRESETS = [15 * 60, 30 * 60, 45 * 60, 60 * 60] as const;

/** Learner start options — timed uses set duration or allowlisted presets when set is untimed. */
export class StartAttemptDto {
  @IsOptional()
  @IsBoolean()
  timed?: boolean;

  /** Seconds; only used when timed and the practice set has no admin duration. */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(60)
  @Max(60 * 60)
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
