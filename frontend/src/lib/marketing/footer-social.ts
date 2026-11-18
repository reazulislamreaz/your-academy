export type FooterSocialId =
  | 'facebook'
  | 'instagram'
  | 'youtube'
  | 'linkedin'
  | 'x'
  | 'whatsapp'
  | 'telegram'
  | 'tiktok';

export type FooterSocialLink = {
  id: FooterSocialId;
  label: string;
  /** Public profile / channel URL from `NEXT_PUBLIC_SOCIAL_*`. Empty until configured. */
  href: string;
  envKey: string;
};

function envUrl(name: string): string {
  const value = process.env[name];
  return typeof value === 'string' ? value.trim() : '';
}

/**
 * Footer social profiles. Set matching `NEXT_PUBLIC_SOCIAL_*` values in `.env`
 * so icons become clickable outbound links.
 */
export function getFooterSocialLinks(): FooterSocialLink[] {
  return [
    {
      id: 'facebook',
      label: 'Facebook',
      envKey: 'NEXT_PUBLIC_SOCIAL_FACEBOOK_URL',
      href: envUrl('NEXT_PUBLIC_SOCIAL_FACEBOOK_URL'),
    },
    {
      id: 'instagram',
      label: 'Instagram',
      envKey: 'NEXT_PUBLIC_SOCIAL_INSTAGRAM_URL',
      href: envUrl('NEXT_PUBLIC_SOCIAL_INSTAGRAM_URL'),
    },
    {
      id: 'youtube',
      label: 'YouTube',
      envKey: 'NEXT_PUBLIC_SOCIAL_YOUTUBE_URL',
      href: envUrl('NEXT_PUBLIC_SOCIAL_YOUTUBE_URL'),
    },
    {
      id: 'linkedin',
      label: 'LinkedIn',
      envKey: 'NEXT_PUBLIC_SOCIAL_LINKEDIN_URL',
      href: envUrl('NEXT_PUBLIC_SOCIAL_LINKEDIN_URL'),
    },
    {
      id: 'x',
      label: 'X (Twitter)',
      envKey: 'NEXT_PUBLIC_SOCIAL_X_URL',
      href: envUrl('NEXT_PUBLIC_SOCIAL_X_URL'),
    },
    {
      id: 'whatsapp',
      label: 'WhatsApp',
      envKey: 'NEXT_PUBLIC_SOCIAL_WHATSAPP_URL',
      href: envUrl('NEXT_PUBLIC_SOCIAL_WHATSAPP_URL'),
    },
    {
      id: 'telegram',
      label: 'Telegram',
      envKey: 'NEXT_PUBLIC_SOCIAL_TELEGRAM_URL',
      href: envUrl('NEXT_PUBLIC_SOCIAL_TELEGRAM_URL'),
    },
    {
      id: 'tiktok',
      label: 'TikTok',
      envKey: 'NEXT_PUBLIC_SOCIAL_TIKTOK_URL',
      href: envUrl('NEXT_PUBLIC_SOCIAL_TIKTOK_URL'),
    },
  ];
}
