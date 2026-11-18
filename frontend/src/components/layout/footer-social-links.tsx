import type { FooterSocialId } from '@/lib/marketing/footer-social';
import { getFooterSocialLinks } from '@/lib/marketing/footer-social';
import { cn } from '@/lib/utils';

/** Glass icon row for marketing footer social profiles. */
export function FooterSocialLinks() {
  const links = getFooterSocialLinks();

  return (
    <ul className="site-footer-social" aria-label="Social media">
      {links.map((link) => {
        const configured = Boolean(link.href);
        const icon = <SocialGlyph id={link.id} className="size-4" />;

        if (!configured) {
          return (
            <li key={link.id}>
              <span
                className={cn('site-footer-social-link', 'is-unconfigured')}
                title={`${link.label} — set ${link.envKey} in .env`}
                aria-label={`${link.label} (not configured)`}
                data-network={link.id}
              >
                {icon}
              </span>
            </li>
          );
        }

        return (
          <li key={link.id}>
            <a
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="site-footer-social-link"
              aria-label={link.label}
              title={link.label}
              data-network={link.id}
            >
              {icon}
            </a>
          </li>
        );
      })}
    </ul>
  );
}

function SocialGlyph({ id, className }: { id: FooterSocialId; className?: string }) {
  switch (id) {
    case 'facebook':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
          <path d="M14 13.5h2.5l1-4H14v-2c0-1.03 0-2 2-2h1.5V2.14C17.26 2.09 16.09 2 14.86 2 12.04 2 10 3.72 10 7.05V9.5H7v4h3V22h4z" />
        </svg>
      );
    case 'instagram':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
          <path d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5zm0 2a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3H7zm11 1.5a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5zM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10zm0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6z" />
        </svg>
      );
    case 'youtube':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
          <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31.5 31.5 0 0 0 0 12a31.5 31.5 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1A31.5 31.5 0 0 0 24 12a31.5 31.5 0 0 0-.5-5.8zM9.75 15.5v-7l6.5 3.5-6.5 3.5z" />
        </svg>
      );
    case 'linkedin':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
          <path d="M6.94 6.5A2.19 2.19 0 1 1 4.75 4.3 2.19 2.19 0 0 1 6.94 6.5zM4.9 8.75h4.08V21H4.9zm7.04 0h3.91v1.67h.06a4.28 4.28 0 0 1 3.86-2.12c4.13 0 4.89 2.72 4.89 6.25V21h-4.08v-5.54c0-1.32 0-3.02-1.84-3.02s-2.12 1.44-2.12 2.93V21h-4.08z" />
        </svg>
      );
    case 'x':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
          <path d="M18.9 2H22l-6.78 7.75L23.2 22h-6.5l-5.09-6.65L5.8 22H2.68l7.25-8.29L.8 2h6.66l4.6 6.1L18.9 2zm-1.14 18h1.8L6.36 3.9H4.43L17.76 20z" />
        </svg>
      );
    case 'whatsapp':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
          <path d="M20.5 3.5A10.5 10.5 0 0 0 3.3 17.7L2 22l4.4-1.15A10.5 10.5 0 1 0 20.5 3.5zM12 20a8 8 0 0 1-4.08-1.12l-.29-.17-2.61.68.7-2.54-.19-.3A8 8 0 1 1 12 20zm4.4-5.65c-.24-.12-1.42-.7-1.64-.78s-.38-.12-.54.12-.62.78-.76.94-.28.18-.52.06a6.55 6.55 0 0 1-1.92-1.18 7.2 7.2 0 0 1-1.33-1.66c-.14-.24 0-.37.1-.49s.24-.28.36-.42.16-.24.24-.4.04-.3-.02-.42-.54-1.3-.74-1.78-.39-.41-.54-.42h-.46a.88.88 0 0 0-.64.3 2.67 2.67 0 0 0-.84 2 4.64 4.64 0 0 0 1 2.46 10.6 10.6 0 0 0 4.05 3.57c.56.24 1 .38 1.34.49a3.23 3.23 0 0 0 1.48.09 2.43 2.43 0 0 0 1.6-1.13 2 2 0 0 0 .14-1.13c-.06-.1-.22-.16-.46-.28z" />
        </svg>
      );
    case 'telegram':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
          <path d="M21.8 4.2 2.9 11.5c-1.3.5-1.28 1.24-.24 1.57l4.85 1.51 1.84 5.66c.23.7.12.98.8.98.53 0 .76-.24 1.06-.53l2.55-2.48 5.3 3.91c.97.54 1.67.26 1.91-.9L23.9 5.5c.33-1.31-.47-1.9-1.1-1.3zm-3.1 2.5-10.1 9.2-.4 3.8-2.05-6.8z" />
        </svg>
      );
    case 'tiktok':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
          <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 0 0-.79-.05A6.34 6.34 0 0 0 3.15 15.2a6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.73a8.18 8.18 0 0 0 4.76 1.52V6.8a4.85 4.85 0 0 1-1-.11Z" />
        </svg>
      );
    default:
      return null;
  }
}
