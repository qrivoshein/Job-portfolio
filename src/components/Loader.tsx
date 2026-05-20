import { useEffect, useRef, useState } from 'react';

interface LoaderProps {
  onDone?: () => void;
}

/* ============================================================
   Organic-loader: solid metaball droplets on light chrome.
   1 central droplet (static), 3 satellites orbit + pulse.
   ============================================================ */

const SHOW_MS = 2000;
const FADE_MS = 500;

const CENTER = 200; // viewBox is 400×400
const CENTER_R = 50;

const CAROUSEL_PERIOD = 7;
const ORBIT_FAR = 95;
const ORBIT_NEAR = 55;
const R_FAR = 20;
const R_NEAR = 35;

const DROPLET_FILL = '#1A2030';

interface Satellite {
  baseAngle: number;
  period: number;
  phaseShift: number;
}

const SATELLITES: Satellite[] = [
  // Phase shifts spread 2π/3 apart in cycle space so that at any moment
  // one satellite is approaching, one merging, one receding.
  { baseAngle: 0,                  period: 2.5, phaseShift: 0 },
  { baseAngle: (2 * Math.PI) / 3,  period: 3.0, phaseShift: (2 * Math.PI) / 3 },
  { baseAngle: (4 * Math.PI) / 3,  period: 3.5, phaseShift: (4 * Math.PI) / 3 },
];

function easeInOutSine(t: number): number {
  return -(Math.cos(Math.PI * t) - 1) / 2;
}

// Ambient page haze — purely a background tint so the loader fade-out
// doesn't pop into a different shade of light than Hero. Subtle enough
// that the droplets read as the only thing on the page.
const BG_BLOBS: { x: number; y: number; r: number; a: number }[] = [
  { x: 20, y: 28, r: 360, a: 0.28 },
  { x: 78, y: 22, r: 400, a: 0.24 },
  { x: 14, y: 76, r: 320, a: 0.26 },
  { x: 82, y: 80, r: 380, a: 0.22 },
  { x: 50, y: 50, r: 480, a: 0.18 },
];

export function Loader({ onDone }: LoaderProps) {
  const satRefs = useRef<Array<SVGCircleElement | null>>([]);
  const [fadingOut, setFadingOut] = useState(false);

  // Stable onDone — don't restart the timers if the parent re-renders.
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const t = performance.now() / 1000;
      const carouselRotation = (t / CAROUSEL_PERIOD) * Math.PI * 2;
      for (let i = 0; i < SATELLITES.length; i++) {
        const el = satRefs.current[i];
        if (!el) continue;
        const s = SATELLITES[i];
        const currentAngle = s.baseAngle + carouselRotation;
        const cycle = (Math.sin((t / s.period) * Math.PI * 2 + s.phaseShift) + 1) / 2;
        const eased = easeInOutSine(cycle);
        const distance = ORBIT_FAR - eased * (ORBIT_FAR - ORBIT_NEAR);
        const radius = R_FAR + eased * (R_NEAR - R_FAR);
        const x = CENTER + Math.cos(currentAngle) * distance;
        const y = CENTER + Math.sin(currentAngle) * distance;
        el.setAttribute('cx', x.toFixed(2));
        el.setAttribute('cy', y.toFixed(2));
        el.setAttribute('r', radius.toFixed(2));
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    const startFade = window.setTimeout(() => setFadingOut(true), SHOW_MS);
    const finish = window.setTimeout(() => onDoneRef.current?.(), SHOW_MS + FADE_MS);
    return () => {
      clearTimeout(startFade);
      clearTimeout(finish);
    };
  }, []);

  return (
    <div className={`loader ${fadingOut ? 'loader-fade' : ''}`}>
      <div className="loader-bg-blobs" aria-hidden="true">
        {BG_BLOBS.map((b, i) => (
          <div
            key={i}
            className="loader-bg-blob"
            style={{
              left: `${b.x}%`,
              top: `${b.y}%`,
              width: b.r,
              height: b.r,
              opacity: b.a,
            }}
          />
        ))}
      </div>

      <svg
        className="loader-metaballs"
        viewBox="0 0 400 400"
        width="400"
        height="400"
        aria-hidden="true"
      >
        <defs>
          {/*
            Standard metaball composite: blur the union of all source
            circles, then snap alpha to a hard threshold via the color
            matrix. The blur creates the gradient bridge between near
            circles; the threshold makes that bridge solid.
          */}
          <filter id="metaball" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="10" />
            <feColorMatrix
              values="1 0 0 0 0
                      0 1 0 0 0
                      0 0 1 0 0
                      0 0 0 18 -7"
            />
          </filter>
        </defs>

        <g filter="url(#metaball)">
          <circle cx={CENTER} cy={CENTER} r={CENTER_R} fill={DROPLET_FILL} />
          {SATELLITES.map((_, i) => (
            <circle
              key={i}
              ref={(el) => {
                satRefs.current[i] = el;
              }}
              cx={CENTER + ORBIT_FAR}
              cy={CENTER}
              r={R_FAR}
              fill={DROPLET_FILL}
            />
          ))}
        </g>
      </svg>
    </div>
  );
}
