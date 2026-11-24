'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils/format';

const LAYERS = [
  {
    index: '01',
    label: 'Dual-Pull Compression',
    metric: '2× INDEPENDENT STRAPS',
    headline: 'Micro-adjustable tension as your posture shifts.',
    detail:
      'Pull both outer elastic straps forward to increase lumbar firmness while standing or walking, then release slightly in two seconds when seated at a desk or travelling.',
    image: '/images/belt-detail.jpg',
    imageAlt: 'Macro detail of dual-pull adjustable compression straps and air-mesh weave',
  },
  {
    index: '02',
    label: 'Contoured 4-Stay Core',
    metric: '21 CM LUMBAR SPAN',
    headline: 'Structured stability without rigid medical bulk.',
    detail:
      'Four flexible polypropylene stays mirror the natural lumbar lordosis curve, gently encouraging upright alignment while flexing smoothly with everyday bends.',
    image: '/images/hero-belt.jpg',
    imageAlt: 'Kamora Adjustable Back Support Belt contoured ergonomic lumbar structure',
  },
  {
    index: '03',
    label: 'Perforated 3D Air-Mesh',
    metric: 'ALL-SEASON BREATHABILITY',
    headline: 'Engineered specifically for Indian climates.',
    detail:
      'Open-cell perforated technical mesh paired with a brushed cotton-blend inner face channels warmth and moisture away so the belt remains light under daily clothing.',
    image: '/images/belt-lifestyle.jpg',
    imageAlt: 'Breathable discreet back support worn comfortably indoors in daylight',
  },
  {
    index: '04',
    label: 'Snag-Free Micro-Hook',
    metric: 'LOW-PROFILE FASTENING',
    headline: 'Quiet, secure grip that respects your wardrobe.',
    detail:
      'Precision-moulded micro-hook tabs fasten flush along the tapered front waist panel without pilling shirts, kurtas, or knitted loungewear.',
    image: '/images/comfort-kit.jpg',
    imageAlt: 'Kamora Back Support Belt with tailored storage pouch and fit card',
  },
];

export function EngineeringShowcase() {
  const [activeIdx, setActiveIdx] = React.useState(0);
  const current = LAYERS[activeIdx] ?? LAYERS[0]!;

  return (
    <section
      id="engineering"
      className="scroll-mt-20 bg-obsidian-ambient text-white py-24 sm:py-32"
    >
      <div className="mx-auto max-w-[1380px] px-4 sm:px-8">
        {/* Section Header */}
        <div className="grid gap-8 border-b border-white/10 pb-12 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-7">
            <p className="font-mono-tech text-[10px] text-[#D6BA8E]">
              02 / LUMBAR ARCHITECTURE
            </p>
            <h2 className="mt-4 font-heading text-3xl font-semibold leading-[1.08] tracking-[-0.03em] text-white sm:text-5xl">
              Precision anatomy,{' '}
              <span className="font-editorial italic font-normal text-[#D6BA8E]">
                stripped of bulk.
              </span>
            </h2>
          </div>
          <div className="lg:col-span-5 lg:text-right">
            <p className="text-sm leading-relaxed text-white/60 lg:ml-auto lg:max-w-sm lg:text-left">
              Explore the four interlocking elements engineered to deliver quiet, reliable lower-back
              support across 12-hour modern routines.
            </p>
          </div>
        </div>

        {/* Interactive Split */}
        <div className="mt-12 grid gap-10 lg:grid-cols-12 lg:items-center">
          {/* Layer Tabs */}
          <div className="space-y-2 lg:col-span-5" role="tablist" aria-label="Belt engineering layers">
            {LAYERS.map((layer, idx) => {
              const active = idx === activeIdx;
              return (
                <button
                  key={layer.index}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setActiveIdx(idx)}
                  className={cn(
                    'w-full rounded-[20px] border p-5 text-left transition duration-200 cursor-pointer',
                    active
                      ? 'border-white/20 bg-white/[0.07]'
                      : 'border-white/[0.06] bg-transparent hover:border-white/15 hover:bg-white/[0.03]'
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span
                        className={cn(
                          'font-mono-tech text-[11px]',
                          active ? 'text-[#D6BA8E]' : 'text-white/40'
                        )}
                      >
                        {layer.index}
                      </span>
                      <span className="font-heading text-base font-semibold text-white">
                        {layer.label}
                      </span>
                    </div>
                    <span className="font-mono-tech hidden text-[10px] text-white/45 sm:inline">
                      {layer.metric}
                    </span>
                  </div>
                  {active && (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25 }}
                      className="mt-3 pl-7"
                    >
                      <p className="text-sm font-medium text-white/90">{layer.headline}</p>
                      <p className="mt-1.5 text-xs leading-relaxed text-white/60">
                        {layer.detail}
                      </p>
                    </motion.div>
                  )}
                </button>
              );
            })}

            <div className="pt-5">
              <Link href="/products/back-support-belt">
                <Button variant="light" size="lg">
                  Inspect Technical Specifications
                  <ArrowUpRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>

          {/* Stage Image */}
          <div className="lg:col-span-7">
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[26px] border border-white/10 bg-[#161B22]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={current.index}
                  initial={{ opacity: 0, scale: 1.02 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.35, ease: 'easeOut' }}
                  className="absolute inset-0"
                >
                  <Image
                    src={current.image}
                    alt={current.imageAlt}
                    fill
                    loading="lazy"
                    sizes="(max-width: 1024px) 100vw, 58vw"
                    className="object-cover"
                  />
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#0E1116]/85 via-[#0E1116]/30 to-transparent" />
                  <div className="absolute bottom-5 left-5 right-5 flex items-end justify-between gap-4">
                    <div>
                      <p className="font-mono-tech text-[10px] text-[#D6BA8E]">
                        LAYER {current.index} · {current.metric}
                      </p>
                      <p className="mt-1 font-heading text-lg font-medium text-white">
                        {current.label}
                      </p>
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
