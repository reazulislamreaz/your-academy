/**
 * Pure scoring helpers mirrored from PracticeService.submitAttempt rules.
 * Keeps exam mark math regression-safe without spinning Nest.
 */
function scoreAttempt(params: {
  answers: Array<{ selected: boolean; correct: boolean }>;
  marksPerCorrect: number;
  negativeMarkPerWrong: number;
  passMarkPercent: number | null;
}) {
  let correctCount = 0;
  let wrongCount = 0;
  let skippedCount = 0;
  let score = 0;
  for (const a of params.answers) {
    if (!a.selected) {
      skippedCount += 1;
      continue;
    }
    if (a.correct) {
      correctCount += 1;
      score += params.marksPerCorrect;
    } else {
      wrongCount += 1;
      score -= params.negativeMarkPerWrong;
    }
  }
  const maxScore = params.answers.length * params.marksPerCorrect;
  const percentScore =
    maxScore <= 0 ? 0 : Math.round((Math.max(0, score) / maxScore) * 1000) / 10;
  const passed =
    params.passMarkPercent == null ? null : percentScore >= params.passMarkPercent;
  return { correctCount, wrongCount, skippedCount, score, maxScore, percentScore, passed };
}

function elapsedSeconds(
  startedAtMs: number,
  endedAtMs: number,
  durationSeconds: number | null,
) {
  const raw = Math.max(0, Math.floor((endedAtMs - startedAtMs) / 1000));
  if (durationSeconds != null) return Math.min(raw, durationSeconds);
  return raw;
}

describe('practice exam scoring', () => {
  it('counts correct, wrong, skipped and applies negative marks', () => {
    const result = scoreAttempt({
      answers: [
        { selected: true, correct: true },
        { selected: true, correct: false },
        { selected: false, correct: false },
        { selected: true, correct: true },
      ],
      marksPerCorrect: 1,
      negativeMarkPerWrong: 0.25,
      passMarkPercent: 50,
    });
    expect(result.correctCount).toBe(2);
    expect(result.wrongCount).toBe(1);
    expect(result.skippedCount).toBe(1);
    expect(result.score).toBe(1.75);
    expect(result.maxScore).toBe(4);
    expect(result.percentScore).toBe(43.8);
    expect(result.passed).toBe(false);
  });

  it('passes when percent meets threshold', () => {
    const result = scoreAttempt({
      answers: [
        { selected: true, correct: true },
        { selected: true, correct: true },
        { selected: true, correct: false },
      ],
      marksPerCorrect: 1,
      negativeMarkPerWrong: 0,
      passMarkPercent: 60,
    });
    expect(result.percentScore).toBe(66.7);
    expect(result.passed).toBe(true);
  });

  it('caps elapsed time by exam duration', () => {
    expect(elapsedSeconds(0, 120_000, 60)).toBe(60);
    expect(elapsedSeconds(0, 40_000, 60)).toBe(40);
    expect(elapsedSeconds(0, 120_000, null)).toBe(120);
  });
});
