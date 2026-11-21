import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class ExamGuideItemDto {
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  id!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(500)
  text!: string;
}

export class UpdateExamGuideDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string;

  @IsArray()
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => ExamGuideItemDto)
  items!: ExamGuideItemDto[];
}
