'use client';

import { useCallback, useEffect, useState } from 'react';
import api from '@/lib/secureAxios';
import type { AxiosError } from 'axios';
import { useRouter } from 'next/navigation';

type IncidentStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
type Severity = 'low' | 'medium' | 'high' | 'critical';

type IncidentItem = {
  id: string;
  title: string;
  status: IncidentStatus;
  severity: Severity;
  priority: 1 | 2 | 3 | 4;
  score: number | null;
  alertId?: string | null;
  userId?: string | null;
  ip?: string | null;
  createdAt: string;
  updatedAt: string;
};

type IncidentsResponse = {
  count: number;
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
  incidents: IncidentItem[];
};

type StatusFilter = 'all' | IncidentStatus;
type SeverityFilter = 'all' | Severity;
type PriorityFilter = 'all' | '1' | '2' | '3' | '4';

const statusLabel: Record<IncidentStatus, string> = {
  open: 'Open',
  in_progress: 'In progress',
  resolved: 'Resolved',
  closed: 'Closed',
};

const statusBadgeClasses = (status: IncidentStatus) => {
  switch (status) {
    case 'open':
      return 'bg-red-500/10 text-red-300';
    case 'in_progress':
      return 'bg-amber-500/10 text-amber-300';
    case 'resolved':
      return 'bg-emerald-500/10 text-emerald-300';
    case 'closed':
      return 'bg-slate-500/10 text-slate-200';
    default:
      return 'bg-slate-700/40 text-slate-200';
  }
};

const severityTextClasses = (severity: Severity) => {
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

export default function IncidentsPage() {
  const router = useRouter();

  const [incidents, setIncidents] = useState<IncidentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('open');
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('all');
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all');

  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);

  const loadIncidents = useCallback(
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

        if (statusFilter !== 'all') params.set('status', statusFilter);
        if (severityFilter !== 'all') params.set('severity', severityFilter);
        if (priorityFilter !== 'all') params.set('priority', priorityFilter);

        const { data } = await api.get<IncidentsResponse>(
          `/admin-monitor/incidents?${params.toString()}`,
        );

        setIncidents(data.incidents);
        setPage(data.page);
        setHasMore(data.hasMore);
        setTotal(data.total);
      } catch (err: unknown) {
        const axiosErr = err as AxiosError<{ message?: string }>;
        setError(axiosErr.response?.data?.message ?? 'Failed to load incidents');
      } finally {
        setLoading(false);
        setIsRefreshing(false);
      }
    },
    [page, statusFilter, severityFilter, priorityFilter],
  );

  // initial load + when filters change, reset to page 1
  useEffect(() => {
    void loadIncidents({ pageOverride: 1 });
  }, [statusFilter, severityFilter, priorityFilter, loadIncidents]);

  const isEmpty = !loading && incidents.length === 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Incidents / cases</h1>
          <p className="text-xs text-slate-400">
            Correlated security issues grouped as SOC cases with status, severity and priority.
          </p>
          {total > 0 && (
            <p className="mt-1 text-[11px] text-slate-500">
              Showing {incidents.length} of {total} incidents
            </p>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center gap-1">
            <span className="text-slate-400">Status</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            >
              <option value="all">All</option>
              <option value="open">Open</option>
              <option value="in_progress">In progress</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
          </div>

          <div className="flex items-center gap-1">
            <span className="text-slate-400">Severity</span>
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value as SeverityFilter)}
              className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            >
              <option value="all">All</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          <div className="flex items-center gap-1">
            <span className="text-slate-400">Priority</span>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value as PriorityFilter)}
              className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            >
              <option value="all">All</option>
              <option value="1">P1</option>
              <option value="2">P2</option>
              <option value="3">P3</option>
              <option value="4">P4</option>
            </select>
          </div>

          <button
            type="button"
            onClick={() => loadIncidents({ silent: true })}
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
            onClick={() => loadIncidents({ pageOverride: page })}
            className="ml-3 rounded-md border border-red-500/70 px-2 py-1 text-[11px] hover:bg-red-500/20"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading */}
      {loading && !incidents.length && (
        <div className="text-sm text-slate-300">Loading incidents…</div>
      )}

      {/* Empty */}
      {isEmpty && (
        <div className="space-y-2 text-sm text-slate-300">
          <div>No incidents for the current filters.</div>
          <button
            type="button"
            onClick={() => {
              setStatusFilter('all');
              setSeverityFilter('all');
              setPriorityFilter('all');
            }}
            className="rounded-md border border-slate-700 px-3 py-1 text-xs text-slate-200 hover:bg-slate-800"
          >
            Reset filters
          </button>
        </div>
      )}

      {/* List */}
      {!loading && incidents.length > 0 && (
        <>
          <div className="space-y-2">
            {incidents.map((i) => (
              <button
                key={i.id}
                type="button"
                onClick={() => router.push(`/god/incidents/${i.id}`)}
                className="w-full rounded-lg border border-slate-800 bg-slate-900/70 p-3 text-left text-xs text-slate-200 hover:border-slate-600 hover:bg-slate-900"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="font-semibold">{i.title}</div>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] ${statusBadgeClasses(
                          i.status,
                        )}`}
                      >
                        {statusLabel[i.status]}
                      </span>
                    </div>
                    <div className="mt-1 text-[10px] text-slate-400">
                      <div>
                        severity:{' '}
                        <span className={severityTextClasses(i.severity)}>
                          {i.severity.toUpperCase()}
                        </span>{' '}
                        • priority: P{i.priority}
                        {i.score != null && (
                          <>
                            {' '}
                            • score: <span className="text-slate-200">{i.score}</span>
                          </>
                        )}
                      </div>
                      <div>userId: {i.userId || '—'}</div>
                      <div>ip: {i.ip || '—'}</div>
                    </div>
                  </div>
                  <div className="text-[10px] text-slate-500 text-right">
                    <div>created: {new Date(i.createdAt).toLocaleString()}</div>
                    <div>updated: {new Date(i.updatedAt).toLocaleString()}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Pagination */}
          <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400">
            <div>
              Page {page}
              {hasMore ? ' (more pages available)' : ''}
            </div>
            <div className="space-x-2">
              <button
                type="button"
                onClick={() => page > 1 && loadIncidents({ pageOverride: page - 1 })}
                disabled={page <= 1}
                className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-200 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() => hasMore && loadIncidents({ pageOverride: page + 1 })}
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
