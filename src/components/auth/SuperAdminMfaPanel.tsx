// src/components/auth/SuperAdminMfaPanel.tsx
'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/secureAxios';
import type { AxiosError } from 'axios';
import { QRCodeCanvas } from 'qrcode.react'; // ✅ named export

type SetupResponse = {
  otpauthUrl: string;
};

type EnableResponse = {
  message?: string;
};

type BackupCodesResponse = {
  backupCodes: string[];
};

type StatusResponse = {
  mfaEnabled: boolean;
  hasBackupCodes?: boolean;
};

export default function SuperAdminMfaPanel() {
  const [otpauthUrl, setOtpauthUrl] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [mfaEnabled, setMfaEnabled] = useState(false);

  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // 🔍 Load current MFA status when panel mounts
  useEffect(() => {
    const loadStatus = async () => {
      try {
        const { data } = await api.get<StatusResponse>('/auth/super-admin/mfa/status');
        setMfaEnabled(data.mfaEnabled);
        if (data.mfaEnabled) {
          setMessage('MFA is currently enabled for this account.');
        }
      } catch {
        // ignore – if it fails we just show the default UI
      }
    };

    loadStatus();
  }, []);

  async function handleStartSetup() {
    setIsBusy(true);
    setError(null);
    setMessage(null);

    try {
      const { data } = await api.post<SetupResponse>('/auth/super-admin/mfa/setup', {});
      setOtpauthUrl(data.otpauthUrl);
      setMessage(
        'MFA setup started. Scan the QR code with your authenticator app, then enter a code.',
      );
    } catch (err: unknown) {
      const axiosErr = err as AxiosError<{ message?: string }>;
      setError(
        axiosErr.response?.data?.message ??
          'Failed to start MFA setup. Make sure you are logged in.',
      );
    } finally {
      setIsBusy(false);
    }
  }

  async function handleEnable() {
    if (!code.trim()) return;

    setIsBusy(true);
    setError(null);
    setMessage(null);

    try {
      const { data } = await api.post<EnableResponse>('/auth/super-admin/mfa/enable', {
        code: code.trim(),
      });
      setMessage(data.message || 'MFA enabled successfully.');
      setMfaEnabled(true);
      setOtpauthUrl(null); // hide QR once enabled
      setCode('');
    } catch (err: unknown) {
      const axiosErr = err as AxiosError<{ message?: string }>;
      setError(axiosErr.response?.data?.message ?? 'Failed to enable MFA.');
    } finally {
      setIsBusy(false);
    }
  }

  async function handleGenerateBackupCodes() {
    setIsBusy(true);
    setError(null);
    setMessage(null);

    try {
      const { data } = await api.post<BackupCodesResponse>(
        '/auth/super-admin/mfa/backup-codes',
        {},
      );
      setBackupCodes(data.backupCodes);
      setMessage('Backup codes generated. Store them in a safe place.');
    } catch (err: unknown) {
      const axiosErr = err as AxiosError<{ message?: string }>;
      setError(axiosErr.response?.data?.message ?? 'Failed to generate backup codes.');
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
      <h2 className="text-lg font-semibold">Super Admin MFA</h2>
      <p className="text-xs text-slate-400">
        Protect this God Mode account with an authenticator app and backup codes.
      </p>

      {error && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-200">
          {error}
        </div>
      )}

      {message && (
        <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-100">
          {message}
        </div>
      )}

      {/* Top-level CTA depends on current status */}
      {!mfaEnabled && (
        <button
          type="button"
          onClick={handleStartSetup}
          disabled={isBusy}
          className="rounded-lg bg-slate-800 px-3 py-2 text-xs font-medium text-slate-100 hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Start MFA setup
        </button>
      )}

      {mfaEnabled && (
        <p className="text-xs text-emerald-400">
          MFA is active. Future logins will always require an authenticator code.
        </p>
      )}

      {/* QR + code input step */}
      {otpauthUrl && (
        <div className="space-y-3 rounded-lg border border-slate-700 bg-slate-900 p-3">
          <p className="text-xs text-slate-300">
            Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.), then
            enter a 6-digit code to confirm.
          </p>

          <div className="mt-2 flex justify-center">
            {/* ✅ QR code rendered from otpauth URL */}
            <QRCodeCanvas value={otpauthUrl} size={160} includeMargin />
          </div>

          <div className="mt-3 flex items-center gap-2">
            <input
              type="text"
              inputMode="numeric"
              placeholder="123456"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
            <button
              type="button"
              onClick={handleEnable}
              disabled={isBusy || !code.trim()}
              className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-medium text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Enable MFA
            </button>
          </div>
        </div>
      )}

      {/* Backup codes section (only once MFA is enabled) */}
      {mfaEnabled && (
        <div className="space-y-2 rounded-lg border border-slate-700 bg-slate-900 p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-emerald-400">
              Backup codes for emergency access
            </span>
            <button
              type="button"
              onClick={handleGenerateBackupCodes}
              disabled={isBusy}
              className="rounded-lg bg-slate-800 px-3 py-1.5 text-[11px] font-medium text-slate-100 hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Generate backup codes
            </button>
          </div>

          {backupCodes.length > 0 && (
            <div className="mt-2">
              <p className="mb-1 text-[10px] text-slate-400">
                Backup codes (each can be used once). Store them offline:
              </p>
              <ul className="grid grid-cols-2 gap-1 text-[11px] font-mono text-slate-100">
                {backupCodes.map((c) => (
                  <li key={c} className="rounded border border-slate-700 bg-slate-950/70 px-2 py-1">
                    {c}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
