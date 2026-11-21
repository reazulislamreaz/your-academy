import { CategoryScope } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateCategoryDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  /** Optional — server generates a unique slug from the name when omitted. */
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(140)
  slug?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsUUID()
  parentId?: string;

  /** Bank taxonomy scope. Inherited from parent when creating a subcategory. */
  @IsOptional()
  @IsEnum(CategoryScope)
  scope?: CategoryScope;

  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  /** Homepage icon key (TOPIC taxonomy). */
  @IsOptional()
  @IsString()
  @MaxLength(40)
  iconKey?: string | null;
}
