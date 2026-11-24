'use client';

import { LogOut } from 'lucide-react';
import { useAuth } from '@/components/auth/auth-provider';
import { Button } from '@/components/ui/button';

export function AccountActions() {
  const { signOut } = useAuth();

  async function handleLogout() {
    await signOut();
    window.location.assign('/');
  }

  return (
    <Button variant="secondary" size="sm" onClick={() => void handleLogout()}>
      <LogOut className="h-4 w-4" />
      Sign Out
    </Button>
  );
}
