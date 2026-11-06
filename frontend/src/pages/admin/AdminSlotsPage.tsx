import React, { useState, useEffect } from 'react';
import { Grid, Plus, RefreshCw, AlertCircle, Sparkles, Zap, Car, Accessibility, Crown } from 'lucide-react';
import { parkingApi, extractErrorMessage } from '../../api/client';
import { ParkingSlot, ParkingLocation, SlotType } from '../../types';
import { PageHeader } from '../../components/common/PageHeader';
import { StatusBadge, PatternBadge } from '../../components/common/StatusBadge';
import { LoadingSkeleton, ErrorState } from '../../components/common/FeedbackStates';
import { formatINR, formatDateTime } from '../../utils/formatters';
import { useToast } from '../../components/common/ToastProvider';

export const AdminSlotsPage: React.FC = () => {
  const { success, error: toastError } = useToast();
  const [slots, setSlots] = useState<ParkingSlot[]>([]);
  const [locations, setLocations] = useState<ParkingLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [locationId, setLocationId] = useState<number | ''>('');
  const [slotCode, setSlotCode] = useState('');
  const [slotType, setSlotType] = useState<SlotType>('Electric Vehicle');
  const [baseRate, setBaseRate] = useState<string>('95.00');
  const [features, setFeatures] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [slotsData, locsData] = await Promise.all([
        parkingApi.getSlots(),
        parkingApi.getLocations(),
      ]);
      setSlots(slotsData);
      setLocations(locsData);
      if (locsData.length > 0 && locationId === '') {
        setLocationId(locsData[0].id);
      }
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSlotTypeChange = (type: SlotType) => {
    setSlotType(type);
    if (type === 'Regular') {
      setBaseRate('50.00');
      setFeatures('Standard bay, CCTV surveillance, 24/7 security');
      setDescription('Standard vehicle slot suitable for hatchbacks and sedans.');
    } else if (type === 'Electric Vehicle') {
      setBaseRate('95.00');
      setFeatures('50kW Type-2 EV Fast Charger, Dedicated power metering');
      setDescription('High-speed EV charging bay with safety surge protection.');
    } else if (type === 'Disabled') {
      setBaseRate('40.00');
      setFeatures('Extra-wide bay, Wheelchair ramp access, Close to elevator');
      setDescription('Reserved accessible bay engineered with accessibility clearance.');
    } else if (type === 'Premium') {
      setBaseRate('140.00');
      setFeatures('Valet concierge, Shaded VIP canopy, Priority entry lane');
      setDescription('Exclusive prime bay with covered weather shield and valet service.');
    }
  };

  const handleCreateSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!locationId || !slotCode.trim()) {
      setFormError('Please select a location and provide a slot code.');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      const created = await parkingApi.createSlot({
        slot_code: slotCode.trim(),
        location_id: Number(locationId),
        slot_type: slotType,
        base_rate: parseFloat(baseRate) || undefined,
        features: features.trim() || undefined,
        description: description.trim() || undefined,
      });

      success(
        'Slot Created with Factory Method!',
        `Invoked ${slotType.replace(' ', '')}Creator -> Constructed slot ${created.slot_code}.`
      );
      setSlotCode('');
      loadData();
    } catch (err) {
      const msg = extractErrorMessage(err);
      setFormError(msg);
      toastError('Slot Creation Failed', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <PageHeader
        title="Parking Slot Factory Management"
        subtitle="Construct concrete parking slot products using Factory Method creators."
        badge={<PatternBadge pattern="Creational Factory Method" />}
        actions={
          <button
            onClick={loadData}
            className="p-2 text-stone-500 hover:text-charcoal hover:bg-stone-100 rounded-lg transition-colors border border-border-light bg-white"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Creator Form */}
        <div className="bg-white rounded-xl border border-border-light p-5 shadow-subtle h-fit">
          <div className="flex items-center justify-between pb-3 border-b border-border-light">
            <div className="flex items-center gap-2">
              <Plus className="w-4 h-4 text-amber-600" />
              <h3 className="font-bold text-sm text-charcoal">Instantiate New Slot</h3>
            </div>
            <span className="text-[10px] font-mono font-semibold text-amber-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
              {slotType === 'Electric Vehicle' ? 'EVSlotCreator' : `${slotType}SlotCreator`}
            </span>
          </div>

          {formError && (
            <div className="mt-3 p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
              <span>{formError}</span>
            </div>
          )}

          <form onSubmit={handleCreateSlot} className="mt-4 space-y-3.5">
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">Target Location *</label>
              <select
                required
                value={locationId}
                onChange={(e) => setLocationId(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs rounded-lg border border-border-light focus:outline-none focus:ring-1 focus:ring-amber-500 bg-white"
              >
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name} ({loc.zone})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">Bay Code * (e.g. EV-301)</label>
              <input
                type="text"
                required
                placeholder="e.g. EV-205"
                value={slotCode}
                onChange={(e) => setSlotCode(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-border-light focus:outline-none focus:ring-1 focus:ring-amber-500 bg-canvas-card font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">
                Concrete Slot Creator Type (GoF Factory)
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'Regular', icon: Car },
                  { id: 'Electric Vehicle', icon: Zap },
                  { id: 'Disabled', icon: Accessibility },
                  { id: 'Premium', icon: Crown },
                ].map((t) => {
                  const Icon = t.icon;
                  const isSelected = slotType === t.id;
                  return (
                    <button
                      type="button"
                      key={t.id}
                      onClick={() => handleSlotTypeChange(t.id as SlotType)}
                      className={`p-2 rounded-lg border text-left text-xs font-medium flex items-center gap-1.5 transition-all ${
                        isSelected
                          ? 'bg-amber-50/80 border-amber-300 ring-1 ring-amber-400 text-charcoal'
                          : 'bg-white border-border-light text-stone-600 hover:bg-stone-50'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5 text-amber-600" />
                      <span className="truncate">{t.id}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">Base Hourly Rate (INR ₹)</label>
              <input
                type="number"
                step="5"
                min="0"
                value={baseRate}
                onChange={(e) => setBaseRate(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-border-light focus:outline-none focus:ring-1 focus:ring-amber-500 bg-canvas-card"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">Hardware / Features</label>
              <input
                type="text"
                value={features}
                onChange={(e) => setFeatures(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-border-light focus:outline-none focus:ring-1 focus:ring-amber-500 bg-canvas-card"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">Bay Description</label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-border-light focus:outline-none focus:ring-1 focus:ring-amber-500 bg-canvas-card"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 py-2 text-xs font-semibold rounded-lg bg-charcoal text-white hover:bg-stone-800 disabled:bg-stone-300 transition-colors shadow-sm flex items-center justify-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>{isSubmitting ? 'Instantiating...' : 'Construct Slot via Factory'}</span>
            </button>
          </form>
        </div>

        {/* Slot Inventory Table */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-border-light shadow-subtle overflow-hidden">
          <div className="p-4 border-b border-border-light flex items-center justify-between">
            <span className="font-bold text-sm text-charcoal">Slot Inventory ({slots.length})</span>
            <span className="text-xs text-stone-500">Live Availability & Rates</span>
          </div>

          {loading ? (
            <div className="p-4">
              <LoadingSkeleton rows={5} height="h-16" />
            </div>
          ) : error ? (
            <div className="p-4">
              <ErrorState message={error} onRetry={loadData} />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-50 border-b border-border-light text-stone-500 uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="py-3 px-4">Bay Code</th>
                    <th className="py-3 px-4">Facility</th>
                    <th className="py-3 px-4">Concrete Type</th>
                    <th className="py-3 px-4">Rate</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Features</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-light/70">
                  {slots.map((s) => (
                    <tr key={s.id} className="hover:bg-stone-50/60 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-charcoal">
                        {s.slot_code}
                      </td>
                      <td className="py-3 px-4 text-stone-700">
                        {s.location_name}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-medium text-amber-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          {s.slot_type}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold text-charcoal">
                        {formatINR(s.base_rate)}/hr
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={s.availability_status} size="sm" />
                      </td>
                      <td className="py-3 px-4 text-stone-500 max-w-xs truncate">
                        {s.features || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
