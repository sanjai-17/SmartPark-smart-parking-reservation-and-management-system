import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './components/common/ToastProvider';
import { AppShell } from './layouts/AppShell';

import { DashboardPage } from './pages/DashboardPage';
import { ParkingPage } from './pages/ParkingPage';
import { ReservationsPage } from './pages/ReservationsPage';
import { ReservationDetailPage } from './pages/ReservationDetailPage';
import { ActivityPage } from './pages/ActivityPage';
import { NotificationsPage } from './pages/NotificationsPage';

import { AdminOverviewPage } from './pages/admin/AdminOverviewPage';
import { AdminLocationsPage } from './pages/admin/AdminLocationsPage';
import { AdminSlotsPage } from './pages/admin/AdminSlotsPage';
import { AdminPaymentsPage } from './pages/admin/AdminPaymentsPage';
import { NotFoundPage } from './pages/NotFoundPage';

export const App: React.FC = () => {
  return (
    <ToastProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<AppShell />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="parking" element={<ParkingPage />} />
            <Route path="reservations" element={<ReservationsPage />} />
            <Route path="reservations/:id" element={<ReservationDetailPage />} />
            <Route path="activity" element={<ActivityPage />} />
            <Route path="notifications" element={<NotificationsPage />} />

            {/* Admin Routes */}
            <Route path="admin" element={<AdminOverviewPage />} />
            <Route path="admin/locations" element={<AdminLocationsPage />} />
            <Route path="admin/slots" element={<AdminSlotsPage />} />
            <Route path="admin/payments" element={<AdminPaymentsPage />} />

            {/* Catch-all 404 */}
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  );
};

export default App;
