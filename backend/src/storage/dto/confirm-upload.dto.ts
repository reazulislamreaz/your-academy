import { IsIn, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { UPLOAD_PURPOSES } from '../storage.types';

export class ConfirmUploadDto {
  @IsString()
  @IsIn([...UPLOAD_PURPOSES])
  purpose!: (typeof UPLOAD_PURPOSES)[number];

  @IsString()
  @MaxLength(255)
  publicId!: string;

  @IsOptional()
  @IsIn(['image', 'raw'])
  resourceType?: 'image' | 'raw';

  @IsOptional()
  @IsInt()
  @Min(0)
  bytes?: number;

  @IsOptional()
  @IsString()
  @MaxLength(127)
  mimeType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  format?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  width?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  height?: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  originalFilename?: string;
}
