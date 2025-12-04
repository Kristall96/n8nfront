// src/providers/AuthProvider.tsx
'use client';

import { ReactNode, useEffect } from 'react';
import api from '@/lib/secureAxios';
import { useAuthStore, AuthUser } from '@/store/authStore';

type RefreshResponse = {
  accessToken: string;
  user: {
    id: string;
    role: 'super_admin';
    email?: string;
  };
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const { setAuth, clearAuth, setLoading } = useAuthStore();

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      setLoading(true);
      try {
        const { data } = await api.post<RefreshResponse>('/auth/super-admin/refresh', {});

        if (cancelled) return;

        const user: AuthUser = {
          id: data.user.id,
          role: data.user.role,
          email: data.user.email,
        };

        // This will also set hasBootstrapped = true
        setAuth(user, data.accessToken);
      } catch {
        if (cancelled) return;

        // This will also set hasBootstrapped = true
        clearAuth();
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    bootstrap();

    return () => {
      cancelled = true;
    };
  }, [setAuth, clearAuth, setLoading]);

  return <>{children}</>;
}
