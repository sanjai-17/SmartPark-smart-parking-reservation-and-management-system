import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { Bell, Smartphone, Mail, Tv, RefreshCw, CheckCircle2 } from 'lucide-react';
import { parkingApi, extractErrorMessage } from '../api/client';
import { NotificationRecord } from '../types';
import { PageHeader } from '../components/common/PageHeader';
import { LoadingSkeleton, EmptyState, ErrorState } from '../components/common/FeedbackStates';
import { PatternBadge } from '../components/common/StatusBadge';
import { formatDateTime } from '../utils/formatters';

export const NotificationsPage: React.FC = () => {
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>('');

  const loadNotifications = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await parkingApi.getNotifications();
      setNotifications(data);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const getNotificationIcon = (type: string) => {
    if (type === 'SMS') return Smartphone;
    if (type === 'Email') return Mail;
    return Tv;
  };

  const filtered = notifications.filter((n) => {
    if (filterType && n.notification_type !== filterType) return false;
    return true;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <PageHeader
        title="Simulated Notification Center"
        subtitle="Live delivery telemetry demonstrating the decoupled GoF Observer Pattern."
        badge={<PatternBadge pattern="Observer Pattern" />}
        actions={
          <button
            onClick={loadNotifications}
            className="p-2 text-stone-500 hover:text-charcoal hover:bg-stone-100 rounded-lg transition-colors border border-border-light bg-white"
            title="Refresh Feed"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        }
      />

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-border-light pb-2 text-xs">
        {[
          { id: '', label: `All Alerts (${notifications.length})` },
          { id: 'SMS', label: 'SMS Observers' },
          { id: 'Email', label: 'Email Observers' },
          { id: 'DisplayBoard', label: 'Entrance Display Boards' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilterType(tab.id)}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              filterType === tab.id
                ? 'bg-charcoal text-white font-semibold'
                : 'text-stone-600 hover:bg-stone-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingSkeleton rows={4} height="h-20" />
      ) : error ? (
        <ErrorState message={error} onRetry={loadNotifications} />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No Notifications Recorded"
          description="Notifications will automatically fire when reservations transition state."
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => {
            const Icon = getNotificationIcon(item.notification_type);

            return (
              <div
                key={item.id}
                className="bg-white rounded-xl border border-border-light p-4 shadow-subtle flex items-start gap-4 hover:border-stone-300 transition-colors"
              >
                <div className="w-10 h-10 rounded-xl bg-stone-100 border border-stone-200 flex items-center justify-center text-charcoal flex-shrink-0 mt-0.5">
                  <Icon className="w-5 h-5 text-amber-700" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-xs uppercase px-2 py-0.5 rounded bg-stone-100 text-stone-800 border border-stone-200">
                        {item.notification_type}
                      </span>
                      {item.reference_code && (
                        <NavLink
                          to={`/reservations/${item.reservation_id}`}
                          className="font-mono text-xs font-semibold text-amber-900 hover:underline"
                        >
                          {item.reference_code}
                        </NavLink>
                      )}
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>{item.delivery_status}</span>
                      </span>
                    </div>

                    <span className="text-[11px] text-stone-400 whitespace-nowrap">
                      {formatDateTime(item.created_at)}
                    </span>
                  </div>

                  <p className="mt-2 text-xs text-charcoal font-mono bg-stone-50 p-2.5 rounded-lg border border-stone-200/60 leading-relaxed break-words">
                    {item.message}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
