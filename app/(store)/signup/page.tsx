import * as React from 'react';
import { AuthPanel } from '@/components/forms/auth-panel';

export const metadata = {
  title: 'Create Account',
};

export default function SignupPage() {
  return (
    <React.Suspense fallback={<div className="py-20 text-center text-sm text-[#5C636E]">Loading...</div>}>
      <AuthPanel mode="signup" />
    </React.Suspense>
  );
}
