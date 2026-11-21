/**
 * Reset viewport to the exam header / Question 1 after name-entry starts the sheet.
 * Runs sync + delayed passes so mobile keyboard dismissal cannot leave a mid-list offset.
 */
export function scrollExamToTop(anchorId?: string): void {
  if (typeof window === 'undefined') return;

  const run = () => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;

    const anchor = anchorId ? document.getElementById(anchorId) : null;
    if (anchor) {
      anchor.scrollIntoView({ block: 'start', inline: 'nearest', behavior: 'auto' });
      // Keep header visible: nudge to absolute top after anchoring Q1.
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    }
  };

  run();
  window.requestAnimationFrame(() => {
    run();
    window.requestAnimationFrame(run);
  });
  window.setTimeout(run, 120);
  window.setTimeout(run, 320);
}
