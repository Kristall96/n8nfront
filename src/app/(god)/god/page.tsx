// src/app/(god)/god/page.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import api from '@/lib/secureAxios';
import type { AxiosError } from 'axios';
import SuperAdminMfaPanel from '@/components/auth/SuperAdminMfaPanel';

type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

type OverviewHighRiskEvent = {
  id: string;
  action: string;
  riskScore: number;
  riskLevel: RiskLevel;
  createdAt: string;
};

type OverviewAlert = {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  userId?: string | null;
  ip?: string | null;
  createdAt: string;
};

type ActivityItem = {
  _id: string; // comes from Mongo as _id
  action: string;
  createdAt: string;
  riskScore?: number | null;
  userId?: string | null;
  ip?: string | null;
  riskTags?: string[];
};

type OverviewResponse = {
  system: {
    environment?: string;
    hostname?: string;
    uptimeSeconds?: number;
    memoryUsageMB?: number;
    loadAverage?: number[];
  };
  security: {
    totalLogs: number;
    last24hLogs: number;
    lastEvent: {
      action: string;
      riskScore?: number;
      createdAt?: string;
    } | null;
    recentHighRisk: OverviewHighRiskEvent[];
    recentAlerts: OverviewAlert[];
  };
  activity?: ActivityItem[];
};

const severityColor = (severity: string) => {
  switch (severity) {
    case 'critical':
      return 'text-red-400';
    case 'high':
      return 'text-orange-400';
    case 'medium':
      return 'text-amber-300';
    default:
      return 'text-emerald-300';
  }
};

const riskColor = (riskLevel: RiskLevel) => {
  switch (riskLevel) {
    case 'critical':
      return 'text-red-400';
    case 'high':
      return 'text-orange-400';
    case 'medium':
      return 'text-amber-300';
    default:
      return 'text-emerald-300';
  }
};

export default function GodPage() {
  const [data, setData] = useState<OverviewResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true); // initial load
  const [isRefreshing, setIsRefreshing] = useState(false); // header Refresh button
  const [error, setError] = useState<string | null>(null);

  const loadOverview = useCallback(async (opts?: { silent?: boolean }) => {
    setError(null);

    if (opts?.silent) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      const res = await api.get<OverviewResponse>('/admin-monitor/overview');
      setData(res.data);
    } catch (err: unknown) {
      const axiosErr = err as AxiosError<{ message?: string }>;
      setError(axiosErr.response?.data?.message ?? 'Failed to load security overview.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    // initial bootstrap load
    void loadOverview();
  }, [loadOverview]);

  if (isLoading && !data && !error) {
    return (
      <main className="flex min-h-screen items-center justify-center p-8">
        <div className="rounded-xl border border-slate-800 px-6 py-4 text-sm text-slate-200">
          Loading threat analytics…
        </div>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="p-8">
        <div className="flex items-center justify-between rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          <span>{error ?? 'Unable to load threat analytics.'}</span>
          <button
            type="button"
            onClick={() => loadOverview()}
            className="ml-4 rounded-md border border-red-500/60 px-3 py-1 text-xs text-red-100 hover:bg-red-500/20"
          >
            Retry
          </button>
        </div>
      </main>
    );
  }

  const { system, security, activity = [] } = data;
  const lastEventRisk = security.lastEvent?.riskScore ?? 0;
  const lastEventAction = security.lastEvent?.action ?? '—';

  const recentActivity = activity.slice(0, 10);

  return (
    <main className="space-y-8 p-8">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Threat analytics</h1>
          <p className="text-sm text-slate-400">
            Consolidated view of audit events, risk scores and security alerts for this God Mode
            tenant.
          </p>
        </div>
        <button
          type="button"
          onClick={() => loadOverview({ silent: true })}
          disabled={isRefreshing}
          className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isRefreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </header>

      {/* Top stats */}
      <section className="grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
          <div className="text-xs font-medium text-slate-400">Total audit events</div>
          <div className="mt-2 text-2xl font-semibold text-slate-50">
            {security.totalLogs.toLocaleString()}
          </div>
          <p className="mt-1 text-[11px] text-slate-500">All tracked security-relevant actions.</p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
          <div className="text-xs font-medium text-slate-400">Events last 24h</div>
          <div className="mt-2 text-2xl font-semibold text-slate-50">
            {security.last24hLogs.toLocaleString()}
          </div>
          <p className="mt-1 text-[11px] text-slate-500">Rolling window of audit activity.</p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
          <div className="text-xs font-medium text-slate-400">Latest event</div>
          <div className="mt-2 truncate text-sm font-semibold text-slate-50">{lastEventAction}</div>
          <div className="mt-1 text-[11px] text-slate-400">
            risk score:{' '}
            <span className={lastEventRisk >= 50 ? 'text-orange-400' : 'text-emerald-300'}>
              {lastEventRisk}
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
          <div className="text-xs font-medium text-slate-400">Security alerts</div>
          <div className="mt-2 text-2xl font-semibold text-slate-50">
            {security.recentAlerts.length}
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            Critical events like lockouts and token reuse.
          </p>
        </div>
      </section>

      {/* System + high-risk + MFA */}
      <section className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,2fr)_minmax(0,1.3fr)]">
        {/* System diagnostics */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
          <div className="mb-2 text-sm font-semibold text-slate-100">System</div>
          <dl className="space-y-1 text-xs text-slate-400">
            <div className="flex justify-between">
              <dt>Environment</dt>
              <dd className="text-slate-200">{system.environment ?? 'unknown'}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Hostname</dt>
              <dd className="text-slate-200">{system.hostname ?? '—'}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Uptime</dt>
              <dd className="text-slate-200">
                {system.uptimeSeconds
                  ? `${Math.floor(system.uptimeSeconds / 3600)}h ${Math.floor(
                      (system.uptimeSeconds % 3600) / 60,
                    )}m`
                  : '—'}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt>Memory</dt>
              <dd className="text-slate-200">
                {system.memoryUsageMB ? `${system.memoryUsageMB} MB` : '—'}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt>Load avg (1m / 5m / 15m)</dt>
              <dd className="text-slate-200">
                {Array.isArray(system.loadAverage) && system.loadAverage.length === 3
                  ? system.loadAverage.map((n) => n.toFixed(2)).join(' / ')
                  : '—'}
              </dd>
            </div>
          </dl>
        </div>

        {/* Recent high-risk events */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-sm font-semibold text-slate-100">Recent high-risk events</div>
            <span className="text-[11px] text-slate-500">
              {security.recentHighRisk.length} events
            </span>
          </div>

          {security.recentHighRisk.length === 0 ? (
            <p className="text-xs text-slate-500">No high-risk events in recent history.</p>
          ) : (
            <ul className="space-y-2 text-xs">
              {security.recentHighRisk.map((event) => (
                <li
                  key={event.id}
                  className="rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-100">{event.action}</span>
                    <span className={riskColor(event.riskLevel)}>
                      {event.riskLevel.toUpperCase()} ({event.riskScore})
                    </span>
                  </div>
                  <div className="mt-1 text-[11px] text-slate-500">
                    {new Date(event.createdAt).toLocaleString()}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* MFA panel as a card */}
        <SuperAdminMfaPanel />
      </section>

      {/* Recent alerts table */}
      <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
        <div className="mb-2 flex items-center justify-between">
          <div className="text-sm font-semibold text-slate-100">Recent security alerts</div>
          <span className="text-[11px] text-slate-500">
            ACCOUNT_LOCKED, REFRESH_TOKEN_REUSE_DETECTED, …
          </span>
        </div>

        {security.recentAlerts.length === 0 ? (
          <p className="text-xs text-slate-500">No security alerts. That&apos;s good news.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-xs">
              <thead className="border-b border-slate-800 text-slate-400">
                <tr>
                  <th className="px-2 py-2 font-normal">Type</th>
                  <th className="px-2 py-2 font-normal">Severity</th>
                  <th className="px-2 py-2 font-normal">User</th>
                  <th className="px-2 py-2 font-normal">IP</th>
                  <th className="px-2 py-2 font-normal">When</th>
                </tr>
              </thead>
              <tbody>
                {security.recentAlerts.map((alert) => (
                  <tr key={alert.id} className="border-b border-slate-900 last:border-0">
                    <td className="px-2 py-2 text-slate-100">{alert.type}</td>
                    <td className={`px-2 py-2 ${severityColor(alert.severity)}`}>
                      {alert.severity.toUpperCase()}
                    </td>
                    <td className="px-2 py-2 text-slate-300">
                      {alert.userId ? alert.userId : '—'}
                    </td>
                    <td className="px-2 py-2 text-slate-300">{alert.ip || '—'}</td>
                    <td className="px-2 py-2 text-slate-400">
                      {new Date(alert.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Recent activity list */}
      <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
        <div className="mb-2 flex items-center justify-between">
          <div className="text-sm font-semibold text-slate-100">Recent activity</div>
          <span className="text-[11px] text-slate-500">
            Last {recentActivity.length} audit events
          </span>
        </div>

        {recentActivity.length === 0 ? (
          <p className="text-xs text-slate-500">
            No recent activity recorded. The system is quiet right now.
          </p>
        ) : (
          <ul className="space-y-2 text-xs">
            {recentActivity.map((evt) => (
              <li
                key={evt._id}
                className="rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-slate-100">{evt.action}</span>
                  <span className="text-[11px] text-slate-400">
                    {evt.riskScore != null ? `risk: ${evt.riskScore}` : ''}
                  </span>
                </div>
                <div className="mt-1 text-[10px] text-slate-500">
                  <div>time: {new Date(evt.createdAt).toLocaleString()}</div>
                  <div>userId: {evt.userId || '—'}</div>
                  <div>ip: {evt.ip || '—'}</div>
                  {evt.riskTags && evt.riskTags.length > 0 && (
                    <div className="mt-0.5">tags: {evt.riskTags.join(', ')}</div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
