import { Allow, IsObject, IsOptional, IsUUID, ValidateIf } from 'class-validator';

/**
 * Draft save body. Nested `payload` is validated in HomepageService via Zod
 * (`homepagePayloadSchema`) — class-validator only checks the envelope shape.
 */
export class UpdateHomepageDraftDto {
  @IsObject()
  @Allow()
  payload!: Record<string, unknown>;

  /** Explicit null clears the hero image; omit to leave unchanged. */
  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @IsUUID()
  heroImageAssetId?: string | null;
}
