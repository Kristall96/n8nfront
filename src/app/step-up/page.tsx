// src/app/(god)/god/step-up/page.tsx
'use client';

import { FormEvent, useEffect, useState } from 'react';
import api from '@/lib/secureAxios';
import type { AxiosError } from 'axios';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';

export default function StepUpPage() {
  const router = useRouter();
  const { user, isLoading, hasBootstrapped } = useAuthStore();

  const [code, setCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // ⛔ Do NOT redirect until AuthProvider has finished its first refresh.
  useEffect(() => {
    if (!hasBootstrapped) return;

    // After bootstrap: if still no user, session is gone → go to login
    if (!user) {
      router.replace('/login');
    }
  }, [user, hasBootstrapped, router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    e.stopPropagation();

    setIsSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      const { data } = await api.post('/auth/super-admin/step-up/verify-mfa', {
        code: code.trim(),
      });

      setMessage(data?.message || 'Step-up authentication successful.');
      setTimeout(() => {
        router.replace('/god');
      }, 800);
    } catch (err: unknown) {
      const axiosErr = err as AxiosError<{ message?: string }>;
      const status = axiosErr.response?.status;
      const backendMessage = axiosErr.response?.data?.message;

      if (status === 401 || status === 403) {
        // Session is gone → log in again
        if (backendMessage === 'Unauthorized' || backendMessage === 'Forbidden') {
          setError('Your session has expired. Please log in again.');
          setTimeout(() => {
            router.replace('/login');
          }, 800);
        } else {
          setError('Invalid MFA code. Please try again.');
        }
      } else {
        setError(backendMessage ?? 'Could not complete step-up authentication. Try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  // While we are bootstrapping auth or about to redirect, show neutral screen
  if (!hasBootstrapped || isLoading || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-100">
        <div className="rounded-xl border border-slate-800 px-6 py-4 text-sm">
          Checking your session…
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-100">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl"
      >
        <div>
          <h1 className="text-xl font-semibold">Confirm it&apos;s really you</h1>
          <p className="mt-1 text-xs text-slate-400">
            We noticed unusual activity. Enter your MFA code to continue.
          </p>
        </div>

        {error && (
          <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-200">
            {error}
          </div>
        )}

        {message && !error && (
          <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-100">
            {message}
          </div>
        )}

        <div className="space-y-2">
          <label className="text-xs font-medium text-slate-200">MFA code</label>
          <input
            type="text"
            inputMode="numeric"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required
            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting || !code.trim()}
          className="flex w-full items-center justify-center rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? 'Verifying…' : 'Confirm and continue'}
        </button>
      </form>
    </main>
  );
}
