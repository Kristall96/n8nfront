// src/store/authStore.ts
import { create } from 'zustand';
import { tokenBridge } from '@/lib/secureAxios';

export type UserRole = 'super_admin';

export type AuthUser = {
  id: string;
  email?: string;
  role: UserRole;
};

type AuthState = {
  user: AuthUser | null;
  accessToken: string | null;

  // true while we are doing the initial /refresh check
  isLoading: boolean;

  // becomes true once AuthProvider has finished its first bootstrap
  // (refresh succeeded or failed)
  hasBootstrapped: boolean;

  setAuth: (user: AuthUser, accessToken: string) => void;
  clearAuth: () => void;
  setLoading: (value: boolean) => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,

  // when the app first mounts, we *expect* AuthProvider to run a refresh
  isLoading: true,
  hasBootstrapped: false,

  setAuth: (user, accessToken) => {
    tokenBridge.setAccessToken(accessToken);
    set({
      user,
      accessToken,
      isLoading: false,
      hasBootstrapped: true,
    });
  },

  clearAuth: () => {
    tokenBridge.setAccessToken(null);
    set({
      user: null,
      accessToken: null,
      isLoading: false,
      hasBootstrapped: true,
    });
  },

  setLoading: (value) => set({ isLoading: value }),
}));
