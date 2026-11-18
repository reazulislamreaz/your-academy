import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class ConfirmWrittenImportDto {
  @IsOptional()
  @IsBoolean()
  skipDuplicates?: boolean;
}

export class UpdateWrittenBatchDto {
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
  @IsString()
  questionDate?: string | null;
}

export class UpdateWrittenImportRowDto {
  @IsOptional()
  @IsString()
  questionDate?: string | null;
}
