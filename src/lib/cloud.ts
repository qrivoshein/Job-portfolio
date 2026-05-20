/* ============================================================
   Cloud — Canvas 2D drifting soft-blob fog.

   No per-frame blur (too expensive in some preview iframes).
   Instead: each blob is a pre-rendered radial-gradient kernel
   with a soft falloff that *is* the blur. Drawing them with
   `multiply` blend onto the canvas makes them merge into clumpy fog.

   API:
     setDensity(mult)        scales effective alpha (0.5..2.5)
     pullTo(x,y, strength)   nudge blobs toward a point, decays per frame
     destroy()
   ============================================================ */

import type { CloudInstance } from '../types';

interface Tone {
  r: number;
  g: number;
  b: number;
}

interface Blob {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  baseR: number;
  alpha: number;
  pulse: number;
  pulseSpeed: number;
  kernel: number;
  phase: number;
  homeX: number;
  homeY: number;
}

// value-noise flow field
const perm = new Uint8Array(512);
(function seed() {
  const a: number[] = [];
  for (let i = 0; i < 256; i++) a.push(i);
  for (let i = 255; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [a[i], a[j]] = [a[j], a[i]];
  }
  for (let i = 0; i < 512; i++) perm[i] = a[i & 255];
})();

const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function noise2(x: number, y: number): number {
  const xi = Math.floor(x) & 255;
  const yi = Math.floor(y) & 255;
  const xf = x - Math.floor(x);
  const yf = y - Math.floor(y);
  const u = fade(xf);
  const v = fade(yf);
  const aa = perm[perm[xi] + yi];
  const ab = perm[perm[xi] + yi + 1];
  const ba = perm[perm[xi + 1] + yi];
  const bb = perm[perm[xi + 1] + yi + 1];
  const x1 = lerp((aa / 255) * 2 - 1, (ba / 255) * 2 - 1, u);
  const x2 = lerp((ab / 255) * 2 - 1, (bb / 255) * 2 - 1, u);
  return lerp(x1, x2, v);
}

// Cool muted palette — these get MULTIPLIED onto the light chrome
// base, so each blob softly DARKENS the bg in its area (like real fog).
// Pure white would do nothing; we want gentle cool grays.
const TONES: Tone[] = [
  { r: 188, g: 200, b: 222 }, // pale blue-silver, slightly darker
  { r: 196, g: 200, b: 212 }, // silver-gray
  { r: 196, g: 188, b: 218 }, // very faint lilac
  { r: 176, g: 192, b: 212 }, // muted cool blue
];

// Pre-render a soft radial-gradient blob kernel per tone.
// Big size + extreme falloff = naturally soft, no canvas filter needed.
// The stops are placed to mimic what a 60–80px Gaussian blur would
// give us, just done once at startup instead of every frame.
function buildKernel(tone: Tone, size: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d')!;
  const half = size / 2;
  const grd = ctx.createRadialGradient(half, half, 0, half, half, half);
  const { r, g, b } = tone;
  grd.addColorStop(0.0, `rgba(${r},${g},${b},0.55)`);
  grd.addColorStop(0.1, `rgba(${r},${g},${b},0.42)`);
  grd.addColorStop(0.22, `rgba(${r},${g},${b},0.28)`);
  grd.addColorStop(0.4, `rgba(${r},${g},${b},0.14)`);
  grd.addColorStop(0.65, `rgba(${r},${g},${b},0.05)`);
  grd.addColorStop(0.85, `rgba(${r},${g},${b},0.012)`);
  grd.addColorStop(1.0, `rgba(${r},${g},${b},0)`);
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, size, size);
  return c;
}

export function createCloud(canvas: HTMLCanvasElement): CloudInstance {
  const ctx = canvas.getContext('2d', { alpha: true })!;
  const dpr = Math.min(window.devicePixelRatio || 1, 1.25);

  const KERNEL_SIZE = 600;
  const kernels = TONES.map((t) => buildKernel(t, KERNEL_SIZE));

  function baseCount(): number {
    const a = window.innerWidth * window.innerHeight;
    const base = Math.round(Math.min(36, Math.max(26, a / 70000)));
    // Mobile viewports get a leaner cloud — smaller GPU budget, narrower
    // screen means overlap density is the same with fewer blobs.
    const isMobile = window.innerWidth <= 767;
    return isMobile ? Math.round(base * 0.6) : base;
  }

  let densityMult = 1.0;
  let targetDensity = 1.0;
  const pull = { x: 0, y: 0, strength: 0 };

  function spawn(p: Partial<Blob>): Blob {
    p.x = Math.random() * canvas.clientWidth;
    p.y = Math.random() * canvas.clientHeight;
    p.vx = (Math.random() - 0.5) * 0.05;
    p.vy = (Math.random() - 0.5) * 0.05;
    p.r = 180 + Math.random() * 220;
    p.baseR = p.r;
    p.alpha = 0.55 + Math.random() * 0.4;
    p.pulse = Math.random() * Math.PI * 2;
    p.pulseSpeed = 0.05 + Math.random() * 0.08;
    p.kernel = (Math.random() * kernels.length) | 0;
    p.phase = Math.random() * 1000;
    p.homeX = p.x;
    p.homeY = p.y;
    return p as Blob;
  }

  const blobs: Blob[] = [];
  function fillTo(n: number) {
    while (blobs.length < n) blobs.push(spawn({}));
    if (blobs.length > n) blobs.length = n;
  }

  function resize() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    fillTo(baseCount());
  }
  resize();
  window.addEventListener('resize', resize);

  const mouse = { x: -9999, y: -9999, active: false };
  const onPointerMove = (e: PointerEvent) => {
    // Skip touch — fingers shouldn't carve corridors in the cloud;
    // mouse and pen do.
    if (e.pointerType === 'touch') return;
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    mouse.active = true;
  };
  const onPointerLeave = () => {
    mouse.active = false;
  };
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerleave', onPointerLeave);

  let stopped = false;
  const t0 = performance.now();
  let lastT = t0;
  function step() {
    if (stopped) return;
    const now = performance.now();
    const dt = Math.min(0.05, (now - lastT) / 1000);
    lastT = now;
    const t = (now - t0) / 1000;

    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    ctx.clearRect(0, 0, w, h);

    densityMult += (targetDensity - densityMult) * 0.06;
    pull.strength *= 0.93;

    ctx.globalCompositeOperation = 'multiply';

    for (let i = 0; i < blobs.length; i++) {
      const p = blobs[i];

      // Slow Perlin drift
      const nx = noise2(p.x * 0.0012 + t * 0.04 + p.phase, p.y * 0.0012);
      const ny = noise2(p.x * 0.0012, p.y * 0.0012 + t * 0.04 + p.phase + 100);
      const ang = (nx + ny) * Math.PI;
      p.vx += Math.cos(ang) * 0.18 * dt;
      p.vy += Math.sin(ang) * 0.18 * dt;

      // Mouse repel
      if (mouse.active) {
        const dx = p.x - mouse.x;
        const dy = p.y - mouse.y;
        const R = 280;
        const d2 = dx * dx + dy * dy;
        if (d2 < R * R && d2 > 0.001) {
          const d = Math.sqrt(d2);
          const force = 1 - d / R;
          const easedForce = force * force;
          const a = Math.atan2(dy, dx);
          p.vx += Math.cos(a) * easedForce * 28 * dt;
          p.vy += Math.sin(a) * easedForce * 28 * dt;
        }
      }

      // Spring back toward "home"
      {
        const hx = p.homeX - p.x;
        const hy = p.homeY - p.y;
        p.vx += hx * 0.0012;
        p.vy += hy * 0.0012;
      }

      // Transition pull
      if (pull.strength > 0.01) {
        const dx = pull.x - p.x;
        const dy = pull.y - p.y;
        const d = Math.sqrt(dx * dx + dy * dy) + 0.001;
        p.vx += (dx / d) * pull.strength * 50 * dt;
        p.vy += (dy / d) * pull.strength * 50 * dt;
      }

      // Damping
      p.vx *= 0.92;
      p.vy *= 0.92;
      p.x += p.vx * 60 * dt;
      p.y += p.vy * 60 * dt;

      // Wrap with generous margin
      const M = p.r;
      if (p.x < -M) {
        p.x = w + M;
        p.homeX = p.x + (Math.random() - 0.5) * 200;
        p.homeY = Math.random() * h;
      } else if (p.x > w + M) {
        p.x = -M;
        p.homeX = p.x + (Math.random() - 0.5) * 200;
        p.homeY = Math.random() * h;
      }
      if (p.y < -M) {
        p.y = h + M;
        p.homeY = p.y + (Math.random() - 0.5) * 200;
        p.homeX = Math.random() * w;
      } else if (p.y > h + M) {
        p.y = -M;
        p.homeY = p.y + (Math.random() - 0.5) * 200;
        p.homeX = Math.random() * w;
      }

      // Slow alpha + radius pulse
      p.pulse += dt * p.pulseSpeed;
      const pa = Math.sin(p.pulse) * 0.5 + 0.5;
      const a = p.alpha * (0.7 + pa * 0.3) * densityMult;
      p.r = p.baseR * (0.92 + pa * 0.18);

      const drawSize = p.r * 2;
      ctx.globalAlpha = Math.min(1, a);
      ctx.drawImage(kernels[p.kernel], p.x - p.r, p.y - p.r, drawSize, drawSize);
    }

    ctx.globalAlpha = 1.0;
    ctx.globalCompositeOperation = 'source-over';

    setTimeout(step, 16);
  }
  step();

  return {
    setDensity(m: number) {
      targetDensity = Math.max(0.5, Math.min(2.5, m));
    },
    pullTo(x: number, y: number, strength = 1.0) {
      pull.x = x;
      pull.y = y;
      pull.strength = strength;
    },
    destroy() {
      stopped = true;
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerleave', onPointerLeave);
    },
  };
}
