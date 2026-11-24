import * as React from 'react';
import { AuthPanel } from '@/components/forms/auth-panel';

export const metadata = {
  title: 'Sign In',
};

export default function LoginPage() {
  return (
    <React.Suspense fallback={<div className="py-20 text-center text-sm text-[#5C636E]">Loading...</div>}>
      <AuthPanel mode="login" />
    </React.Suspense>
  );
}
