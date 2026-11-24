#!/usr/bin/env node
// Backward-compatibility guard for Prisma migrations (zero-downtime deploys + rollback).
//
// During a deploy the PREVIOUS app version keeps running on the NEW schema, and a rollback
// runs it there for good. So a migration must only EXPAND the schema; contract it (drop /
// rename / retype) in a later release once no running version uses the old shape.
//
//   node scripts/check-migrations.mjs                 check every migration
//   node scripts/check-migrations.mjs NAME [NAME...]  check only these (deploy: pending ones)
//
// A migration that must break compatibility is allowed only when listed in
// backend/prisma/breaking-migrations.txt (one name per line, '#' comments). The deploy then
// takes a DB backup first and refuses automatic rollback below that version.
// Exit code 1 = blocked. Prints "ALLOWLISTED-BREAKING: <name>" for acknowledged ones.
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const MIGRATIONS = 'backend/prisma/migrations';
const ALLOWLIST = 'backend/prisma/breaking-migrations.txt';

const allow = new Set(
  existsSync(ALLOWLIST)
    ? readFileSync(ALLOWLIST, 'utf8')
        .split('\n')
        .map((l) => l.replace(/#.*/, '').trim())
        .filter(Boolean)
    : [],
);

const names = process.argv.slice(2).length
  ? process.argv.slice(2)
  : readdirSync(MIGRATIONS, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
      .sort();

/** Strip comments and split into statements (good enough for Prisma-generated SQL). */
function statements(sql) {
  const noComments = sql.replace(/--[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
  return noComments
    .split(';')
    .map((s) => s.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

const ident = (s) => s.replace(/"/g, '').toLowerCase();

export function findProblems(sql) {
  const stmts = statements(sql);
  const added = new Set();
  const defaulted = new Set();
  for (const s of stmts) {
    for (const m of s.matchAll(/ADD COLUMN (?:IF NOT EXISTS )?("?[\w]+"?)/gi)) added.add(ident(m[1]));
    for (const m of s.matchAll(/ALTER COLUMN ("?[\w]+"?) SET DEFAULT/gi)) defaulted.add(ident(m[1]));
  }
  const problems = [];
  for (const s of stmts) {
    const short = s.length > 140 ? `${s.slice(0, 140)}…` : s;
    if (/^DROP (TABLE|TYPE|SCHEMA|VIEW|MATERIALIZED VIEW|FUNCTION)\b/i.test(s)) {
      problems.push(`drops an object the running version may use: ${short}`);
    }
    if (/\bDROP COLUMN\b/i.test(s)) problems.push(`drops a column: ${short}`);
    if (/\bRENAME\b/i.test(s)) problems.push(`renames (old code still uses the old name): ${short}`);
    if (/\bALTER COLUMN "?\w+"? (SET DATA )?TYPE\b/i.test(s)) problems.push(`changes a column type: ${short}`);
    for (const m of s.matchAll(/ALTER COLUMN ("?\w+"?) SET NOT NULL/gi)) {
      // Safe only for a column added (and back-filled) in this same migration.
      if (!added.has(ident(m[1]))) problems.push(`makes an existing column NOT NULL: ${short}`);
    }
    for (const m of s.matchAll(/ADD COLUMN (?:IF NOT EXISTS )?("?\w+"?) ([^,]*)/gi)) {
      const col = ident(m[1]);
      const def = m[2];
      if (/NOT NULL/i.test(def) && !/DEFAULT/i.test(def) && !defaulted.has(col)) {
        problems.push(`adds NOT NULL column "${col}" without a default (old code's inserts fail): ${short}`);
      }
    }
    if (/^(TRUNCATE|DELETE FROM)\b/i.test(s)) problems.push(`deletes data: ${short}`);
  }
  return problems;
}

let blocked = 0;
for (const name of names) {
  const file = join(MIGRATIONS, name, 'migration.sql');
  if (!existsSync(file)) {
    console.error(`BLOCKED ${name}: ${file} not found`);
    blocked++;
    continue;
  }
  const problems = findProblems(readFileSync(file, 'utf8'));
  if (!problems.length) {
    console.log(`ok       ${name}`);
  } else if (allow.has(name)) {
    console.log(`ALLOWLISTED-BREAKING: ${name}`);
    for (const p of problems) console.log(`           - ${p}`);
  } else {
    blocked++;
    console.error(`BLOCKED  ${name}`);
    for (const p of problems) console.error(`           - ${p}`);
  }
}
if (blocked) {
  console.error(
    `\n${blocked} migration(s) are not backward-compatible. Split them into expand (now) and ` +
      `contract (a later release), or — if a breaking change is truly intended — add the name ` +
      `to ${ALLOWLIST} with a comment (deploy then backs up the DB and blocks automatic rollback).`,
  );
  process.exit(1);
}
