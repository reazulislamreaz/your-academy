import {
  IsBoolean,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class SubmitExamAttemptDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  userName!: string;

  /** Map of questionId → selected option text. */
  @IsObject()
  userAnswers!: Record<string, string>;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(60 * 60 * 12)
  elapsedSeconds?: number;

  @IsOptional()
  @IsBoolean()
  timedOut?: boolean;
}
