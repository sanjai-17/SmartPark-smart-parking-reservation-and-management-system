import axios, { AxiosError } from 'axios';
import {
  DashboardStats,
  ParkingLocation,
  ParkingSlot,
  Reservation,
  PricingEstimateRequest,
  PricingEstimateResponse,
  PaymentTransaction,
  NotificationRecord,
  ReservationAction,
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

export function extractErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;
    if (data) {
      if (typeof data.detail === 'string') return data.detail;
      if (Array.isArray(data.detail)) {
        return data.detail.map((d: any) => d.msg || JSON.stringify(d)).join('; ');
      }
      if (data.message) return data.message;
      if (data.error) return data.error;
    }
    return error.message || 'Network request failed';
  }
  return error instanceof Error ? error.message : 'An unexpected error occurred';
}

// API Services
export const parkingApi = {
  // Dashboard
  getDashboardStats: async (): Promise<DashboardStats> => {
    const res = await apiClient.get<DashboardStats>('/dashboard/stats');
    return res.data;
  },

  // Locations
  getLocations: async (): Promise<ParkingLocation[]> => {
    const res = await apiClient.get<ParkingLocation[]>('/locations');
    return res.data;
  },
  getLocation: async (id: number): Promise<ParkingLocation> => {
    const res = await apiClient.get<ParkingLocation>(`/locations/${id}`);
    return res.data;
  },
  createLocation: async (data: { name: string; address: string; zone: string; description?: string }): Promise<ParkingLocation> => {
    const res = await apiClient.post<ParkingLocation>('/locations', data);
    return res.data;
  },
  getLocationSlots: async (locationId: number): Promise<ParkingSlot[]> => {
    const res = await apiClient.get<ParkingSlot[]>(`/locations/${locationId}/slots`);
    return res.data;
  },

  // Slots
  getSlots: async (params?: {
    location_id?: number;
    slot_type?: string;
    availability?: string;
    min_rate?: number;
    max_rate?: number;
  }): Promise<ParkingSlot[]> => {
    const res = await apiClient.get<ParkingSlot[]>('/slots', { params });
    return res.data;
  },
  getSlot: async (id: number): Promise<ParkingSlot> => {
    const res = await apiClient.get<ParkingSlot>(`/slots/${id}`);
    return res.data;
  },
  createSlot: async (data: {
    slot_code: string;
    location_id: number;
    slot_type: string;
    base_rate?: number;
    description?: string;
    features?: string;
  }): Promise<ParkingSlot> => {
    const res = await apiClient.post<ParkingSlot>('/slots', data);
    return res.data;
  },

  // Pricing
  estimatePricing: async (data: PricingEstimateRequest): Promise<PricingEstimateResponse> => {
    const res = await apiClient.post<PricingEstimateResponse>('/pricing/estimate', data);
    return res.data;
  },

  // Reservations
  getReservations: async (status?: string): Promise<Reservation[]> => {
    const res = await apiClient.get<Reservation[]>('/reservations', {
      params: status ? { status } : undefined,
    });
    return res.data;
  },
  getReservation: async (id: number): Promise<Reservation> => {
    const res = await apiClient.get<Reservation>(`/reservations/${id}`);
    return res.data;
  },
  createReservation: async (data: {
    slot_id: number;
    driver_name: string;
    driver_email: string;
    driver_phone: string;
    vehicle_type: string;
    duration_hours: number;
    pricing_strategy: string;
  }): Promise<Reservation> => {
    const res = await apiClient.post<Reservation>('/reservations', data);
    return res.data;
  },
  confirmReservation: async (id: number): Promise<Reservation> => {
    const res = await apiClient.post<Reservation>(`/reservations/${id}/confirm`);
    return res.data;
  },
  checkInReservation: async (id: number): Promise<Reservation> => {
    const res = await apiClient.post<Reservation>(`/reservations/${id}/check-in`);
    return res.data;
  },
  checkOutReservation: async (id: number): Promise<Reservation> => {
    const res = await apiClient.post<Reservation>(`/reservations/${id}/check-out`);
    return res.data;
  },
  cancelReservation: async (id: number): Promise<Reservation> => {
    const res = await apiClient.post<Reservation>(`/reservations/${id}/cancel`);
    return res.data;
  },
  undoReservationAction: async (id: number): Promise<Reservation> => {
    const res = await apiClient.post<Reservation>(`/reservations/${id}/undo`);
    return res.data;
  },

  // Payments
  processPayment: async (
    reservationId: number,
    data: { payment_method: string; account_identifier: string; amount?: number }
  ): Promise<PaymentTransaction> => {
    const res = await apiClient.post<PaymentTransaction>(`/reservations/${reservationId}/payments`, data);
    return res.data;
  },
  getPayments: async (): Promise<PaymentTransaction[]> => {
    const res = await apiClient.get<PaymentTransaction[]>('/payments');
    return res.data;
  },

  // Notifications & Activity
  getNotifications: async (reservationId?: number): Promise<NotificationRecord[]> => {
    const res = await apiClient.get<NotificationRecord[]>('/notifications', {
      params: reservationId ? { reservation_id: reservationId } : undefined,
    });
    return res.data;
  },
  getAllActivity: async (limit = 50): Promise<ReservationAction[]> => {
    const res = await apiClient.get<ReservationAction[]>('/activity', { params: { limit } });
    return res.data;
  },
  getReservationActivity: async (reservationId: number): Promise<ReservationAction[]> => {
    const res = await apiClient.get<ReservationAction[]>(`/reservations/${reservationId}/activity`);
    return res.data;
  },
};
