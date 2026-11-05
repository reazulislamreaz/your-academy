import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateIf,
} from 'class-validator';

export class UpdateStudyPrefsDto {
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(3)
  @IsUUID('4', { each: true })
  preferredCategoryIds?: string[];

  /** Pass null to clear the continue pointer. */
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsUUID('4')
  lastQuestionId?: string | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== '')
  @IsString()
  @MaxLength(512)
  lastQuestionFilterQs?: string | null;

  @IsOptional()
  @IsBoolean()
  onboardingCompleted?: boolean;
}
