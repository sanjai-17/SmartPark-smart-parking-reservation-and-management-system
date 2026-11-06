import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import {
  SlidersHorizontal,
  MapPin,
  Grid,
  CreditCard,
  PlusCircle,
  ArrowRight,
  ShieldCheck,
  Layers,
  Sparkles,
} from 'lucide-react';

import { parkingApi, extractErrorMessage } from '../../api/client';
import { DashboardStats } from '../../types';
import { PageHeader } from '../../components/common/PageHeader';
import { StatCard } from '../../components/common/StatCard';
import { LoadingSkeleton, ErrorState } from '../../components/common/FeedbackStates';
import { PatternBadge } from '../../components/common/StatusBadge';
import { formatINR } from '../../utils/formatters';

export const AdminOverviewPage: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await parkingApi.getDashboardStats();
        setStats(data);
      } catch (err) {
        setError(extractErrorMessage(err));
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) return <LoadingSkeleton rows={4} height="h-28" />;
  if (error || !stats) return <ErrorState message={error || 'Failed to load stats.'} />;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <PageHeader
        title="Administration Console"
        subtitle="Manage parking infrastructure, slot factories, and review payment ledgers."
        badge={<PatternBadge pattern="Design Patterns Admin" />}
      />

      {/* Admin Quick Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white rounded-xl border border-border-light p-6 shadow-subtle flex flex-col justify-between hover:shadow-card transition-all">
          <div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 mb-3">
              <Grid className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-charcoal">Slot Factory Management</h3>
            <p className="mt-1 text-xs text-stone-500 leading-relaxed">
              Create and configure slots using the Factory Method pattern (Regular, EV, Disabled, and Premium creators).
            </p>
          </div>
          <NavLink
            to="/admin/slots"
            className="mt-5 inline-flex items-center gap-1.5 text-xs font-semibold text-amber-900 hover:text-amber-950"
          >
            <span>Launch Slot Creator</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </NavLink>
        </div>

        <div className="bg-white rounded-xl border border-border-light p-6 shadow-subtle flex flex-col justify-between hover:shadow-card transition-all">
          <div>
            <div className="w-10 h-10 rounded-xl bg-stone-100 border border-stone-200 flex items-center justify-center text-charcoal mb-3">
              <MapPin className="w-5 h-5 text-stone-700" />
            </div>
            <h3 className="font-bold text-base text-charcoal">Locations & Hubs</h3>
            <p className="mt-1 text-xs text-stone-500 leading-relaxed">
              Register new parking zones (Suburb, City Centre, Airport) and configure base pricing tiers.
            </p>
          </div>
          <NavLink
            to="/admin/locations"
            className="mt-5 inline-flex items-center gap-1.5 text-xs font-semibold text-charcoal hover:text-stone-900"
          >
            <span>Manage Locations ({stats.total_locations})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </NavLink>
        </div>

        <div className="bg-white rounded-xl border border-border-light p-6 shadow-subtle flex flex-col justify-between hover:shadow-card transition-all">
          <div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 mb-3">
              <CreditCard className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-charcoal">Payment Transaction Ledger</h3>
            <p className="mt-1 text-xs text-stone-500 leading-relaxed">
              Inspect simulated payments adapted from UPI, Card, and digital wallet gateway responses.
            </p>
          </div>
          <NavLink
            to="/admin/payments"
            className="mt-5 inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-900 hover:text-emerald-950"
          >
            <span>View Transactions ({formatINR(stats.total_revenue)})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </NavLink>
        </div>
      </div>

      {/* Facilities Breakdown */}
      <div className="bg-white rounded-xl border border-border-light p-6 shadow-subtle">
        <h3 className="font-bold text-sm text-charcoal pb-3 border-b border-border-light">
          Facility Capacity & Allocation Breakdown
        </h3>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.location_breakdown.map((loc) => (
            <div key={loc.location_id} className="p-4 rounded-xl bg-stone-50/70 border border-stone-200/80">
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-white border border-stone-200 text-stone-600">
                {loc.zone} Zone
              </span>
              <h4 className="mt-2 font-bold text-sm text-charcoal truncate">{loc.name}</h4>
              <div className="mt-3 flex items-baseline justify-between text-xs">
                <span className="text-stone-500">Available:</span>
                <span className="font-bold text-emerald-700">
                  {loc.available_slots} / {loc.total_slots}
                </span>
              </div>
              <div className="mt-1.5 w-full bg-stone-200 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-amber-500 h-1.5 rounded-full"
                  style={{ width: `${loc.occupancy_rate}%` }}
                />
              </div>
              <div className="mt-1 text-[10px] text-stone-400 text-right font-medium">
                {loc.occupancy_rate}% Occupied
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
