import React, { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Compass,
  Car,
  CheckCircle2,
  Clock,
  IndianRupee,
  Activity,
  Layers,
  ArrowRight,
  MapPin,
  Search,
  Sparkles,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

import { parkingApi, extractErrorMessage } from '../api/client';
import { DashboardStats, ParkingLocation } from '../types';
import { StatCard } from '../components/common/StatCard';
import { PageHeader } from '../components/common/PageHeader';
import { LoadingSkeleton, ErrorState } from '../components/common/FeedbackStates';
import { StatusBadge, PatternBadge } from '../components/common/StatusBadge';
import { formatINR, formatDateTime } from '../utils/formatters';

const PIE_COLORS = ['#d97706', '#3b82f6', '#10b981', '#8b5cf6'];

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [locations, setLocations] = useState<ParkingLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [sData, locData] = await Promise.all([
        parkingApi.getDashboardStats(),
        parkingApi.getLocations(),
      ]);
      setStats(sData);
      setLocations(locData);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/parking?search=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      navigate('/parking');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Overview" subtitle="Loading live parking network telemetry..." />
        <LoadingSkeleton rows={4} height="h-28" />
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="space-y-6">
        <PageHeader title="Dashboard" subtitle="System telemetry" />
        <ErrorState message={error || 'Failed to load stats.'} onRetry={loadData} />
      </div>
    );
  }

  const pieData = Object.entries(stats.slot_type_breakdown).map(([name, value]) => ({
    name,
    value,
  }));

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Top Welcome & Search */}
      <div className="relative rounded-2xl bg-white border border-border-light p-6 sm:p-8 shadow-card overflow-hidden">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-900 border border-amber-200/80 mb-3">
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>Design Patterns Architecture • College Review Ready</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-charcoal">
            Intelligent Parking Reservation & Management
          </h1>
          <p className="mt-2 text-sm text-stone-500 leading-relaxed">
            Real-time multi-zone slot allocation, dynamic pricing engines, state machine transitions,
            and normalized payment adapters across city parking hubs.
          </p>

          <form onSubmit={handleSearchSubmit} className="mt-5 flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-3.5" />
              <input
                type="text"
                placeholder="Search parking hub by name (e.g. Airport, CBD, City Centre)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-border-light bg-stone-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500 transition-all"
              />
            </div>
            <button
              type="submit"
              className="px-5 py-2.5 text-sm font-semibold text-white bg-charcoal hover:bg-stone-800 rounded-xl shadow-sm transition-colors flex items-center gap-1.5"
            >
              <span>Find Bay</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>

      {/* Summary KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Parking Bays"
          value={stats.total_slots}
          subValue={`${stats.total_locations} operational locations`}
          icon={Car}
          badge={`${stats.occupancy_percentage}% Full`}
          badgeColor={stats.occupancy_percentage > 70 ? 'amber' : 'emerald'}
        />
        <StatCard
          label="Available Bays"
          value={stats.available_slots}
          subValue="Ready for instant reservation"
          icon={CheckCircle2}
          badge="Live"
          badgeColor="emerald"
        />
        <StatCard
          label="Active Drivers"
          value={stats.active_reservations}
          subValue={`${stats.occupied_slots} bays parked on-site`}
          icon={Clock}
          badge="In Session"
          badgeColor="blue"
        />
        <StatCard
          label="Simulated Revenue"
          value={formatINR(stats.total_revenue)}
          subValue={`${stats.completed_reservations} completed bookings`}
          icon={IndianRupee}
          badge="Adapter Ledgers"
          badgeColor="stone"
        />
      </div>

      {/* Interactive Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Occupancy by Hub */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-border-light p-5 shadow-subtle">
          <div className="flex items-center justify-between pb-4 border-b border-border-light">
            <div>
              <h3 className="font-bold text-sm text-charcoal">Occupancy by Parking Facility</h3>
              <p className="text-xs text-stone-500">Live occupied vs available slots per location</p>
            </div>
            <PatternBadge pattern="Database Synced" />
          </div>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.location_breakdown} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#78716c' }} interval={0} angle={-10} textAnchor="end" />
                <YAxis tick={{ fontSize: 11, fill: '#78716c' }} />
                <Tooltip
                  formatter={(value: any, name: any) => [value, name === 'available_slots' ? 'Available' : 'Occupied / Reserved']}
                  contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e7e5e4', fontSize: '12px' }}
                />
                <Bar dataKey="occupied_slots" fill="#d97706" stackId="a" name="Occupied" radius={[0, 0, 0, 0]} />
                <Bar dataKey="reserved_slots" fill="#f59e0b" stackId="a" name="Reserved" radius={[0, 0, 0, 0]} />
                <Bar dataKey="available_slots" fill="#e7e5e4" stackId="a" name="Available" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Slot Types breakdown */}
        <div className="bg-white rounded-xl border border-border-light p-5 shadow-subtle flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-border-light">
              <h3 className="font-bold text-sm text-charcoal">Slot Type Diversity</h3>
              <PatternBadge pattern="Factory Method" />
            </div>
            <div className="mt-3 h-48 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={3}
                  >
                    {pieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e7e5e4', fontSize: '12px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs pt-3 border-t border-border-light">
            {pieData.map((item, idx) => (
              <div key={item.name} className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }} />
                <span className="text-stone-600 truncate">{item.name}:</span>
                <span className="font-bold text-charcoal">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Locations & Recent Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Hubs Overview */}
        <div className="bg-white rounded-xl border border-border-light p-5 shadow-subtle">
          <div className="flex items-center justify-between pb-3 border-b border-border-light">
            <h3 className="font-bold text-sm text-charcoal">Parking Facilities</h3>
            <NavLink to="/parking" className="text-xs text-amber-700 hover:text-amber-800 font-semibold flex items-center gap-1">
              <span>View All Slots</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </NavLink>
          </div>

          <div className="mt-3 divide-y divide-border-light/60">
            {locations.slice(0, 4).map((loc) => (
              <div key={loc.id} className="py-3 flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-sm text-charcoal">{loc.name}</h4>
                  <div className="flex items-center gap-1 text-xs text-stone-500 mt-0.5">
                    <MapPin className="w-3 h-3 text-stone-400" />
                    <span>{loc.address}</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                    {loc.available_slots} / {loc.total_slots} Open
                  </span>
                  <span className="block text-[10px] text-stone-400 mt-0.5 font-medium">{loc.zone} Zone</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Actions & Undo Stream */}
        <div className="bg-white rounded-xl border border-border-light p-5 shadow-subtle">
          <div className="flex items-center justify-between pb-3 border-b border-border-light">
            <div>
              <h3 className="font-bold text-sm text-charcoal">Audit Activity Stream</h3>
              <p className="text-xs text-stone-500">Live Command pattern event log</p>
            </div>
            <NavLink to="/activity" className="text-xs text-amber-700 hover:text-amber-800 font-semibold flex items-center gap-1">
              <span>Activity History</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </NavLink>
          </div>

          <div className="mt-3 space-y-2.5">
            {stats.recent_activity.length === 0 ? (
              <p className="text-xs text-stone-400 py-6 text-center">No recent activity recorded.</p>
            ) : (
              stats.recent_activity.slice(0, 5).map((act) => (
                <div
                  key={act.id}
                  className="p-2.5 rounded-lg bg-stone-50 border border-stone-200/70 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-2 h-2 rounded-full bg-amber-500" />
                    <div>
                      <span className="font-bold text-charcoal">{act.action_type}</span>
                      <span className="text-stone-500 ml-1.5 font-mono text-[11px]">{act.reference_code}</span>
                      <div className="text-[11px] text-stone-400 mt-0.5">
                        {act.previous_state} → {act.resulting_state} • {formatDateTime(act.created_at)}
                      </div>
                    </div>
                  </div>
                  {act.undo_available && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-900 border border-amber-300">
                      Undoable
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
