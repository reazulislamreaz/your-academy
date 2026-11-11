import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class ConfirmImportDto {
  @IsOptional()
  @IsBoolean()
  skipDuplicates?: boolean;
}

export class UploadMetaDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  batchCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  displayName?: string;
}
