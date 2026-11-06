import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { History, RotateCcw, RefreshCw, CheckCircle2, XCircle, Sparkles, ArrowRight } from 'lucide-react';
import { parkingApi, extractErrorMessage } from '../api/client';
import { ReservationAction } from '../types';
import { PageHeader } from '../components/common/PageHeader';
import { LoadingSkeleton, EmptyState, ErrorState, ConfirmDialog } from '../components/common/FeedbackStates';
import { PatternBadge } from '../components/common/StatusBadge';
import { formatDateTime } from '../utils/formatters';
import { useToast } from '../components/common/ToastProvider';

export const ActivityPage: React.FC = () => {
  const { success, error: toastError } = useToast();
  const [activities, setActivities] = useState<ReservationAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [confirmUndo, setConfirmUndo] = useState<{
    isOpen: boolean;
    action: ReservationAction | null;
  }>({
    isOpen: false,
    action: null,
  });

  const loadActivity = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await parkingApi.getAllActivity(100);
      setActivities(data);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadActivity();
  }, []);

  const handleExecuteUndo = async (action: ReservationAction) => {
    setConfirmUndo({ isOpen: false, action: null });
    try {
      await parkingApi.undoReservationAction(action.reservation_id);
      success('Undo Executed Successfully', `Command reversed for reservation ${action.reference_code}.`);
      loadActivity();
    } catch (err) {
      toastError('Undo Failed', extractErrorMessage(err));
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <PageHeader
        title="Reservation Activity & Undo Log"
        subtitle="Auditable Command pattern event log with persistent snapshot-based state reversal."
        badge={<PatternBadge pattern="Command Pattern (Undo/Redo)" />}
        actions={
          <button
            onClick={loadActivity}
            className="p-2 text-stone-500 hover:text-charcoal hover:bg-stone-100 rounded-lg transition-colors border border-border-light bg-white"
            title="Refresh Activity"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        }
      />

      {loading ? (
        <LoadingSkeleton rows={5} height="h-16" />
      ) : error ? (
        <ErrorState message={error} onRetry={loadActivity} />
      ) : activities.length === 0 ? (
        <EmptyState
          title="No Activity Logged"
          description="Actions performed on reservations (confirmations, check-ins, check-outs) will be captured here."
        />
      ) : (
        <div className="bg-white rounded-xl border border-border-light shadow-subtle overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50/80 border-b border-border-light text-stone-500 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-4">Action Type</th>
                  <th className="py-3 px-4">Booking Ref</th>
                  <th className="py-3 px-4">Driver</th>
                  <th className="py-3 px-4">State Transition</th>
                  <th className="py-3 px-4">Outcome</th>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4 text-right">Undo Capability</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-light/70">
                {activities.map((act) => (
                  <tr key={act.id} className="hover:bg-stone-50/60 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-charcoal">
                      <span className="px-2 py-0.5 rounded bg-stone-100 text-stone-800 border border-stone-200">
                        {act.action_type}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 font-mono font-medium">
                      <NavLink
                        to={`/reservations/${act.reservation_id}`}
                        className="hover:underline text-amber-900 font-semibold"
                      >
                        {act.reference_code || `ID #${act.reservation_id}`}
                      </NavLink>
                    </td>

                    <td className="py-3.5 px-4 text-stone-700 font-medium">
                      {act.driver_name || '—'}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 font-mono text-[11px]">
                        <span className="text-stone-500">{act.previous_state}</span>
                        <ArrowRight className="w-3 h-3 text-stone-400" />
                        <span className="font-semibold text-charcoal">{act.resulting_state}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      {act.success ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Success</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-rose-700 font-semibold">
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Failed</span>
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-stone-500">
                      {formatDateTime(act.created_at)}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      {act.undo_available ? (
                        <button
                          onClick={() => setConfirmUndo({ isOpen: true, action: act })}
                          className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200 transition-colors inline-flex items-center gap-1 shadow-xs"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Undo Action</span>
                        </button>
                      ) : (
                        <span className="text-[11px] text-stone-400">Irreversible / Settled</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Confirm Undo Dialog */}
      <ConfirmDialog
        isOpen={confirmUndo.isOpen}
        title="Undo Reservation Command"
        message={`Are you sure you want to reverse the '${confirmUndo.action?.action_type}' action on reservation ${confirmUndo.action?.reference_code}?`}
        confirmLabel="Execute Undo"
        isDestructive={false}
        onConfirm={() => confirmUndo.action && handleExecuteUndo(confirmUndo.action)}
        onCancel={() => setConfirmUndo({ isOpen: false, action: null })}
      />
    </div>
  );
};
