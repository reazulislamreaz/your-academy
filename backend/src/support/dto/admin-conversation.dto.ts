import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { SupportConversationStatus } from '@prisma/client';

export class UpdateSupportConversationDto {
  @IsOptional()
  @IsEnum(SupportConversationStatus)
  status?: SupportConversationStatus;

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsUUID()
  assignedAdminId?: string | null;
}

export class CreateInternalNoteDto {
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  body!: string;
}

export class AdminConversationQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  q?: string;

  @IsOptional()
  @IsEnum(SupportConversationStatus)
  status?: SupportConversationStatus;

  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @IsString()
  limit?: string;
}
