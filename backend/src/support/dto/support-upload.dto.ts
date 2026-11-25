import { IsIn, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

/**
 * SEC-8 — support attachment sign / confirm bodies (were inline types, so the global
 * ValidationPipe skipped them and a missing publicId crashed with a 500). Fields match what
 * the web client sends; mimeType / format are informational only (SEC-3 derives the type).
 */
export class SupportUploadSignDto {
  @IsOptional()
  @IsIn(['image', 'raw'])
  resourceType?: 'image' | 'raw';

  @IsOptional()
  @IsString()
  @MaxLength(127)
  mimeType?: string;
}

export class SupportUploadConfirmDto {
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
