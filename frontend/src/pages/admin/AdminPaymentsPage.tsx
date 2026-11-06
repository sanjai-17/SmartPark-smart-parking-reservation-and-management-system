import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { CreditCard, Smartphone, Wallet, RefreshCw, CheckCircle2, XCircle } from 'lucide-react';
import { parkingApi, extractErrorMessage } from '../../api/client';
import { PaymentTransaction } from '../../types';
import { PageHeader } from '../../components/common/PageHeader';
import { LoadingSkeleton, EmptyState, ErrorState } from '../../components/common/FeedbackStates';
import { PatternBadge } from '../../components/common/StatusBadge';
import { formatINR, formatDateTime } from '../../utils/formatters';

export const AdminPaymentsPage: React.FC = () => {
  const [payments, setPayments] = useState<PaymentTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPayments = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await parkingApi.getPayments();
      setPayments(data);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayments();
  }, []);

  const getMethodIcon = (method: string) => {
    if (method === 'UPI') return Smartphone;
    if (method === 'Card') return CreditCard;
    return Wallet;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <PageHeader
        title="Payment Adapter Transactions"
        subtitle="Auditable record of normalized payment operations across simulated UPI, Card, and Wallet gateways."
        badge={<PatternBadge pattern="Structural Adapter Pattern" />}
        actions={
          <button
            onClick={loadPayments}
            className="p-2 text-stone-500 hover:text-charcoal hover:bg-stone-100 rounded-lg transition-colors border border-border-light bg-white"
            title="Refresh Transactions"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        }
      />

      {loading ? (
        <LoadingSkeleton rows={5} height="h-16" />
      ) : error ? (
        <ErrorState message={error} onRetry={loadPayments} />
      ) : payments.length === 0 ? (
        <EmptyState
          title="No Transactions Recorded"
          description="Simulate a payment from any active or confirmed reservation to populate this ledger."
        />
      ) : (
        <div className="bg-white rounded-xl border border-border-light shadow-subtle overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 border-b border-border-light text-stone-500 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-4">Transaction Ref</th>
                  <th className="py-3 px-4">Booking Ref</th>
                  <th className="py-3 px-4">Driver</th>
                  <th className="py-3 px-4">Adapter Gateway</th>
                  <th className="py-3 px-4">Gateway Ref</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-light/70">
                {payments.map((txn) => {
                  const Icon = getMethodIcon(txn.payment_method);
                  return (
                    <tr key={txn.id} className="hover:bg-stone-50/60 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-charcoal">
                        {txn.transaction_reference}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-amber-900 font-semibold">
                        {txn.reference_code ? (
                          <NavLink to={`/reservations/${txn.reservation_id}`} className="hover:underline">
                            {txn.reference_code}
                          </NavLink>
                        ) : (
                          `#${txn.reservation_id}`
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-stone-700 font-medium">
                        {txn.driver_name || '—'}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded font-medium bg-stone-100 text-stone-800 border border-stone-200">
                          <Icon className="w-3.5 h-3.5 text-stone-600" />
                          <span>{txn.payment_method} Adapter</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[11px] text-stone-500">
                        {txn.gateway_reference || '—'}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-charcoal text-sm">
                        {formatINR(txn.amount)}
                      </td>
                      <td className="py-3.5 px-4">
                        {txn.status === 'SUCCESS' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>CLEARED</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            <XCircle className="w-3 h-3" />
                            <span>DECLINED</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-stone-400">
                        {formatDateTime(txn.created_at)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
