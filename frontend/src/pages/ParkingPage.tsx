import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Filter, Search, RefreshCw, Sparkles, Layers } from 'lucide-react';

import { parkingApi, extractErrorMessage } from '../api/client';
import { ParkingSlot, ParkingLocation } from '../types';
import { ParkingSlotCard } from '../components/parking/ParkingSlotCard';
import { BookingModal } from '../components/parking/BookingModal';
import { PageHeader } from '../components/common/PageHeader';
import { LoadingSkeleton, EmptyState, ErrorState } from '../components/common/FeedbackStates';
import { PatternBadge } from '../components/common/StatusBadge';

export const ParkingPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const searchFilter = searchParams.get('search') || '';

  const [slots, setSlots] = useState<ParkingSlot[]>([]);
  const [locations, setLocations] = useState<ParkingLocation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filter states
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>(searchFilter);

  // Modal reservation state
  const [selectedSlotForBooking, setSelectedSlotForBooking] = useState<ParkingSlot | null>(null);

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
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter slots in memory for instant responsive UI
  const filteredSlots = slots.filter((slot) => {
    if (selectedLocation && slot.location_id !== Number(selectedLocation)) return false;
    if (selectedType && slot.slot_type.toLowerCase() !== selectedType.toLowerCase()) return false;
    if (selectedStatus && slot.availability_status.toLowerCase() !== selectedStatus.toLowerCase()) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const codeMatch = slot.slot_code.toLowerCase().includes(q);
      const locMatch = (slot.location_name || '').toLowerCase().includes(q);
      const descMatch = (slot.description || '').toLowerCase().includes(q);
      const featMatch = (slot.features || '').toLowerCase().includes(q);
      if (!codeMatch && !locMatch && !descMatch && !featMatch) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <PageHeader
        title="Find & Reserve Parking"
        subtitle="Browse available bays across urban centers, airport terminals, and residential hubs."
        badge={<PatternBadge pattern="Factory Method & Strategy" />}
        actions={
          <button
            onClick={loadData}
            className="p-2 text-stone-500 hover:text-charcoal hover:bg-stone-100 rounded-lg transition-colors border border-border-light bg-white"
            title="Refresh Slots"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        }
      />

      {/* Filter Toolbar */}
      <div className="bg-white rounded-xl border border-border-light p-4 shadow-subtle space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search text */}
          <div className="relative">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search code or keywords..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-border-light focus:outline-none focus:ring-1 focus:ring-amber-500 bg-stone-50/50"
            />
          </div>

          {/* Location filter */}
          <div>
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-border-light focus:outline-none focus:ring-1 focus:ring-amber-500 bg-white"
            >
              <option value="">All Locations ({locations.length})</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name} ({loc.zone})
                </option>
              ))}
            </select>
          </div>

          {/* Slot type filter */}
          <div>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-border-light focus:outline-none focus:ring-1 focus:ring-amber-500 bg-white"
            >
              <option value="">All Slot Types</option>
              <option value="Regular">Regular</option>
              <option value="Electric Vehicle">Electric Vehicle (EV)</option>
              <option value="Disabled">Accessible (Disabled)</option>
              <option value="Premium">Premium VIP</option>
            </select>
          </div>

          {/* Availability filter */}
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-border-light focus:outline-none focus:ring-1 focus:ring-amber-500 bg-white"
            >
              <option value="">All Statuses</option>
              <option value="Available">Available Only</option>
              <option value="Reserved">Reserved</option>
              <option value="Occupied">Occupied</option>
            </select>
          </div>
        </div>

        {/* Quick Type Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border-light/60 text-xs">
          <span className="text-stone-400 font-medium">Quick Filter:</span>
          {['', 'Available', 'Electric Vehicle', 'Premium', 'Disabled'].map((tag) => {
            const isActive =
              (tag === '' && !selectedType && !selectedStatus) ||
              selectedType === tag ||
              selectedStatus === tag;
            return (
              <button
                key={tag || 'all'}
                onClick={() => {
                  if (tag === '') {
                    setSelectedType('');
                    setSelectedStatus('');
                    setSelectedLocation('');
                    setSearchQuery('');
                  } else if (tag === 'Available') {
                    setSelectedStatus(selectedStatus === 'Available' ? '' : 'Available');
                  } else {
                    setSelectedType(selectedType === tag ? '' : tag);
                  }
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-stone-900 text-white'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200/70'
                }`}
              >
                {tag || 'Show All'}
              </button>
            );
          })}
          <span className="ml-auto text-xs text-stone-400 font-medium">
            Showing {filteredSlots.length} of {slots.length} bays
          </span>
        </div>
      </div>

      {/* Grid of Slots */}
      {loading ? (
        <LoadingSkeleton rows={4} height="h-44" />
      ) : error ? (
        <ErrorState message={error} onRetry={loadData} />
      ) : filteredSlots.length === 0 ? (
        <EmptyState
          title="No Parking Bays Match Criteria"
          description="Try broadening your filters or resetting the search query."
          action={
            <button
              onClick={() => {
                setSelectedLocation('');
                setSelectedType('');
                setSelectedStatus('');
                setSearchQuery('');
              }}
              className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-charcoal text-white hover:bg-stone-800"
            >
              Clear All Filters
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredSlots.map((slot) => (
            <ParkingSlotCard
              key={slot.id}
              slot={slot}
              onReserve={(s) => setSelectedSlotForBooking(s)}
            />
          ))}
        </div>
      )}

      {/* Booking Modal */}
      {selectedSlotForBooking && (
        <BookingModal
          slot={selectedSlotForBooking}
          isOpen={Boolean(selectedSlotForBooking)}
          onClose={() => setSelectedSlotForBooking(null)}
          onSuccess={() => {
            loadData();
          }}
        />
      )}
    </div>
  );
};
