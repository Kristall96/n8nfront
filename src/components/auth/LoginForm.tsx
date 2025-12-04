// src/components/auth/LoginForm.tsx
'use client';

import { FormEvent, useState } from 'react';
import api from '@/lib/secureAxios';
import { useRouter } from 'next/navigation';
import { useAuthStore, AuthUser } from '@/store/authStore';
import type { AxiosError } from 'axios';
import { getDeviceInfo } from '@/lib/deviceInfo';

type LoginSuccessResponse = {
  accessToken: string;
  user: AuthUser; // { id, email, role: 'super_admin' }
  mfaRequired?: false; // discriminator
};

type LoginMfaRequiredResponse = {
  mfaRequired: true;
  message?: string;
};

type LoginResponse = LoginSuccessResponse | LoginMfaRequiredResponse;

export default function LoginForm() {
  const router = useRouter();
  const { setAuth } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [backupCode, setBackupCode] = useState('');

  const [phase, setPhase] = useState<'PASSWORD' | 'MFA'>('PASSWORD');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setInfo(null);

    try {
      const { deviceId, deviceLabel } = getDeviceInfo();

      // base payload is always email + password + device info
      const payload: {
        email: string;
        password: string;
        mfaCode?: string;
        backupCode?: string;
        deviceId?: string;
        deviceLabel?: string;
      } = {
        email,
        password,
        deviceId: deviceId || undefined,
        deviceLabel: deviceLabel || undefined,
      };

      // in MFA phase we also send codes
      if (phase === 'MFA') {
        payload.mfaCode = mfaCode || undefined;
        payload.backupCode = backupCode || undefined;
      }

      const { data } = await api.post<LoginResponse>('/auth/super-admin/login', payload);

      // Case 1: backend says "password is correct but MFA is required"
      if ('mfaRequired' in data && data.mfaRequired) {
        setPhase('MFA');
        setInfo(data.message || 'MFA required. Please enter your code to continue.');
        // we do NOT call setAuth yet – no tokens have been issued
        return;
      }

      // From here on, TS knows this is LoginSuccessResponse
      setAuth(data.user, data.accessToken);
      router.push('/god');
    } catch (err: unknown) {
      const axiosErr = err as AxiosError<{ message?: string }>;
      const status = axiosErr.response?.status;

      if (status === 401) {
        setError('Authentication failed. Check your credentials or MFA code.');
      } else {
        setError(axiosErr.response?.data?.message ?? 'Login failed. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  const isMfaPhase = phase === 'MFA';

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-sm space-y-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl"
    >
      <div>
        <h1 className="text-xl font-semibold">Super Admin Login</h1>
        <p className="mt-1 text-xs text-slate-400">
          Restricted area. All actions are fully audited.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-200">
          {error}
        </div>
      )}

      {info && !error && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
          {info}
        </div>
      )}

      <div className="space-y-2">
        <label className="text-xs font-medium text-slate-200">Email</label>
        <input
          type="email"
          required
          autoComplete="off"
          disabled={isMfaPhase} // lock email during MFA step
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:opacity-60"
        />
      </div>

      <div className="space-y-2">
        <label className="text-xs font-medium text-slate-200">Password</label>
        <input
          type="password"
          required
          autoComplete="off"
          disabled={isMfaPhase} // lock password during MFA step
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:opacity-60"
        />
      </div>

      {isMfaPhase && (
        <>
          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-200">MFA code</label>
            <input
              type="text"
              inputMode="numeric"
              value={mfaCode}
              onChange={(e) => setMfaCode(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-200">
              Backup code (optional, one-time)
            </label>
            <input
              type="text"
              value={backupCode}
              onChange={(e) => setBackupCode(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="flex w-full items-center justify-center rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting
          ? isMfaPhase
            ? 'Verifying MFA…'
            : 'Verifying…'
          : isMfaPhase
          ? 'Confirm MFA'
          : 'Enter God Mode'}
      </button>
    </form>
  );
}
