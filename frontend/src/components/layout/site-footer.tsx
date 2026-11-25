import { GsapReveal } from '@/components/motion/gsap-reveal';
import { getPublicSocialLinks } from '@/lib/api/social-links';
import { getFooterContent } from '@/lib/site-content';
import { SiteFooterView } from './site-footer-view';

/**
 * Server Component footer — loads admin-managed social links (DEC-046) on the
 * server so they are not trapped behind the client `MarketingShell` boundary.
 * Must be passed into the shell as a `footer` slot (never imported by a client file).
 */
export async function SiteFooter() {
  const [socialLinks, content] = await Promise.all([getPublicSocialLinks(), getFooterContent()]);
  return (
    <GsapReveal y={16} start="top 96%">
      <SiteFooterView socialLinks={socialLinks} content={content} />
    </GsapReveal>
  );
}
