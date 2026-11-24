'use client';

import * as React from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import type { Announcement } from '@/types/database';

export function AnnouncementBar({ announcements }: { announcements: Announcement[] }) {
  const [index, setIndex] = React.useState(0);
  const [paused, setPaused] = React.useState(false);

  React.useEffect(() => {
    if (announcements.length <= 1 || paused) return;
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % announcements.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [announcements.length, paused]);

  if (announcements.length === 0) return null;
  const current = announcements[index] ?? announcements[0]!;

  return (
    <div className="border-b border-white/10 bg-[#0E1116] text-white">
      <div className="mx-auto flex max-w-[1380px] items-center justify-between gap-3 px-4 py-2 text-[11px] sm:px-8">
        <div className="hidden items-center gap-1 sm:flex">
          {announcements.length > 1 && (
            <>
              <button
                type="button"
                onClick={() =>
                  setIndex((prev) => (prev - 1 + announcements.length) % announcements.length)
                }
                aria-label="Previous announcement"
                className="inline-flex h-6 w-6 items-center justify-center rounded-full text-white/60 transition hover:bg-white/10 hover:text-white cursor-pointer"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setIndex((prev) => (prev + 1) % announcements.length)}
                aria-label="Next announcement"
                className="inline-flex h-6 w-6 items-center justify-center rounded-full text-white/60 transition hover:bg-white/10 hover:text-white cursor-pointer"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </>
          )}
        </div>

        <p className="flex-1 text-center font-medium tracking-[0.02em] text-white/85">
          <span>{current.message}</span>
          {current.link_href && current.link_label && (
            <Link
              href={current.link_href}
              className="ml-2.5 inline-flex items-center font-semibold text-[#D6BA8E] underline decoration-[#D6BA8E]/40 underline-offset-4 transition hover:text-white"
            >
              {current.link_label}
            </Link>
          )}
        </p>

        <div className="hidden items-center justify-end sm:flex">
          {announcements.length > 1 && (
            <button
              type="button"
              onClick={() => setPaused((p) => !p)}
              aria-label={paused ? 'Play announcements' : 'Pause announcements'}
              className="inline-flex h-6 w-6 items-center justify-center rounded-full text-white/60 transition hover:bg-white/10 hover:text-white cursor-pointer"
            >
              {paused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
