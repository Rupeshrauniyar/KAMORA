'use client';

import * as React from 'react';
import { MapPin, Truck, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatPaise } from '@/lib/utils/format';

interface PincodeResponse {
  serviceable: boolean;
  zone_name?: string;
  estimated_min_days?: number;
  estimated_max_days?: number;
  shipping_charge_paise?: number;
  free_shipping_threshold_paise?: number;
  cod_available?: boolean;
  cod_fee_paise?: number;
  message?: string;
}

export function PincodeChecker({ orderValuePaise }: { orderValuePaise: number }) {
  const [pincode, setPincode] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [result, setResult] = React.useState<PincodeResponse | null>(null);
  const [error, setError] = React.useState('');

  async function handleCheck(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setResult(null);

    if (!/^[1-9][0-9]{5}$/.test(pincode.trim())) {
      setError('Enter a valid 6-digit Indian PIN code (e.g. 560038).');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(
        `/api/shipping/check?pincode=${encodeURIComponent(pincode.trim())}`
      );
      const data = (await res.json()) as PincodeResponse & { error?: string };
      if (!res.ok) {
        setError(data.error ?? 'Could not check PIN code availability.');
      } else {
        setResult(data);
      }
    } catch {
      setError('Unable to check PIN code right now.');
    } finally {
      setLoading(false);
    }
  }

  const qualifiesFree =
    result?.free_shipping_threshold_paise !== undefined &&
    orderValuePaise >= result.free_shipping_threshold_paise;

  return (
    <div className="rounded-[18px] border border-[#E6E3DC] bg-white p-4">
      <div className="font-mono-tech flex items-center gap-2 text-[10px] text-[#5C636E]">
        <MapPin className="h-3.5 w-3.5 text-[#B89768]" />
        DELIVERY AVAILABILITY (INDIA PIN)
      </div>
      <form onSubmit={handleCheck} className="mt-2.5 flex gap-2">
        <label htmlFor="pincode-check-input" className="sr-only">
          6-digit Indian PIN code
        </label>
        <input
          id="pincode-check-input"
          type="text"
          inputMode="numeric"
          maxLength={6}
          value={pincode}
          onChange={(e) => setPincode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder="Enter 6-digit PIN code"
          className="h-10 flex-1 rounded-full border border-[#E6E3DC] bg-[#FAFAF8] px-4 text-sm text-[#11151B] focus:border-[#0E1116] focus:bg-white focus:outline-none"
        />
        <Button type="submit" variant="secondary" size="sm" disabled={loading}>
          {loading ? 'Checking...' : 'Check'}
        </Button>
      </form>

      {error && (
        <p className="mt-2.5 flex items-center gap-1.5 text-xs text-rose-700">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          {error}
        </p>
      )}

      {result && (
        <div className="mt-3 space-y-1.5 rounded-[14px] border border-[#E6E3DC] bg-[#FAFAF8] p-3.5 text-xs">
          {result.serviceable ? (
            <>
              <p className="flex items-center gap-1.5 font-semibold text-emerald-800">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                Delivery available to {pincode}
              </p>
              <p className="flex items-center gap-1.5 text-[#11151B]">
                <Truck className="h-3.5 w-3.5 text-[#5C636E]" />
                Estimated arrival:{' '}
                <strong>
                  {result.estimated_min_days}–{result.estimated_max_days} business days
                </strong>
              </p>
              <p className="text-[#5C636E]">
                {qualifiesFree
                  ? 'Free Shipping unlocked'
                  : `Shipping ${formatPaise(result.shipping_charge_paise ?? 9900)}`}
                {' · '}
                {result.cod_available
                  ? result.cod_fee_paise
                    ? `COD available (+${formatPaise(result.cod_fee_paise)})`
                    : 'COD available'
                  : 'Prepaid only for this PIN'}
              </p>
            </>
          ) : (
            <p className="flex items-center gap-1.5 text-amber-800">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {result.message ?? 'PIN code outside standard delivery zones.'}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
