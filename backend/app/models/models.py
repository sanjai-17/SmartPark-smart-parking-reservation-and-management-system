import datetime
from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    Numeric,
    DateTime,
    Boolean,
    ForeignKey,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship
from app.database.session import Base


def utcnow():
    return datetime.datetime.now(datetime.timezone.utc)


class ParkingLocation(Base):
    __tablename__ = "parking_locations"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(100), nullable=False)
    address = Column(String(255), nullable=False)
    zone = Column(String(50), nullable=False)  # "Suburb", "City Centre", "Airport"
    description = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow)

    slots = relationship("ParkingSlot", back_populates="location", cascade="all, delete-orphan")
    reservations = relationship("Reservation", back_populates="location")


class ParkingSlot(Base):
    __tablename__ = "parking_slots"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    slot_code = Column(String(50), nullable=False)
    location_id = Column(Integer, ForeignKey("parking_locations.id", ondelete="CASCADE"), nullable=False)
    slot_type = Column(String(50), nullable=False)  # "Regular", "Electric Vehicle", "Disabled", "Premium"
    base_rate = Column(Numeric(10, 2), nullable=False)
    availability_status = Column(String(50), nullable=False, default="Available")  # "Available", "Reserved", "Occupied", "Unavailable"
    description = Column(Text, nullable=True)
    features = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow)

    location = relationship("ParkingLocation", back_populates="slots")
    reservations = relationship("Reservation", back_populates="slot")

    __table_args__ = (
        UniqueConstraint("location_id", "slot_code", name="uq_location_slot_code"),
    )


class Reservation(Base):
    __tablename__ = "reservations"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    reference_code = Column(String(30), unique=True, index=True, nullable=False)
    driver_name = Column(String(100), nullable=False)
    driver_email = Column(String(100), nullable=False)
    driver_phone = Column(String(30), nullable=False)
    vehicle_type = Column(String(30), nullable=False)  # "Bike", "Car", "SUV"
    location_id = Column(Integer, ForeignKey("parking_locations.id"), nullable=False)
    slot_id = Column(Integer, ForeignKey("parking_slots.id"), nullable=False)
    duration_hours = Column(Numeric(5, 2), nullable=False)
    pricing_strategy = Column(String(50), nullable=False)  # "Duration", "VehicleType", "Location"
    estimated_amount = Column(Numeric(10, 2), nullable=False)
    final_amount = Column(Numeric(10, 2), nullable=True)
    status = Column(String(30), nullable=False, default="Pending")  # "Pending", "Confirmed", "Active", "Completed", "Cancelled"
    created_at = Column(DateTime(timezone=True), default=utcnow)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)
    checked_in_at = Column(DateTime(timezone=True), nullable=True)
    checked_out_at = Column(DateTime(timezone=True), nullable=True)

    location = relationship("ParkingLocation", back_populates="reservations")
    slot = relationship("ParkingSlot", back_populates="reservations")
    payments = relationship("PaymentTransaction", back_populates="reservation", cascade="all, delete-orphan")
    notifications = relationship("NotificationRecord", back_populates="reservation", cascade="all, delete-orphan")
    actions = relationship("ReservationAction", back_populates="reservation", cascade="all, delete-orphan")


class PaymentTransaction(Base):
    __tablename__ = "payment_transactions"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    transaction_reference = Column(String(64), unique=True, index=True, nullable=False)
    reservation_id = Column(Integer, ForeignKey("reservations.id", ondelete="CASCADE"), nullable=False)
    payment_method = Column(String(30), nullable=False)  # "UPI", "Card", "Wallet"
    amount = Column(Numeric(10, 2), nullable=False)
    status = Column(String(30), nullable=False)  # "SUCCESS", "FAILED"
    gateway_reference = Column(String(100), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow)

    reservation = relationship("Reservation", back_populates="payments")


class NotificationRecord(Base):
    __tablename__ = "notification_records"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    reservation_id = Column(Integer, ForeignKey("reservations.id", ondelete="CASCADE"), nullable=False)
    notification_type = Column(String(30), nullable=False)  # "SMS", "Email", "DisplayBoard"
    message = Column(Text, nullable=False)
    delivery_status = Column(String(30), nullable=False)  # "DELIVERED", "FAILED", "QUEUED"
    created_at = Column(DateTime(timezone=True), default=utcnow)

    reservation = relationship("Reservation", back_populates="notifications")


class ReservationAction(Base):
    __tablename__ = "reservation_actions"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    reservation_id = Column(Integer, ForeignKey("reservations.id", ondelete="CASCADE"), nullable=False)
    action_type = Column(String(50), nullable=False)  # "CONFIRM", "CHECK_IN", "CHECK_OUT", "CANCEL", "UNDO"
    previous_state = Column(String(50), nullable=False)
    resulting_state = Column(String(50), nullable=False)
    success = Column(Boolean, nullable=False, default=True)
    undo_available = Column(Boolean, nullable=False, default=False)
    snapshot_data = Column(Text, nullable=True)  # JSON serialized snapshot of previous state for reliable undo
    created_at = Column(DateTime(timezone=True), default=utcnow)

    reservation = relationship("Reservation", back_populates="actions")
