// src/app/(god)/god/layout.tsx
'use client';

import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import LogoutButton from '@/components/auth/LogoutButton';

type GodLayoutProps = {
  children: ReactNode;
};

const navItems = [
  { label: 'Overview', href: '/god' },
  { label: 'Sessions', href: '/god/sessions' },
  { label: 'Security alerts', href: '/god/security-alerts' },
  { label: 'Security feed', href: '/god/security-feed' },
  { label: 'Incidents', href: '/god/incidents' }, // 👈 new
];

export default function GodLayout({ children }: GodLayoutProps) {
  const { user, isLoading, hasBootstrapped } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Do nothing until AuthProvider has finished the first refresh attempt
    if (!hasBootstrapped) return;

    // After bootstrap: if no valid super_admin, kick to login
    if (!user || user.role !== 'super_admin') {
      router.replace('/login');
    }
  }, [user, hasBootstrapped, router]);

  // While bootstrapping, or while redirecting, show neutral screen
  if (!hasBootstrapped || isLoading || !user || user.role !== 'super_admin') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-100">
        <div className="rounded-xl border border-slate-800 px-6 py-4 text-sm">
          Checking god-mode access...
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100">
      {/* Left sidebar */}
      <aside className="flex w-64 flex-col border-r border-slate-800 p-4">
        {/* Header + logout */}
        <div className="mb-6 flex items-center justify-between">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            God Mode
          </div>
          <LogoutButton />
        </div>

        {/* User info */}
        <div className="text-sm">
          <div className="font-medium">{user.email ?? 'Super Admin'}</div>
          <div className="mt-1 text-xs text-slate-400">role: {user.role}</div>
        </div>

        {/* Nav */}
        <nav className="mt-8 space-y-2 text-sm">
          <div className="text-xs uppercase tracking-wide text-slate-400">Panels</div>

          {navItems.map((item) => {
            const isActive =
              pathname === item.href || (pathname?.startsWith(item.href) && item.href !== '/god'); // handle subroutes

            const baseClasses = 'w-full rounded-lg px-3 py-2 text-left transition-colors text-sm';
            const activeClasses = 'bg-slate-800 text-slate-100';
            const inactiveClasses = 'text-slate-300 hover:bg-slate-800';

            return (
              <button
                key={item.href}
                type="button"
                onClick={() => router.push(item.href)}
                className={`${baseClasses} ${isActive ? activeClasses : inactiveClasses}`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Main content area */}
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
