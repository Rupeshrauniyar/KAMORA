'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Mail, Smartphone, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';
import { createClient, isSupabaseBrowserConfigured } from '@/lib/supabase/client';
import { useAuth } from '@/components/auth/auth-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export function AuthPanel({ mode }: { mode: 'login' | 'signup' }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get('next') ?? '/account';
  const reason = searchParams.get('reason');
  const urlError = searchParams.get('error');
  const urlErrorDetail = searchParams.get('detail');
  const { user, loading: authLoading, refreshSession } = useAuth();

  const [tab, setTab] = React.useState<'phone' | 'email'>('email');
  const [countryCode, setCountryCode] = React.useState('+91');
  const [phone, setPhone] = React.useState('');
  const [fullName, setFullName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(
    urlErrorDetail
      ? urlErrorDetail
      : urlError === 'auth_callback_failed'
      ? 'Google sign-in could not be completed. Please try again.'
      : ''
  );
  const [successMsg, setSuccessMsg] = React.useState('');

  const configured = isSupabaseBrowserConfigured();

  // If already signed in, send user straight to destination without forcing re-login
  React.useEffect(() => {
    if (!authLoading && user && mode === 'login') {
      const safeTarget = nextPath.startsWith('/') && !nextPath.startsWith('//') ? nextPath : '/account';
      window.location.assign(safeTarget);
    }
  }, [authLoading, user, mode, nextPath]);

  function handleGoogleAuth() {
    if (!configured) {
      setError('Configure Supabase environment variables to enable Google OAuth.');
      return;
    }
    setError('');
    setLoading(true);
    // Server-initiated PKCE guarantees the code-verifier cookie matches /api/auth/callback
    window.location.assign(
      `/api/auth/google?next=${encodeURIComponent(nextPath)}`
    );
  }

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!configured) {
      setError('Configure Supabase Auth & an SMS provider (e.g. Twilio/MSG91) to send real OTPs.');
      return;
    }
    const cleanDigits = phone.replace(/\D/g, '');
    if (cleanDigits.length < 10) {
      setError('Enter a valid 10-digit Indian mobile number.');
      return;
    }

    setError('');
    setLoading(true);
    const e164Phone = `${countryCode.startsWith('+') ? countryCode : `+${countryCode}`}${cleanDigits}`;

    try {
      const supabase = createClient();
      const { error: otpErr } = await supabase.auth.signInWithOtp({
        phone: e164Phone,
        options: fullName.trim() ? { data: { full_name: fullName.trim() } } : undefined,
      });

      if (otpErr) {
        setError(otpErr.message);
        setLoading(false);
        return;
      }

      router.push(
        `/verify-otp?phone=${encodeURIComponent(e164Phone)}&next=${encodeURIComponent(nextPath)}`
      );
    } catch {
      setError('Could not send OTP right now. Please try again.');
      setLoading(false);
    }
  }

  async function handleEmailAuth(e: React.FormEvent) {
    e.preventDefault();
    if (!configured) {
      setError('Configure Supabase environment variables to sign in with email.');
      return;
    }
    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      const supabase = createClient();
      if (mode === 'signup') {
        const { error: signUpErr } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/api/auth/callback?next=${encodeURIComponent(nextPath)}`,
            data: { full_name: fullName.trim() },
          },
        });
        if (signUpErr) {
          setError(signUpErr.message);
        } else {
          setSuccessMsg(
            'Account created! Please check your email inbox to confirm your address before signing in.'
          );
        }
      } else {
        // Server-side login writes durable 30-day HTTP Set-Cookie headers immediately
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({ email, password }),
        });
        const data = (await res.json()) as {
          ok?: boolean;
          isAdmin?: boolean;
          error?: string;
        };

        if (!res.ok || !data.ok) {
          setError(data.error ?? 'Invalid email or password.');
        } else {
          await refreshSession();
          const requestedNext = searchParams.get('next');
          const defaultDest = data.isAdmin ? '/admin' : '/account';
          const rawTarget = requestedNext ?? defaultDest;
          const safeTarget =
            rawTarget.startsWith('/') && !rawTarget.startsWith('//')
              ? rawTarget
              : defaultDest;
          window.location.assign(safeTarget);
          return;
        }
      }
    } catch {
      setError('Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-14 sm:px-6">
      <div className="rounded-[24px] border border-[#E6E3DC] bg-white p-7 shadow-soft sm:p-8">
        <div className="text-center">
          <Badge variant="default">Kamora Account</Badge>
          <h1 className="mt-3 font-heading text-2xl font-bold text-[#11151B]">
            {mode === 'login' ? 'Welcome Back' : 'Create Your Account'}
          </h1>
          <p className="mt-1.5 text-sm text-[#5C636E]">
            {mode === 'login'
              ? 'Manage your orders, saved Indian addresses, and sizing preferences.'
              : 'Sign up for faster checkout, order tracking, and saved addresses.'}
          </p>
        </div>

        {reason === 'supabase_not_configured' && (
          <div className="mt-5 flex items-start gap-2 rounded-[12px] border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Admin and account authentication require connecting Supabase credentials in{' '}
              <code>.env.local</code>. See <code>README.md</code> for setup steps.
            </span>
          </div>
        )}

        {/* Google OAuth */}
        <Button
          variant="secondary"
          size="lg"
          className="mt-6 w-full"
          disabled={loading}
          onClick={() => void handleGoogleAuth()}
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="#4285F4"
              d="M23.745 12.27c0-.79-.07-1.54-.19-2.27h-11.3v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"
            />
            <path
              fill="#34A853"
              d="M12.255 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96h-3.98v3.09C3.515 21.3 7.565 24 12.255 24z"
            />
            <path
              fill="#FBBC05"
              d="M5.525 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62h-3.98a11.86 11.86 0 000 10.76l3.98-3.09z"
            />
            <path
              fill="#EA4335"
              d="M12.255 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C18.205 1.19 15.495 0 12.255 0c-4.69 0-8.74 2.7-10.71 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"
            />
          </svg>
          Continue with Google
        </Button>

        <div className="my-5 flex items-center gap-3 text-xs text-[#5C636E]">
          <span className="h-px flex-1 bg-[#D9E6EF]" />
          <span>or continue with</span>
          <span className="h-px flex-1 bg-[#D9E6EF]" />
        </div>

        {/* Method Switcher */}
        <div className="grid grid-cols-2 gap-2 rounded-[12px] bg-[#FAFAF8] p-1 border border-[#E6E3DC]">
          <button
            type="button"
            onClick={() => {
              setTab('phone');
              setError('');
            }}
            className={`flex items-center justify-center gap-1.5 rounded-[9px] py-2 text-xs font-semibold transition cursor-pointer ${
              tab === 'phone'
                ? 'bg-white text-[#1C3D5A] shadow-soft'
                : 'text-[#5C636E]'
            }`}
          >
            <Smartphone className="h-3.5 w-3.5" />
            Phone OTP
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('email');
              setError('');
            }}
            className={`flex items-center justify-center gap-1.5 rounded-[9px] py-2 text-xs font-semibold transition cursor-pointer ${
              tab === 'email'
                ? 'bg-white text-[#1C3D5A] shadow-soft'
                : 'text-[#5C636E]'
            }`}
          >
            <Mail className="h-3.5 w-3.5" />
            Email
          </button>
        </div>

        {tab === 'phone' ? (
          <form onSubmit={handleSendOtp} className="mt-5 space-y-4">
            {mode === 'signup' && (
              <div>
                <label htmlFor="otp-fullname" className="mb-1.5 block text-xs font-semibold text-[#11151B]">
                  Full Name
                </label>
                <Input
                  id="otp-fullname"
                  type="text"
                  autoComplete="name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your full name"
                />
              </div>
            )}
            <div>
              <label htmlFor="otp-phone" className="mb-1.5 block text-xs font-semibold text-[#11151B]">
                Mobile Number
              </label>
              <div className="flex gap-2">
                <Input
                  aria-label="Country code"
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  className="w-20 text-center font-medium"
                />
                <Input
                  id="otp-phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel-national"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="9876543210"
                  className="flex-1"
                />
              </div>
            </div>
            <Button type="submit" variant="primary" size="lg" className="w-full" disabled={loading}>
              {loading ? 'Sending OTP...' : 'Send 6-Digit SMS OTP'}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>
        ) : (
          <form onSubmit={handleEmailAuth} className="mt-5 space-y-4">
            {mode === 'signup' && (
              <div>
                <label htmlFor="email-fullname" className="mb-1.5 block text-xs font-semibold text-[#11151B]">
                  Full Name
                </label>
                <Input
                  id="email-fullname"
                  type="text"
                  autoComplete="name"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your full name"
                />
              </div>
            )}
            <div>
              <label htmlFor="auth-email" className="mb-1.5 block text-xs font-semibold text-[#11151B]">
                Email Address
              </label>
              <Input
                id="auth-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label htmlFor="auth-password" className="text-xs font-semibold text-[#11151B]">
                  Password
                </label>
                {mode === 'login' && (
                  <Link
                    href="/forgot-password"
                    className="text-xs font-medium text-[#1C3D5A] hover:underline"
                  >
                    Forgot password?
                  </Link>
                )}
              </div>
              <Input
                id="auth-password"
                type="password"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 8 characters"
              />
            </div>
            <Button type="submit" variant="primary" size="lg" className="w-full" disabled={loading}>
              {loading
                ? 'Please wait...'
                : mode === 'login'
                ? 'Sign In with Email'
                : 'Create Account'}
            </Button>
          </form>
        )}

        {error && (
          <p className="mt-4 flex items-start gap-2 rounded-[12px] border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </p>
        )}

        {successMsg && (
          <p className="mt-4 flex items-start gap-2 rounded-[12px] border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{successMsg}</span>
          </p>
        )}

        <p className="mt-6 text-center text-xs text-[#5C636E]">
          {mode === 'login' ? (
            <>
              New to Kamora?{' '}
              <Link href="/signup" className="font-semibold text-[#1C3D5A] hover:underline">
                Create an account
              </Link>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <Link href="/login" className="font-semibold text-[#1C3D5A] hover:underline">
                Sign in
              </Link>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
