import { AuditFloodGuard } from '../audit-flood-guard';

/** AUD-1 — a noisy source can't flood audit_logs, and suppressed events are reported. */
describe('AuditFloodGuard', () => {
  it('admits up to the limit per window, then suppresses', () => {
    const g = new AuditFloodGuard(3, 60_000);
    const t = 1_000_000;
    expect([g.admit('ip:a', t), g.admit('ip:a', t), g.admit('ip:a', t)]).toEqual([0, 0, 0]);
    expect(g.admit('ip:a', t + 1)).toBeNull();
    expect(g.admit('ip:a', t + 2)).toBeNull();
    // Other sources are unaffected.
    expect(g.admit('ip:b', t + 3)).toBe(0);
  });

  it('reports the suppressed count on the first row of the next window', () => {
    const g = new AuditFloodGuard(1, 60_000);
    expect(g.admit('wa:1', 0)).toBe(0);
    expect(g.admit('wa:1', 10)).toBeNull();
    expect(g.admit('wa:1', 20)).toBeNull();
    expect(g.admit('wa:1', 60_000)).toBe(2);
    expect(g.admit('wa:1', 60_001)).toBeNull();
  });

  it('stays bounded in memory under many sources', () => {
    const g = new AuditFloodGuard(1, 60_000, 100);
    for (let i = 0; i < 1_000; i += 1) g.admit(`ip:${i}`, i);
    expect((g as unknown as { windows: Map<string, unknown> }).windows.size).toBeLessThanOrEqual(
      100,
    );
  });
});
