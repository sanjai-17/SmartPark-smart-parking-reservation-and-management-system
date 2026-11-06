export type SlotType = 'Regular' | 'Electric Vehicle' | 'Disabled' | 'Premium';

export type AvailabilityStatus = 'Available' | 'Reserved' | 'Occupied' | 'Unavailable';

export type ReservationStatus = 'Pending' | 'Confirmed' | 'Active' | 'Completed' | 'Cancelled';

export type PricingStrategyType = 'Duration' | 'VehicleType' | 'Location';

export type VehicleType = 'Bike' | 'Car' | 'SUV';

export type LocationZone = 'Suburb' | 'City Centre' | 'Airport';

export type PaymentMethod = 'UPI' | 'Card' | 'Wallet';

export interface ParkingLocation {
  id: number;
  name: string;
  address: string;
  zone: LocationZone;
  description?: string;
  created_at: string;
  total_slots: number;
  available_slots: number;
}

export interface ParkingSlot {
  id: number;
  slot_code: string;
  location_id: number;
  slot_type: SlotType;
  base_rate: number | string;
  availability_status: AvailabilityStatus;
  description?: string;
  features?: string;
  created_at: string;
  location_name?: string;
  location_zone?: LocationZone;
}

export interface Reservation {
  id: number;
  reference_code: string;
  driver_name: string;
  driver_email: string;
  driver_phone: string;
  vehicle_type: VehicleType;
  location_id: number;
  slot_id: number;
  duration_hours: number;
  pricing_strategy: PricingStrategyType;
  estimated_amount: number | string;
  final_amount?: number | string;
  status: ReservationStatus;
  created_at: string;
  updated_at: string;
  checked_in_at?: string;
  checked_out_at?: string;
  location_name?: string;
  location_zone?: LocationZone;
  slot_code?: string;
  slot_type?: SlotType;
  base_rate?: number | string;
  undo_eligible: boolean;
  payment_status?: 'PAID' | 'UNPAID';
}

export interface PricingEstimateRequest {
  duration_hours: number;
  base_rate: number;
  pricing_strategy: PricingStrategyType;
  vehicle_type: VehicleType;
  location_zone: LocationZone;
}

export interface PricingEstimateResponse {
  strategy_name: string;
  duration_hours: number;
  base_rate: number;
  final_amount: number;
  breakdown: Record<string, any>;
  formula_description: string;
}

export interface PaymentTransaction {
  id: number;
  transaction_reference: string;
  reservation_id: number;
  payment_method: PaymentMethod;
  amount: number | string;
  status: 'SUCCESS' | 'FAILED';
  gateway_reference?: string;
  created_at: string;
  driver_name?: string;
  reference_code?: string;
}

export interface NotificationRecord {
  id: number;
  reservation_id: number;
  notification_type: 'SMS' | 'Email' | 'DisplayBoard';
  message: string;
  delivery_status: 'DELIVERED' | 'FAILED' | 'QUEUED';
  created_at: string;
  reference_code?: string;
}

export interface ReservationAction {
  id: number;
  reservation_id: number;
  action_type: 'CREATE' | 'CONFIRM' | 'CHECK_IN' | 'CHECK_OUT' | 'CANCEL' | 'UNDO';
  previous_state: string;
  resulting_state: string;
  success: boolean;
  undo_available: boolean;
  created_at: string;
  reference_code?: string;
  driver_name?: string;
}

export interface LocationOccupancyStat {
  location_id: number;
  name: string;
  zone: string;
  total_slots: number;
  available_slots: number;
  occupied_slots: number;
  reserved_slots: number;
  occupancy_rate: number;
}

export interface DashboardStats {
  total_locations: number;
  total_slots: number;
  available_slots: number;
  reserved_slots: number;
  occupied_slots: number;
  active_reservations: number;
  completed_reservations: number;
  total_revenue: number | string;
  occupancy_percentage: number;
  location_breakdown: LocationOccupancyStat[];
  slot_type_breakdown: Record<string, number>;
  recent_activity: ReservationAction[];
}
