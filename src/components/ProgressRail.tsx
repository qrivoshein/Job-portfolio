export function ProgressRail() {
  // Circular ring indicator. 4 tick marks for the 4 sections in the
  // cycle (Hero, Опыт, Messenger, NeOrbit). Contact is reached by
  // flipping the Hero card, NOT as a 5th section.
  const ticks = [];
  for (let i = 0; i < 4; i++) {
    const angle = (i / 4) * 360 - 90;
    const rad = (angle * Math.PI) / 180;
    const cx = 30 + Math.cos(rad) * 22;
    const cy = 30 + Math.sin(rad) * 22;
    ticks.push(
      <circle key={i} cx={cx.toFixed(2)} cy={cy.toFixed(2)} r="1.4" fill="rgba(10,10,10,0.20)" />,
    );
  }
  return (
    <svg className="progress-ring" viewBox="0 0 60 60" width="60" height="60" aria-hidden="true">
      <circle cx="30" cy="30" r="22" fill="none" stroke="rgba(10,10,10,0.10)" strokeWidth="1" />
      {ticks}
      <circle className="progress-ring-dot" cx="30" cy="8" r="3.2" fill="rgba(10,10,10,0.85)" />
    </svg>
  );
}
