import { z } from 'zod';

/** Supported footer social platforms (DEC-046). */
export const SOCIAL_PLATFORMS = [
  'FACEBOOK',
  'INSTAGRAM',
  'YOUTUBE',
  'LINKEDIN',
  'X',
  'WHATSAPP',
  'TELEGRAM',
  'TIKTOK',
] as const;

export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number];

export const SOCIAL_PLATFORM_LABELS: Record<SocialPlatform, string> = {
  FACEBOOK: 'Facebook',
  INSTAGRAM: 'Instagram',
  YOUTUBE: 'YouTube',
  LINKEDIN: 'LinkedIn',
  X: 'X (Twitter)',
  WHATSAPP: 'WhatsApp',
  TELEGRAM: 'Telegram',
  TIKTOK: 'TikTok',
};

export const socialPlatformSchema = z.enum(SOCIAL_PLATFORMS);

export const socialLinkPublicSchema = z.object({
  id: z.string().uuid(),
  platform: socialPlatformSchema,
  label: z.string().min(1).max(80),
  url: z.string().url().max(500),
  sortOrder: z.number().int(),
});

export type SocialLinkPublic = z.infer<typeof socialLinkPublicSchema>;

export const socialLinkAdminSchema = socialLinkPublicSchema.extend({
  enabled: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type SocialLinkAdmin = z.infer<typeof socialLinkAdminSchema>;

export function resolveSocialLabel(
  platform: SocialPlatform,
  label?: string | null,
): string {
  const trimmed = label?.trim();
  return trimmed || SOCIAL_PLATFORM_LABELS[platform];
}
