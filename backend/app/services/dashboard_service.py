from decimal import Decimal
from typing import List, Dict
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.models import (
    ParkingLocation,
    ParkingSlot,
    Reservation,
    PaymentTransaction,
    ReservationAction,
)
from app.schemas.schemas import (
    DashboardStats,
    LocationOccupancyStat,
    ReservationActionOut,
)


class DashboardService:
    @staticmethod
    def get_stats(db: Session) -> DashboardStats:
        locations = db.query(ParkingLocation).all()
        slots = db.query(ParkingSlot).all()
        reservations = db.query(Reservation).all()

        total_locations = len(locations)
        total_slots = len(slots)
        available_slots = sum(1 for s in slots if s.availability_status == "Available")
        reserved_slots = sum(1 for s in slots if s.availability_status == "Reserved")
        occupied_slots = sum(1 for s in slots if s.availability_status == "Occupied")

        active_reservations = sum(1 for r in reservations if r.status in ["Pending", "Confirmed", "Active"])
        completed_reservations = sum(1 for r in reservations if r.status == "Completed")

        # Revenue
        revenue_sum = db.query(func.sum(PaymentTransaction.amount)).filter(
            PaymentTransaction.status == "SUCCESS"
        ).scalar()
        total_revenue = Decimal(str(revenue_sum)) if revenue_sum is not None else Decimal("0.00")

        # Occupancy %
        occupancy_percentage = 0.0
        if total_slots > 0:
            occupancy_percentage = round(((occupied_slots + reserved_slots) / total_slots) * 100, 1)

        # Location breakdown
        loc_breakdown: List[LocationOccupancyStat] = []
        for loc in locations:
            loc_slots = [s for s in slots if s.location_id == loc.id]
            t_s = len(loc_slots)
            a_s = sum(1 for s in loc_slots if s.availability_status == "Available")
            o_s = sum(1 for s in loc_slots if s.availability_status == "Occupied")
            r_s = sum(1 for s in loc_slots if s.availability_status == "Reserved")
            rate = round(((o_s + r_s) / t_s * 100), 1) if t_s > 0 else 0.0

            loc_breakdown.append(
                LocationOccupancyStat(
                    location_id=loc.id,
                    name=loc.name,
                    zone=loc.zone,
                    total_slots=t_s,
                    available_slots=a_s,
                    occupied_slots=o_s,
                    reserved_slots=r_s,
                    occupancy_rate=rate,
                )
            )

        # Slot type breakdown
        slot_type_breakdown: Dict[str, int] = {}
        for s in slots:
            slot_type_breakdown[s.slot_type] = slot_type_breakdown.get(s.slot_type, 0) + 1

        # Recent activities
        recent_actions = db.query(ReservationAction).order_by(ReservationAction.id.desc()).limit(8).all()
        activity_list: List[ReservationActionOut] = []
        for a in recent_actions:
            ref = a.reservation.reference_code if a.reservation else "Unknown"
            driver = a.reservation.driver_name if a.reservation else "Unknown"
            activity_list.append(
                ReservationActionOut(
                    id=a.id,
                    reservation_id=a.reservation_id,
                    action_type=a.action_type,
                    previous_state=a.previous_state,
                    resulting_state=a.resulting_state,
                    success=a.success,
                    undo_available=a.undo_available,
                    created_at=a.created_at,
                    reference_code=ref,
                    driver_name=driver,
                )
            )

        return DashboardStats(
            total_locations=total_locations,
            total_slots=total_slots,
            available_slots=available_slots,
            reserved_slots=reserved_slots,
            occupied_slots=occupied_slots,
            active_reservations=active_reservations,
            completed_reservations=completed_reservations,
            total_revenue=total_revenue,
            occupancy_percentage=occupancy_percentage,
            location_breakdown=loc_breakdown,
            slot_type_breakdown=slot_type_breakdown,
            recent_activity=activity_list,
        )
