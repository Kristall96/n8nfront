// src/app/(god)/god/security-alerts/page.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import api from '@/lib/secureAxios';
import type { AxiosError } from 'axios';
import { useRouter } from 'next/navigation';

type Severity = 'low' | 'medium' | 'high' | 'critical';

type AlertItem = {
  id: string;
  type: string;
  severity: Severity;
  userId?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  createdAt: string;
};

type AlertsResponse = {
  count: number;
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
  alerts: AlertItem[];
};

type SeverityFilter = 'all' | Severity;

export default function SecurityAlertsPage() {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true); // initial load
  const [isRefreshing, setIsRefreshing] = useState(false); // header refresh
  const [error, setError] = useState<string | null>(null);

  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('all');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);

  const router = useRouter();

  const severityBadgeClasses = (severity: Severity) =>
    severity === 'critical'
      ? 'rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] text-red-300'
      : severity === 'high'
      ? 'rounded-full bg-orange-500/10 px-2 py-0.5 text-[10px] text-orange-300'
      : severity === 'medium'
      ? 'rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-300'
      : 'rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-300';

  const loadAlerts = useCallback(
    async (opts?: { pageOverride?: number; silent?: boolean }) => {
      const targetPage = opts?.pageOverride ?? page;

      setError(null);
      if (opts?.silent) {
        setIsRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        const params = new URLSearchParams();
        params.set('limit', '50');
        params.set('page', targetPage.toString());
        if (severityFilter !== 'all') {
          params.set('severity', severityFilter);
        }

        const { data } = await api.get<AlertsResponse>(
          `/admin-monitor/security-alerts?${params.toString()}`,
        );

        setAlerts(data.alerts);
        setPage(data.page);
        setHasMore(data.hasMore);
        setTotal(data.total);
      } catch (err: unknown) {
        const axiosErr = err as AxiosError<{ message?: string }>;
        setError(axiosErr.response?.data?.message ?? 'Failed to load security alerts');
      } finally {
        setLoading(false);
        setIsRefreshing(false);
      }
    },
    [page, severityFilter],
  );

  // initial load + when severityFilter changes, reset to page 1
  useEffect(() => {
    void loadAlerts({ pageOverride: 1 });
  }, [severityFilter, loadAlerts]);

  const isEmpty = !loading && alerts.length === 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Security alerts</h1>
          <p className="text-xs text-slate-400">
            Critical events such as account lockouts and refresh token reuse are captured here.
          </p>
          {total > 0 && (
            <p className="mt-1 text-[11px] text-slate-500">
              Showing {alerts.length} of {total} alerts
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400">Severity</span>
          <select
            value={severityFilter}
            onChange={(e) => {
              setSeverityFilter(e.target.value as SeverityFilter);
              // page reset handled by useEffect
            }}
            className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          >
            <option value="all">All</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <button
            type="button"
            onClick={() => loadAlerts({ silent: true })}
            disabled={isRefreshing}
            className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-200 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isRefreshing ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-center justify-between rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-200">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => loadAlerts({ pageOverride: page })}
            className="ml-3 rounded-md border border-red-500/70 px-2 py-1 text-[11px] hover:bg-red-500/20"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading state (initial) */}
      {loading && !alerts.length && (
        <div className="text-sm text-slate-300">Loading security alerts…</div>
      )}

      {/* Empty state */}
      {isEmpty && (
        <div className="space-y-2 text-sm text-slate-300">
          <div>No security alerts for this severity filter.</div>
          <button
            type="button"
            onClick={() => setSeverityFilter('all')}
            className="rounded-md border border-slate-700 px-3 py-1 text-xs text-slate-200 hover:bg-slate-800"
          >
            Reset filter
          </button>
        </div>
      )}

      {/* Alerts list */}
      {!loading && alerts.length > 0 && (
        <>
          <div className="space-y-2">
            {alerts.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => {
                  const params = new URLSearchParams();
                  if (a.userId) params.set('userId', a.userId);
                  if (a.type) params.set('action', a.type);
                  router.push(`/god/security-feed?${params.toString()}`);
                }}
                className="w-full rounded-lg border border-slate-800 bg-slate-900/70 p-3 text-left text-xs text-slate-200 hover:border-slate-600 hover:bg-slate-900"
              >
                <div className="flex items-center justify-between">
                  <div className="font-semibold">{a.type}</div>
                  <span className={severityBadgeClasses(a.severity)}>
                    {a.severity.toUpperCase()}
                  </span>
                </div>
                <div className="mt-1 text-[10px] text-slate-400">
                  <div>time: {new Date(a.createdAt).toLocaleString()}</div>
                  <div>userId: {a.userId || '—'}</div>
                  <div>ip: {a.ip || '—'}</div>
                </div>
              </button>
            ))}
          </div>

          {/* Pagination controls */}
          <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400">
            <div>
              Page {page}
              {hasMore ? ' (more pages available)' : ''}
            </div>
            <div className="space-x-2">
              <button
                type="button"
                onClick={() => page > 1 && loadAlerts({ pageOverride: page - 1 })}
                disabled={page <= 1}
                className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-200 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() => hasMore && loadAlerts({ pageOverride: page + 1 })}
                disabled={!hasMore}
                className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-200 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
