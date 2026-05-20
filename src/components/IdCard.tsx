/* ============================================================
   IdCard — the centerpiece.
   Frosted glass, holographic sheen, 3D tilt on hover, flip on click.
   Two faces: front (data fields) + back (contacts + skills + QR).
   ============================================================ */
import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';

interface IdCardProps {
  initialFlipped?: boolean;
  autoFlipOnMount?: boolean;
  idleSway?: boolean;
}

interface IdCardState {
  targetRx: number;
  targetRy: number;
  rx: number;
  ry: number;
  sx: number;
  sy: number;
  sxT: number;
  syT: number;
  time: number;
  flipAngle: number;
  flipFrom: number;
  flipTarget: number;
  flipStart: number;
  flipDuration: number;
}

export function IdCard({
  initialFlipped = false,
  autoFlipOnMount = false,
  idleSway = true,
}: IdCardProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const sheenRef = useRef<HTMLDivElement>(null);
  const frontRef = useRef<HTMLDivElement>(null);
  const backRef = useRef<HTMLDivElement>(null);
  const [flipped, setFlipped] = useState(initialFlipped);
  const [hovering, setHovering] = useState(false);

  const state = useRef<IdCardState>({
    targetRx: 0,
    targetRy: 0,
    rx: 0,
    ry: 0,
    sx: 50,
    sy: 50,
    sxT: 50,
    syT: 50,
    time: 0,
    flipAngle: initialFlipped ? 180 : 0,
    flipFrom: initialFlipped ? 180 : 0,
    flipTarget: initialFlipped ? 180 : 0,
    flipStart: 0,
    flipDuration: 800,
  });

  useEffect(() => {
    if (autoFlipOnMount) setFlipped(true);
  }, [autoFlipOnMount]);

  useEffect(() => {
    const s = state.current;
    const newTarget = flipped ? 180 : 0;
    if (newTarget === s.flipTarget) return;
    s.flipFrom = s.flipAngle;
    s.flipTarget = newTarget;
    s.flipStart = performance.now();
  }, [flipped]);

  useEffect(() => {
    let raf = 0;
    const cubicInOut = (t: number) =>
      t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    const tick = () => {
      const s = state.current;
      s.time += 0.016;

      if (!hovering && idleSway) {
        s.targetRx = Math.sin(s.time * 0.6) * 1.0;
        s.targetRy = Math.cos(s.time * 0.45) * 1.2;
      }

      s.rx += (s.targetRx - s.rx) * 0.12;
      s.ry += (s.targetRy - s.ry) * 0.12;
      s.sx += (s.sxT - s.sx) * 0.18;
      s.sy += (s.syT - s.sy) * 0.18;

      if (s.flipAngle !== s.flipTarget) {
        const t = Math.min(1, (performance.now() - s.flipStart) / s.flipDuration);
        const e = cubicInOut(t);
        s.flipAngle = s.flipFrom + (s.flipTarget - s.flipFrom) * e;
        if (t >= 1) s.flipAngle = s.flipTarget;
      }

      if (innerRef.current) {
        innerRef.current.style.transform = `rotateX(${s.rx}deg) rotateY(${s.ry + s.flipAngle}deg)`;
      }
      if (frontRef.current && backRef.current) {
        const angle = ((s.flipAngle % 360) + 360) % 360;
        const frontFacing = angle <= 90 || angle >= 270;
        frontRef.current.style.visibility = frontFacing ? 'visible' : 'hidden';
        backRef.current.style.visibility = frontFacing ? 'hidden' : 'visible';
      }
      if (sheenRef.current) {
        sheenRef.current.style.background = `
          radial-gradient(circle at ${s.sx}% ${s.sy}%,
            rgba(255,255,255,0.55) 0%,
            rgba(196,188,224,0.18) 18%,
            rgba(168,188,220,0.10) 32%,
            rgba(255,255,255,0.0) 55%)
        `;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [hovering, idleSway]);

  // When the cursor is hovering the back-side links, tilt is frozen
  // back to neutral. Otherwise mousemove → tilt → links shift under
  // the cursor → hover loses → tilt resets → loops infinitely (the
  // classic "flickering links" 3D-tilt bug). Using a ref instead of
  // state so toggling it doesn't trigger re-renders inside the RAF loop.
  const isOverLinksRef = useRef(false);

  const onLinkAreaEnter = useCallback(() => {
    isOverLinksRef.current = true;
    const s = state.current;
    s.targetRx = 0;
    s.targetRy = 0;
  }, []);
  const onLinkAreaLeave = useCallback(() => {
    isOverLinksRef.current = false;
  }, []);

  const onMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (isOverLinksRef.current) return;
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect) return;
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = (e.clientX - cx) / (rect.width / 2);
    const dy = (e.clientY - cy) / (rect.height / 2);
    const s = state.current;
    s.targetRy = dx * 15;
    s.targetRx = -dy * 15;
    s.sxT = ((e.clientX - rect.left) / rect.width) * 100;
    s.syT = ((e.clientY - rect.top) / rect.height) * 100;
  }, []);

  const onLeave = useCallback(() => {
    setHovering(false);
    isOverLinksRef.current = false;
    const s = state.current;
    s.targetRx = 0;
    s.targetRy = 0;
  }, []);

  const onEnter = useCallback(() => {
    setHovering(true);
  }, []);

  return (
    <div
      ref={wrapRef}
      className="idcard-perspective"
      onMouseMove={onMove}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      onClick={() => setFlipped((f) => !f)}
    >
      <div ref={innerRef} className="idcard-inner">
        <div ref={frontRef} className="idcard-face idcard-front">
          <div className="idcard-glass">
            <IdCardFront />
            <div ref={sheenRef} className="idcard-sheen" />
          </div>
        </div>
        <div ref={backRef} className="idcard-face idcard-back">
          <div className="idcard-glass">
            <IdCardBack
              onLinkAreaEnter={onLinkAreaEnter}
              onLinkAreaLeave={onLinkAreaLeave}
            />
            <div className="idcard-sheen idcard-sheen-back" />
          </div>
        </div>
      </div>
    </div>
  );
}

function IdCardFront() {
  return (
    <div className="idcard-bg">
      <div className="idcard-header">
        <div className="t-mono-xs">RUS · ID</div>
        <div className="t-mono-xs">EK · 2026</div>
      </div>

      <div className="idcard-body">
        <div className="idcard-photo">
          <img src="/id/my-photo.jpg" alt="Егор Кривошеин" loading="eager" />
        </div>

        <div className="idcard-fields">
          <Field label="ФАМИЛИЯ" value="КРИВОШЕИН" big />
          <Field label="ИМЯ" value="ЕГОР" big />
          <Field label="РОД ДЕЯТЕЛЬНОСТИ" value="QA-ИНЖЕНЕР / РАЗРАБОТЧИК · ДИЗАЙНЕР" />
          <div className="idcard-row">
            <Field label="ЛОКАЦИЯ" value="МОСКВА" />
            <Field label="ДАТА РОЖДЕНИЯ" value="25.11.2003" />
          </div>
          <div className="idcard-row">
            <Field label="ОПЫТ" value="3+ ГОДА" />
            <Field label="ВЫДАНО" value="2026" />
          </div>
          <Field label="СТАТУС" value="ОТКРЫТ К ПРЕДЛОЖЕНИЯМ" status />
        </div>
      </div>
    </div>
  );
}

interface ContactLink {
  label: 'TELEGRAM' | 'EMAIL' | 'GITHUB' | 'VK';
  value: string;
  href: string;
}

interface IdCardBackProps {
  onLinkAreaEnter?: () => void;
  onLinkAreaLeave?: () => void;
}

const EMAIL = 'egorqrivoshein@gmail.com';

function IdCardBack({ onLinkAreaEnter, onLinkAreaLeave }: IdCardBackProps) {
  const contacts: ContactLink[] = [
    { label: 'TELEGRAM', value: '@qrivoshein', href: 'https://t.me/qrivoshein' },
    { label: 'EMAIL', value: EMAIL, href: 'mailto:' + EMAIL },
    { label: 'GITHUB', value: 'github.com/qrivoshein', href: 'https://github.com/qrivoshein' },
    { label: 'VK', value: 'vk.com/qrivoshein', href: 'https://vk.com/qrivoshein' },
  ];

  const skills =
    'QA · Postman · TestRail · Charles · GitLab CI/CD · Kibana · Grafana · TypeScript · React · Node.js · Python · PostgreSQL · Figma · WebSocket';

  const [emailCopied, setEmailCopied] = useState(false);

  const handleEmailClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard
      .writeText(EMAIL)
      .then(() => {
        setEmailCopied(true);
        window.setTimeout(() => setEmailCopied(false), 2000);
      })
      .catch(() => {
        /* clipboard API may be unavailable on HTTP / older Safari —
           silently fail; user can still long-press the visible text. */
      });
  };

  return (
    <div className="idcard-bg">
      <div className="idcard-header">
        <div className="t-mono-xs">EK · КОНТАКТЫ</div>
        <div className="t-mono-xs">REV · 2026</div>
      </div>

      <div className="idcard-back-body">
        <div
          className="idcard-contacts"
          onMouseEnter={onLinkAreaEnter}
          onMouseLeave={onLinkAreaLeave}
        >
          {contacts.map((c) =>
            c.label === 'EMAIL' ? (
              <a
                key={c.label}
                href={c.href}
                onClick={handleEmailClick}
                className="idcard-contact"
              >
                <ContactIcon label={c.label} />
                <div className="idcard-contact-text">
                  <span className="t-engraved-label">{c.label}</span>
                  <span className="idcard-contact-value">
                    {c.value}
                    {emailCopied && (
                      <span className="idcard-contact-copied">(скопировано)</span>
                    )}
                  </span>
                </div>
              </a>
            ) : (
              <a
                key={c.label}
                href={c.href}
                target="_blank"
                rel="noopener noreferrer"
                className="idcard-contact"
                onClick={(e) => e.stopPropagation()}
              >
                <ContactIcon label={c.label} />
                <div className="idcard-contact-text">
                  <span className="t-engraved-label">{c.label}</span>
                  <span className="idcard-contact-value">{c.value}</span>
                </div>
              </a>
            ),
          )}
        </div>
      </div>

      <div className="idcard-skills">
        <div className="t-engraved-label" style={{ marginBottom: 4 }}>СТЕК</div>
        <div className="idcard-skills-line">{skills}</div>
        <div className="idcard-footer t-mono-xs">МОСКВА · 2026</div>
      </div>
    </div>
  );
}

interface FieldProps {
  label: string;
  value: string;
  big?: boolean;
  status?: boolean;
}

function Field({ label, value, big, status }: FieldProps) {
  const valueStyle: CSSProperties | undefined = undefined;
  return (
    <div className="idcard-field">
      <div className="t-engraved-label">{label}</div>
      <div
        className={`idcard-field-value ${big ? 'idcard-field-value-big' : ''} ${
          status ? 'idcard-field-status' : ''
        }`}
        style={valueStyle}
      >
        {status && <span className="status-tag">[ACTIVE]</span>}
        {value}
      </div>
    </div>
  );
}

function ContactIcon({ label }: { label: ContactLink['label'] }) {
  const common = {
    width: 18,
    height: 18,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'rgba(10,10,10,0.7)',
    strokeWidth: 1.4,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
  if (label === 'TELEGRAM')
    return (
      <svg {...common}>
        <path d="M3 11l17-7-3 16-5-4-3 4-1-6 12-7-13 5z" />
      </svg>
    );
  if (label === 'EMAIL')
    return (
      <svg {...common}>
        <rect x="3" y="5" width="18" height="14" rx="1.5" />
        <path d="M3 7l9 6 9-6" />
      </svg>
    );
  if (label === 'GITHUB')
    return (
      <svg {...common}>
        <path d="M12 2a10 10 0 0 0-3.2 19.5c.5.1.7-.2.7-.5v-1.7c-2.8.6-3.4-1.3-3.4-1.3-.5-1.2-1.1-1.5-1.1-1.5-.9-.6.1-.6.1-.6 1 .1 1.5 1 1.5 1 .9 1.5 2.3 1.1 2.9.8.1-.7.4-1.1.6-1.4-2.2-.3-4.6-1.1-4.6-5 0-1.1.4-2 1-2.7-.1-.3-.4-1.3.1-2.7 0 0 .8-.3 2.7 1a9.4 9.4 0 0 1 5 0c1.9-1.3 2.7-1 2.7-1 .5 1.4.2 2.4.1 2.7.6.7 1 1.6 1 2.7 0 3.9-2.4 4.7-4.6 5 .4.3.7.9.7 1.8v2.7c0 .3.2.6.7.5A10 10 0 0 0 12 2z" />
      </svg>
    );
  if (label === 'VK')
    return (
      <svg {...common}>
        <path d="M3 7c.5 6 4.5 10 9 10h1v-3.5c0-.5.2-.5.4-.2.5.5 2 2.5 2.5 3.2.2.3.4.5.8.5H20c.7 0 1-.4.7-1-.4-.8-2-2.8-2.4-3.4-.3-.4-.3-.6 0-1 .6-.6 2.1-2.6 2.4-3.4.2-.4 0-.7-.5-.7h-2.4c-.4 0-.6.1-.8.5-.4.8-1.7 2.6-2.2 3.2-.4.4-.5.2-.5-.3V7.4c0-.3-.2-.5-.5-.5h-3.6c-.3 0-.4.2-.4.4 0 .4.5.4.6 1.4v2.1c0 .6-.1.7-.4.3-.7-.8-1.6-2.5-2-3.4-.2-.4-.4-.5-.8-.5H4.2c-.4 0-.7.2-.7.6 0 .1 0 .1 0 .2z" />
      </svg>
    );
  return null;
}
