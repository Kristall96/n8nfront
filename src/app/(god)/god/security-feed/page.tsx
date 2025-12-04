// src/app/(god)/god/security-feed/page.tsx
'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import api from '@/lib/secureAxios';
import type { AxiosError } from 'axios';
import { useSearchParams } from 'next/navigation';

type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

type SecurityFeedItem = {
  id: string;
  timestamp: string;
  action: string;
  userId?: string;
  ip?: string;
  userAgent?: string;
  riskScore: number;
  riskLevel: RiskLevel;
  riskTags: string[];
  metadata: Record<string, unknown>;
};

type FeedResponse = {
  count: number;
  events: SecurityFeedItem[];
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

export default function SecurityFeedPage() {
  const searchParams = useSearchParams();
  const urlUserId = searchParams.get('userId');
  const urlAction = searchParams.get('action');
  const urlTag = searchParams.get('tag');

  const [events, setEvents] = useState<SecurityFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [minRisk, setMinRisk] = useState(50);
  const [selectedTag, setSelectedTag] = useState<string | 'all'>(urlTag || 'all');

  const loadFeed = useCallback(
    async (overrideMinRisk?: number) => {
      const risk = overrideMinRisk ?? minRisk;
      setLoading(true);
      setError(null);

      try {
        const { data } = await api.get<FeedResponse>(
          `/admin-monitor/security-feed?limit=50&minRisk=${risk}`,
        );
        setEvents(data.events);
      } catch (err: unknown) {
        const axiosErr = err as AxiosError<{ message?: string }>;
        setError(axiosErr.response?.data?.message ?? 'Failed to load security feed');
      } finally {
        setLoading(false);
      }
    },
    [minRisk],
  );

  useEffect(() => {
    void loadFeed();
  }, [loadFeed]);

  // recompute when events change
  const availableTags = useMemo(() => {
    const set = new Set<string>();
    for (const e of events) {
      e.riskTags?.forEach((t) => set.add(t));
    }
    return Array.from(set).sort();
  }, [events]);

  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      if (urlUserId && e.userId !== urlUserId) return false;
      if (urlAction && e.action !== urlAction) return false;
      if (selectedTag !== 'all' && !e.riskTags?.includes(selectedTag)) return false;
      return true;
    });
  }, [events, urlUserId, urlAction, selectedTag]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold">Security feed</h1>
          <p className="text-xs text-slate-400">
            Sorted by highest risk first. Filter by minimum risk score, tag, or deep link from
            alerts.
          </p>
          {(urlUserId || urlAction) && (
            <p className="mt-1 text-[11px] text-slate-500">
              Filtered by{' '}
              {urlUserId && (
                <>
                  userId <span className="font-mono text-slate-300">{urlUserId}</span>{' '}
                </>
              )}
              {urlAction && (
                <>
                  action <span className="font-mono text-slate-300">{urlAction}</span>
                </>
              )}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-400">Min risk</span>
            <input
              type="number"
              min={0}
              max={100}
              value={minRisk}
              onChange={(e) => setMinRisk(Number(e.target.value) || 0)}
              onBlur={() => loadFeed()}
              className="w-16 rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-400">Tag</span>
            <select
              value={selectedTag}
              onChange={(e) => setSelectedTag(e.target.value as string | 'all')}
              className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            >
              <option value="all">All</option>
              {availableTags.map((tag) => (
                <option key={tag} value={tag}>
                  {tag}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={() => loadFeed()}
            className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-200 hover:bg-slate-800"
          >
            Refresh
          </button>
        </div>
      </div>

      {loading && <div className="text-sm text-slate-300">Loading feed…</div>}

      {error && (
        <div className="flex items-center justify-between rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-200">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => loadFeed()}
            className="ml-3 rounded-md border border-red-500/70 px-2 py-1 text-[11px] hover:bg-red-500/20"
          >
            Retry
          </button>
        </div>
      )}

      {!loading && !error && filteredEvents.length === 0 && (
        <div className="text-sm text-slate-300">
          No events at or above this risk threshold for the current filters.
        </div>
      )}

      {!loading && !error && filteredEvents.length > 0 && (
        <div className="space-y-2">
          {filteredEvents.map((e) => (
            <div
              key={e.id}
              className="rounded-lg border border-slate-800 bg-slate-900/70 p-3 text-xs text-slate-200"
            >
              <div className="flex items-center justify-between">
                <div className="font-semibold">{e.action}</div>
                <div className={riskColor(e.riskLevel)}>
                  {e.riskLevel.toUpperCase()} ({e.riskScore})
                </div>
              </div>
              <div className="mt-1 text-[10px] text-slate-400">
                <div>time: {new Date(e.timestamp).toLocaleString()}</div>
                <div>userId: {e.userId || '—'}</div>
                <div>ip: {e.ip || '—'}</div>
                {e.riskTags?.length > 0 && (
                  <div className="mt-1">
                    tags:{' '}
                    <span className="text-[10px] text-slate-300">{e.riskTags.join(', ')}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
