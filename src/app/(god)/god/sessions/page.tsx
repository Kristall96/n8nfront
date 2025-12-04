// src/app/(god)/god/sessions/page.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import api from '@/lib/secureAxios';
import type { AxiosError } from 'axios';

type SessionItem = {
  id: string;
  ip: string;
  userAgent: string;
  createdAt: string;
  lastUsedAt: string;
  expiresAt: string;
  absoluteExpiresAt: string;
  trustLevel: 'low' | 'medium' | 'high';
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  isHighRisk: boolean;
  isCurrent: boolean;
  geoCountry: string | null;
  geoRegion: string | null;
  geoCity: string | null;
  deviceLabel: string | null;
  deviceId: string | null;
};

type SessionsResponse = {
  sessions: SessionItem[];
};

type RiskFilter = 'all' | 'medium+' | 'high+' | 'critical';

export default function SessionsPage() {
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [loading, setLoading] = useState(true); // initial load
  const [isRefreshing, setIsRefreshing] = useState(false); // header refresh button
  const [error, setError] = useState<string | null>(null);
  const [riskFilter, setRiskFilter] = useState<RiskFilter>('all');

  const loadSessions = useCallback(async (opts?: { silent?: boolean }) => {
    setError(null);

    if (opts?.silent) {
      setIsRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const { data } = await api.get<SessionsResponse>('/auth/super-admin/sessions');
      setSessions(data.sessions);
    } catch (err: unknown) {
      const axiosErr = err as AxiosError<{ message?: string }>;
      setError(axiosErr.response?.data?.message ?? 'Failed to load sessions');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadSessions();
  }, [loadSessions]);

  const filteredSessions = sessions.filter((s) => {
    if (riskFilter === 'all') return true;
    if (riskFilter === 'critical') return s.riskLevel === 'critical';
    if (riskFilter === 'high+') return s.riskLevel === 'critical' || s.riskLevel === 'high';
    if (riskFilter === 'medium+')
      return s.riskLevel === 'critical' || s.riskLevel === 'high' || s.riskLevel === 'medium';
    return true;
  });

  const isEmptyAfterFilter = !loading && filteredSessions.length === 0;

  return (
    <div className="space-y-4">
      {/* Header + filters */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Active sessions</h1>
          <p className="text-xs text-slate-400">
            Each session is bound to a device + geo + risk profile. You can revoke individual
            sessions.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400">Risk filter</span>
          <select
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value as RiskFilter)}
            className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          >
            <option value="all">All</option>
            <option value="medium+">Medium+</option>
            <option value="high+">High+</option>
            <option value="critical">Critical only</option>
          </select>
          <button
            type="button"
            onClick={() => loadSessions({ silent: true })}
            disabled={isRefreshing}
            className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-200 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isRefreshing ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Error banner (non-blocking) */}
      {error && (
        <div className="flex items-center justify-between rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-200">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => loadSessions()}
            className="ml-3 rounded-md border border-red-500/70 px-2 py-1 text-[11px] hover:bg-red-500/20"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading state */}
      {loading && !sessions.length && (
        <div className="text-sm text-slate-300">Loading sessions…</div>
      )}

      {/* Empty state (after filtering) */}
      {isEmptyAfterFilter && (
        <div className="space-y-2 text-sm text-slate-300">
          <div>No active sessions matching this risk filter.</div>
          <button
            type="button"
            onClick={() => setRiskFilter('all')}
            className="rounded-md border border-slate-700 px-3 py-1 text-xs text-slate-200 hover:bg-slate-800"
          >
            Reset filter
          </button>
        </div>
      )}

      {/* Table */}
      {!loading && filteredSessions.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60">
          <table className="min-w-full text-xs">
            <thead className="bg-slate-900/80 text-slate-400">
              <tr>
                <th className="px-3 py-2 text-left">Device</th>
                <th className="px-3 py-2 text-left">IP / Location</th>
                <th className="px-3 py-2 text-left">Risk</th>
                <th className="px-3 py-2 text-left">Created / Last used</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSessions.map((s) => (
                <tr key={s.id} className="border-t border-slate-800">
                  <td className="px-3 py-2 align-top">
                    <div className="font-medium text-slate-100">
                      {s.deviceLabel || 'Unknown device'}
                      {s.isCurrent && (
                        <span className="ml-2 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-300">
                          current
                        </span>
                      )}
                    </div>
                    <div className="mt-1 text-[10px] text-slate-500">
                      {s.deviceId && <span>ID: {s.deviceId}</span>}
                      <div className="mt-0.5 line-clamp-2 wrap-break-word text-[9px] text-slate-500">
                        {s.userAgent}
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2 align-top text-[11px] text-slate-300">
                    <div>{s.ip}</div>
                    <div className="mt-0.5 text-[10px] text-slate-500">
                      {[s.geoCity, s.geoRegion, s.geoCountry].filter(Boolean).join(', ') || '—'}
                    </div>
                  </td>
                  <td className="px-3 py-2 align-top text-[11px]">
                    <div
                      className={
                        s.riskLevel === 'critical'
                          ? 'text-red-400'
                          : s.riskLevel === 'high'
                          ? 'text-orange-400'
                          : s.riskLevel === 'medium'
                          ? 'text-amber-300'
                          : 'text-emerald-300'
                      }
                    >
                      {s.riskLevel.toUpperCase()} ({s.riskScore})
                    </div>
                    <div className="mt-0.5 text-[10px] text-slate-500">
                      trust: {s.trustLevel.toUpperCase()}
                    </div>
                  </td>
                  <td className="px-3 py-2 align-top text-[10px] text-slate-400">
                    <div>created: {new Date(s.createdAt).toLocaleString()}</div>
                    <div>last used: {new Date(s.lastUsedAt).toLocaleString()}</div>
                  </td>
                  <td className="px-3 py-2 align-top text-right">
                    <button
                      type="button"
                      onClick={async () => {
                        if (
                          !window.confirm(
                            'Revoke this session? The user will be logged out on that device.',
                          )
                        ) {
                          return;
                        }
                        try {
                          await api.post(`/auth/super-admin/sessions/${s.id}/revoke`, {});
                          setSessions((prev) => prev.filter((x) => x.id !== s.id));
                        } catch (err) {
                          console.error('Failed to revoke session', err);
                          alert('Failed to revoke session');
                        }
                      }}
                      className="rounded-md border border-slate-700 px-2 py-1 text-[10px] text-slate-200 hover:bg-slate-800"
                    >
                      Revoke
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
