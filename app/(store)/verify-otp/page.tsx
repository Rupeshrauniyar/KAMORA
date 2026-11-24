'use client';

import * as React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { AlertCircle, ShieldCheck } from 'lucide-react';
import { createClient, isSupabaseBrowserConfigured } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

/**
 * SMS OTP Verification Page.
 * Implements modern-web-guidance `sms-otp-form`:
 * - Single <input type="text" inputMode="numeric" autoComplete="one-time-code">
 * - Format hint placed visually ABOVE the input via aria-describedby
 * - AbortController-managed WebOTP API (`OTPCredential`) triggering form.requestSubmit()
 */
function VerifyOtpInner() {
  const searchParams = useSearchParams();
  const phone = searchParams.get('phone') ?? '';
  const nextPath = searchParams.get('next') ?? '/account';

  const [code, setCode] = React.useState('');
  const [cooldown, setCooldown] = React.useState(45);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  const formRef = React.useRef<HTMLFormElement>(null);
  const abortControllerRef = React.useRef<AbortController | null>(null);

  const stopWebOtp = React.useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  const startWebOtp = React.useCallback(async () => {
    if (typeof window === 'undefined' || !('OTPCredential' in window)) return;
    stopWebOtp();
    const ac = new AbortController();
    abortControllerRef.current = ac;

    try {
      const credential = (await navigator.credentials.get({
        // WebOTP credential request options
        ...({ otp: { transport: ['sms'] } } as CredentialRequestOptions),
        signal: ac.signal,
      })) as { code?: string } | null;

      if (credential?.code) {
        setCode(credential.code);
        setTimeout(() => {
          formRef.current?.requestSubmit();
        }, 0);
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
    }
  }, [stopWebOtp]);

  React.useEffect(() => {
    void startWebOtp();
    return () => stopWebOtp();
  }, [startWebOtp, stopWebOtp]);

  React.useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    stopWebOtp();

    if (!isSupabaseBrowserConfigured()) {
      setError('Supabase Auth is not configured in environment variables.');
      return;
    }
    if (!phone) {
      setError('Missing phone number. Please start again from the login page.');
      return;
    }

    setError('');
    setLoading(true);
    try {
      const supabase = createClient();
      const { error: verifyErr } = await supabase.auth.verifyOtp({
        phone,
        token: code.trim(),
        type: 'sms',
      });

      if (verifyErr) {
        setError(verifyErr.message);
        setLoading(false);
        return;
      }

      const safeTarget =
        nextPath.startsWith('/') && !nextPath.startsWith('//') ? nextPath : '/account';
      window.location.assign(safeTarget);
    } catch {
      setError('Could not verify OTP. Please try again.');
      setLoading(false);
    }
  }

  async function handleResend() {
    if (cooldown > 0 || !phone || !isSupabaseBrowserConfigured()) return;
    setError('');
    const supabase = createClient();
    const { error: resendErr } = await supabase.auth.signInWithOtp({ phone });
    if (resendErr) {
      setError(resendErr.message);
      return;
    }
    setCooldown(45);
    void startWebOtp();
  }

  return (
    <div className="mx-auto max-w-md px-4 py-14 sm:px-6">
      <div className="rounded-[24px] border border-[#E6E3DC] bg-white p-7 shadow-soft sm:p-8">
        <div className="text-center">
          <Badge variant="default">SMS Verification</Badge>
          <h1 className="mt-3 font-heading text-2xl font-bold text-[#11151B]">
            Verify Your Mobile Number
          </h1>
          <p className="mt-1.5 text-sm text-[#5C636E]">
            Code sent to <strong className="text-[#11151B]">{phone || 'your phone'}</strong>
          </p>
        </div>

        <form ref={formRef} onSubmit={handleVerify} method="POST" className="mt-6 space-y-5">
          <div>
            <label htmlFor="otp-input" className="block text-xs font-semibold text-[#11151B]">
              Verification Code
            </label>
            {/* Instructional hint placed ABOVE input so autofill/keyboard never obscures it */}
            <p id="otp-format-hint" className="mt-1 text-xs text-[#5C636E]">
              Enter the 6-digit numeric code sent via SMS.
            </p>
            <input
              id="otp-input"
              name="otp"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="\d{6}"
              maxLength={6}
              required
              aria-describedby="otp-format-hint"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              className="otp-single-input mt-2 w-full rounded-[12px] border border-[#E6E3DC] bg-[#FAFAF8] px-4 text-[#11151B] focus:border-[#0E1116] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0E1116]/10"
            />
          </div>

          {error && (
            <p className="flex items-start gap-2 rounded-[12px] border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </p>
          )}

          <Button type="submit" variant="primary" size="lg" className="w-full" disabled={loading}>
            <ShieldCheck className="h-4 w-4" />
            {loading ? 'Verifying...' : 'Verify Code'}
          </Button>
        </form>

        <div className="mt-5 flex items-center justify-between text-xs text-[#5C636E]">
          <button
            type="button"
            disabled={cooldown > 0}
            onClick={() => void handleResend()}
            className="font-semibold text-[#1C3D5A] disabled:text-[#5C636E]/60 hover:underline cursor-pointer disabled:cursor-not-allowed"
          >
            {cooldown > 0 ? `Resend OTP in ${cooldown}s` : 'Resend OTP'}
          </button>
          <Link href="/login" className="hover:text-[#11151B]">
            Change phone number
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function VerifyOtpPage() {
  return (
    <React.Suspense fallback={<div className="py-20 text-center text-sm text-[#5C636E]">Loading...</div>}>
      <VerifyOtpInner />
    </React.Suspense>
  );
}
