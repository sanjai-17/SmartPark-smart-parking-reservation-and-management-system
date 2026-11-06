import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Compass } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
      <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 mb-4 font-bold text-2xl font-mono">
        404
      </div>
      <h1 className="text-xl font-bold text-charcoal">Page Not Found</h1>
      <p className="mt-1 text-xs text-stone-500 max-w-sm">
        The requested parking bay or resource route does not exist in the system.
      </p>
      <div className="mt-5 flex items-center gap-3">
        <NavLink
          to="/dashboard"
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-charcoal text-white hover:bg-stone-800 transition-colors shadow-sm"
        >
          <Home className="w-3.5 h-3.5" />
          <span>Dashboard</span>
        </NavLink>
        <NavLink
          to="/parking"
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-white border border-border-light text-stone-700 hover:bg-stone-50 transition-colors"
        >
          <Compass className="w-3.5 h-3.5" />
          <span>Find Parking</span>
        </NavLink>
      </div>
    </div>
  );
};
