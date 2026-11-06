import React, { useState, useEffect } from 'react';
import { MapPin, Plus, RefreshCw, AlertCircle } from 'lucide-react';
import { parkingApi, extractErrorMessage } from '../../api/client';
import { ParkingLocation, LocationZone } from '../../types';
import { PageHeader } from '../../components/common/PageHeader';
import { LoadingSkeleton, ErrorState } from '../../components/common/FeedbackStates';
import { formatDateTime } from '../../utils/formatters';
import { useToast } from '../../components/common/ToastProvider';

export const AdminLocationsPage: React.FC = () => {
  const { success, error: toastError } = useToast();
  const [locations, setLocations] = useState<ParkingLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [zone, setZone] = useState<LocationZone>('City Centre');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const loadLocations = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await parkingApi.getLocations();
      setLocations(data);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLocations();
  }, []);

  const handleCreateLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !address.trim()) {
      setFormError('Name and Address are required.');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);
    try {
      const created = await parkingApi.createLocation({
        name: name.trim(),
        address: address.trim(),
        zone,
        description: description.trim() || undefined,
      });

      success('Location Created', `Added ${created.name} (${created.zone} Zone).`);
      setName('');
      setAddress('');
      setDescription('');
      loadLocations();
    } catch (err) {
      const msg = extractErrorMessage(err);
      setFormError(msg);
      toastError('Creation Failed', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <PageHeader
        title="Location & Hub Management"
        subtitle="Configure parking locations, geographic pricing zones, and facility capacities."
        actions={
          <button
            onClick={loadLocations}
            className="p-2 text-stone-500 hover:text-charcoal hover:bg-stone-100 rounded-lg transition-colors border border-border-light bg-white"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        }
      />

      {/* Grid: Form on left/top, Table on right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Creation Form */}
        <div className="bg-white rounded-xl border border-border-light p-5 shadow-subtle h-fit">
          <div className="flex items-center gap-2 pb-3 border-b border-border-light">
            <Plus className="w-4 h-4 text-amber-600" />
            <h3 className="font-bold text-sm text-charcoal">Add Parking Facility</h3>
          </div>

          {formError && (
            <div className="mt-3 p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
              <span>{formError}</span>
            </div>
          )}

          <form onSubmit={handleCreateLocation} className="mt-4 space-y-3.5">
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">Facility Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Metro Station South Deck"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-border-light focus:outline-none focus:ring-1 focus:ring-amber-500 bg-canvas-card"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">Full Street Address *</label>
              <input
                type="text"
                required
                placeholder="e.g. 55 Outer Ring Road, Sector 3"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-border-light focus:outline-none focus:ring-1 focus:ring-amber-500 bg-canvas-card"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">Zone Tier (Pricing)</label>
              <select
                value={zone}
                onChange={(e) => setZone(e.target.value as LocationZone)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-border-light focus:outline-none focus:ring-1 focus:ring-amber-500 bg-white"
              >
                <option value="Suburb">Suburb (1.0x baseline)</option>
                <option value="City Centre">City Centre (1.5x multiplier)</option>
                <option value="Airport">Airport (2.0x multiplier)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">Facility Overview</label>
              <textarea
                rows={3}
                placeholder="Optional amenities and security details..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-border-light focus:outline-none focus:ring-1 focus:ring-amber-500 bg-canvas-card"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 py-2 text-xs font-semibold rounded-lg bg-charcoal text-white hover:bg-stone-800 disabled:bg-stone-300 transition-colors shadow-sm"
            >
              {isSubmitting ? 'Registering...' : 'Save Parking Facility'}
            </button>
          </form>
        </div>

        {/* Location Table */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-border-light shadow-subtle overflow-hidden">
          <div className="p-4 border-b border-border-light font-bold text-sm text-charcoal">
            Active Parking Facilities ({locations.length})
          </div>

          {loading ? (
            <div className="p-4">
              <LoadingSkeleton rows={4} height="h-16" />
            </div>
          ) : error ? (
            <div className="p-4">
              <ErrorState message={error} onRetry={loadLocations} />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-50 border-b border-border-light text-stone-500 uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="py-3 px-4">Location</th>
                    <th className="py-3 px-4">Zone Tier</th>
                    <th className="py-3 px-4">Address</th>
                    <th className="py-3 px-4">Slot Capacity</th>
                    <th className="py-3 px-4">Registered</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-light/70">
                  {locations.map((loc) => (
                    <tr key={loc.id} className="hover:bg-stone-50/60 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-charcoal">
                        {loc.name}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-stone-100 text-stone-700 border border-stone-200">
                          {loc.zone}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-stone-600 max-w-xs truncate">
                        {loc.address}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-emerald-800">
                        {loc.available_slots} / {loc.total_slots} Open
                      </td>
                      <td className="py-3.5 px-4 text-stone-400">
                        {formatDateTime(loc.created_at)}
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
