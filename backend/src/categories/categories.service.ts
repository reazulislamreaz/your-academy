import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createErrorResponse } from '@your-academy/shared';
import { AuditService } from '../audit/audit.service';
import { newRequestId } from '../common/request-id';
import { PrismaService } from '../database/prisma.service';
import type { CreateCategoryDto } from './dto/create-category.dto';

@Injectable()
export class CategoriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async listActive() {
    const roots = await this.prisma.category.findMany({
      where: { parentId: null, isActive: true },
      orderBy: { sortOrder: 'asc' },
      include: {
        children: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });
    return roots;
  }

  async create(dto: CreateCategoryDto) {
    if (dto.parentId) {
      const parent = await this.prisma.category.findUnique({ where: { id: dto.parentId } });
      if (!parent) {
        throw new NotFoundException(
          createErrorResponse('CATEGORY_NOT_FOUND', 'Parent category not found', newRequestId()),
        );
      }
      if (parent.parentId) {
        throw new BadRequestException(
          createErrorResponse('INVALID_HIERARCHY', 'Only two category levels allowed', newRequestId()),
        );
      }
    }

    try {
      return await this.prisma.category.create({
        data: {
          name: dto.name.trim(),
          slug: dto.slug.trim().toLowerCase(),
          description: dto.description,
          parentId: dto.parentId,
          sortOrder: dto.sortOrder ?? 0,
          isActive: dto.isActive ?? true,
        },
      });
    } catch {
      throw new ConflictException(
        createErrorResponse('SLUG_EXISTS', 'Category slug already exists', newRequestId()),
      );
    }
  }

  async update(id: string, dto: Partial<CreateCategoryDto>) {
    const existing = await this.prisma.category.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(
        createErrorResponse('CATEGORY_NOT_FOUND', 'Category not found', newRequestId()),
      );
    }
    if (dto.parentId === id) {
      throw new BadRequestException(
        createErrorResponse('INVALID_HIERARCHY', 'Category cannot be its own parent', newRequestId()),
      );
    }
    return this.prisma.category.update({
      where: { id },
      data: {
        ...(dto.name ? { name: dto.name.trim() } : {}),
        ...(dto.slug ? { slug: dto.slug.trim().toLowerCase() } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.parentId !== undefined ? { parentId: dto.parentId } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });
  }

  async deactivate(id: string, actorUserId?: string) {
    const updated = await this.update(id, { isActive: false });
    await this.audit.record({
      actorUserId,
      action: 'CATEGORY_DEACTIVATE',
      entityType: 'category',
      entityId: id,
    });
    return updated;
  }
}
