import { useEffect } from 'react';
import { createCloud } from '../lib/cloud';
import type { CloudInstance } from '../types';

interface UseWheelNavigationOptions {
  /** Number of cycling sections. */
  count: number;
  /** Called when the active section index changes (snapped, modulo count). */
  onActiveChange: (idx: number) => void;
}

/**
 * Mounts the cloud engine onto #cloud-canvas, then drives all
 * .section-panel elements with a scrub + inertia + snap + burst
 * scroll model on top of cyclic positions in [0, count).
 *
 * Cleanup cancels the loop, the FPS probe, removes input listeners,
 * and destroys the cloud.
 */
export function useWheelNavigation({ count, onActiveChange }: UseWheelNavigationOptions) {
  useEffect(() => {
    const cloudCanvas = document.getElementById('cloud-canvas') as HTMLCanvasElement | null;
    if (!cloudCanvas) return;

    const cloud: CloudInstance = createCloud(cloudCanvas);
    window.__cloud = cloud;

    // FPS probe
    let frames = 0;
    const probeStart = performance.now();
    let probeRaf = 0;
    const probe = () => {
      frames++;
      if (performance.now() - probeStart < 1000) {
        probeRaf = requestAnimationFrame(probe);
      } else {
        if (frames < 45 && cloud.setBaseCount) cloud.setBaseCount(1100);
      }
    };
    probeRaf = requestAnimationFrame(probe);

    const N = count;
    const panels = document.querySelectorAll<HTMLElement>('.section-panel');

    // Shortest signed distance in cyclic space, in [-N/2, N/2].
    function cyclicDist(a: number): number {
      let d = ((a % N) + N) % N;
      if (d > N / 2) d -= N;
      return d;
    }

    // Touchpads fire many small pixel-mode wheel events (|deltaY| < 50,
    // deltaMode === 0). Mice fire fewer, larger events (or line mode).
    // We keep separate sensitivities + burst thresholds so a casual
    // two-finger swipe doesn't fly past several sections, but a single
    // mouse-wheel notch still advances cleanly.
    const TOUCHPAD_SENSITIVITY = 0.0004;
    const MOUSE_SENSITIVITY = 0.0015;
    const TOUCHPAD_BURST = 300;
    const MOUSE_BURST = 150;

    const DAMPING = 0.92;
    const SNAP_DELAY = 200;
    const BURST_WINDOW = 150;
    const VEL_MIN = 0.0005;
    const VEL_MAX = 0.05; // hard cap → at 60fps that's ~3 sections/sec
    const LERP_AUTO = 0.12;
    const SNAP_COOLDOWN_MS = 300; // post-snap, wheel impact is dampened
    const COOLDOWN_DAMPEN = 1 / 3;

    let scrollPos = 0;
    let velocity = 0;
    let lastInputAt = performance.now();
    let burstSum = 0;
    let burstWinStart = performance.now();
    let autoTarget: number | null = null;
    let cooldownUntil = 0; // performance.now() at which cooldown ends

    const ringDot = document.querySelector<SVGCircleElement>('.progress-ring-dot');
    let currentActive = 0;

    function renderPanels() {
      for (let i = 0; i < panels.length; i++) {
        const dist = cyclicDist(scrollPos - i);
        const ad = Math.abs(dist);
        if (ad >= 1.5) {
          panels[i].style.opacity = '0';
          panels[i].style.transform = 'scale(0.3)';
          panels[i].style.filter = 'blur(25px)';
          panels[i].style.pointerEvents = 'none';
        } else {
          const t = Math.min(1, ad);
          const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
          const opacity = 1 - e;
          const scale = 1 - 0.7 * e;
          const blur = 25 * e;
          panels[i].style.opacity = String(opacity);
          panels[i].style.transform = `scale(${scale})`;
          // `filter` (even `blur(0px)`) creates an implicit clip rect at the
          // element's bounding box per the CSS Filter Effects spec — that
          // was cutting the right halo of NeOrbit's rightmost card. Skip
          // the filter declaration when blur is effectively zero so the
          // active panel renders without a filter stacking context.
          panels[i].style.filter = blur > 0.05 ? `blur(${blur}px)` : '';
          panels[i].style.pointerEvents = ad < 0.08 ? 'auto' : 'none';
        }
      }

      // Cloud peaks mid-transition between two sections (also cyclic-safe)
      const frac = Math.abs(cyclicDist(scrollPos - Math.round(scrollPos)));
      const cloudIntensity = Math.sin((Math.min(1, frac * 2) * Math.PI) / 2);
      cloud.setDensity(1.0 + cloudIntensity * 1.4);
      if (cloudIntensity > 0.05) {
        cloud.pullTo(window.innerWidth / 2, window.innerHeight / 2, cloudIntensity * 0.6);
      }

      // Progress ring dot orbits at angle = (scrollPos / N) * 360°
      if (ringDot) {
        const angle = ((((scrollPos % N) + N) % N) / N) * 360 - 90;
        const cx = 30 + Math.cos((angle * Math.PI) / 180) * 22;
        const cy = 30 + Math.sin((angle * Math.PI) / 180) * 22;
        ringDot.setAttribute('cx', cx.toFixed(2));
        ringDot.setAttribute('cy', cy.toFixed(2));
      }

      const nearest = ((Math.round(scrollPos) % N) + N) % N;
      if (nearest !== currentActive) {
        currentActive = nearest;
        onActiveChange(nearest);
        // Reset the new section's scroll position so the user always
        // lands at its top after a transition.
        const newSection = panels[nearest]?.querySelector('.section') as HTMLElement | null;
        if (newSection) newSection.scrollTop = 0;
      }
    }

    let stopped = false;
    function loop() {
      if (stopped) return;
      const now = performance.now();
      const idle = now - lastInputAt;

      if (autoTarget !== null) {
        scrollPos += (autoTarget - scrollPos) * LERP_AUTO;
        if (Math.abs(autoTarget - scrollPos) < 0.001) {
          scrollPos = autoTarget;
          autoTarget = null;
          // We just landed on a section — short cooldown so a still-rolling
          // wheel/trackpad doesn't immediately fling us past the next one.
          cooldownUntil = now + SNAP_COOLDOWN_MS;
        }
        velocity = 0;
      } else {
        if (Math.abs(velocity) > VEL_MIN) {
          scrollPos += velocity;
          velocity *= DAMPING;
        } else {
          velocity = 0;
        }

        if (velocity === 0 && idle > SNAP_DELAY) {
          const nearest = Math.round(scrollPos);
          if (Math.abs(scrollPos - nearest) > 0.001) {
            autoTarget = nearest;
          }
        }
      }

      if (scrollPos < 0) {
        scrollPos += N;
        if (autoTarget !== null) autoTarget += N;
      }
      if (scrollPos >= N) {
        scrollPos -= N;
        if (autoTarget !== null) autoTarget -= N;
      }

      renderPanels();
      setTimeout(loop, 16);
    }
    loop();

    type DeviceKind = 'touchpad' | 'mouse';

    function applyImpulse(dy: number, device: DeviceKind) {
      const now = performance.now();
      lastInputAt = now;
      autoTarget = null;

      const sensitivity = device === 'touchpad' ? TOUCHPAD_SENSITIVITY : MOUSE_SENSITIVITY;
      const burstThreshold = device === 'touchpad' ? TOUCHPAD_BURST : MOUSE_BURST;
      const damp = now < cooldownUntil ? COOLDOWN_DAMPEN : 1;

      if (now - burstWinStart > BURST_WINDOW) {
        burstSum = 0;
        burstWinStart = now;
      }
      burstSum += dy * damp;

      velocity += dy * sensitivity * damp;
      if (velocity > VEL_MAX) velocity = VEL_MAX;
      else if (velocity < -VEL_MAX) velocity = -VEL_MAX;

      if (Math.abs(burstSum) > burstThreshold) {
        const dir = Math.sign(burstSum);
        const target = Math.round(scrollPos) + dir;
        if (
          target !== Math.round(scrollPos) ||
          Math.abs(scrollPos - Math.round(scrollPos)) > 0.05
        ) {
          autoTarget = target;
          velocity = 0;
        }
        burstSum = 0;
      }
    }

    // Touchpad: many small pixel-mode events. Mouse: rare large events
    // or line-mode. Pixel deltas under 50 ⇒ trackpad; everything else ⇒
    // mouse. Line/page mode is always mouse.
    function detectDevice(e: WheelEvent): DeviceKind {
      if (e.deltaMode !== 0) return 'mouse';
      return Math.abs(e.deltaY) < 50 ? 'touchpad' : 'mouse';
    }

    const wheelHandler = (e: WheelEvent) => {
      e.preventDefault();
      applyImpulse(e.deltaY, detectDevice(e));
    };
    window.addEventListener('wheel', wheelHandler, { passive: false });

    // Touch handling — two modes, picked per-stroke by viewport width:
    //
    // Desktop (≥ 768 px wide): every vertical swipe drives section z-axis
    //   navigation. (Tablets in landscape still use this — `useWheelNav`
    //   originally serves desktop trackpads.)
    //
    // Mobile (< 768 px wide): the active section uses native overflow-y
    //   scroll so its content can exceed 100 vh. Section transition fires
    //   only when the active section's scroll position is pinned to the
    //   top / bottom edge AND the user continues swiping in that
    //   direction. Otherwise the move is left to the browser's native
    //   scroll. Horizontal-dominant swipes always defer to native scroll
    //   so the NeOrbit carousel works.
    const MOBILE_BP = 768;
    const isMobileViewport = () => window.innerWidth < MOBILE_BP;

    let touchPrevY = 0;
    let touchStartY = 0;
    let touchStartX = 0;
    let touchActive = false;
    let touchDir: 'vertical' | 'horizontal' | null = null;
    let activeScroller: HTMLElement | null = null;

    function findActiveScroller(): HTMLElement | null {
      const idx = ((Math.round(scrollPos) % N) + N) % N;
      const panel = panels[idx];
      return (panel?.querySelector('.section') as HTMLElement | null) ?? null;
    }

    const onTouchStart = (e: TouchEvent) => {
      const t = e.touches[0];
      touchPrevY = t.clientY;
      touchStartY = t.clientY;
      touchStartX = t.clientX;
      touchActive = true;
      touchDir = null;
      activeScroller = isMobileViewport() ? findActiveScroller() : null;
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!touchActive) return;
      const t = e.touches[0];
      const cy = t.clientY;
      const cx = t.clientX;
      if (touchDir === null) {
        const dy = Math.abs(cy - touchStartY);
        const dx = Math.abs(cx - touchStartX);
        if (dy > 8 || dx > 8) touchDir = dy > dx ? 'vertical' : 'horizontal';
      }
      if (touchDir !== 'vertical') {
        // Horizontal-dominant or undecided — let native scroll handle it
        // (carousel etc.). Don't preventDefault.
        touchPrevY = cy;
        return;
      }

      const dy = touchPrevY - cy;
      touchPrevY = cy;

      if (!isMobileViewport()) {
        // Desktop touchscreen path — always fire section nav.
        e.preventDefault();
        applyImpulse(dy * 2.2, 'mouse');
        return;
      }

      // Mobile path — boundary detection on the active section.
      if (!activeScroller) {
        e.preventDefault();
        applyImpulse(dy * 2.2, 'mouse');
        return;
      }
      const st = activeScroller.scrollTop;
      const maxSt = activeScroller.scrollHeight - activeScroller.clientHeight;
      const atTop = st <= 1;
      const atBottom = st >= maxSt - 1;
      if ((atTop && dy < 0) || (atBottom && dy > 0)) {
        // At a scroll edge and the user keeps swiping in that direction
        // → trigger a section transition. Boost the impulse so a single
        // overscroll stroke is enough to fire the burst snap.
        e.preventDefault();
        applyImpulse(dy * 5, 'mouse');
      }
      // else: don't preventDefault — browser scrolls the section natively.
    };
    const onTouchEnd = () => {
      touchActive = false;
      touchDir = null;
      activeScroller = null;
    };
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd, { passive: true });

    const stepKey = (dir: number) => {
      lastInputAt = performance.now();
      velocity = 0;
      autoTarget = Math.round(scrollPos) + dir;
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ') {
        e.preventDefault();
        stepKey(+1);
      } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
        e.preventDefault();
        stepKey(-1);
      } else if (e.key === 'Home') {
        e.preventDefault();
        lastInputAt = performance.now();
        velocity = 0;
        autoTarget = 0;
      } else if (e.key === 'End') {
        e.preventDefault();
        lastInputAt = performance.now();
        velocity = 0;
        autoTarget = N - 1;
      }
    };
    window.addEventListener('keydown', onKey);

    // Debug hooks
    window.__setPos = (v: number) => {
      scrollPos = v;
      velocity = 0;
      autoTarget = null;
      lastInputAt = performance.now();
    };
    window.__pos = () => ({ scrollPos, velocity, autoTarget });
    window.__nudge = (dy: number) => applyImpulse(dy, Math.abs(dy) < 50 ? 'touchpad' : 'mouse');

    return () => {
      stopped = true;
      cancelAnimationFrame(probeRaf);
      window.removeEventListener('wheel', wheelHandler);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('keydown', onKey);
      cloud.destroy();
    };
  }, [count, onActiveChange]);
}
