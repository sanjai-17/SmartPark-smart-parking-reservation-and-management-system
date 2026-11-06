import uuid
import datetime
import json
from typing import List, Optional
from decimal import Decimal
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.models import (
    Reservation,
    ParkingSlot,
    ParkingLocation,
    ReservationAction,
    PaymentTransaction,
)
from app.schemas.schemas import ReservationCreate, ReservationOut
from app.patterns.state import InvalidTransitionError
from app.patterns.command import (
    CommandInvoker,
    ConfirmCommand,
    CheckInCommand,
    CheckOutCommand,
    CancelCommand,
    CommandExecutionError,
)
from app.patterns.strategy import (
    PricingSession,
    get_pricing_strategy,
    UnknownPricingStrategyError,
)
from app.patterns.observer import create_default_subject


class ReservationService:
    @staticmethod
    def _invoker() -> CommandInvoker:
        return CommandInvoker()

    @staticmethod
    def generate_reference_code() -> str:
        date_str = datetime.datetime.now(datetime.timezone.utc).strftime("%Y%m%d")
        rand_suffix = uuid.uuid4().hex[:5].upper()
        return f"SPK-{date_str}-{rand_suffix}"

    @classmethod
    def create_reservation(cls, db: Session, data: ReservationCreate) -> Reservation:
        # Atomic lock / slot availability check
        slot = db.query(ParkingSlot).filter(ParkingSlot.id == data.slot_id).with_for_update().first()
        if not slot:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Parking slot with ID {data.slot_id} does not exist."
            )

        if slot.availability_status != "Available":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Slot '{slot.slot_code}' is currently '{slot.availability_status}' and cannot be reserved."
            )

        location = db.query(ParkingLocation).filter(ParkingLocation.id == slot.location_id).first()
        if not location:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Location with ID {slot.location_id} not found."
            )

        # Calculate initial estimate using Strategy pattern
        try:
            strategy = get_pricing_strategy(data.pricing_strategy)
        except UnknownPricingStrategyError as e:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=str(e),
            )

        pricing_session = PricingSession(
            duration_hours=data.duration_hours,
            base_rate=slot.base_rate,
            vehicle_type=data.vehicle_type,
            location_zone=location.zone,
        )
        pricing_res = strategy.calculate(pricing_session)

        # Hold slot
        slot.availability_status = "Reserved"

        ref_code = cls.generate_reference_code()
        reservation = Reservation(
            reference_code=ref_code,
            driver_name=data.driver_name.strip(),
            driver_email=data.driver_email.strip(),
            driver_phone=data.driver_phone.strip(),
            vehicle_type=data.vehicle_type,
            location_id=location.id,
            slot_id=slot.id,
            duration_hours=data.duration_hours,
            pricing_strategy=strategy.name,
            estimated_amount=pricing_res.final_amount,
            status="Pending",
        )
        db.add(reservation)
        db.flush()

        # Record initial creation in audit history
        action_record = ReservationAction(
            reservation_id=reservation.id,
            action_type="CREATE",
            previous_state="None",
            resulting_state="Pending",
            success=True,
            undo_available=False,  # Creation cannot be undone; use Cancel instead
            snapshot_data=json.dumps({"prev_slot_status": "Available", "resulting_slot_status": "Reserved"}),
        )
        db.add(action_record)
        db.commit()
        db.refresh(reservation)

        # Notify observers of initial pending reservation
        subject = create_default_subject()
        subject.notify(
            event_type="CREATE",
            reservation_id=reservation.id,
            reference_code=reservation.reference_code,
            driver_name=reservation.driver_name,
            driver_email=reservation.driver_email,
            driver_phone=reservation.driver_phone,
            slot_code=slot.slot_code,
            location_name=location.name,
            current_state=reservation.status,
            db=db,
        )
        db.commit()

        return reservation

    @classmethod
    def confirm_reservation(cls, db: Session, reservation_id: int) -> Reservation:
        reservation = db.query(Reservation).filter(Reservation.id == reservation_id).first()
        if not reservation:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reservation not found.")

        invoker = cls._invoker()
        try:
            invoker.run(ConfirmCommand(reservation_id), db)
            db.commit()
            db.refresh(reservation)
        except InvalidTransitionError as e:
            db.rollback()
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
        except CommandExecutionError as e:
            db.rollback()
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

        return reservation

    @classmethod
    def check_in_reservation(cls, db: Session, reservation_id: int) -> Reservation:
        reservation = db.query(Reservation).filter(Reservation.id == reservation_id).first()
        if not reservation:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reservation not found.")

        invoker = cls._invoker()
        try:
            invoker.run(CheckInCommand(reservation_id), db)
            db.commit()
            db.refresh(reservation)
        except InvalidTransitionError as e:
            db.rollback()
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
        except CommandExecutionError as e:
            db.rollback()
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

        return reservation

    @classmethod
    def check_out_reservation(cls, db: Session, reservation_id: int) -> Reservation:
        reservation = db.query(Reservation).filter(Reservation.id == reservation_id).first()
        if not reservation:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reservation not found.")

        invoker = cls._invoker()
        try:
            invoker.run(CheckOutCommand(reservation_id), db)
            db.commit()
            db.refresh(reservation)
        except InvalidTransitionError as e:
            db.rollback()
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
        except CommandExecutionError as e:
            db.rollback()
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

        return reservation

    @classmethod
    def cancel_reservation(cls, db: Session, reservation_id: int) -> Reservation:
        reservation = db.query(Reservation).filter(Reservation.id == reservation_id).first()
        if not reservation:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reservation not found.")

        invoker = cls._invoker()
        try:
            invoker.run(CancelCommand(reservation_id), db)
            db.commit()
            db.refresh(reservation)
        except InvalidTransitionError as e:
            db.rollback()
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
        except CommandExecutionError as e:
            db.rollback()
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

        return reservation

    @classmethod
    def undo_last_action(cls, db: Session, reservation_id: int) -> Reservation:
        reservation = db.query(Reservation).filter(Reservation.id == reservation_id).first()
        if not reservation:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reservation not found.")

        invoker = cls._invoker()
        try:
            invoker.undo_last(reservation_id, db)
            db.commit()
            db.refresh(reservation)
        except CommandExecutionError as e:
            db.rollback()
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

        return reservation

    @staticmethod
    def get_reservations(db: Session, status_filter: Optional[str] = None) -> List[Reservation]:
        query = db.query(Reservation)
        if status_filter:
            query = query.filter(Reservation.status == status_filter.strip())
        return query.order_by(Reservation.id.desc()).all()

    @staticmethod
    def get_reservation_by_id(db: Session, reservation_id: int) -> Optional[Reservation]:
        return db.query(Reservation).filter(Reservation.id == reservation_id).first()

    @staticmethod
    def enrich_reservation_out(res: Reservation, db: Session) -> ReservationOut:
        # Check if undo is available
        last_undoable = db.query(ReservationAction).filter(
            ReservationAction.reservation_id == res.id,
            ReservationAction.undo_available == True,
            ReservationAction.success == True,
        ).first()

        # Check payment status
        latest_payment = db.query(PaymentTransaction).filter(
            PaymentTransaction.reservation_id == res.id,
            PaymentTransaction.status == "SUCCESS"
        ).first()

        payment_status = "PAID" if latest_payment else "UNPAID"

        return ReservationOut(
            id=res.id,
            reference_code=res.reference_code,
            driver_name=res.driver_name,
            driver_email=res.driver_email,
            driver_phone=res.driver_phone,
            vehicle_type=res.vehicle_type,
            location_id=res.location_id,
            slot_id=res.slot_id,
            duration_hours=res.duration_hours,
            pricing_strategy=res.pricing_strategy,
            estimated_amount=res.estimated_amount,
            final_amount=res.final_amount,
            status=res.status,
            created_at=res.created_at,
            updated_at=res.updated_at,
            checked_in_at=res.checked_in_at,
            checked_out_at=res.checked_out_at,
            location_name=res.location.name if res.location else None,
            location_zone=res.location.zone if res.location else None,
            slot_code=res.slot.slot_code if res.slot else None,
            slot_type=res.slot.slot_type if res.slot else None,
            base_rate=res.slot.base_rate if res.slot else None,
            undo_eligible=bool(last_undoable),
            payment_status=payment_status,
        )
