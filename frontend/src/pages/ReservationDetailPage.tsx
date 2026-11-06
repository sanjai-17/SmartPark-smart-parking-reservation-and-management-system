import React, { useState, useEffect } from 'react';
import { useParams, NavLink, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  CalendarCheck,
  CreditCard,
  RotateCcw,
  CheckCircle2,
  Clock,
  Car,
  ShieldCheck,
  Bell,
  History,
  MapPin,
  Layers,
  AlertCircle,
  XCircle,
  Sparkles,
} from 'lucide-react';

import { parkingApi, extractErrorMessage } from '../api/client';
import { Reservation, NotificationRecord, ReservationAction, PaymentTransaction } from '../types';
import { PageHeader } from '../components/common/PageHeader';
import { StatusBadge, PatternBadge } from '../components/common/StatusBadge';
import { LoadingSkeleton, ErrorState, ConfirmDialog } from '../components/common/FeedbackStates';
import { PaymentModal } from '../components/payment/PaymentModal';
import { formatINR, formatDateTime } from '../utils/formatters';
import { useToast } from '../components/common/ToastProvider';

export const ReservationDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();

  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [actions, setActions] = useState<ReservationAction[]>([]);
  const [payments, setPayments] = useState<PaymentTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    isDestructive?: boolean;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const loadAllDetails = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const resId = Number(id);
      const [resData, notifsData, actionsData, paymentsData] = await Promise.all([
        parkingApi.getReservation(resId),
        parkingApi.getNotifications(resId),
        parkingApi.getReservationActivity(resId),
        parkingApi.getPayments(),
      ]);
      setReservation(resData);
      setNotifications(notifsData);
      setActions(actionsData);
      setPayments(paymentsData.filter((p) => p.reservation_id === resId));
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllDetails();
  }, [id]);

  const handleCommand = async (actionType: 'confirm' | 'check-in' | 'check-out' | 'cancel' | 'undo') => {
    if (!reservation) return;
    try {
      if (actionType === 'confirm') {
        await parkingApi.confirmReservation(reservation.id);
        success('State Transition: Confirmed', 'Bay confirmed and locked for arrival.');
      } else if (actionType === 'check-in') {
        await parkingApi.checkInReservation(reservation.id);
        success('State Transition: Active', 'Driver checked in. Bay is Occupied.');
      } else if (actionType === 'check-out') {
        await parkingApi.checkOutReservation(reservation.id);
        success('State Transition: Completed', 'Driver checked out. Bay released to inventory.');
      } else if (actionType === 'cancel') {
        await parkingApi.cancelReservation(reservation.id);
        success('Reservation Cancelled', 'Slot released.');
      } else if (actionType === 'undo') {
        await parkingApi.undoReservationAction(reservation.id);
        success('Command Undone', 'Reverted to previous state with slot status restored.');
      }
      loadAllDetails();
    } catch (err) {
      toastError('Operation Failed', extractErrorMessage(err));
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <LoadingSkeleton rows={4} height="h-28" />
      </div>
    );
  }

  if (error || !reservation) {
    return (
      <div className="space-y-6">
        <ErrorState message={error || 'Reservation not found'} onRetry={loadAllDetails} />
      </div>
    );
  }

  const isPending = reservation.status === 'Pending';
  const isConfirmed = reservation.status === 'Confirmed';
  const isActive = reservation.status === 'Active';
  const isCompleted = reservation.status === 'Completed';
  const isCancelled = reservation.status === 'Cancelled';
  const isPaid = reservation.payment_status === 'PAID';

  const lifecycleSteps = [
    { key: 'Pending', label: '1. Pending', desc: 'Hold bay' },
    { key: 'Confirmed', label: '2. Confirmed', desc: 'Locked' },
    { key: 'Active', label: '3. Active', desc: 'Parked' },
    { key: 'Completed', label: '4. Completed', desc: 'Departed' },
  ];

  const getStepStatus = (stepKey: string) => {
    if (isCancelled) return 'cancelled';
    const order = ['Pending', 'Confirmed', 'Active', 'Completed'];
    const curIdx = order.indexOf(reservation.status);
    const stepIdx = order.indexOf(stepKey);
    if (stepIdx < curIdx) return 'done';
    if (stepIdx === curIdx) return 'current';
    return 'upcoming';
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Top back navigation */}
      <div>
        <NavLink
          to="/reservations"
          className="inline-flex items-center gap-1.5 text-xs text-stone-500 hover:text-charcoal font-medium transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Reservations</span>
        </NavLink>

        <div className="mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-charcoal font-mono">{reservation.reference_code}</h1>
            <StatusBadge status={reservation.status} />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {isPending && (
              <button
                onClick={() => handleCommand('confirm')}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-colors"
              >
                Confirm Booking
              </button>
            )}

            {isConfirmed && (
              <button
                onClick={() => handleCommand('check-in')}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-colors"
              >
                Check In (Arrival)
              </button>
            )}

            {isActive && (
              <button
                onClick={() => handleCommand('check-out')}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-amber-600 hover:bg-amber-700 text-white shadow-sm transition-colors"
              >
                Check Out (Departure)
              </button>
            )}

            {!isPaid && (
              <button
                onClick={() => setPaymentModalOpen(true)}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-stone-900 hover:bg-stone-800 text-white shadow-sm transition-colors flex items-center gap-1.5"
              >
                <CreditCard className="w-3.5 h-3.5 text-amber-400" />
                <span>Simulate Payment</span>
              </button>
            )}

            {(isPending || isConfirmed) && (
              <button
                onClick={() =>
                  setConfirmDialog({
                    isOpen: true,
                    title: 'Cancel Reservation',
                    message: 'Are you sure you want to cancel this booking? The parking slot will be freed.',
                    isDestructive: true,
                    onConfirm: () => {
                      setConfirmDialog((p) => ({ ...p, isOpen: false }));
                      handleCommand('cancel');
                    },
                  })
                }
                className="px-3 py-2 text-xs font-medium rounded-lg text-rose-600 border border-rose-200 hover:bg-rose-50 transition-colors"
              >
                Cancel
              </button>
            )}

            {reservation.undo_eligible && (
              <button
                onClick={() =>
                  setConfirmDialog({
                    isOpen: true,
                    title: 'Undo Last Command',
                    message: 'Reverse the latest state transition? This invokes Command.undo() on the server.',
                    isDestructive: false,
                    onConfirm: () => {
                      setConfirmDialog((p) => ({ ...p, isOpen: false }));
                      handleCommand('undo');
                    },
                  })
                }
                className="px-3 py-2 text-xs font-semibold rounded-lg bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200 transition-colors flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Undo Last Action</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* State Pattern Lifecycle Stepper */}
      <div className="bg-white rounded-xl border border-border-light p-6 shadow-subtle">
        <div className="flex items-center justify-between pb-4 border-b border-border-light mb-6">
          <div>
            <h3 className="font-bold text-sm text-charcoal">GoF State Pattern Lifecycle</h3>
            <p className="text-xs text-stone-500">
              Current State Context:{' '}
              <span className="font-mono font-semibold text-amber-900">{reservation.status}State</span>
            </p>
          </div>
          <PatternBadge pattern="Behavioral State Pattern" />
        </div>

        {isCancelled ? (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-3 text-rose-900">
            <XCircle className="w-6 h-6 text-rose-600 flex-shrink-0" />
            <div>
              <div className="font-bold text-sm">Reservation Cancelled</div>
              <p className="text-xs text-rose-700">
                This reservation was cancelled before entry. Parking slot was safely released to available inventory.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {lifecycleSteps.map((step) => {
              const status = getStepStatus(step.key);
              const isDone = status === 'done';
              const isCurrent = status === 'current';

              return (
                <div
                  key={step.key}
                  className={`p-3.5 rounded-xl border transition-all ${
                    isCurrent
                      ? 'bg-amber-50/80 border-amber-300 ring-1 ring-amber-400 text-charcoal'
                      : isDone
                      ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950'
                      : 'bg-stone-50/50 border-stone-200 text-stone-400'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold">{step.label}</span>
                    {isDone && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                    {isCurrent && <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />}
                  </div>
                  <p className="text-[11px] opacity-80">{step.desc}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Driver & Bay Info */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl border border-border-light p-5 shadow-subtle">
            <h3 className="font-bold text-sm text-charcoal pb-3 border-b border-border-light">
              Booking Particulars
            </h3>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-stone-400 uppercase tracking-wider text-[10px] block">Driver Full Name</span>
                <span className="font-semibold text-charcoal text-sm">{reservation.driver_name}</span>
              </div>
              <div>
                <span className="text-stone-400 uppercase tracking-wider text-[10px] block">Contact Phone</span>
                <span className="font-semibold text-charcoal text-sm">{reservation.driver_phone}</span>
              </div>
              <div>
                <span className="text-stone-400 uppercase tracking-wider text-[10px] block">Email Address</span>
                <span className="font-semibold text-charcoal text-sm">{reservation.driver_email}</span>
              </div>
              <div>
                <span className="text-stone-400 uppercase tracking-wider text-[10px] block">Vehicle Category</span>
                <span className="font-semibold text-charcoal text-sm">{reservation.vehicle_type}</span>
              </div>
              <div>
                <span className="text-stone-400 uppercase tracking-wider text-[10px] block">Parking Facility</span>
                <span className="font-semibold text-charcoal text-sm">{reservation.location_name}</span>
                <span className="text-[11px] text-stone-400 block">{reservation.location_zone} Zone</span>
              </div>
              <div>
                <span className="text-stone-400 uppercase tracking-wider text-[10px] block">Assigned Bay</span>
                <span className="font-semibold text-charcoal text-sm font-mono">
                  {reservation.slot_code || reservation.slot_id} ({reservation.slot_type})
                </span>
              </div>
            </div>
          </div>

          {/* Observer Pattern Notification Log */}
          <div className="bg-white rounded-xl border border-border-light p-5 shadow-subtle">
            <div className="flex items-center justify-between pb-3 border-b border-border-light">
              <div>
                <h3 className="font-bold text-sm text-charcoal">Observer Pattern Notifications</h3>
                <p className="text-xs text-stone-500">Real-time alerts dispatched to SMS, Email, and Display Board</p>
              </div>
              <PatternBadge pattern="Observer Pattern" />
            </div>

            <div className="mt-4 space-y-2.5">
              {notifications.length === 0 ? (
                <p className="text-xs text-stone-400 py-4 text-center">No notifications dispatched yet.</p>
              ) : (
                notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className="p-3 rounded-lg bg-stone-50 border border-stone-200 text-xs flex items-start gap-3"
                  >
                    <div className="p-1 rounded bg-white border border-stone-200 mt-0.5 text-stone-600">
                      <Bell className="w-3.5 h-3.5 text-amber-700" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-charcoal uppercase text-[10px] tracking-wider px-1.5 py-0.5 rounded bg-stone-200/60">
                          {notif.notification_type}
                        </span>
                        <span className="text-[10px] text-stone-400">{formatDateTime(notif.created_at)}</span>
                      </div>
                      <p className="mt-1 text-stone-700 font-mono text-[11px] leading-relaxed">
                        {notif.message}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Pricing Strategy & Payment Column */}
        <div className="space-y-6">
          {/* Pricing Details */}
          <div className="bg-white rounded-xl border border-border-light p-5 shadow-subtle">
            <div className="flex items-center justify-between pb-3 border-b border-border-light">
              <h3 className="font-bold text-sm text-charcoal">Pricing Strategy</h3>
              <PatternBadge pattern="Strategy" />
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div className="flex justify-between">
                <span className="text-stone-500">Selected Strategy:</span>
                <span className="font-bold text-charcoal">{reservation.pricing_strategy}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Duration:</span>
                <span className="font-semibold text-charcoal">{reservation.duration_hours} hours</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Base Hourly Rate:</span>
                <span className="font-semibold text-charcoal">{formatINR(reservation.base_rate)}/hr</span>
              </div>
              <div className="pt-2 border-t border-border-light flex justify-between items-baseline">
                <span className="text-sm font-bold text-charcoal">Total Amount:</span>
                <span className="text-xl font-black text-amber-950">
                  {formatINR(reservation.final_amount || reservation.estimated_amount)}
                </span>
              </div>
            </div>
          </div>

          {/* Payment Status & Adapter Audit */}
          <div className="bg-white rounded-xl border border-border-light p-5 shadow-subtle">
            <div className="flex items-center justify-between pb-3 border-b border-border-light">
              <h3 className="font-bold text-sm text-charcoal">Adapter Payment Record</h3>
              <PatternBadge pattern="Adapter" />
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-stone-500">Payment Status:</span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                    isPaid
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : 'bg-stone-100 text-stone-600 border-stone-200'
                  }`}
                >
                  {isPaid ? 'PAID IN FULL' : 'PENDING PAYMENT'}
                </span>
              </div>

              {payments.length > 0 ? (
                payments.map((p) => (
                  <div key={p.id} className="p-3 rounded-lg bg-emerald-50/70 border border-emerald-200 text-emerald-950 space-y-1">
                    <div className="flex justify-between font-bold">
                      <span>Gateway: {p.payment_method}</span>
                      <span>{formatINR(p.amount)}</span>
                    </div>
                    <div className="font-mono text-[10px] truncate">Txn: {p.transaction_reference}</div>
                    <div className="text-[10px] opacity-80">{formatDateTime(p.created_at)}</div>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 bg-stone-50 rounded-lg border border-dashed border-stone-200">
                  <p className="text-stone-400 text-xs">No payment recorded yet.</p>
                  <button
                    onClick={() => setPaymentModalOpen(true)}
                    className="mt-2 px-3 py-1 text-xs font-semibold rounded bg-stone-900 text-white"
                  >
                    Simulate Payment
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Command Audit Log */}
          <div className="bg-white rounded-xl border border-border-light p-5 shadow-subtle">
            <div className="flex items-center justify-between pb-3 border-b border-border-light">
              <h3 className="font-bold text-sm text-charcoal">Command Audit Trail</h3>
              <PatternBadge pattern="Command" />
            </div>

            <div className="mt-4 space-y-2">
              {actions.map((act) => (
                <div
                  key={act.id}
                  className="p-2.5 rounded-lg bg-stone-50 border border-stone-200 text-xs flex items-center justify-between"
                >
                  <div>
                    <span className="font-bold text-charcoal">{act.action_type}</span>
                    <div className="text-[10px] text-stone-400">
                      {act.previous_state} → {act.resulting_state}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-stone-400 block">{formatDateTime(act.created_at)}</span>
                    {act.undo_available && (
                      <span className="text-[10px] font-semibold text-amber-700">Eligible Undo</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      {paymentModalOpen && (
        <PaymentModal
          reservation={reservation}
          isOpen={paymentModalOpen}
          onClose={() => setPaymentModalOpen(false)}
          onSuccess={() => loadAllDetails()}
        />
      )}

      {/* Confirm dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        isDestructive={confirmDialog.isDestructive}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog((p) => ({ ...p, isOpen: false }))}
      />
    </div>
  );
};
