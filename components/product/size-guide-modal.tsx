'use client';

import * as React from 'react';
import { Ruler, CheckCircle2 } from 'lucide-react';
import type { SizeGuideEntry } from '@/types/database';
import { ModalDialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface SizeGuideModalProps {
  open: boolean;
  onClose: () => void;
  sizeGuides: SizeGuideEntry[];
  onSelectSize?: (sizeCode: string) => void;
}

export function SizeGuideModal({
  open,
  onClose,
  sizeGuides,
  onSelectSize,
}: SizeGuideModalProps) {
  const [unit, setUnit] = React.useState<'in' | 'cm'>('in');
  const [measurement, setMeasurement] = React.useState('');

  const suggested = React.useMemo(() => {
    const val = parseFloat(measurement);
    if (Number.isNaN(val) || val <= 0) return null;

    return (
      sizeGuides.find((g) =>
        unit === 'in'
          ? val >= Number(g.waist_min_inches) && val <= Number(g.waist_max_inches)
          : val >= Number(g.waist_min_cm) && val <= Number(g.waist_max_cm)
      ) ?? null
    );
  }, [measurement, sizeGuides, unit]);

  return (
    <ModalDialog
      open={open}
      onClose={onClose}
      title="Precision Size Guide & Waist Finder"
      description="Measure horizontally around your navel while standing relaxed — not your trouser size."
      size="lg"
    >
      <div className="space-y-6">
        <div className="rounded-[18px] border border-[#E6E3DC] bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#11151B]">
              <Ruler className="h-4 w-4 text-[#B89768]" />
              Find Your Suggested Size
            </div>
            <div className="inline-flex rounded-full border border-[#E6E3DC] bg-[#FAFAF8] p-0.5 text-xs font-medium">
              <button
                type="button"
                onClick={() => setUnit('in')}
                className={`rounded-full px-3.5 py-1 transition cursor-pointer ${
                  unit === 'in' ? 'bg-[#0E1116] text-white' : 'text-[#5C636E]'
                }`}
              >
                Inches (in)
              </button>
              <button
                type="button"
                onClick={() => setUnit('cm')}
                className={`rounded-full px-3.5 py-1 transition cursor-pointer ${
                  unit === 'cm' ? 'bg-[#0E1116] text-white' : 'text-[#5C636E]'
                }`}
              >
                Centimetres (cm)
              </button>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <label htmlFor="waist-calc-input" className="sr-only">
              Enter waist measurement in {unit === 'in' ? 'inches' : 'centimetres'}
            </label>
            <input
              id="waist-calc-input"
              type="text"
              inputMode="decimal"
              value={measurement}
              onChange={(e) => setMeasurement(e.target.value)}
              placeholder={
                unit === 'in'
                  ? 'Enter waist in inches (e.g. 33)'
                  : 'Enter waist in cm (e.g. 84)'
              }
              className="h-11 flex-1 rounded-full border border-[#E6E3DC] bg-[#FAFAF8] px-4 text-sm text-[#11151B] focus:border-[#0E1116] focus:bg-white focus:outline-none"
            />
            {suggested && onSelectSize && (
              <Button
                variant="primary"
                onClick={() => {
                  onSelectSize(suggested.size_code);
                  onClose();
                }}
              >
                Select Size {suggested.size_code}
              </Button>
            )}
          </div>

          {measurement.trim() !== '' && (
            <div className="mt-3 text-sm">
              {suggested ? (
                <p className="flex items-center gap-2 font-medium text-[#11151B]">
                  <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                  Suggested Size:{' '}
                  <strong className="text-[#0E1116]">
                    {suggested.size_code} — {suggested.size_label}
                  </strong>
                </p>
              ) : (
                <p className="text-xs text-[#5C636E]">
                  Measurement is outside standard range (26–48 in / 66–122 cm). If between two
                  sizes, pick the larger size.
                </p>
              )}
            </div>
          )}
        </div>

        <div className="overflow-x-auto rounded-[18px] border border-[#E6E3DC] bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[#E6E3DC] bg-[#FAFAF8] font-mono-tech text-[10px] text-[#8A9099]">
              <tr>
                <th className="px-4 py-3">Size</th>
                <th className="px-4 py-3">Waist (in)</th>
                <th className="px-4 py-3">Waist (cm)</th>
                <th className="px-4 py-3">Belt Length</th>
                <th className="px-4 py-3">Select</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E6E3DC]">
              {sizeGuides.map((g) => (
                <tr key={g.id} className="hover:bg-[#FAFAF8]">
                  <td className="px-4 py-3 font-semibold text-[#11151B]">
                    {g.size_code}{' '}
                    <span className="font-normal text-[#8A9099]">({g.size_label})</span>
                  </td>
                  <td className="px-4 py-3 text-[#11151B]">
                    {g.waist_min_inches}–{g.waist_max_inches}&quot;
                  </td>
                  <td className="px-4 py-3 text-[#11151B]">
                    {g.waist_min_cm}–{g.waist_max_cm} cm
                  </td>
                  <td className="px-4 py-3 text-[#5C636E]">
                    {g.belt_length_cm ? `${g.belt_length_cm} cm` : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {onSelectSize && (
                      <button
                        type="button"
                        onClick={() => {
                          onSelectSize(g.size_code);
                          onClose();
                        }}
                        className="text-xs font-semibold text-[#0E1116] underline underline-offset-4 cursor-pointer"
                      >
                        Choose {g.size_code}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </ModalDialog>
  );
}
