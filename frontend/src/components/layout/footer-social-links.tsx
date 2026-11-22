import type { SocialLinkPublic } from '@your-academy/shared';
import { SocialPlatformIcon } from '@/lib/marketing/social-platform-icon';

type Props = {
  links: SocialLinkPublic[];
};

/** Footer social row — URLs come from admin-managed DB rows (DEC-046). */
export function FooterSocialLinks({ links }: Props) {
  if (!links.length) return null;

  return (
    <ul className="site-footer-social" aria-label="Social media">
      {links.map((link) => (
        <li key={link.id}>
          <a
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="site-footer-social-link"
            aria-label={link.label}
            title={link.label}
            data-platform={link.platform}
          >
            <SocialPlatformIcon platform={link.platform} />
          </a>
        </li>
      ))}
    </ul>
  );
}
