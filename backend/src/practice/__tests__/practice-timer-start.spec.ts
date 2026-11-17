const TIMER_PRESETS = [15 * 60, 30 * 60, 45 * 60, 60 * 60, 90 * 60, 120 * 60] as const;
const TIMER_CUSTOM_MIN_SECONDS = 5 * 60;
const TIMER_CUSTOM_MAX_SECONDS = 180 * 60;

function isAllowedLearnerTimerSeconds(seconds: number): boolean {
  if (!Number.isInteger(seconds)) return false;
  if (seconds < TIMER_CUSTOM_MIN_SECONDS || seconds > TIMER_CUSTOM_MAX_SECONDS) return false;
  if (seconds % 60 !== 0) return false;
  return true;
}

/**
 * Mirrors PracticeService.resolveStartTimerSeconds rules for regression safety.
 */
function resolveStartTimerSeconds(
  setDurationSeconds: number | null,
  dto: { timed?: boolean; durationSeconds?: number },
): number | null {
  if (dto.timed === false) return null;

  const setMax =
    setDurationSeconds != null && setDurationSeconds > 0 ? setDurationSeconds : null;

  if (dto.timed === true) {
    const requested = dto.durationSeconds;
    if (requested != null) {
      const ok =
        isAllowedLearnerTimerSeconds(requested) ||
        (TIMER_PRESETS as readonly number[]).includes(requested);
      if (!ok) throw new Error('TIMER_DURATION_INVALID');
      return setMax != null ? Math.min(requested, setMax) : requested;
    }
    if (setMax != null) return setMax;
    throw new Error('TIMER_DURATION_REQUIRED');
  }

  return setMax;
}

describe('practice attempt timer start rules', () => {
  it('untimed when timed=false even if set has duration', () => {
    expect(resolveStartTimerSeconds(1800, { timed: false })).toBeNull();
  });

  it('uses set duration when timed=true and no custom duration', () => {
    expect(resolveStartTimerSeconds(2700, { timed: true })).toBe(2700);
  });

  it('allows custom duration when set is untimed', () => {
    expect(resolveStartTimerSeconds(null, { timed: true, durationSeconds: 25 * 60 })).toBe(
      25 * 60,
    );
  });

  it('uses allowlisted preset when set is untimed', () => {
    expect(resolveStartTimerSeconds(null, { timed: true, durationSeconds: 15 * 60 })).toBe(900);
  });

  it('caps custom duration at admin set max', () => {
    expect(resolveStartTimerSeconds(1800, { timed: true, durationSeconds: 60 * 60 })).toBe(1800);
  });

  it('rejects invalid custom duration when set is untimed', () => {
    expect(() =>
      resolveStartTimerSeconds(null, { timed: true, durationSeconds: 90 }),
    ).toThrow('TIMER_DURATION_INVALID');
  });

  it('requires a duration when timed and set is untimed', () => {
    expect(() => resolveStartTimerSeconds(null, { timed: true })).toThrow(
      'TIMER_DURATION_REQUIRED',
    );
  });

  it('legacy omitted body follows set duration', () => {
    expect(resolveStartTimerSeconds(1200, {})).toBe(1200);
    expect(resolveStartTimerSeconds(null, {})).toBeNull();
  });
});
