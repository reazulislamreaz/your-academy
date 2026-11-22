import type { HomepagePayload } from '@your-academy/shared';
import {
  customSectionIdFromLayoutId,
  isCustomLayoutSectionId,
  normalizeHomepageLayout,
} from '@your-academy/shared';
import { HomepageAccessFaq } from '@/components/marketing/homepage-access-faq';
import {
  HomepageBankBrowseCategories,
  HomepageBankBrowseTopics,
  HomepageBankBrowseWrittenCategories,
} from '@/components/marketing/homepage-bank-browse';
import { HomepageCustomSection } from '@/components/marketing/homepage-custom-section';
import { HomepageDashboardPreview } from '@/components/marketing/homepage-dashboard-preview';
import { HomepageFinalCta } from '@/components/marketing/homepage-final-cta';
import { HomepageHero } from '@/components/marketing/homepage-hero';
import { HomepageHowItWorks } from '@/components/marketing/homepage-how-it-works';
import { HomepageLatestQuestions } from '@/components/marketing/homepage-latest-questions';
import { HomepageLiveStats } from '@/components/marketing/homepage-live-stats';
import { HomepageMidSections } from '@/components/marketing/homepage-mid-sections';
import { HomepageNewsStrip } from '@/components/marketing/homepage-news-strip';
import { HomepageProductFeatures } from '@/components/marketing/homepage-product-features';
import { HomepageSampleMcq } from '@/components/marketing/homepage-sample-mcq';
import { HomepageReveal } from '@/components/marketing/homepage-gsap';
import { NewsletterBar } from '@/components/marketing/newsletter-bar';
import type { PublicDocumentListItem } from '@/lib/api/public-documents';
import type { PublicQuestionCard } from '@/lib/api/public-questions';
import type { PublicPlatformStats } from '@/lib/api/public-stats';
import type { ApiResult } from '@/lib/api/client';
type Props = {
  payload: HomepagePayload;
  heroImageUrl: string | null;
  liveStats: PublicPlatformStats | null;
  sampleMcq: ApiResult<PublicQuestionCard[]> | null;
  newsDocs: ApiResult<PublicDocumentListItem[]> | null;
};

/**
 * Renders the marketing homepage from CMS layout order + section visibility.
 */
export function HomepageSectionsRenderer({
  payload,
  heroImageUrl,
  liveStats,
  sampleMcq,
  newsDocs,
}: Props) {
  const layout = normalizeHomepageLayout(payload.layout);

  return (
    <div className="homepage-shell flex w-full flex-1 flex-col">
      {layout.sections.map((entry) => {
        if (!entry.visible) return null;

        if (isCustomLayoutSectionId(entry.id)) {
          const customId = customSectionIdFromLayoutId(entry.id);
          const block = payload.customSections.find((c) => c.id === customId && c.visible);
          if (!block) return null;
          return <HomepageCustomSection key={entry.id} section={block} />;
        }

        switch (entry.id) {
          case 'hero':
            return payload.hero.visible ? (
              <HomepageHero
                key={entry.id}
                hero={payload.hero}
                heroImageUrl={heroImageUrl}
                liveStats={liveStats}
              />
            ) : null;
          case 'trialStrip':
            // Free trials disabled — never render the promotional strip.
            return null;
          case 'liveStats':
            return payload.liveStats.visible ? (
              <HomepageLiveStats key={entry.id} stats={liveStats} content={payload.liveStats} />
            ) : null;
          case 'categories':
            return payload.categories.visible ? (
              <HomepageBankBrowseCategories
                key={entry.id}
                categories={payload.categories}
              />
            ) : null;
          case 'writtenCategories':
            return payload.writtenCategories.visible ? (
              <HomepageBankBrowseWrittenCategories
                key={entry.id}
                writtenCategories={payload.writtenCategories}
              />
            ) : null;
          case 'topics':
            return payload.topics.visible ? (
              <HomepageBankBrowseTopics key={entry.id} topics={payload.topics} />
            ) : null;
          case 'sampleMcq':
            return payload.sampleMcq.visible ? (
              <HomepageSampleMcq key={entry.id} initial={sampleMcq} content={payload.sampleMcq} />
            ) : null;
          case 'productFeatures':
            return payload.productFeatures.visible ? (
              <HomepageProductFeatures key={entry.id} content={payload.productFeatures} />
            ) : null;
          case 'howItWorks':
            return payload.howItWorks.visible ? (
              <HomepageHowItWorks key={entry.id} content={payload.howItWorks} />
            ) : null;
          case 'dashboardPreview':
            return payload.dashboardPreview.visible ? (
              <HomepageDashboardPreview key={entry.id} content={payload.dashboardPreview} />
            ) : null;
          case 'why':
            return payload.why.visible ? (
              <HomepageMidSections key={entry.id} why={payload.why} />
            ) : null;
          case 'latest':
            return payload.latest.visible ? (
              <HomepageLatestQuestions key={entry.id} latest={payload.latest} />
            ) : null;
          case 'newsStrip':
            return payload.newsStrip.visible ? (
              <HomepageNewsStrip
                key={entry.id}
                initial={newsDocs}
                content={payload.newsStrip}
              />
            ) : null;
          case 'accessFaq':
            return payload.accessFaq.visible ? (
              <HomepageAccessFaq key={entry.id} content={payload.accessFaq} />
            ) : null;
          case 'ctaBanner':
            return payload.ctaBanner.visible ? (
              <HomepageFinalCta key={entry.id} ctaBanner={payload.ctaBanner} />
            ) : null;
          case 'newsletter':
            return payload.newsletter.visible ? (
              <section key={entry.id} className="hp-section hp-newsletter-section">
                <HomepageReveal className="marketing-container">
                  <NewsletterBar newsletter={payload.newsletter} />
                </HomepageReveal>
              </section>
            ) : null;
          default:
            return null;
        }
      })}
    </div>
  );
}
