import React, { useState, useEffect } from 'react';
import { X, Calculator, ShieldCheck, Car, Clock, Sparkles, AlertCircle } from 'lucide-react';
import { ParkingSlot, PricingEstimateResponse, PricingStrategyType, VehicleType } from '../../types';
import { parkingApi, extractErrorMessage } from '../../api/client';
import { formatINR } from '../../utils/formatters';
import { PatternBadge } from '../common/StatusBadge';
import { useToast } from '../common/ToastProvider';

interface BookingModalProps {
  slot: ParkingSlot | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const BookingModal: React.FC<BookingModalProps> = ({
  slot,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { success, error: toastError } = useToast();

  const [driverName, setDriverName] = useState('Rahul Verma');
  const [driverEmail, setDriverEmail] = useState('rahul.verma@example.com');
  const [driverPhone, setDriverPhone] = useState('+91 98765 12345');
  const [vehicleType, setVehicleType] = useState<VehicleType>('Car');
  const [durationHours, setDurationHours] = useState<number>(3);
  const [pricingStrategy, setPricingStrategy] = useState<PricingStrategyType>('Duration');

  const [estimate, setEstimate] = useState<PricingEstimateResponse | null>(null);
  const [isEstimating, setIsEstimating] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Recalculate pricing estimate via Strategy pattern whenever inputs change
  useEffect(() => {
    if (!slot || !isOpen) return;

    let active = true;
    const fetchEstimate = async () => {
      setIsEstimating(true);
      try {
        const res = await parkingApi.estimatePricing({
          duration_hours: Number(durationHours) || 1,
          base_rate: Number(slot.base_rate),
          pricing_strategy: pricingStrategy,
          vehicle_type: vehicleType,
          location_zone: slot.location_zone || 'City Centre',
        });
        if (active) {
          setEstimate(res);
          setFormError(null);
        }
      } catch (err) {
        if (active) {
          setFormError(extractErrorMessage(err));
        }
      } finally {
        if (active) setIsEstimating(false);
      }
    };

    fetchEstimate();
    return () => {
      active = false;
    };
  }, [slot, durationHours, pricingStrategy, vehicleType, isOpen]);

  if (!isOpen || !slot) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!driverName || !driverEmail || !driverPhone) {
      setFormError('Please fill in all driver details.');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      const created = await parkingApi.createReservation({
        slot_id: slot.id,
        driver_name: driverName.trim(),
        driver_email: driverEmail.trim(),
        driver_phone: driverPhone.trim(),
        vehicle_type: vehicleType,
        duration_hours: Number(durationHours),
        pricing_strategy: pricingStrategy,
      });

      success('Reservation Created!', `Reference code: ${created.reference_code}. Slot is temporarily held.`);
      onSuccess();
      onClose();
    } catch (err) {
      const msg = extractErrorMessage(err);
      setFormError(msg);
      toastError('Booking Failed', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/40 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-border-light my-8">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-border-light">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-charcoal">Reserve Parking Bay {slot.slot_code}</h2>
              <PatternBadge pattern="Strategy Pattern" />
            </div>
            <p className="text-xs text-stone-500 mt-0.5">
              {slot.slot_type} slot • {slot.location_name} ({slot.location_zone || 'City Centre'})
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {formError && (
          <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Driver Contact */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">Driver Name *</label>
              <input
                type="text"
                required
                value={driverName}
                onChange={(e) => setDriverName(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-border-light focus:outline-none focus:ring-1 focus:ring-amber-500 bg-canvas-card"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">Mobile Number *</label>
              <input
                type="tel"
                required
                value={driverPhone}
                onChange={(e) => setDriverPhone(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-border-light focus:outline-none focus:ring-1 focus:ring-amber-500 bg-canvas-card"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1">Email Address *</label>
            <input
              type="email"
              required
              value={driverEmail}
              onChange={(e) => setDriverEmail(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-border-light focus:outline-none focus:ring-1 focus:ring-amber-500 bg-canvas-card"
            />
          </div>

          {/* Vehicle and Duration */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">Vehicle Category</label>
              <select
                value={vehicleType}
                onChange={(e) => setVehicleType(e.target.value as VehicleType)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-border-light focus:outline-none focus:ring-1 focus:ring-amber-500 bg-white"
              >
                <option value="Bike">Bike (0.5x rate)</option>
                <option value="Car">Car (1.0x rate)</option>
                <option value="SUV">SUV (1.5x rate)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">Estimated Hours</label>
              <input
                type="number"
                min="0.5"
                max="72"
                step="0.5"
                value={durationHours}
                onChange={(e) => setDurationHours(parseFloat(e.target.value) || 1)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-border-light focus:outline-none focus:ring-1 focus:ring-amber-500 bg-canvas-card"
              />
            </div>
          </div>

          {/* Strategy Pattern Selection */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-charcoal">
                Select Pricing Strategy Algorithm
              </label>
              <span className="text-[11px] text-amber-700">Dynamic GoF Strategy</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'Duration', label: 'By Duration', desc: '30% off > 4h' },
                { id: 'VehicleType', label: 'By Vehicle', desc: 'Bike/Car/SUV rate' },
                { id: 'Location', label: 'By Location', desc: 'Zone multiplier' },
              ].map((strat) => (
                <button
                  type="button"
                  key={strat.id}
                  onClick={() => setPricingStrategy(strat.id as PricingStrategyType)}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    pricingStrategy === strat.id
                      ? 'bg-amber-50/70 border-amber-300 ring-1 ring-amber-400 text-charcoal'
                      : 'bg-white border-border-light text-stone-600 hover:bg-stone-50'
                  }`}
                >
                  <div className="text-xs font-semibold">{strat.label}</div>
                  <div className="text-[10px] text-stone-500 mt-0.5">{strat.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Price Breakdown from Backend Strategy */}
          <div className="p-4 rounded-xl bg-stone-50 border border-stone-200/80 space-y-2">
            <div className="flex items-center justify-between text-xs text-stone-600">
              <span className="flex items-center gap-1.5">
                <Calculator className="w-3.5 h-3.5 text-stone-400" />
                <span>Base Rate ({slot.slot_code})</span>
              </span>
              <span className="font-medium text-charcoal">{formatINR(slot.base_rate)}/hr</span>
            </div>

            {estimate && (
              <div className="text-xs text-stone-500 font-mono bg-white/70 p-2 rounded-lg border border-stone-200/60">
                <div className="text-[11px] text-stone-400 uppercase font-sans font-medium mb-0.5">
                  Calculation Formula
                </div>
                {estimate.formula_description}
              </div>
            )}

            <div className="pt-2 border-t border-stone-200 flex items-center justify-between">
              <span className="text-sm font-semibold text-charcoal">Estimated Total</span>
              <span className="text-lg font-bold text-amber-900">
                {isEstimating ? (
                  <span className="text-xs text-stone-400 animate-pulse">Calculating...</span>
                ) : (
                  formatINR(estimate?.final_amount)
                )}
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="pt-3 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-stone-600 hover:bg-stone-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isEstimating}
              className="px-5 py-2.5 text-xs font-semibold text-white bg-charcoal hover:bg-stone-800 disabled:bg-stone-300 rounded-lg shadow-sm transition-colors flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Holding Slot...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4 text-amber-400" />
                  <span>Confirm Reservation</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
