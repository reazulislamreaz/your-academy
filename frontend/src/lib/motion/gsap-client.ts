/**
 * Shared GSAP loader — dynamic imports keep the library off the critical path.
 * Always pair animations with `gsap.context(...).revert()` on cleanup.
 */

export type GsapCore = typeof import('gsap').default;
export type ScrollTriggerType = typeof import('gsap/ScrollTrigger').ScrollTrigger;

let gsapPromise: Promise<GsapCore> | null = null;
let scrollTriggerPromise: Promise<ScrollTriggerType> | null = null;
let pluginRegistered = false;

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return true;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function loadGsap(): Promise<GsapCore> {
  if (!gsapPromise) {
    gsapPromise = import('gsap').then((m) => m.default);
  }
  return gsapPromise;
}

export async function loadScrollTrigger(): Promise<{
  gsap: GsapCore;
  ScrollTrigger: ScrollTriggerType;
}> {
  const [gsap, ScrollTrigger] = await Promise.all([
    loadGsap(),
    (scrollTriggerPromise ??= import('gsap/ScrollTrigger').then((m) => m.ScrollTrigger)),
  ]);
  if (!pluginRegistered) {
    gsap.registerPlugin(ScrollTrigger);
    pluginRegistered = true;
  }
  return { gsap, ScrollTrigger };
}

/** Premium YA motion tokens — short, transform/opacity only. */
export const YA_MOTION = {
  ease: 'power3.out',
  duration: 0.42,
  stagger: 0.045,
  /** Never start from 0 — keeps LCP / no-JS content readable. */
  fromOpacity: 0.92,
  fromY: 14,
  heroY: 10,
  pageY: 8,
  pageDuration: 0.32,
} as const;
