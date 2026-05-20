import { useEffect, useRef, useState, type CSSProperties } from 'react';

const SCREENSHOTS = [
  '/neorbit/neorbit1.jpg',
  '/neorbit/neorbit2.jpg',
  '/neorbit/neorbit3.jpg',
  '/neorbit/neorbit4.jpg',
  '/neorbit/neorbit5.jpg',
];

const CENTER_IDX = 2;

/* ============================================================
   Horizontal carousel — 5 cards in a row at rotateY(-65°), stepped
   along X with a slight depth retreat at the edges. Hover swings the
   picked card flat to the camera; the others slide aside. */

// Geometry
const SPACING_X = 135;
const SPACING_Z = -50;
const IDLE_ROTATE_Y = -65;

// Hover
const HOVER_TRANSLATE_Z = 80;
const HOVER_SCALE = 1.05;
const SPREAD_STEP = 80;

// Premium tweaks
const Y_JITTER       = [-8, 12, 0, 8, -12];          // breaks linear baseline
const IDLE_SCALES    = [0.86, 0.94, 1.0, 0.94, 0.86]; // centre largest, edges smaller
// Edge-card depth blur removed: `filter: blur()` on a 3D-transformed
// element inside a preserve-3d parent disables pointer hit-testing
// on it (cards 0 and 4 became unhoverable). Depth perception is
// already conveyed by the per-card scale + translateZ values above.
const IDLE_BLUR_PX   = [0, 0, 0, 0, 0];

function getCardStyle(i: number, hovered: number | null): CSSProperties {
  const offsetFromCenter = i - CENTER_IDX;
  const baseX = offsetFromCenter * SPACING_X;
  const baseZ = Math.abs(offsetFromCenter) * SPACING_Z;
  const baseY = Y_JITTER[i];
  const baseScale = IDLE_SCALES[i];
  const baseBlur = IDLE_BLUR_PX[i];
  const stackZ = 5 - Math.abs(offsetFromCenter); // centre on top

  if (hovered === i) {
    return {
      transform:
        `translate(-50%, -50%)` +
        ` translateX(${baseX}px)` +
        ` translateY(${baseY}px)` +
        ` translateZ(${HOVER_TRANSLATE_Z}px)` +
        ` rotateY(0deg)` +
        ` scale(${HOVER_SCALE})`,
      zIndex: 100,
      filter: undefined, // hovered card is always sharp
    };
  }

  if (hovered === null) {
    return {
      transform:
        `translate(-50%, -50%)` +
        ` translateX(${baseX}px)` +
        ` translateY(${baseY}px)` +
        ` translateZ(${baseZ}px)` +
        ` rotateY(${IDLE_ROTATE_Y}deg)` +
        ` scale(${baseScale})`,
      zIndex: stackZ,
      filter: baseBlur > 0 ? `blur(${baseBlur}px)` : undefined,
    };
  }

  // Non-hovered cards: keep idle rotation + scale + blur, but shift
  // further in X away from the hovered card so the focal card has room.
  const extraX = (i - hovered) * SPREAD_STEP;
  return {
    transform:
      `translate(-50%, -50%)` +
      ` translateX(${baseX + extraX}px)` +
      ` translateY(${baseY}px)` +
      ` translateZ(${baseZ}px)` +
      ` rotateY(${IDLE_ROTATE_Y}deg)` +
      ` scale(${baseScale})`,
    zIndex: stackZ,
    filter: baseBlur > 0 ? `blur(${baseBlur}px)` : undefined,
  };
}

export function NeOrbit() {
  const [hovered, setHovered] = useState<number | null>(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);

  // Track which mobile-carousel card is currently snapped to centre.
  // Hidden on desktop (display: none on .neorbit-dots), but the listener
  // is cheap so we keep it mounted unconditionally.
  useEffect(() => {
    const carousel = carouselRef.current;
    if (!carousel) return;
    const onScroll = () => {
      const cards = carousel.children;
      if (cards.length < 2) return;
      const first = cards[0] as HTMLElement;
      const second = cards[1] as HTMLElement;
      const step = second.offsetLeft - first.offsetLeft;
      if (step <= 0) return;
      const idx = Math.round(carousel.scrollLeft / step);
      setActiveIdx(Math.max(0, Math.min(SCREENSHOTS.length - 1, idx)));
    };
    carousel.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => carousel.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <section className="section section-content" data-section="neorbit" data-screen-label="04 NeOrbit">
      <div className="section-grid section-grid-neorbit">
        <header className="section-head">
          <div className="t-mono section-eyebrow">04 / ПРОЕКТ</div>
          <h2 className="t-display">Telegram Mini App</h2>
          <p className="t-meta section-subtitle">NEORBIT</p>
          <p className="t-body section-body">
            Коммерческий заказ. Полный цикл: исследование интерфейса, UI/UX-дизайн
            в Figma, фронтенд на React + TypeScript. Пять экранов, в продакшене.
          </p>
          <dl className="kv">
            <dt className="t-engraved-label">РОЛЬ</dt>
            <dd className="t-body-lg" style={{ margin: 0 }}>Дизайн + разработка</dd>
            <dt className="t-engraved-label">СТАТУС</dt>
            <dd className="t-body-lg" style={{ margin: 0 }}>Сервис живой</dd>
          </dl>
        </header>

        {/* Desktop: 3D row at rotateY(-65). Hidden < 768px. */}
        <div
          className="section-visual neorbit-gallery neorbit-gallery-desktop"
          onMouseLeave={() => setHovered(null)}
        >
          {SCREENSHOTS.map((src, i) => (
            <div
              key={i}
              className="neorbit-card"
              style={getCardStyle(i, hovered)}
              onMouseEnter={() => setHovered(i)}
            >
              <div className="neorbit-card-front">
                <img src={src} alt={`Скриншот NeOrbit ${i + 1}`} loading="lazy" />
              </div>
            </div>
          ))}
        </div>

        {/* Mobile: horizontal scroll-snap carousel. Hidden ≥ 768px. */}
        <div
          className="neorbit-gallery-mobile"
          aria-label="Скриншоты NeOrbit"
          ref={carouselRef}
        >
          {SCREENSHOTS.map((src, i) => (
            <div key={i} className="neorbit-card-mobile">
              <img src={src} alt={`Скриншот NeOrbit ${i + 1}`} loading="lazy" />
            </div>
          ))}
        </div>
        <div className="neorbit-dots" aria-hidden="true">
          {SCREENSHOTS.map((_, i) => (
            <span
              key={i}
              className={`neorbit-dot ${i === activeIdx ? 'is-active' : ''}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
