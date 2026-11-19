/**
 * Ensure four relevant active WRITTEN subcategories for the homepage strip.
 * Migrates existing Wrt/sub content onto BCS Written; deactivates placeholder junk.
 *
 * Usage: pnpm exec tsx scripts/seed-written-subcategories.ts
 */
import { CategoryScope, PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const p = new PrismaClient();

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[^\w\s-]/g, '')
      .trim()
      .replace(/[\s_]+/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 80) || 'category'
  );
}

async function uniqueSlug(base: string): Promise<string> {
  let slug = slugify(base);
  for (let i = 0; i < 8; i += 1) {
    const taken = await p.category.findUnique({
      where: { scope_slug: { scope: CategoryScope.WRITTEN, slug } },
      select: { id: true },
    });
    if (!taken) return slug;
    slug = `${slugify(base)}-${randomUUID().slice(0, 6)}`;
  }
  return `${slugify(base)}-${randomUUID().slice(0, 8)}`;
}

async function ensureRoot(name: string) {
  const existing = await p.category.findFirst({
    where: {
      scope: CategoryScope.WRITTEN,
      parentId: null,
      name: { equals: name, mode: 'insensitive' },
    },
  });
  if (existing) {
    return p.category.update({
      where: { id: existing.id },
      data: { isActive: true, sortOrder: 0, name },
    });
  }
  // Prefer renaming the legacy "Wrt" root if present.
  const legacy = await p.category.findFirst({
    where: {
      scope: CategoryScope.WRITTEN,
      parentId: null,
      name: { equals: 'Wrt', mode: 'insensitive' },
    },
  });
  if (legacy) {
    const slug = await uniqueSlug(name);
    return p.category.update({
      where: { id: legacy.id },
      data: { name, slug, isActive: true, sortOrder: 0 },
    });
  }
  return p.category.create({
    data: {
      name,
      slug: await uniqueSlug(name),
      scope: CategoryScope.WRITTEN,
      parentId: null,
      isActive: true,
      sortOrder: 0,
    },
  });
}

async function ensureChild(
  parentId: string,
  name: string,
  sortOrder: number,
) {
  const existing = await p.category.findFirst({
    where: {
      scope: CategoryScope.WRITTEN,
      parentId,
      name: { equals: name, mode: 'insensitive' },
    },
  });
  if (existing) {
    return p.category.update({
      where: { id: existing.id },
      data: { isActive: true, sortOrder, name },
    });
  }
  return p.category.create({
    data: {
      name,
      slug: await uniqueSlug(name),
      scope: CategoryScope.WRITTEN,
      parentId,
      isActive: true,
      sortOrder,
    },
  });
}

async function main() {
  const root = await ensureRoot('Written Exams');

  const desired = [
    { name: 'BCS Written', sortOrder: 0 },
    { name: 'Bank Written', sortOrder: 1 },
    { name: 'Government Jobs', sortOrder: 2 },
    { name: 'Primary & NTRCA', sortOrder: 3 },
  ] as const;

  const children = [];
  for (const d of desired) {
    children.push(await ensureChild(root.id, d.name, d.sortOrder));
  }
  const bcsWritten = children[0]!;

  // Move legacy placeholder subcategory usage onto BCS Written.
  const legacySubs = await p.category.findMany({
    where: {
      scope: CategoryScope.WRITTEN,
      parentId: root.id,
      id: { notIn: children.map((c) => c.id) },
      OR: [
        { name: { equals: 'sub', mode: 'insensitive' } },
        { name: { equals: 'test', mode: 'insensitive' } },
      ],
    },
    select: { id: true, name: true },
  });

  for (const legacy of legacySubs) {
    await p.writtenQuestion.updateMany({
      where: { subcategoryId: legacy.id },
      data: { subcategoryId: bcsWritten.id, categoryId: root.id },
    });
    await p.writtenQuestion.updateMany({
      where: { categoryId: legacy.id },
      data: { categoryId: root.id, subcategoryId: bcsWritten.id },
    });
    await p.writtenUploadBatchPlacement.updateMany({
      where: { subcategoryId: legacy.id },
      data: { subcategoryId: bcsWritten.id, categoryId: root.id },
    });
    await p.writtenUploadBatchPlacement.updateMany({
      where: { categoryId: legacy.id },
      data: { categoryId: root.id, subcategoryId: bcsWritten.id },
    });
    await p.category.update({
      where: { id: legacy.id },
      data: { isActive: false },
    });
    console.log(`Migrated + deactivated legacy sub "${legacy.name}"`);
  }

  // Point any questions still on the root (no sub) to BCS Written.
  await p.writtenQuestion.updateMany({
    where: { categoryId: root.id, subcategoryId: null },
    data: { subcategoryId: bcsWritten.id },
  });
  await p.writtenQuestion.updateMany({
    where: { categoryId: root.id, subcategoryId: { notIn: children.map((c) => c.id) } },
    data: { subcategoryId: bcsWritten.id },
  });

  // Deactivate other WRITTEN roots that aren't the canonical one (e.g. "tst").
  const otherRoots = await p.category.findMany({
    where: {
      scope: CategoryScope.WRITTEN,
      parentId: null,
      id: { not: root.id },
    },
    select: { id: true, name: true },
  });
  for (const other of otherRoots) {
    await p.writtenQuestion.updateMany({
      where: { categoryId: other.id },
      data: { categoryId: root.id, subcategoryId: bcsWritten.id },
    });
    await p.writtenUploadBatchPlacement.updateMany({
      where: { categoryId: other.id },
      data: { categoryId: root.id, subcategoryId: bcsWritten.id },
    });
    await p.category.updateMany({
      where: { parentId: other.id },
      data: { isActive: false },
    });
    await p.category.update({
      where: { id: other.id },
      data: { isActive: false },
    });
    console.log(`Deactivated extra root "${other.name}"`);
  }

  const activeSubs = await p.category.findMany({
    where: {
      scope: CategoryScope.WRITTEN,
      parentId: { not: null },
      isActive: true,
    },
    select: { name: true, parent: { select: { name: true } } },
    orderBy: { sortOrder: 'asc' },
  });
  console.log(
    'Active Written subcategories:',
    activeSubs.map((s) => `${s.parent?.name} · ${s.name}`),
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await p.$disconnect();
  });
