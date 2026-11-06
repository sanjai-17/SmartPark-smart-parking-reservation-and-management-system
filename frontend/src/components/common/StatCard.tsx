import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  icon: LucideIcon;
  badge?: string;
  badgeColor?: 'emerald' | 'amber' | 'blue' | 'stone';
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  subValue,
  icon: Icon,
  badge,
  badgeColor = 'stone',
}) => {
  const badgeClasses = {
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    amber: 'bg-amber-50 text-amber-800 border-amber-200',
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    stone: 'bg-stone-100 text-stone-700 border-stone-200',
  }[badgeColor];

  return (
    <div className="bg-white rounded-xl border border-border-light p-5 shadow-subtle hover:border-stone-300 transition-colors">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-stone-500 uppercase tracking-wider">{label}</span>
        <div className="w-8 h-8 rounded-lg bg-stone-50 border border-stone-100 flex items-center justify-center text-stone-600">
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-2xl font-bold tracking-tight text-charcoal">{value}</span>
        {badge && (
          <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${badgeClasses}`}>
            {badge}
          </span>
        )}
      </div>
      {subValue && <p className="mt-1 text-xs text-stone-400">{subValue}</p>}
    </div>
  );
};
