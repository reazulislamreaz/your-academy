import { IsOptional, IsString, MaxLength, ValidateIf } from 'class-validator';

export class UpdateBatchDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  displayName?: string;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  subjectHint?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  topicHint?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  examCategoryHint?: string | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsString()
  @MaxLength(32)
  /** Collection default / primary question date (YYYY-MM-DD). */
  questionDate?: string | null;
}
