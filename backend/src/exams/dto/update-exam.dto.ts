import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';

/** Quiz (guest exam) details. The slug stays fixed so shared links keep working. */
export class UpdateExamDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title?: string;

  /** null or "" clears it. */
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsString()
  @MaxLength(5000)
  description?: string | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(600)
  durationInMinutes?: number;

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}

/** One quiz question. `correctOptionIndex` is 0–3 (ক / খ / গ / ঘ). */
export class UpdateExamQuestionDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  questionText?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(4)
  @ArrayMaxSize(4)
  @IsString({ each: true })
  @MinLength(1, { each: true })
  @MaxLength(1000, { each: true })
  options?: string[];

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(3)
  correctOptionIndex?: number;

  /** null or "" clears it. */
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsString()
  @MaxLength(5000)
  explanation?: string | null;
}
