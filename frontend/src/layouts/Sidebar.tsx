import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Compass,
  CalendarCheck,
  History,
  Bell,
  SlidersHorizontal,
  MapPin,
  Grid,
  CreditCard,
  ChevronDown,
  Layers,
} from 'lucide-react';

interface SidebarProps {
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onCloseMobile }) => {
  const location = useLocation();
  const isAdminActive = location.pathname.startsWith('/admin');

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Find Parking', path: '/parking', icon: Compass },
    { label: 'Reservations', path: '/reservations', icon: CalendarCheck },
    { label: 'Activity & Undo', path: '/activity', icon: History },
    { label: 'Notifications', path: '/notifications', icon: Bell },
  ];

  const adminItems = [
    { label: 'Admin Overview', path: '/admin', icon: SlidersHorizontal },
    { label: 'Manage Locations', path: '/admin/locations', icon: MapPin },
    { label: 'Manage Slots (Factory)', path: '/admin/slots', icon: Grid },
    { label: 'Payment Ledger', path: '/admin/payments', icon: CreditCard },
  ];

  return (
    <aside className="w-64 h-full bg-white border-r border-border-light flex flex-col select-none">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-6 border-b border-border-light/60">
        <NavLink to="/dashboard" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-charcoal text-white flex items-center justify-center font-bold text-base shadow-sm">
            <span className="text-amber-400">P</span>
          </div>
          <div>
            <span className="font-semibold text-charcoal text-base tracking-tight">SmartPark</span>
            <span className="ml-1 text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-stone-100 text-stone-600 border border-stone-200">GoF</span>
          </div>
        </NavLink>
      </div>

      {/* Navigation List */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        <div>
          <div className="px-3 mb-2 text-[11px] font-medium tracking-wider text-stone-400 uppercase">
            Platform
          </div>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={onCloseMobile}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-stone-100 text-charcoal font-semibold shadow-subtle'
                        : 'text-stone-600 hover:text-charcoal hover:bg-stone-50'
                    }`
                  }
                >
                  <Icon className="w-4 h-4 text-stone-500" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        <div>
          <div className="px-3 mb-2 text-[11px] font-medium tracking-wider text-stone-400 uppercase flex items-center justify-between">
            <span>Administration</span>
            <span className="text-[10px] lowercase text-amber-700 bg-amber-50 px-1 rounded">creator</span>
          </div>
          <nav className="space-y-1">
            {adminItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/admin'}
                  onClick={onCloseMobile}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-amber-50/80 text-amber-950 font-semibold border border-amber-200/50'
                        : 'text-stone-600 hover:text-charcoal hover:bg-stone-50'
                    }`
                  }
                >
                  <Icon className="w-4 h-4 text-stone-500" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>
      </div>

      {/* College Project Pattern Callout Footer */}
      <div className="p-4 border-t border-border-light/60 bg-canvas-card">
        <div className="p-3 rounded-lg bg-stone-50 border border-border-light text-xs text-stone-600 space-y-1.5">
          <div className="font-semibold text-charcoal flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-amber-600" />
            <span>6 GoF Patterns Active</span>
          </div>
          <p className="text-[11px] leading-relaxed text-stone-500">
            Factory Method, Strategy, State, Observer, Command & Adapter.
          </p>
        </div>
      </div>
    </aside>
  );
};
