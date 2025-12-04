'use client';

import { useCallback, useEffect, useState, FormEvent } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/secureAxios';
import type { AxiosError } from 'axios';

type IncidentStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
type Severity = 'low' | 'medium' | 'high' | 'critical';

type IncidentNote = {
  message: string;
  createdAt: string;
  createdBy?: string | null;
};

type IncidentDetail = {
  id: string;
  title: string;
  description?: string | null;
  status: IncidentStatus;
  severity: Severity;
  priority: 1 | 2 | 3 | 4;
  score: number | null;
  alertId?: string | null;
  userId?: string | null;
  ip?: string | null;
  deviceId?: string | null;
  assigneeId?: string | null;
  assigneeEmail?: string | null;
  tags: string[];
  notes: IncidentNote[];
  createdAt: string;
  updatedAt: string;
};

type ContextAlert = {
  _id: string;
  type: string;
  severity: Severity;
  userId?: string | null;
  ip?: string | null;
  createdAt: string;
};

type ContextLog = {
  _id: string;
  action: string;
  userId?: string | null;
  ip?: string | null;
  createdAt: string;
  riskScore?: number | null;
};

type IncidentContextResponse = {
  incident: IncidentDetail;
  window: {
    from: string;
    to: string;
    hours: number;
  };
  relatedAlerts: ContextAlert[];
  relatedLogs: ContextLog[];
};

type StatusOption = IncidentStatus;
type PriorityOption = 1 | 2 | 3 | 4;

const statusOptions: StatusOption[] = ['open', 'in_progress', 'resolved', 'closed'];
const priorityOptions: PriorityOption[] = [1, 2, 3, 4];

export default function IncidentDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id;

  const [incident, setIncident] = useState<IncidentDetail | null>(null);
  const [context, setContext] = useState<IncidentContextResponse | null>(null);

  const [loading, setLoading] = useState(true);
  const [contextLoading, setContextLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [statusDraft, setStatusDraft] = useState<StatusOption>('open');
  const [priorityDraft, setPriorityDraft] = useState<PriorityOption>(3);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isUpdatingPriority, setIsUpdatingPriority] = useState(false);

  const [noteDraft, setNoteDraft] = useState('');
  const [isAddingNote, setIsAddingNote] = useState(false);

  const loadIncident = useCallback(async () => {
    if (!id) return;

    setLoading(true);
    setError(null);

    try {
      const { data } = await api.get<IncidentDetail>(`/admin-monitor/incidents/${id}`);
      setIncident(data);
      setStatusDraft(data.status);
      setPriorityDraft(data.priority as PriorityOption);
    } catch (err: unknown) {
      const axiosErr = err as AxiosError<{ message?: string }>;
      setError(axiosErr.response?.data?.message ?? 'Failed to load incident');
    } finally {
      setLoading(false);
    }
  }, [id]);

  const loadContext = useCallback(async () => {
    if (!id) return;

    setContextLoading(true);
    try {
      const { data } = await api.get<IncidentContextResponse>(
        `/admin-monitor/incidents/${id}/context?windowHours=24`,
      );
      setContext(data);
    } catch (err) {
      // context is optional, log and ignore
      console.error('Failed to load incident context', err);
    } finally {
      setContextLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadIncident();
    void loadContext();
  }, [loadIncident, loadContext]);

  async function handleStatusUpdate() {
    if (!incident) return;
    setIsUpdatingStatus(true);
    try {
      await api.patch(`/admin-monitor/incidents/${incident.id}/status`, {
        status: statusDraft,
      });
      setIncident((prev) => (prev ? { ...prev, status: statusDraft } : prev));
    } catch (err) {
      console.error('Failed to update status', err);
      alert('Failed to update status');
    } finally {
      setIsUpdatingStatus(false);
    }
  }

  async function handlePriorityUpdate() {
    if (!incident) return;
    setIsUpdatingPriority(true);
    try {
      await api.patch(`/admin-monitor/incidents/${incident.id}/priority`, {
        priority: priorityDraft,
      });
      setIncident((prev) => (prev ? { ...prev, priority: priorityDraft } : prev));
    } catch (err) {
      console.error('Failed to update priority', err);
      alert('Failed to update priority');
    } finally {
      setIsUpdatingPriority(false);
    }
  }

  async function handleAddNote(e: FormEvent) {
    e.preventDefault();
    if (!incident || !noteDraft.trim()) return;

    setIsAddingNote(true);
    try {
      const { data } = await api.post<{ id: string; notes: IncidentNote[] }>(
        `/admin-monitor/incidents/${incident.id}/notes`,
        { message: noteDraft.trim() },
      );
      setIncident((prev) => (prev ? { ...prev, notes: data.notes } : prev));
      setNoteDraft('');
    } catch (err) {
      console.error('Failed to add note', err);
      alert('Failed to add note');
    } finally {
      setIsAddingNote(false);
    }
  }

  if (!id) {
    return <div className="text-sm text-red-300">Missing incident id in route parameters.</div>;
  }

  if (loading) {
    return <div className="text-sm text-slate-300">Loading incident…</div>;
  }

  if (error || !incident) {
    return (
      <div className="space-y-3 text-sm text-slate-300">
        <div>{error ?? 'Incident not found.'}</div>
        <button
          type="button"
          onClick={() => router.push('/god/incidents')}
          className="rounded-md border border-slate-700 px-3 py-1 text-xs text-slate-200 hover:bg-slate-800"
        >
          Back to incidents
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <button
            type="button"
            onClick={() => router.push('/god/incidents')}
            className="mb-2 text-[11px] text-slate-400 hover:text-slate-200"
          >
            ← Back to incidents
          </button>
          <h1 className="text-lg font-semibold">{incident.title}</h1>
          <p className="mt-1 text-xs text-slate-400">
            Incident created {new Date(incident.createdAt).toLocaleString()}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-500">
            userId: <span className="font-mono text-slate-200">{incident.userId || '—'}</span> • ip:{' '}
            <span className="font-mono text-slate-200">{incident.ip || '—'}</span> • deviceId:{' '}
            <span className="font-mono text-slate-200">{incident.deviceId || '—'}</span>
          </p>
        </div>

        {/* Status / priority controls */}
        <div className="flex flex-col items-end gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-400">Status</span>
            <select
              value={statusDraft}
              onChange={(e) => setStatusDraft(e.target.value as IncidentStatus)}
              className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            >
              {statusOptions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleStatusUpdate}
              disabled={isUpdatingStatus}
              className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-200 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isUpdatingStatus ? 'Saving…' : 'Update'}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-400">Priority</span>
            <select
              value={priorityDraft}
              onChange={(e) => setPriorityDraft(Number(e.target.value) as PriorityOption)}
              className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            >
              {priorityOptions.map((p) => (
                <option key={p} value={p}>
                  P{p}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={handlePriorityUpdate}
              disabled={isUpdatingPriority}
              className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-200 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isUpdatingPriority ? 'Saving…' : 'Update'}
            </button>
          </div>

          {incident.score != null && (
            <div className="text-[11px] text-slate-400">
              Score: <span className="text-slate-100">{incident.score}</span>
            </div>
          )}
        </div>
      </div>

      {/* Description + tags */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3 text-xs">
        <div className="font-semibold text-slate-200">Description</div>
        <p className="mt-1 text-[11px] text-slate-300">
          {incident.description || 'No description provided.'}
        </p>
        {incident.tags?.length > 0 && (
          <div className="mt-2 text-[10px] text-slate-400">
            tags: <span className="font-mono text-slate-200">{incident.tags.join(', ')}</span>
          </div>
        )}
      </div>

      {/* Notes */}
      <div className="grid gap-4 md:grid-cols-[2fr,1.5fr]">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Notes</h2>
            <span className="text-[11px] text-slate-500">
              {incident.notes.length} note{incident.notes.length !== 1 ? 's' : ''}
            </span>
          </div>

          <form onSubmit={handleAddNote} className="space-y-2 text-xs">
            <textarea
              value={noteDraft}
              onChange={(e) => setNoteDraft(e.target.value)}
              rows={3}
              placeholder="Add investigation note…"
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isAddingNote || !noteDraft.trim()}
                className="rounded-md bg-indigo-600 px-3 py-1 text-[11px] font-medium text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isAddingNote ? 'Adding…' : 'Add note'}
              </button>
            </div>
          </form>

          <div className="space-y-2">
            {incident.notes
              .slice()
              .reverse()
              .map((n, idx) => (
                <div
                  key={`${n.createdAt}-${idx}`}
                  className="rounded-lg border border-slate-800 bg-slate-900/70 p-2 text-[11px] text-slate-200"
                >
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span>{new Date(n.createdAt).toLocaleString()}</span>
                    {n.createdBy && <span>by {n.createdBy}</span>}
                  </div>
                  <p className="mt-1 text-[11px] text-slate-200 whitespace-pre-wrap">{n.message}</p>
                </div>
              ))}
            {incident.notes.length === 0 && (
              <div className="text-[11px] text-slate-400">No notes yet.</div>
            )}
          </div>
        </div>

        {/* Lightweight context panel */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold">Context (last 24h)</h2>

          {contextLoading && (
            <div className="text-[11px] text-slate-400">Loading related activity…</div>
          )}

          {!contextLoading && context && (
            <div className="space-y-3 text-[11px] text-slate-300">
              <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-2">
                <div className="font-medium text-slate-200">Summary</div>
                <div className="mt-1 text-[10px] text-slate-400">
                  Window: {new Date(context.window.from).toLocaleString()} →{' '}
                  {new Date(context.window.to).toLocaleString()}
                </div>
                <div className="mt-1 text-[10px] text-slate-400">
                  {context.relatedAlerts.length} related alert
                  {context.relatedAlerts.length !== 1 ? 's' : ''} • {context.relatedLogs.length}{' '}
                  related log event{context.relatedLogs.length !== 1 ? 's' : ''}
                </div>
              </div>

              {context.relatedAlerts.length > 0 && (
                <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-2">
                  <div className="mb-1 text-[11px] font-medium text-slate-200">Recent alerts</div>
                  <ul className="space-y-1">
                    {context.relatedAlerts.slice(-5).map((a) => (
                      <li key={a._id} className="text-[10px] text-slate-300">
                        <span className="font-mono text-slate-400">
                          {new Date(a.createdAt).toLocaleTimeString()}
                        </span>{' '}
                        — <span className="font-semibold">{a.type}</span> ({a.severity})
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {context.relatedLogs.length > 0 && (
                <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-2">
                  <div className="mb-1 text-[11px] font-medium text-slate-200">Recent activity</div>
                  <ul className="space-y-1">
                    {context.relatedLogs.slice(-5).map((l) => (
                      <li key={l._id} className="text-[10px] text-slate-300">
                        <span className="font-mono text-slate-400">
                          {new Date(l.createdAt).toLocaleTimeString()}
                        </span>{' '}
                        — {l.action}
                        {typeof l.riskScore === 'number' && (
                          <span className="text-slate-400"> (risk {l.riskScore})</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
