'use client';

import * as React from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, Expand, ZoomIn } from 'lucide-react';
import type { ProductImage } from '@/types/database';
import { ModalDialog } from '@/components/ui/dialog';
import { cn } from '@/lib/utils/format';

export function ProductGallery({ images }: { images: ProductImage[] }) {
  const [activeIndex, setActiveIndex] = React.useState(0);
  const [lightboxOpen, setLightboxOpen] = React.useState(false);
  const [zoomed, setZoomed] = React.useState(false);
  const touchStartX = React.useRef<number | null>(null);

  const safeImages = images.length > 0 ? images : [];
  const active = safeImages[activeIndex] ?? safeImages[0];
  if (!active) return null;

  const prev = () =>
    setActiveIndex((i) => (i - 1 + safeImages.length) % safeImages.length);
  const next = () => setActiveIndex((i) => (i + 1) % safeImages.length);

  return (
    <div className="space-y-4">
      <div
        className="group relative aspect-[4/3] w-full overflow-hidden rounded-[26px] border border-[#E6E3DC] bg-[#F2F0EB] shadow-soft"
        onTouchStart={(e) => {
          touchStartX.current = e.touches[0]?.clientX ?? null;
        }}
        onTouchEnd={(e) => {
          if (touchStartX.current === null) return;
          const delta = (e.changedTouches[0]?.clientX ?? 0) - touchStartX.current;
          if (delta > 45) prev();
          if (delta < -45) next();
          touchStartX.current = null;
        }}
      >
        <Image
          src={active.url}
          alt={active.alt_text}
          fill
          priority={activeIndex === 0}
          fetchPriority={activeIndex === 0 ? 'high' : undefined}
          sizes="(max-width: 1024px) 100vw, 55vw"
          onClick={() => setZoomed((z) => !z)}
          className={cn(
            'object-cover transition-transform duration-500 cursor-zoom-in',
            zoomed && 'scale-125 cursor-zoom-out'
          )}
        />

        {active.caption && (
          <div className="pointer-events-none absolute bottom-4 left-4 rounded-full border border-white/60 bg-white/85 px-3.5 py-1.5 text-xs font-medium text-[#11151B] backdrop-blur-md">
            {active.caption}
          </div>
        )}

        <div className="absolute right-4 top-4 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setZoomed((z) => !z)}
            aria-label={zoomed ? 'Reset zoom' : 'Zoom product image'}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/60 bg-white/85 text-[#11151B] backdrop-blur-md transition hover:bg-white cursor-pointer"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setLightboxOpen(true)}
            aria-label="Open full screen gallery"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/60 bg-white/85 text-[#11151B] backdrop-blur-md transition hover:bg-white cursor-pointer"
          >
            <Expand className="h-4 w-4" />
          </button>
        </div>

        {safeImages.length > 1 && (
          <>
            <button
              type="button"
              onClick={prev}
              aria-label="Previous product image"
              className="absolute left-3 top-1/2 -translate-y-1/2 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/60 bg-white/85 text-[#11151B] backdrop-blur-md transition hover:bg-white cursor-pointer"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={next}
              aria-label="Next product image"
              className="absolute right-3 top-1/2 -translate-y-1/2 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/60 bg-white/85 text-[#11151B] backdrop-blur-md transition hover:bg-white cursor-pointer"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}
      </div>

      {safeImages.length > 1 && (
        <div className="grid grid-cols-4 gap-3">
          {safeImages.map((img, idx) => (
            <button
              key={img.id}
              type="button"
              onClick={() => {
                setActiveIndex(idx);
                setZoomed(false);
              }}
              aria-label={`View ${img.caption ?? img.alt_text}`}
              className={cn(
                'relative aspect-[4/3] overflow-hidden rounded-[14px] border-2 bg-[#F2F0EB] transition cursor-pointer',
                idx === activeIndex
                  ? 'border-[#0E1116]'
                  : 'border-transparent opacity-70 hover:opacity-100'
              )}
            >
              <Image
                src={img.url}
                alt={img.alt_text}
                fill
                sizes="140px"
                fetchPriority={idx > 0 ? 'low' : undefined}
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}

      <ModalDialog
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        title={active.caption ?? 'Product Gallery'}
        description={active.alt_text}
        size="xl"
      >
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[18px] bg-[#F2F0EB]">
          <Image
            src={active.url}
            alt={active.alt_text}
            fill
            sizes="(max-width: 1024px) 95vw, 900px"
            className="object-contain"
          />
        </div>
        <div className="mt-4 flex items-center justify-between">
          <button
            type="button"
            onClick={prev}
            className="inline-flex items-center gap-1.5 rounded-full border border-[#E6E3DC] bg-white px-4 py-2 text-xs font-medium text-[#11151B] hover:border-[#0E1116] cursor-pointer"
          >
            <ChevronLeft className="h-4 w-4" /> Previous
          </button>
          <span className="font-mono-tech text-[11px] text-[#8A9099]">
            0{activeIndex + 1} / 0{safeImages.length}
          </span>
          <button
            type="button"
            onClick={next}
            className="inline-flex items-center gap-1.5 rounded-full border border-[#E6E3DC] bg-white px-4 py-2 text-xs font-medium text-[#11151B] hover:border-[#0E1116] cursor-pointer"
          >
            Next <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </ModalDialog>
    </div>
  );
}
