import { IsUUID } from 'class-validator';

/** SEC-8 — was an inline type, which the global ValidationPipe cannot validate. */
export class SetAvatarDto {
  @IsUUID()
  mediaAssetId!: string;
}
