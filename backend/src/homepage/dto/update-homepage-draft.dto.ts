import { Type } from 'class-transformer';
import { Allow, IsObject, IsOptional, IsUUID, ValidateNested } from 'class-validator';

/** Payload validated in service via Zod (homepagePayloadSchema). */
export class UpdateHomepageDraftDto {
  @IsObject()
  @Allow()
  payload!: Record<string, unknown>;

  @IsOptional()
  @IsUUID()
  heroImageAssetId?: string | null;
}
