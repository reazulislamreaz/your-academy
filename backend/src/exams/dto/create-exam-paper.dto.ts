import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateExamPaperDto {
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title!: string;

  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'slug must be lowercase letters, numbers and hyphens',
  })
  @MaxLength(220)
  slug?: string;

  @IsString()
  @MinLength(2)
  @MaxLength(80)
  examBody!: string;

  @IsOptional()
  @IsInt()
  @Min(1900)
  @Max(2100)
  year?: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsInt()
  @Min(1)
  @Max(24 * 60)
  durationMinutes!: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  totalMarks?: number;

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}

export class UpdateExamPaperDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'slug must be lowercase letters, numbers and hyphens',
  })
  @MaxLength(220)
  slug?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  examBody?: string;

  @IsOptional()
  @IsInt()
  @Min(1900)
  @Max(2100)
  year?: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(24 * 60)
  durationMinutes?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  totalMarks?: number;

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}
