// Controllers are loaded only for their decorator metadata; stub ESM-only passport.
jest.mock('@nestjs/passport', () => ({
  AuthGuard: () => class MockAuthGuard {},
  PassportStrategy: () => class MockPassportStrategy {},
}));
jest.mock('@nestjs/jwt', () => ({ JwtService: class MockJwtService {} }));

import { readdirSync, statSync } from 'fs';
import { join } from 'path';
import { RequestMethod } from '@nestjs/common';
import { GUARDS_METADATA, METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { hasPermission, type DashboardPermission } from '@your-academy/shared';
import { PERMISSION_KEY } from '../../decorators/require-permission.decorator';
import { PermissionsGuard } from '../permissions.guard';

/**
 * Route-level RBAC matrix (DEC-048), read from the real controller metadata.
 * Fails if a new `/admin/*` route ships without `PermissionsGuard` + a permission,
 * or if a moderator could reach anything outside the six content sections.
 */

type Route = {
  method: string;
  path: string;
  guarded: boolean;
  permission?: DashboardPermission;
};

const SRC = join(__dirname, '..', '..', '..');

function controllerFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (name === '__tests__' || name === 'node_modules') return [];
    if (statSync(full).isDirectory()) return controllerFiles(full);
    return name.endsWith('.controller.ts') ? [full] : [];
  });
}

function joinPath(...parts: Array<string | undefined>): string {
  return (
    '/' +
    parts
      .flatMap((p) => (p ?? '').split('/'))
      .filter(Boolean)
      .join('/')
  );
}

function collectRoutes(): Route[] {
  const reflector = new Reflector();
  const routes: Route[] = [];
  for (const file of controllerFiles(SRC)) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- dynamic discovery of every controller
    const mod = require(file) as Record<string, unknown>;
    for (const exported of Object.values(mod)) {
      if (typeof exported !== 'function') continue;
      const ctrlPath = Reflect.getMetadata(PATH_METADATA, exported) as string | undefined;
      if (ctrlPath === undefined) continue;
      const proto = (exported as { prototype: Record<string, unknown> }).prototype;
      for (const key of Object.getOwnPropertyNames(proto)) {
        const handler = proto[key];
        if (key === 'constructor' || typeof handler !== 'function') continue;
        const methodPath = Reflect.getMetadata(PATH_METADATA, handler) as string | undefined;
        if (methodPath === undefined) continue;
        const method = RequestMethod[Reflect.getMetadata(METHOD_METADATA, handler) as number];
        const guards = [
          ...((Reflect.getMetadata(GUARDS_METADATA, exported) as unknown[]) ?? []),
          ...((Reflect.getMetadata(GUARDS_METADATA, handler) as unknown[]) ?? []),
        ];
        routes.push({
          method,
          path: joinPath(ctrlPath, methodPath),
          guarded: guards.includes(PermissionsGuard),
          permission: reflector.getAllAndOverride<DashboardPermission | undefined>(
            PERMISSION_KEY,
            [handler as () => void, exported as () => void],
          ),
        });
      }
    }
  }
  return routes;
}

const MODERATOR_PREFIXES = [
  '/api/v1/admin/questions',
  '/api/v1/admin/question-imports',
  '/api/v1/admin/written-question-imports',
  '/api/v1/admin/topic-question-imports',
  '/api/v1/admin/categories',
  '/api/v1/admin/exams',
  '/api/v1/admin/practice-sets',
  '/api/v1/admin/model-tests',
  '/api/v1/admin/news',
  '/api/v1/admin/documents',
];

describe('Dashboard RBAC route matrix', () => {
  const routes = collectRoutes();
  const adminRoutes = routes.filter((r) => r.path.startsWith('/api/v1/admin'));
  const label = (r: Route) => `${r.method} ${r.path}`;

  it('discovers the admin API surface', () => {
    expect(adminRoutes.length).toBeGreaterThan(80);
  });

  it('protects every /admin route with PermissionsGuard and a permission', () => {
    const unprotected = adminRoutes.filter((r) => !r.guarded || !r.permission).map(label);
    expect(unprotected).toEqual([]);
  });

  it('lets moderators reach only the six content sections', () => {
    const leaked = adminRoutes
      .filter((r) => r.permission && hasPermission(UserRole.MODERATOR, r.permission))
      .filter((r) => !MODERATOR_PREFIXES.some((p) => r.path === p || r.path.startsWith(`${p}/`)))
      .map(label);
    expect(leaked).toEqual([]);
  });

  it('gives moderators full CRUD on every content section', () => {
    for (const prefix of MODERATOR_PREFIXES) {
      const section = adminRoutes.filter((r) => r.path === prefix || r.path.startsWith(`${prefix}/`));
      expect(section.length).toBeGreaterThan(0);
      const denied = section
        .filter((r) => !r.permission || !hasPermission(UserRole.MODERATOR, r.permission))
        .map(label);
      expect(denied).toEqual([]);
    }
  });

  it.each([
    ['GET', '/api/v1/admin/users'],
    ['POST', '/api/v1/admin/users'],
    ['PATCH', '/api/v1/admin/users/:id/role'],
    ['PATCH', '/api/v1/admin/users/:id/status'],
    ['POST', '/api/v1/admin/users/:id/reset-password'],
    ['GET', '/api/v1/admin/dashboard'],
    ['GET', '/api/v1/admin/audit'],
    ['GET', '/api/v1/admin/practice-attempts'],
    ['GET', '/api/v1/admin/support/conversations'],
    ['PUT', '/api/v1/admin/homepage/draft'],
  ])('keeps %s %s admin-only', (method, path) => {
    const route = adminRoutes.find((r) => r.method === method && r.path === path);
    expect(route).toBeDefined();
    expect(hasPermission(UserRole.ADMIN, route!.permission!)).toBe(true);
    expect(hasPermission(UserRole.MODERATOR, route!.permission!)).toBe(false);
  });

  it('never grants learners any admin route', () => {
    const open = adminRoutes
      .filter((r) => r.permission && hasPermission(UserRole.USER, r.permission))
      .map(label);
    expect(open).toEqual([]);
  });
});
