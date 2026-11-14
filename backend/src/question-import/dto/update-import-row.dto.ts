import { IsOptional, IsString, MaxLength, ValidateIf } from 'class-validator';

export class UpdateImportRowDto {
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsString()
  @MaxLength(32)
  /** ISO date YYYY-MM-DD, or null to clear. */
  questionDate?: string | null;
}
