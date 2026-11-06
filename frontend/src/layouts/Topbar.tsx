import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { Menu, Bell, Shield, Radio, CheckCircle, ExternalLink } from 'lucide-react';
import { parkingApi } from '../api/client';

interface TopbarProps {
  onOpenMobileMenu: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({ onOpenMobileMenu }) => {
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isBackendHealthy, setIsBackendHealthy] = useState<boolean>(true);

  useEffect(() => {
    let mounted = true;
    const fetchStatus = async () => {
      try {
        const notifs = await parkingApi.getNotifications();
        if (mounted) {
          setUnreadCount(notifs.length);
          setIsBackendHealthy(true);
        }
      } catch {
        if (mounted) {
          setIsBackendHealthy(false);
        }
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 15000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <header className="h-16 bg-white border-b border-border-light flex items-center justify-between px-4 sm:px-8 sticky top-0 z-20">
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileMenu}
          className="lg:hidden p-2 text-stone-500 hover:text-charcoal hover:bg-stone-100 rounded-lg transition-colors"
          aria-label="Toggle menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            {isBackendHealthy ? 'Backend Connected' : 'API Reconnecting...'}
          </span>
          <span className="hidden md:inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-stone-100 text-stone-700 border border-stone-200">
            <Radio className="w-3 h-3 text-amber-600" />
            Simulation Mode • INR (₹)
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <a
          href="http://localhost:8000/docs"
          target="_blank"
          rel="noreferrer"
          className="hidden sm:flex items-center gap-1 text-xs text-stone-500 hover:text-charcoal font-medium px-2.5 py-1.5 rounded-md hover:bg-stone-50 transition-colors"
        >
          <span>API Docs</span>
          <ExternalLink className="w-3 h-3" />
        </a>

        <NavLink
          to="/notifications"
          className="relative p-2 text-stone-500 hover:text-charcoal hover:bg-stone-50 rounded-lg transition-colors"
          title="Simulated Notifications"
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-500 ring-2 ring-white" />
          )}
        </NavLink>

        <div className="h-4 w-[1px] bg-stone-200 hidden sm:block" />

        <div className="flex items-center gap-2 text-xs text-stone-600">
          <div className="w-7 h-7 rounded-full bg-stone-100 border border-stone-200 flex items-center justify-center font-medium text-stone-700">
            SP
          </div>
          <span className="hidden sm:inline font-medium text-stone-800">College Demo</span>
        </div>
      </div>
    </header>
  );
};
