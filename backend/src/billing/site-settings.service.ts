import { Injectable } from '@nestjs/common';
import type { SiteAccessSettings } from '@your-academy/shared';
import { PrismaService } from '../database/prisma.service';

const SETTINGS_ID = 'default';
/**
 * Short in-process cache: settings are read on every gated request. Updates through this
 * service clear it at once; another API replica picks a change up within this window.
 */
const CACHE_MS = 5_000;

export type SiteSettingsSnapshot = {
  paidSystemEnabled: boolean;
  preliFreeSetCount: number;
  writtenFreeSetCount: number;
  updatedAt: Date;
};

export type SiteSettingsUpdate = Partial<
  Pick<SiteSettingsSnapshot, 'paidSystemEnabled' | 'preliFreeSetCount' | 'writtenFreeSetCount'>
>;

/** DEC-060 — the single `site_settings` row (paid switch + free set counts). */
@Injectable()
export class SiteSettingsService {
  private cache: { value: SiteSettingsSnapshot; at: number } | null = null;

  constructor(private readonly prisma: PrismaService) {}

  async get(): Promise<SiteSettingsSnapshot> {
    if (this.cache && Date.now() - this.cache.at < CACHE_MS) return this.cache.value;
    // Upsert keeps the API working even if the row was removed by hand (safe defaults).
    const row = await this.prisma.siteSetting.upsert({
      where: { id: SETTINGS_ID },
      update: {},
      create: { id: SETTINGS_ID },
    });
    const value: SiteSettingsSnapshot = {
      paidSystemEnabled: row.paidSystemEnabled,
      preliFreeSetCount: row.preliFreeSetCount,
      writtenFreeSetCount: row.writtenFreeSetCount,
      updatedAt: row.updatedAt,
    };
    this.cache = { value, at: Date.now() };
    return value;
  }

  async update(patch: SiteSettingsUpdate, actorUserId: string): Promise<SiteSettingsSnapshot> {
    await this.prisma.siteSetting.upsert({
      where: { id: SETTINGS_ID },
      update: { ...patch, updatedById: actorUserId },
      create: { id: SETTINGS_ID, ...patch, updatedById: actorUserId },
    });
    this.cache = null;
    return this.get();
  }

  toDto(s: SiteSettingsSnapshot): SiteAccessSettings {
    return {
      paidSystemEnabled: s.paidSystemEnabled,
      preliFreeSetCount: s.preliFreeSetCount,
      writtenFreeSetCount: s.writtenFreeSetCount,
      updatedAt: s.updatedAt.toISOString(),
    };
  }
}
