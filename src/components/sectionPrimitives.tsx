import { useRef, type CSSProperties } from 'react';

interface AppIconProps {
  name: string;
  hue: number;
  src?: string;
}

export function AppIcon({ name, src }: AppIconProps) {
  const tileRef = useRef<HTMLDivElement>(null);
  const sheenRef = useRef<HTMLDivElement>(null);

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = tileRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const cx = x - rect.width / 2;
    const cy = y - rect.height / 2;
    const rotateY = (cx / (rect.width / 2)) * 10;
    const rotateX = -(cy / (rect.height / 2)) * 10;
    el.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    if (sheenRef.current) {
      sheenRef.current.style.background =
        `radial-gradient(circle 80px at ${x}px ${y}px,` +
        ` rgba(255,255,255,0.4) 0%,` +
        ` rgba(255,255,255,0.1) 30%,` +
        ` transparent 70%)`;
    }
  };
  const onLeave = () => {
    const el = tileRef.current;
    if (!el) return;
    el.style.transform = '';
    if (sheenRef.current) sheenRef.current.style.background = '';
  };

  return (
    <div className="app-tile-wrap">
      <div ref={tileRef} className="app-tile" onMouseMove={onMove} onMouseLeave={onLeave}>
        {src ? (
          <img className="app-tile-img" src={src} alt={name} loading="lazy" />
        ) : (
          <div className="app-tile-inner placeholder-frame">[ИКОНКА]</div>
        )}
        <div ref={sheenRef} className="app-tile-sheen" aria-hidden="true" />
      </div>
      <div className="t-meta app-tile-label">{name}</div>
    </div>
  );
}

interface Tilt {
  rx: number;
  ry: number;
  x: number;
  y: number;
}

const TILTS: Tilt[] = [
  { rx: 8, ry: -10, x: 0, y: 0 },
  { rx: 12, ry: 7, x: 40, y: 30 },
  { rx: 5, ry: -14, x: -30, y: 60 },
  { rx: 9, ry: 6, x: 30, y: -10 },
  { rx: 14, ry: -8, x: -20, y: 20 },
];

interface ScreenshotPanelProps {
  index?: number;
  label: string;
  w?: number;
  h?: number;
  /** Optional image src. If provided, the label is rendered only as alt text. */
  src?: string;
}

/**
 * Absolutely-positioned panel with a fixed 3D tilt that springs flat on
 * hover. Used by Messenger.
 */
export function ScreenshotPanel({
  index = 0,
  label,
  w = 340,
  h = 220,
  src,
}: ScreenshotPanelProps) {
  const ref = useRef<HTMLDivElement>(null);
  const t = TILTS[index % TILTS.length];

  const onEnter = () => {
    if (ref.current) {
      ref.current.style.transform = `translate(${t.x}px, ${t.y}px) perspective(900px) rotateX(0deg) rotateY(0deg)`;
    }
  };
  const onLeave = () => {
    if (ref.current) {
      ref.current.style.transform = `translate(${t.x}px, ${t.y}px) perspective(900px) rotateX(${t.rx}deg) rotateY(${t.ry}deg)`;
    }
  };

  const style: CSSProperties = {
    width: w,
    height: h,
    transform: `translate(${t.x}px, ${t.y}px) perspective(900px) rotateX(${t.rx}deg) rotateY(${t.ry}deg)`,
  };

  return (
    <div
      ref={ref}
      className="screenshot-panel screenshot-panel-tilted"
      style={style}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
    >
      {src ? (
        <img className="screenshot-panel-img" src={src} alt={label} loading="lazy" />
      ) : (
        <span>{label}</span>
      )}
    </div>
  );
}
