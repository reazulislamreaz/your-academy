import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { SOCIAL_PLATFORMS, type SocialPlatform } from '@your-academy/shared';

export class CreateSocialLinkDto {
  /** Shared enum — avoids Nest compile failures when Prisma client lags behind migrate. */
  @IsIn([...SOCIAL_PLATFORMS])
  platform!: SocialPlatform;

  @IsUrl({ require_protocol: true, protocols: ['http', 'https'] })
  @MaxLength(500)
  url!: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  label?: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class UpdateSocialLinkDto {
  @IsOptional()
  @IsUrl({ require_protocol: true, protocols: ['http', 'https'] })
  @MaxLength(500)
  url?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  label?: string | null;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class ReorderSocialLinksDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  orderedIds!: string[];
}
