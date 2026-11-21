import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CategoryScope, Prisma } from '@prisma/client';
import { createErrorResponse } from '@your-academy/shared';
import { randomUUID } from 'crypto';
import { AuditService } from '../audit/audit.service';
import { newRequestId } from '../common/request-id';
import { PrismaService } from '../database/prisma.service';
import { nameKey, slugifyCategoryName } from './category-slug';
import type { CreateCategoryDto } from './dto/create-category.dto';
import type { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /** Public/learner tree: active roots + active children for one bank scope. */
  async listActive(scope: CategoryScope = CategoryScope.PRELIMINARY) {
    const roots = await this.prisma.category.findMany({
      where: { parentId: null, isActive: true, scope },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: {
        children: {
          where: { isActive: true, scope },
          orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
            isActive: true,
            sortOrder: true,
            scope: true,
            iconKey: true,
            _count: { select: { topicSubQuestions: true } },
          },
        },
      },
    });
    return roots.map((root) => ({
      id: root.id,
      name: root.name,
      slug: root.slug,
      description: root.description,
      isActive: root.isActive,
      sortOrder: root.sortOrder,
      scope: root.scope,
      iconKey: root.iconKey,
      children: root.children.map((child) => ({
        id: child.id,
        name: child.name,
        slug: child.slug,
        description: child.description,
        isActive: child.isActive,
        sortOrder: child.sortOrder,
        scope: child.scope,
        iconKey: child.iconKey,
        questionCount: child._count.topicSubQuestions,
      })),
    }));
  }

  /** Admin tree: all roots/children with usage counts for one bank scope. */
  async listAdmin(scope: CategoryScope = CategoryScope.PRELIMINARY) {
    const roots = await this.prisma.category.findMany({
      where: { parentId: null, scope },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: {
        children: {
          where: { scope },
          orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
          include: {
            _count: {
              select: {
                subQuestions: true,
                writtenSubQuestions: true,
                topicSubQuestions: true,
                practiceSetTopics: true,
                documents: true,
              },
            },
          },
        },
        _count: {
          select: {
            children: true,
            questions: true,
            writtenQuestions: true,
            topicQuestions: true,
            practiceSets: true,
            documents: true,
          },
        },
      },
    });

    const rootQuestionCount = (root: {
      _count: {
        questions: number;
        writtenQuestions: number;
        topicQuestions: number;
      };
    }) => {
      if (scope === CategoryScope.WRITTEN) return root._count.writtenQuestions;
      if (scope === CategoryScope.TOPIC) return root._count.topicQuestions;
      return root._count.questions;
    };
    const childQuestionCount = (child: {
      _count: {
        subQuestions: number;
        writtenSubQuestions: number;
        topicSubQuestions: number;
      };
    }) => {
      if (scope === CategoryScope.WRITTEN) return child._count.writtenSubQuestions;
      if (scope === CategoryScope.TOPIC) return child._count.topicSubQuestions;
      return child._count.subQuestions;
    };

    return roots.map((root) => ({
      id: root.id,
      name: root.name,
      slug: root.slug,
      description: root.description,
      isActive: root.isActive,
      sortOrder: root.sortOrder,
      scope: root.scope,
      iconKey: root.iconKey,
      createdAt: root.createdAt,
      updatedAt: root.updatedAt,
      subcategoryCount: root._count.children,
      questionCount: rootQuestionCount(root),
      practiceSetCount: root._count.practiceSets,
      documentCount: root._count.documents,
      children: root.children.map((child) => ({
        id: child.id,
        name: child.name,
        slug: child.slug,
        description: child.description,
        isActive: child.isActive,
        sortOrder: child.sortOrder,
        parentId: child.parentId,
        scope: child.scope,
        iconKey: child.iconKey,
        createdAt: child.createdAt,
        updatedAt: child.updatedAt,
        questionCount: childQuestionCount(child),
        practiceSetCount: child._count.practiceSetTopics,
        documentCount: child._count.documents,
      })),
    }));
  }

  async create(dto: CreateCategoryDto) {
    const name = dto.name.trim();
    if (name.length < 2) {
      throw new BadRequestException(
        createErrorResponse('INVALID_NAME', 'Name must be at least 2 characters', newRequestId()),
      );
    }

    let parentId: string | null | undefined = dto.parentId;
    let scope: CategoryScope = dto.scope ?? CategoryScope.PRELIMINARY;
    if (parentId) {
      const parent = await this.prisma.category.findUnique({ where: { id: parentId } });
      if (!parent) {
        throw new NotFoundException(
          createErrorResponse('CATEGORY_NOT_FOUND', 'Parent category not found', newRequestId()),
        );
      }
      if (parent.parentId) {
        throw new BadRequestException(
          createErrorResponse(
            'INVALID_HIERARCHY',
            'Only two category levels are allowed',
            newRequestId(),
          ),
        );
      }
      scope = parent.scope;
      if (dto.scope && dto.scope !== parent.scope) {
        throw new BadRequestException(
          createErrorResponse(
            'SCOPE_MISMATCH',
            'Subcategory scope must match its parent category',
            newRequestId(),
          ),
        );
      }
    } else {
      parentId = null;
    }

    await this.assertUniqueName(name, parentId, scope);

    const slug = await this.ensureUniqueSlug(
      scope,
      dto.slug?.trim() ? dto.slug.trim().toLowerCase() : slugifyCategoryName(name),
    );

    // Append to the end of the sibling list unless the client sets sortOrder.
    let sortOrder = dto.sortOrder;
    if (sortOrder === undefined) {
      const agg = await this.prisma.category.aggregate({
        where: { parentId, scope },
        _max: { sortOrder: true },
      });
      sortOrder = (agg._max.sortOrder ?? -1) + 1;
    }

    try {
      return await this.prisma.category.create({
        data: {
          name,
          slug,
          description: dto.description?.trim() || null,
          parentId,
          scope,
          iconKey: dto.iconKey?.trim() || null,
          sortOrder,
          isActive: dto.isActive ?? true,
        },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException(
          createErrorResponse('SLUG_EXISTS', 'Category slug already exists in this bank', newRequestId()),
        );
      }
      throw err;
    }
  }

  async update(id: string, dto: UpdateCategoryDto) {
    const existing = await this.prisma.category.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(
        createErrorResponse('CATEGORY_NOT_FOUND', 'Category not found', newRequestId()),
      );
    }

    let nextParentId = existing.parentId;
    if (dto.parentId !== undefined) {
      if (dto.parentId === id) {
        throw new BadRequestException(
          createErrorResponse(
            'INVALID_HIERARCHY',
            'Category cannot be its own parent',
            newRequestId(),
          ),
        );
      }
      if (dto.parentId) {
        const parent = await this.prisma.category.findUnique({ where: { id: dto.parentId } });
        if (!parent) {
          throw new NotFoundException(
            createErrorResponse('CATEGORY_NOT_FOUND', 'Parent category not found', newRequestId()),
          );
        }
        if (parent.parentId) {
          throw new BadRequestException(
            createErrorResponse(
              'INVALID_HIERARCHY',
              'Only two category levels are allowed',
              newRequestId(),
            ),
          );
        }
        if (parent.scope !== existing.scope) {
          throw new BadRequestException(
            createErrorResponse(
              'SCOPE_MISMATCH',
              'Cannot move a category across Preliminary / Written / Topic banks',
              newRequestId(),
            ),
          );
        }
        if (!existing.parentId) {
          const childCount = await this.prisma.category.count({ where: { parentId: id } });
          if (childCount > 0) {
            throw new BadRequestException(
              createErrorResponse(
                'INVALID_HIERARCHY',
                'Move or remove subcategories before nesting this category',
                newRequestId(),
              ),
            );
          }
        }
        nextParentId = dto.parentId;
      } else {
        nextParentId = null;
      }
    }

    const nextName = dto.name?.trim() ?? existing.name;
    if (dto.name !== undefined || dto.parentId !== undefined) {
      await this.assertUniqueName(nextName, nextParentId, existing.scope, id);
    }

    try {
      return await this.prisma.category.update({
        where: { id },
        data: {
          ...(dto.name !== undefined ? { name: nextName } : {}),
          ...(dto.slug !== undefined ? { slug: dto.slug.trim().toLowerCase() } : {}),
          ...(dto.description !== undefined
            ? { description: dto.description?.trim() || null }
            : {}),
          ...(dto.parentId !== undefined ? { parentId: nextParentId } : {}),
          ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
          ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
          ...(dto.iconKey !== undefined
            ? { iconKey: dto.iconKey?.trim() || null }
            : {}),
        },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException(
          createErrorResponse('SLUG_EXISTS', 'Category slug already exists in this bank', newRequestId()),
        );
      }
      throw err;
    }
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

  async activate(id: string, actorUserId?: string) {
    const updated = await this.update(id, { isActive: true });
    await this.audit.record({
      actorUserId,
      action: 'CATEGORY_ACTIVATE',
      entityType: 'category',
      entityId: id,
    });
    return updated;
  }

  async remove(id: string, actorUserId?: string, hard = false) {
    const existing = await this.prisma.category.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(
        createErrorResponse('CATEGORY_NOT_FOUND', 'Category not found', newRequestId()),
      );
    }

    if (!hard) {
      return this.deactivate(id, actorUserId);
    }

    const usage = await this.usageCounts(id);
    if (
      usage.children > 0 ||
      usage.questions > 0 ||
      usage.subQuestions > 0 ||
      usage.writtenQuestions > 0 ||
      usage.writtenSubQuestions > 0 ||
      usage.documents > 0 ||
      usage.practiceSets > 0 ||
      usage.practiceSetTopics > 0
    ) {
      throw new ConflictException(
        createErrorResponse(
          'CATEGORY_IN_USE',
          'Cannot permanently delete a category that still has questions, documents, practice sets, or subcategories. Deactivate it instead, or reassign content first.',
          newRequestId(),
          [usage],
        ),
      );
    }

    await this.prisma.category.delete({ where: { id } });
    await this.audit.record({
      actorUserId,
      action: 'CATEGORY_DELETE',
      entityType: 'category',
      entityId: id,
      metadata: { name: existing.name, parentId: existing.parentId, scope: existing.scope },
    });
    return { id, deleted: true };
  }

  private async usageCounts(id: string) {
    const [
      children,
      questions,
      subQuestions,
      writtenQuestions,
      writtenSubQuestions,
      documents,
      practiceSets,
      practiceSetTopics,
    ] = await Promise.all([
      this.prisma.category.count({ where: { parentId: id } }),
      this.prisma.question.count({ where: { categoryId: id, deletedAt: null } }),
      this.prisma.question.count({ where: { subcategoryId: id, deletedAt: null } }),
      this.prisma.writtenQuestion.count({ where: { categoryId: id, deletedAt: null } }),
      this.prisma.writtenQuestion.count({ where: { subcategoryId: id, deletedAt: null } }),
      this.prisma.document.count({ where: { categoryId: id, deletedAt: null } }),
      this.prisma.practiceSet.count({ where: { categoryId: id } }),
      this.prisma.practiceSet.count({ where: { subcategoryId: id } }),
    ]);
    return {
      children,
      questions,
      subQuestions,
      writtenQuestions,
      writtenSubQuestions,
      documents,
      practiceSets,
      practiceSetTopics,
    };
  }

  private async assertUniqueName(
    name: string,
    parentId: string | null,
    scope: CategoryScope,
    excludeId?: string,
  ) {
    const siblings = await this.prisma.category.findMany({
      where: {
        parentId,
        scope,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true, name: true },
    });
    const key = nameKey(name);
    if (siblings.some((s) => nameKey(s.name) === key)) {
      throw new ConflictException(
        createErrorResponse(
          'NAME_EXISTS',
          parentId
            ? 'A subcategory with this name already exists under the selected category'
            : 'A category with this name already exists in this bank',
          newRequestId(),
        ),
      );
    }
  }

  private async ensureUniqueSlug(scope: CategoryScope, base: string): Promise<string> {
    let slug = base.slice(0, 140) || `category-${randomUUID().slice(0, 8)}`;
    for (let i = 0; i < 8; i += 1) {
      const taken = await this.prisma.category.findUnique({
        where: { scope_slug: { scope, slug } },
        select: { id: true },
      });
      if (!taken) return slug;
      slug = `${base.slice(0, 120)}-${randomUUID().slice(0, 6)}`.slice(0, 140);
    }
    return `${base.slice(0, 100)}-${Date.now()}`.slice(0, 140);
  }
}
