import { homepagePayloadSchema, type HomepagePayload } from '@your-academy/shared';
import { ApiError } from '@/lib/api/client';

export type FieldErrors = Record<string, string>;

const HREF_HINT =
  'Must be a site path starting with "/" or a full URL starting with "https://" (or "http://" for local).';

function isPlausibleHref(href: string): boolean {
  const v = href.trim();
  if (!v) return false;
  if (v.startsWith('/')) return true;
  try {
    const u = new URL(v);
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch {
    return false;
  }
}

function pushCtaErrors(
  errors: FieldErrors,
  prefix: string,
  cta: { label: string; href: string },
  labelName: string,
) {
  if (!cta.label.trim()) {
    errors[`${prefix}.label`] = `${labelName} button text is required.`;
  } else if (cta.label.length > 200) {
    errors[`${prefix}.label`] = `${labelName} button text must be 200 characters or fewer.`;
  }
  if (!cta.href.trim()) {
    errors[`${prefix}.href`] = `${labelName} link is required.`;
  } else if (cta.href.length > 500) {
    errors[`${prefix}.href`] = `${labelName} link must be 500 characters or fewer.`;
  } else if (!isPlausibleHref(cta.href)) {
    errors[`${prefix}.href`] = `${labelName} link: ${HREF_HINT}`;
  }
}

/**
 * Client-side validation before draft save / publish.
 * Returns a map of dotted paths → human-readable messages.
 */
export function validateHomepageDraft(payload: HomepagePayload): {
  ok: boolean;
  errors: FieldErrors;
  summary?: string;
} {
  const errors: FieldErrors = {};

  const parsed = homepagePayloadSchema.safeParse(payload);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const path = issue.path.join('.') || 'payload';
      if (!errors[path]) errors[path] = issue.message;
    }
  }

  const hero = payload.hero;
  if (!hero.titleBefore.trim()) {
    errors['hero.titleBefore'] = 'Main title is required.';
  } else if (hero.titleBefore.length > 500) {
    errors['hero.titleBefore'] = 'Main title must be 500 characters or fewer.';
  }
  if (hero.eyebrow.length > 500) {
    errors['hero.eyebrow'] = 'Eyebrow must be 500 characters or fewer.';
  }
  if (hero.description.length > 4000) {
    errors['hero.description'] = 'Subtitle / description must be 4000 characters or fewer.';
  }
  pushCtaErrors(errors, 'hero.primaryCta', hero.primaryCta, 'Primary CTA');
  pushCtaErrors(errors, 'hero.secondaryCta', hero.secondaryCta, 'Secondary CTA');

  if (payload.topics.heading.length > 500) {
    errors['topics.heading'] = 'Topic section heading must be 500 characters or fewer.';
  }
  if ((payload.topics.subtitle ?? '').length > 500) {
    errors['topics.subtitle'] =
      'Topic section description must be 500 characters or fewer.';
  }

  const keys = Object.keys(errors);
  if (keys.length === 0) return { ok: true, errors: {} };

  const heroKeys = keys.filter((k) => k.startsWith('hero.'));
  const summary = heroKeys.length
    ? `Could not save: fix ${heroKeys.length} Hero field${heroKeys.length === 1 ? '' : 's'} (and any other highlighted fields).`
    : `Could not save: ${keys.length} field${keys.length === 1 ? '' : 's'} need attention.`;

  return { ok: false, errors, summary };
}

/** Map API / network failures to plain-language admin banners. */
export function formatHomepageSaveError(err: unknown, action: 'save' | 'publish'): string {
  const verb = action === 'publish' ? 'publish homepage' : 'save homepage draft';
  if (err instanceof ApiError) {
    if (err.status === 401) {
      return 'Session expired: please log in again as Admin to save changes.';
    }
    if (err.status === 403) {
      return 'Permission denied: only Admin accounts can update the homepage.';
    }
    if (err.status === 429) {
      return 'Too many requests — wait a moment and try saving again.';
    }
    if (err.code === 'INVALID_HOMEPAGE_PAYLOAD' || err.status === 400) {
      return `Failed to ${verb}: ${err.message}`;
    }
    if (err.code === 'MEDIA_NOT_FOUND') {
      return 'Failed to save: a hero or tile logo asset was not found. Re-upload the image and try again.';
    }
    if (err.code === 'NETWORK_ERROR' || err.status === 0) {
      return `Failed to ${verb}: network error (${err.message}). Check your connection.`;
    }
    if (err.code === 'REQUEST_TIMEOUT' || err.status === 408) {
      return `Failed to ${verb}: the request timed out. Try again.`;
    }
    if (err.code === 'INVALID_JSON' || err.code === 'EMPTY_RESPONSE') {
      return `Failed to ${verb}: ${err.message}. If the API was just restarted, wait a few seconds and try again.`;
    }
    if (err.status >= 500) {
      return `Failed to ${verb}: server error (${err.code}). Try again or check API logs.`;
    }
    return `Failed to ${verb}: ${err.message} (${err.code})`;
  }
  if (err instanceof Error) {
    return `Failed to ${verb}: ${err.message}`;
  }
  return `Failed to ${verb}: unexpected error.`;
}
