from decimal import Decimal
from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, EmailStr, ConfigDict


# =====================================================================
# Location Schemas
# =====================================================================

class LocationBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    address: str = Field(..., min_length=5, max_length=255)
    zone: str = Field(..., description="Suburb, City Centre, or Airport")
    description: Optional[str] = None


class LocationCreate(LocationBase):
    pass


class LocationOut(LocationBase):
    id: int
    created_at: datetime
    total_slots: int = 0
    available_slots: int = 0

    model_config = ConfigDict(from_attributes=True)


# =====================================================================
# Slot Schemas
# =====================================================================

class SlotBase(BaseModel):
    slot_code: str = Field(..., min_length=1, max_length=50)
    location_id: int
    slot_type: str = Field(..., description="Regular, Electric Vehicle, Disabled, or Premium")
    base_rate: Optional[Decimal] = Field(None, ge=0, description="Optional custom base rate in INR")
    description: Optional[str] = None
    features: Optional[str] = None


class SlotCreate(SlotBase):
    pass


class SlotOut(BaseModel):
    id: int
    slot_code: str
    location_id: int
    slot_type: str
    base_rate: Decimal
    availability_status: str
    description: Optional[str] = None
    features: Optional[str] = None
    created_at: datetime
    location_name: Optional[str] = None
    location_zone: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


# =====================================================================
# Pricing Schemas
# =====================================================================

class PricingEstimateRequest(BaseModel):
    duration_hours: Decimal = Field(..., gt=0, le=720, description="Parking duration in hours")
    base_rate: Decimal = Field(..., ge=0, description="Base hourly rate in INR")
    pricing_strategy: str = Field(default="Duration", description="Duration, VehicleType, or Location")
    vehicle_type: str = Field(default="Car", description="Bike, Car, or SUV")
    location_zone: str = Field(default="City Centre", description="Suburb, City Centre, or Airport")


class PricingEstimateResponse(BaseModel):
    strategy_name: str
    duration_hours: Decimal
    base_rate: Decimal
    final_amount: Decimal
    breakdown: Dict[str, Any]
    formula_description: str


# =====================================================================
# Reservation Schemas
# =====================================================================

class ReservationCreate(BaseModel):
    slot_id: int
    driver_name: str = Field(..., min_length=2, max_length=100)
    driver_email: EmailStr
    driver_phone: str = Field(..., min_length=7, max_length=20)
    vehicle_type: str = Field(default="Car", description="Bike, Car, or SUV")
    duration_hours: Decimal = Field(..., gt=0, le=720)
    pricing_strategy: str = Field(default="Duration", description="Duration, VehicleType, or Location")


class ReservationOut(BaseModel):
    id: int
    reference_code: str
    driver_name: str
    driver_email: str
    driver_phone: str
    vehicle_type: str
    location_id: int
    slot_id: int
    duration_hours: Decimal
    pricing_strategy: str
    estimated_amount: Decimal
    final_amount: Optional[Decimal] = None
    status: str
    created_at: datetime
    updated_at: datetime
    checked_in_at: Optional[datetime] = None
    checked_out_at: Optional[datetime] = None
    location_name: Optional[str] = None
    location_zone: Optional[str] = None
    slot_code: Optional[str] = None
    slot_type: Optional[str] = None
    base_rate: Optional[Decimal] = None
    undo_eligible: bool = False
    payment_status: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


# =====================================================================
# Payment Schemas
# =====================================================================

class PaymentRequest(BaseModel):
    payment_method: str = Field(..., description="UPI, Card, or Wallet")
    account_identifier: str = Field(..., min_length=3, description="VPA, dummy card token, or wallet ID")
    amount: Optional[Decimal] = Field(None, ge=0, description="Optional override; server uses reservation amount by default")


class PaymentOut(BaseModel):
    id: int
    transaction_reference: str
    reservation_id: int
    payment_method: str
    amount: Decimal
    status: str
    gateway_reference: Optional[str] = None
    created_at: datetime
    driver_name: Optional[str] = None
    reference_code: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


# =====================================================================
# Notification & Action Schemas
# =====================================================================

class NotificationOut(BaseModel):
    id: int
    reservation_id: int
    notification_type: str
    message: str
    delivery_status: str
    created_at: datetime
    reference_code: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class ReservationActionOut(BaseModel):
    id: int
    reservation_id: int
    action_type: str
    previous_state: str
    resulting_state: str
    success: bool
    undo_available: bool
    created_at: datetime
    reference_code: Optional[str] = None
    driver_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


# =====================================================================
# Dashboard Stats Schemas
# =====================================================================

class LocationOccupancyStat(BaseModel):
    location_id: int
    name: str
    zone: str
    total_slots: int
    available_slots: int
    occupied_slots: int
    reserved_slots: int
    occupancy_rate: float


class DashboardStats(BaseModel):
    total_locations: int
    total_slots: int
    available_slots: int
    reserved_slots: int
    occupied_slots: int
    active_reservations: int
    completed_reservations: int
    total_revenue: Decimal
    occupancy_percentage: float
    location_breakdown: List[LocationOccupancyStat]
    slot_type_breakdown: Dict[str, int]
    recent_activity: List[ReservationActionOut]
