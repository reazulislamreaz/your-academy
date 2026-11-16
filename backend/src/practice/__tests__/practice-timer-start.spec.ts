const TIMER_PRESETS = [15 * 60, 30 * 60, 45 * 60, 60 * 60] as const;

/**
 * Mirrors PracticeService.resolveStartTimerSeconds rules for regression safety.
 */
function resolveStartTimerSeconds(
  setDurationSeconds: number | null,
  dto: { timed?: boolean; durationSeconds?: number },
): number | null {
  if (dto.timed === false) return null;

  if (dto.timed === true) {
    if (setDurationSeconds != null && setDurationSeconds > 0) {
      return setDurationSeconds;
    }
    const preset = dto.durationSeconds;
    if (preset != null && (TIMER_PRESETS as readonly number[]).includes(preset)) {
      return preset;
    }
    throw new Error('TIMER_DURATION_REQUIRED');
  }

  return setDurationSeconds != null && setDurationSeconds > 0 ? setDurationSeconds : null;
}

describe('practice attempt timer start rules', () => {
  it('untimed when timed=false even if set has duration', () => {
    expect(resolveStartTimerSeconds(1800, { timed: false })).toBeNull();
  });

  it('uses set duration when timed=true', () => {
    expect(resolveStartTimerSeconds(2700, { timed: true })).toBe(2700);
  });

  it('uses allowlisted preset when set is untimed and timed=true', () => {
    expect(resolveStartTimerSeconds(null, { timed: true, durationSeconds: 15 * 60 })).toBe(900);
  });

  it('rejects non-preset duration when set is untimed', () => {
    expect(() =>
      resolveStartTimerSeconds(null, { timed: true, durationSeconds: 10 * 60 }),
    ).toThrow('TIMER_DURATION_REQUIRED');
  });

  it('legacy omitted body follows set duration', () => {
    expect(resolveStartTimerSeconds(1200, {})).toBe(1200);
    expect(resolveStartTimerSeconds(null, {})).toBeNull();
  });
});
