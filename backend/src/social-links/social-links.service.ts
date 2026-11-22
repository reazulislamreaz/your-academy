import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, SocialPlatform } from '@prisma/client';
import {
  createErrorResponse,
  resolveSocialLabel,
  type SocialLinkAdmin,
  type SocialLinkPublic,
  type SocialPlatform as SharedSocialPlatform,
} from '@your-academy/shared';
import { PrismaService } from '../database/prisma.service';
import { newRequestId } from '../common/request-id';
import type { CreateSocialLinkDto, UpdateSocialLinkDto } from './dto/create-social-link.dto';

@Injectable()
export class SocialLinksService {
  constructor(private readonly prisma: PrismaService) {}

  async listPublic(): Promise<SocialLinkPublic[]> {
    const rows = await this.prisma.socialLink.findMany({
      where: { enabled: true },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });
    return rows
      .filter((row) => row.url.trim().length > 0)
      .map((row) => this.toPublic(row));
  }

  async listAdmin(): Promise<SocialLinkAdmin[]> {
    const rows = await this.prisma.socialLink.findMany({
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });
    return rows.map((row) => this.toAdmin(row));
  }

  async create(dto: CreateSocialLinkDto): Promise<SocialLinkAdmin> {
    const url = this.normalizeUrl(dto.url);
    const label = dto.label?.trim() ?? '';
    const enabled = dto.enabled ?? true;

    let sortOrder = dto.sortOrder;
    if (sortOrder === undefined) {
      const agg = await this.prisma.socialLink.aggregate({ _max: { sortOrder: true } });
      sortOrder = (agg._max.sortOrder ?? -1) + 1;
    }

    try {
      const row = await this.prisma.socialLink.create({
        data: {
          platform: dto.platform,
          url,
          label,
          enabled,
          sortOrder,
        },
      });
      return this.toAdmin(row);
    } catch (err) {
      const code =
        typeof err === 'object' && err && 'code' in err
          ? String((err as { code: unknown }).code)
          : '';
      if (code === 'P2002') {
        throw new ConflictException(
          createErrorResponse(
            'SOCIAL_LINK_EXISTS',
            'A link for this platform already exists — edit or delete it instead',
            newRequestId(),
          ),
        );
      }
      throw err;
    }
  }

  async update(id: string, dto: UpdateSocialLinkDto): Promise<SocialLinkAdmin> {
    await this.requireRow(id);
    const data: Prisma.SocialLinkUpdateInput = {};
    if (dto.url !== undefined) data.url = this.normalizeUrl(dto.url);
    if (dto.label !== undefined) data.label = dto.label?.trim() ?? '';
    if (dto.enabled !== undefined) data.enabled = dto.enabled;
    if (dto.sortOrder !== undefined) data.sortOrder = dto.sortOrder;

    const row = await this.prisma.socialLink.update({ where: { id }, data });
    return this.toAdmin(row);
  }

  async remove(id: string): Promise<{ id: string }> {
    await this.requireRow(id);
    await this.prisma.socialLink.delete({ where: { id } });
    return { id };
  }

  async reorder(orderedIds: string[]): Promise<SocialLinkAdmin[]> {
    const unique = [...new Set(orderedIds.map((id) => id.trim()).filter(Boolean))];
    if (!unique.length) {
      throw new BadRequestException(
        createErrorResponse(
          'SOCIAL_LINK_REORDER_EMPTY',
          'orderedIds must include at least one link id',
          newRequestId(),
        ),
      );
    }

    const existing = await this.prisma.socialLink.findMany({ select: { id: true } });
    const existingIds = new Set(existing.map((r) => r.id));
    if (unique.length !== existingIds.size || unique.some((id) => !existingIds.has(id))) {
      throw new BadRequestException(
        createErrorResponse(
          'SOCIAL_LINK_REORDER_MISMATCH',
          'orderedIds must list every social link exactly once',
          newRequestId(),
        ),
      );
    }

    await this.prisma.$transaction(
      unique.map((id, index) =>
        this.prisma.socialLink.update({
          where: { id },
          data: { sortOrder: index },
        }),
      ),
    );

    return this.listAdmin();
  }

  private async requireRow(id: string) {
    const row = await this.prisma.socialLink.findUnique({ where: { id } });
    if (!row) {
      throw new NotFoundException(
        createErrorResponse('SOCIAL_LINK_NOT_FOUND', 'Social link not found', newRequestId()),
      );
    }
    return row;
  }

  private normalizeUrl(raw: string): string {
    const url = raw.trim();
    if (!url) {
      throw new BadRequestException(
        createErrorResponse('SOCIAL_LINK_URL_REQUIRED', 'URL is required', newRequestId()),
      );
    }
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        throw new Error('bad protocol');
      }
      return parsed.toString();
    } catch {
      throw new BadRequestException(
        createErrorResponse(
          'SOCIAL_LINK_URL_INVALID',
          'URL must be a valid http(s) address',
          newRequestId(),
        ),
      );
    }
  }

  private toPublic(row: {
    id: string;
    platform: SocialPlatform;
    label: string;
    url: string;
    sortOrder: number;
  }): SocialLinkPublic {
    const platform = row.platform as SharedSocialPlatform;
    return {
      id: row.id,
      platform,
      label: resolveSocialLabel(platform, row.label),
      url: row.url,
      sortOrder: row.sortOrder,
    };
  }

  private toAdmin(row: {
    id: string;
    platform: SocialPlatform;
    label: string;
    url: string;
    enabled: boolean;
    sortOrder: number;
    createdAt: Date;
    updatedAt: Date;
  }): SocialLinkAdmin {
    return {
      ...this.toPublic(row),
      enabled: row.enabled,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
