import React from 'react';
import {
  Car,
  Zap,
  Accessibility,
  Crown,
  MapPin,
  Clock,
  Sparkles,
} from 'lucide-react';
import { ParkingSlot, SlotType } from '../../types';
import { StatusBadge } from '../common/StatusBadge';
import { formatINR } from '../../utils/formatters';

interface ParkingSlotCardProps {
  slot: ParkingSlot;
  onReserve?: (slot: ParkingSlot) => void;
}

export const getSlotTypeIcon = (type: SlotType | string) => {
  const norm = (type || '').toLowerCase();
  if (norm.includes('electric') || norm.includes('ev')) return Zap;
  if (norm.includes('disabled') || norm.includes('accessible')) return Accessibility;
  if (norm.includes('premium') || norm.includes('vip')) return Crown;
  return Car;
};

export const ParkingSlotCard: React.FC<ParkingSlotCardProps> = ({ slot, onReserve }) => {
  const TypeIcon = getSlotTypeIcon(slot.slot_type);
  const isAvailable = slot.availability_status === 'Available';

  return (
    <div className="bg-white rounded-xl border border-border-light p-5 shadow-subtle hover:shadow-card transition-all flex flex-col justify-between">
      <div>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-stone-100 border border-stone-200 flex items-center justify-center text-charcoal font-semibold">
              <TypeIcon className="w-4 h-4 text-amber-700" />
            </div>
            <div>
              <span className="font-bold text-base text-charcoal tracking-tight">{slot.slot_code}</span>
              <p className="text-xs text-stone-500 font-medium">{slot.slot_type}</p>
            </div>
          </div>
          <StatusBadge status={slot.availability_status} size="sm" />
        </div>

        {slot.location_name && (
          <div className="mt-3 flex items-center gap-1.5 text-xs text-stone-600">
            <MapPin className="w-3.5 h-3.5 text-stone-400 flex-shrink-0" />
            <span className="truncate">{slot.location_name}</span>
            {slot.location_zone && (
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-stone-100 text-stone-600">
                {slot.location_zone}
              </span>
            )}
          </div>
        )}

        {slot.features && (
          <div className="mt-2.5 flex items-center gap-1.5 text-xs text-amber-900 bg-amber-50/60 border border-amber-100 px-2.5 py-1.5 rounded-lg">
            <Sparkles className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
            <span className="text-[11px] truncate">{slot.features}</span>
          </div>
        )}

        {slot.description && (
          <p className="mt-2 text-xs text-stone-500 line-clamp-2 leading-relaxed">
            {slot.description}
          </p>
        )}
      </div>

      <div className="mt-5 pt-3 border-t border-border-light/70 flex items-center justify-between">
        <div>
          <span className="text-[11px] text-stone-400 uppercase tracking-wider block">Base Rate</span>
          <span className="text-base font-bold text-charcoal">
            {formatINR(slot.base_rate)}
            <span className="text-xs font-normal text-stone-500">/hr</span>
          </span>
        </div>

        {onReserve && (
          <button
            disabled={!isAvailable}
            onClick={() => onReserve(slot)}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              isAvailable
                ? 'bg-charcoal text-white hover:bg-stone-800 shadow-sm'
                : 'bg-stone-100 text-stone-400 cursor-not-allowed border border-stone-200'
            }`}
          >
            {isAvailable ? 'Reserve Bay' : 'Occupied'}
          </button>
        )}
      </div>
    </div>
  );
};
