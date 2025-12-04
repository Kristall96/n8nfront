// src/components/auth/LogoutButton.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/secureAxios';
import { useAuthStore } from '@/store/authStore';

export default function LogoutButton() {
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { clearAuth } = useAuthStore();
  const router = useRouter();

  async function handleLogout() {
    if (isLoggingOut) return;
    setIsLoggingOut(true);

    try {
      // Tell backend to revoke the session + clear cookie
      await api.post('/auth/super-admin/logout', {});
    } catch (e) {
      // even if this fails, we still clear local state
      console.error('Logout error', e);
    } finally {
      clearAuth(); // clear user + token from store
      router.replace('/login');
      setIsLoggingOut(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={isLoggingOut}
      className="rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1 text-[11px] font-medium text-slate-300 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {isLoggingOut ? 'Logging out…' : 'Logout'}
    </button>
  );
}
