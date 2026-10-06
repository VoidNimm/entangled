/**
 * useLenis - initialises Lenis smooth-scroll, syncs it to GSAP's ticker,
 * and wires ScrollTrigger.update to every Lenis scroll event.
 *
 * StrictMode safety: useEffect cleanup destroys the Lenis instance and
 * removes the GSAP ticker callback. A ref-guard prevents double-init
 * when React re-runs the effect in dev mode.
 *
 * Capabilities: if the user is in static mode, Lenis is never
 * created - native scroll is used and ScrollTrigger still works because
 * it listens to the native scroll event by default.
 */
import { useEffect, useRef, useState } from 'react';
import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useCapabilities } from './useCapabilities';

gsap.registerPlugin(ScrollTrigger);

interface UseLenisReturn {
  /** The Lenis instance, or null before initialisation / on reduced-motion */
  lenis: Lenis | null;
}

export function useLenis(): UseLenisReturn {
  const [lenis, setLenis] = useState<Lenis | null>(null);
  const { mode } = useCapabilities();

  // Ref-guard: prevents double-init in StrictMode where the effect
  // fires -> cleans up -> fires again before the first cleanup is garbage-collected.
  const initRef = useRef(false);

  useEffect(() => {
    // Respect capabilities - skip Lenis entirely in static mode
    if (mode === 'static') return;

    // StrictMode guard: if another mount already created Lenis, bail.
    if (initRef.current) return;
    initRef.current = true;

    const instance = new Lenis({
      lerp: 0.08,
      // Don't override native scroll behavior on touch - only wheel/keyboard.
      // This lets mobile scroll feel native while desktop gets butter-smooth.
    });

    // Every Lenis scroll tick -> tell ScrollTrigger to re-evaluate positions.
    instance.on('scroll', ScrollTrigger.update);

    // Disable GSAP's own lag compensation - it fights with Lenis's lerp
    // and causes jumps after idle periods.
    gsap.ticker.lagSmoothing(0);

    // Drive Lenis's RAF loop from GSAP's ticker so both share the same
    // frame timing. GSAP ticker fires ~60fps and passes elapsed time.
    const tickerCallback = (time: number) => {
      // GSAP ticker `time` is in seconds; Lenis.raf expects milliseconds.
      instance.raf(time * 1000);
    };
    gsap.ticker.add(tickerCallback);

    setLenis(instance);

    return () => {
      initRef.current = false;
      gsap.ticker.remove(tickerCallback);
      instance.destroy();
      setLenis(null);
    };
  }, [mode]);

  return { lenis };
}
