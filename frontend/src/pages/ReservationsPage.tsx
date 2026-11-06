import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  CalendarCheck,
  CreditCard,
  RotateCcw,
  ShieldCheck,
  LogIn,
  LogOut,
  XCircle,
  Eye,
  RefreshCw,
  Search,
  Filter,
} from 'lucide-react';

import { parkingApi, extractErrorMessage } from '../api/client';
import { Reservation, PaymentTransaction } from '../types';
import { StatusBadge, PatternBadge } from '../components/common/StatusBadge';
import { PageHeader } from '../components/common/PageHeader';
import { LoadingSkeleton, EmptyState, ErrorState, ConfirmDialog } from '../components/common/FeedbackStates';
import { PaymentModal } from '../components/payment/PaymentModal';
import { formatINR, formatDateTime } from '../utils/formatters';
import { useToast } from '../components/common/ToastProvider';

export const ReservationsPage: React.FC = () => {
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();

  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Payment modal state
  const [paymentRes, setPaymentRes] = useState<Reservation | null>(null);

  // Confirmation dialog for cancel / undo
  const [actionConfirm, setActionConfirm] = useState<{
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

  const loadReservations = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await parkingApi.getReservations();
      setReservations(data);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReservations();
  }, []);

  // Action handlers calling backend Command + State + Observer pipelines
  const handleConfirm = async (res: Reservation) => {
    try {
      await parkingApi.confirmReservation(res.id);
      success('Reservation Confirmed', `Bay ${res.slot_code || res.slot_id} is now locked for ${res.driver_name}.`);
      loadReservations();
    } catch (err) {
      toastError('Action Failed', extractErrorMessage(err));
    }
  };

  const handleCheckIn = async (res: Reservation) => {
    try {
      await parkingApi.checkInReservation(res.id);
      success('Check-In Recorded', `Driver on-site. Slot marked Occupied.`);
      loadReservations();
    } catch (err) {
      toastError('Action Failed', extractErrorMessage(err));
    }
  };

  const handleCheckOut = async (res: Reservation) => {
    try {
      await parkingApi.checkOutReservation(res.id);
      success('Check-Out Recorded', `Session ended. Slot released to Available.`);
      loadReservations();
    } catch (err) {
      toastError('Action Failed', extractErrorMessage(err));
    }
  };

  const promptCancel = (res: Reservation) => {
    setActionConfirm({
      isOpen: true,
      title: 'Cancel Reservation',
      message: `Are you sure you want to cancel reservation ${res.reference_code}? The slot will be released immediately.`,
      isDestructive: true,
      onConfirm: async () => {
        setActionConfirm((prev) => ({ ...prev, isOpen: false }));
        try {
          await parkingApi.cancelReservation(res.id);
          success('Reservation Cancelled', `Slot has been returned to Available inventory.`);
          loadReservations();
        } catch (err) {
          toastError('Cancellation Failed', extractErrorMessage(err));
        }
      },
    });
  };

  const promptUndo = (res: Reservation) => {
    setActionConfirm({
      isOpen: true,
      title: 'Undo Last Action',
      message: `Revert the most recent state change on ${res.reference_code}? Slot status will also be restored.`,
      isDestructive: false,
      onConfirm: async () => {
        setActionConfirm((prev) => ({ ...prev, isOpen: false }));
        try {
          await parkingApi.undoReservationAction(res.id);
          success('Action Undone Successfully', `Reservation restored to previous state via Command pattern.`);
          loadReservations();
        } catch (err) {
          toastError('Undo Failed', extractErrorMessage(err));
        }
      },
    });
  };

  const filteredReservations = reservations.filter((r) => {
    if (statusFilter && r.status.toLowerCase() !== statusFilter.toLowerCase()) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const codeMatch = r.reference_code.toLowerCase().includes(q);
      const nameMatch = r.driver_name.toLowerCase().includes(q);
      const locMatch = (r.location_name || '').toLowerCase().includes(q);
      const slotMatch = (r.slot_code || '').toLowerCase().includes(q);
      if (!codeMatch && !nameMatch && !locMatch && !slotMatch) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <PageHeader
        title="Reservation Management"
        subtitle="Track driver lifecycles, execute state transitions, simulate payments, or undo recent actions."
        badge={<PatternBadge pattern="State & Command Patterns" />}
        actions={
          <div className="flex items-center gap-2">
            <NavLink
              to="/parking"
              className="px-3.5 py-2 text-xs font-semibold text-white bg-charcoal hover:bg-stone-800 rounded-lg shadow-sm transition-colors"
            >
              + New Reservation
            </NavLink>
            <button
              onClick={loadReservations}
              className="p-2 text-stone-500 hover:text-charcoal hover:bg-stone-100 rounded-lg transition-colors border border-border-light bg-white"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        }
      />

      {/* Filter toolbar */}
      <div className="bg-white rounded-xl border border-border-light p-4 shadow-subtle flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search by ref code, driver, slot..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-border-light focus:outline-none focus:ring-1 focus:ring-amber-500 bg-stone-50/50"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs rounded-lg border border-border-light focus:outline-none focus:ring-1 focus:ring-amber-500 bg-white"
          >
            <option value="">All States ({reservations.length})</option>
            <option value="Pending">Pending</option>
            <option value="Confirmed">Confirmed</option>
            <option value="Active">Active (Parked)</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Main Table */}
      {loading ? (
        <LoadingSkeleton rows={5} height="h-20" />
      ) : error ? (
        <ErrorState message={error} onRetry={loadReservations} />
      ) : filteredReservations.length === 0 ? (
        <EmptyState
          title="No Reservations Found"
          description="Create your first parking reservation from the Find Parking screen."
          action={
            <NavLink
              to="/parking"
              className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-charcoal text-white hover:bg-stone-800"
            >
              Browse Parking Slots
            </NavLink>
          }
        />
      ) : (
        <div className="bg-white rounded-xl border border-border-light shadow-subtle overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50/80 border-b border-border-light text-stone-500 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-4">Booking Ref</th>
                  <th className="py-3 px-4">Driver</th>
                  <th className="py-3 px-4">Location & Bay</th>
                  <th className="py-3 px-4">Strategy & Fee</th>
                  <th className="py-3 px-4">State</th>
                  <th className="py-3 px-4">Payment</th>
                  <th className="py-3 px-4 text-right">Permitted Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-light/70">
                {filteredReservations.map((res) => {
                  const isPending = res.status === 'Pending';
                  const isConfirmed = res.status === 'Confirmed';
                  const isActive = res.status === 'Active';
                  const isPaid = res.payment_status === 'PAID';

                  return (
                    <tr key={res.id} className="hover:bg-stone-50/60 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-medium text-charcoal">
                        <NavLink
                          to={`/reservations/${res.id}`}
                          className="hover:underline text-amber-900 font-bold"
                        >
                          {res.reference_code}
                        </NavLink>
                        <div className="text-[10px] text-stone-400 font-sans mt-0.5">
                          {formatDateTime(res.created_at)}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-charcoal">{res.driver_name}</div>
                        <div className="text-stone-400 text-[11px]">{res.driver_phone}</div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-medium text-charcoal">
                          Bay <span className="font-bold">{res.slot_code || res.slot_id}</span> ({res.slot_type || 'Regular'})
                        </div>
                        <div className="text-stone-500 text-[11px]">{res.location_name}</div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-bold text-charcoal">
                          {formatINR(res.final_amount || res.estimated_amount)}
                        </div>
                        <div className="text-[11px] text-stone-500">
                          {res.pricing_strategy} ({res.duration_hours}h)
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <StatusBadge status={res.status} size="sm" />
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border ${
                            isPaid
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-stone-100 text-stone-600 border-stone-200'
                          }`}
                        >
                          {isPaid ? 'PAID' : 'UNPAID'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          {/* Confirm action for Pending */}
                          {isPending && (
                            <button
                              onClick={() => handleConfirm(res)}
                              className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-xs"
                              title="Confirm reservation (State: Pending -> Confirmed)"
                            >
                              Confirm
                            </button>
                          )}

                          {/* Check-In for Confirmed */}
                          {isConfirmed && (
                            <button
                              onClick={() => handleCheckIn(res)}
                              className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-xs"
                              title="Check-in driver on arrival (State: Confirmed -> Active)"
                            >
                              Check In
                            </button>
                          )}

                          {/* Check-Out for Active */}
                          {isActive && (
                            <button
                              onClick={() => handleCheckOut(res)}
                              className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-amber-600 text-white hover:bg-amber-700 transition-colors shadow-xs"
                              title="Check-out driver (State: Active -> Completed)"
                            >
                              Check Out
                            </button>
                          )}

                          {/* Payment Simulator */}
                          {!isPaid && (
                            <button
                              onClick={() => setPaymentRes(res)}
                              className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-stone-900 text-white hover:bg-stone-800 transition-colors flex items-center gap-1 shadow-xs"
                              title="Simulate UPI/Card/Wallet Payment (Adapter Pattern)"
                            >
                              <CreditCard className="w-3 h-3 text-amber-400" />
                              <span>Pay</span>
                            </button>
                          )}

                          {/* Cancel if Pending or Confirmed */}
                          {(isPending || isConfirmed) && (
                            <button
                              onClick={() => promptCancel(res)}
                              className="p-1 text-stone-400 hover:text-rose-600 rounded transition-colors"
                              title="Cancel Reservation (Releases slot)"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          )}

                          {/* Undo Button */}
                          {res.undo_eligible && (
                            <button
                              onClick={() => promptUndo(res)}
                              className="px-2 py-1 text-[11px] font-semibold rounded-lg bg-amber-100 text-amber-900 hover:bg-amber-200 border border-amber-300 transition-colors flex items-center gap-1"
                              title="Undo last command (Command Pattern)"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>Undo</span>
                            </button>
                          )}

                          {/* Detail Link */}
                          <NavLink
                            to={`/reservations/${res.id}`}
                            className="p-1 text-stone-400 hover:text-stone-700 rounded transition-colors"
                            title="View Full Lifecycle Details"
                          >
                            <Eye className="w-4 h-4" />
                          </NavLink>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {paymentRes && (
        <PaymentModal
          reservation={paymentRes}
          isOpen={Boolean(paymentRes)}
          onClose={() => setPaymentRes(null)}
          onSuccess={() => loadReservations()}
        />
      )}

      {/* Confirm Action Dialog */}
      <ConfirmDialog
        isOpen={actionConfirm.isOpen}
        title={actionConfirm.title}
        message={actionConfirm.message}
        isDestructive={actionConfirm.isDestructive}
        onConfirm={actionConfirm.onConfirm}
        onCancel={() => setActionConfirm((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};
