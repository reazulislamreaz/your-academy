import { IsOptional, IsString, IsUUID, MaxLength, MinLength, ValidateIf } from 'class-validator';

export class SendSupportMessageDto {
  @IsOptional()
  @IsString()
  @MaxLength(64)
  clientMessageId?: string;

  @ValidateIf((o: SendSupportMessageDto) => !o.mediaAssetId)
  @IsString()
  @MinLength(1)
  @MaxLength(8000)
  body?: string;

  @IsOptional()
  @IsUUID()
  mediaAssetId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  originalFilename?: string;
}
