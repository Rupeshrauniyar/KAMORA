'use client';

import * as React from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

/**
 * Sleek 2026 top hairline navigation progress bar.
 * Fires instantaneously on internal link clicks and smoothly completes on route switch.
 */
function NavigationProgressInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [progress, setProgress] = React.useState(0);
  const [visible, setVisible] = React.useState(false);
  const timerRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const hideRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const complete = React.useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setProgress(100);
    hideRef.current = setTimeout(() => {
      setVisible(false);
      setProgress(0);
    }, 240);
  }, []);

  const start = React.useCallback(() => {
    if (hideRef.current) clearTimeout(hideRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
    setVisible(true);
    setProgress(18);
    timerRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 88) return prev;
        return prev + Math.max(2, (90 - prev) * 0.18);
      });
    }, 120);
  }, []);

  // Complete progress bar whenever route finishes changing
  React.useEffect(() => {
    complete();
  }, [pathname, searchParams, complete]);

  // Listen for internal link clicks to trigger immediate visual feedback
  React.useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const anchor = (e.target as HTMLElement | null)?.closest('a');
      if (!anchor) return;
      const href = anchor.getAttribute('href');
      if (
        !href ||
        href.startsWith('#') ||
        href.startsWith('mailto:') ||
        href.startsWith('tel:') ||
        anchor.target === '_blank'
      ) {
        return;
      }
      try {
        const nextUrl = new URL(href, window.location.origin);
        if (nextUrl.origin !== window.location.origin) return;
        if (
          nextUrl.pathname === window.location.pathname &&
          nextUrl.search === window.location.search
        ) {
          return;
        }
        start();
      } catch {
        // ignore invalid href
      }
    }

    document.addEventListener('click', handleClick, true);
    return () => {
      document.removeEventListener('click', handleClick, true);
      if (timerRef.current) clearInterval(timerRef.current);
      if (hideRef.current) clearTimeout(hideRef.current);
    };
  }, [start]);

  if (!visible) return null;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-[2.5px] bg-transparent"
    >
      <div
        className="h-full origin-left bg-gradient-to-r from-[#0E1116] via-[#B89768] to-[#1C3D5A] transition-transform duration-200 ease-out"
        style={{ transform: `scaleX(${progress / 100})` }}
      />
    </div>
  );
}

export function NavigationProgress() {
  return (
    <React.Suspense fallback={null}>
      <NavigationProgressInner />
    </React.Suspense>
  );
}
