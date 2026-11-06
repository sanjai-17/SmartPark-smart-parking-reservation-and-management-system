import React, { useState } from 'react';
import { X, CreditCard, Smartphone, Wallet, ShieldCheck, AlertCircle } from 'lucide-react';
import { Reservation, PaymentMethod, PaymentTransaction } from '../../types';
import { parkingApi, extractErrorMessage } from '../../api/client';
import { formatINR } from '../../utils/formatters';
import { PatternBadge } from '../common/StatusBadge';
import { useToast } from '../common/ToastProvider';

interface PaymentModalProps {
  reservation: Reservation;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (txn: PaymentTransaction) => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  reservation,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { success, error: toastError } = useToast();
  const [method, setMethod] = useState<PaymentMethod>('UPI');
  const [account, setAccount] = useState('driver@okaxis');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const dueAmount = reservation.final_amount || reservation.estimated_amount;

  const handleMethodChange = (newMethod: PaymentMethod) => {
    setMethod(newMethod);
    if (newMethod === 'UPI') setAccount('driver@okaxis');
    else if (newMethod === 'Card') setAccount('4532-1111-2222-3333');
    else setAccount('WLT-USER-8899');
  };

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!account.trim()) {
      setErrorMsg('Please enter an account identifier.');
      return;
    }

    setIsProcessing(true);
    setErrorMsg(null);

    try {
      const txn = await parkingApi.processPayment(reservation.id, {
        payment_method: method,
        account_identifier: account.trim(),
      });

      success('Payment Successful!', `Transaction Ref: ${txn.transaction_reference} via ${method} Adapter`);
      onSuccess(txn);
      onClose();
    } catch (err) {
      const msg = extractErrorMessage(err);
      setErrorMsg(msg);
      toastError('Payment Declined', msg);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/40 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-border-light">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-border-light">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-charcoal">Simulate Payment</h3>
              <PatternBadge pattern="Adapter Pattern" />
            </div>
            <p className="text-xs text-stone-500 mt-0.5">
              Ref: {reservation.reference_code} • Slot {reservation.slot_code || reservation.slot_id}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handlePay} className="mt-4 space-y-4">
          {/* Amount Due Card */}
          <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200/70 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-medium text-amber-900 uppercase tracking-wider block">
                Total Amount Due
              </span>
              <span className="text-xs text-amber-800">
                Strategy: {reservation.pricing_strategy} ({reservation.duration_hours} hrs)
              </span>
            </div>
            <span className="text-2xl font-black text-amber-950">{formatINR(dueAmount)}</span>
          </div>

          {/* Payment Method Selector */}
          <div>
            <label className="block text-xs font-semibold text-charcoal mb-2">
              Select Adapter Payment Gateway
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'UPI', label: 'UPI VPA', icon: Smartphone, desc: 'paise converter' },
                { id: 'Card', label: 'Card', icon: CreditCard, desc: 'auth & capture' },
                { id: 'Wallet', label: 'Wallet', icon: Wallet, desc: 'digital debit' },
              ].map((m) => {
                const Icon = m.icon;
                const isSelected = method === m.id;
                return (
                  <button
                    type="button"
                    key={m.id}
                    onClick={() => handleMethodChange(m.id as PaymentMethod)}
                    className={`p-3 rounded-xl border text-center transition-all ${
                      isSelected
                        ? 'bg-stone-900 border-stone-900 text-white shadow-sm'
                        : 'bg-white border-border-light text-stone-600 hover:bg-stone-50'
                    }`}
                  >
                    <Icon className="w-4 h-4 mx-auto mb-1 opacity-90" />
                    <div className="text-xs font-semibold">{m.label}</div>
                    <div className={`text-[10px] mt-0.5 ${isSelected ? 'text-stone-300' : 'text-stone-400'}`}>
                      {m.desc}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dummy Account Identifier */}
          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1">
              {method === 'UPI' && 'UPI ID / Virtual Payment Address (VPA)'}
              {method === 'Card' && 'Simulated Card Identifier (Dummy)'}
              {method === 'Wallet' && 'Digital Wallet Account ID'}
            </label>
            <input
              type="text"
              required
              value={account}
              onChange={(e) => setAccount(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-border-light focus:outline-none focus:ring-1 focus:ring-amber-500 bg-canvas-card font-mono text-xs"
              placeholder={
                method === 'UPI'
                  ? 'username@bank'
                  : method === 'Card'
                  ? '4111-2222-3333-4444'
                  : 'WLT-ACCOUNT'
              }
            />
            <p className="mt-1 text-[11px] text-stone-400">
              Demo sandbox: Safe dummy credentials only. No actual money is debited.
            </p>
          </div>

          {/* Action buttons */}
          <div className="pt-3 flex items-center justify-end gap-3 border-t border-border-light">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-stone-600 hover:bg-stone-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isProcessing}
              className="px-5 py-2.5 text-xs font-semibold text-white bg-charcoal hover:bg-stone-800 disabled:bg-stone-300 rounded-lg shadow-sm transition-colors flex items-center gap-2"
            >
              {isProcessing ? (
                <>
                  <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Adapting Gateway...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Pay {formatINR(dueAmount)}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
