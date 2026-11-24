'use client';

import * as React from 'react';
import Link from 'next/link';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import { createClient, isSupabaseBrowserConfigured } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function ForgotPasswordPage() {
  const [email, setEmail] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [sent, setSent] = React.useState(false);
  const [error, setError] = React.useState('');

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    if (!isSupabaseBrowserConfigured()) {
      setError('Configure Supabase environment variables to enable password recovery.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const supabase = createClient();
      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/api/auth/callback?next=/account`,
      });
      if (resetErr) {
        setError(resetErr.message);
      } else {
        setSent(true);
      }
    } catch {
      setError('Unable to send reset link right now.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-14 sm:px-6">
      <div className="rounded-[24px] border border-[#E6E3DC] bg-white p-7 shadow-soft sm:p-8">
        <div className="text-center">
          <Badge variant="default">Password Recovery</Badge>
          <h1 className="mt-3 font-heading text-2xl font-bold text-[#11151B]">
            Reset Your Password
          </h1>
          <p className="mt-1.5 text-sm text-[#5C636E]">
            Enter the email linked to your Kamora account and we will send a secure reset link.
          </p>
        </div>

        {sent ? (
          <div className="mt-6 rounded-[14px] border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            <p className="flex items-center gap-2 font-semibold">
              <CheckCircle2 className="h-4 w-4" />
              Reset Link Sent
            </p>
            <p className="mt-1 text-xs">
              Check your inbox at <strong>{email}</strong> to set a new password.
            </p>
          </div>
        ) : (
          <form onSubmit={handleReset} className="mt-6 space-y-4">
            <div>
              <label htmlFor="reset-email" className="mb-1.5 block text-xs font-semibold text-[#11151B]">
                Email Address
              </label>
              <Input
                id="reset-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>

            {error && (
              <p className="flex items-start gap-2 rounded-[12px] border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </p>
            )}

            <Button type="submit" variant="primary" size="lg" className="w-full" disabled={loading}>
              {loading ? 'Sending...' : 'Send Reset Link'}
            </Button>
          </form>
        )}

        <p className="mt-6 text-center text-xs text-[#5C636E]">
          <Link href="/login" className="font-semibold text-[#1C3D5A] hover:underline">
            Return to Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
