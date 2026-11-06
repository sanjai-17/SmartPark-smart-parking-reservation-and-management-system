import React from 'react';
import {
  CheckCircle2,
  Clock,
  Car,
  XCircle,
  AlertTriangle,
  ShieldCheck,
  Ban,
  Sparkles,
} from 'lucide-react';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const norm = (status || '').toLowerCase();

  let colorClasses = 'bg-stone-100 text-stone-700 border-stone-200';
  let Icon = Clock;
  let label = status;

  if (norm === 'available') {
    colorClasses = 'bg-emerald-50 text-emerald-700 border-emerald-200/80';
    Icon = CheckCircle2;
    label = 'Available';
  } else if (norm === 'reserved') {
    colorClasses = 'bg-amber-50 text-amber-800 border-amber-200/80';
    Icon = Clock;
    label = 'Reserved';
  } else if (norm === 'occupied') {
    colorClasses = 'bg-blue-50 text-blue-700 border-blue-200/80';
    Icon = Car;
    label = 'Occupied';
  } else if (norm === 'unavailable') {
    colorClasses = 'bg-stone-100 text-stone-600 border-stone-200';
    Icon = Ban;
    label = 'Unavailable';
  } else if (norm === 'pending') {
    colorClasses = 'bg-amber-50 text-amber-800 border-amber-200/80';
    Icon = Clock;
    label = 'Pending';
  } else if (norm === 'confirmed') {
    colorClasses = 'bg-sky-50 text-sky-700 border-sky-200/80';
    Icon = ShieldCheck;
    label = 'Confirmed';
  } else if (norm === 'active') {
    colorClasses = 'bg-indigo-50 text-indigo-700 border-indigo-200/80';
    Icon = Car;
    label = 'Active';
  } else if (norm === 'completed') {
    colorClasses = 'bg-emerald-50 text-emerald-800 border-emerald-200/80';
    Icon = CheckCircle2;
    label = 'Completed';
  } else if (norm === 'cancelled') {
    colorClasses = 'bg-rose-50 text-rose-700 border-rose-200/80';
    Icon = XCircle;
    label = 'Cancelled';
  } else if (norm === 'success' || norm === 'paid') {
    colorClasses = 'bg-emerald-50 text-emerald-700 border-emerald-200/80';
    Icon = CheckCircle2;
    label = 'Paid';
  } else if (norm === 'failed' || norm === 'unpaid') {
    colorClasses = 'bg-rose-50 text-rose-700 border-rose-200/80';
    Icon = AlertTriangle;
    label = norm === 'unpaid' ? 'Unpaid' : 'Failed';
  }

  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full border ${colorClasses} ${sizeClasses}`}
    >
      <Icon className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
      <span>{label}</span>
    </span>
  );
};

export const PatternBadge: React.FC<{ pattern: string }> = ({ pattern }) => {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-800 border border-amber-200/70">
      <Sparkles className="w-3 h-3 text-amber-600" />
      <span>{pattern}</span>
    </span>
  );
};
