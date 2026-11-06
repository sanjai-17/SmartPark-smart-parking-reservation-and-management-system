import json
import logging
from abc import ABC, abstractmethod
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session

from app.models.models import Reservation, ParkingSlot, ReservationAction
from app.patterns.state.reservation_state import (
    ReservationLifecycleContext,
    InvalidTransitionError,
)
from app.patterns.observer.notification_observer import create_default_subject

logger = logging.getLogger(__name__)


class CommandExecutionError(Exception):
    """Raised when command execution or undo fails."""
    pass


class ReservationCommand(ABC):
    """
    Abstract Command in the Command pattern.
    Encapsulates a reservation action as an object, allowing execution and reversal (undo).
    """
    def __init__(self, reservation_id: int):
        self.reservation_id = reservation_id
        self.action_name: str = "GENERIC_ACTION"
        self.prev_state: Optional[str] = None
        self.resulting_state: Optional[str] = None
        self.prev_slot_status: Optional[str] = None
        self.resulting_slot_status: Optional[str] = None
        self.snapshot_data: Dict[str, Any] = {}

    @abstractmethod
    def execute(self, db: Session) -> bool:
        """Executes the action on the reservation, updates DB models, and records snapshot."""
        pass

    @abstractmethod
    def undo(self, db: Session, action_record: ReservationAction) -> bool:
        """Reverses the action and restores the previous reservation state and slot status."""
        pass


class ConfirmCommand(ReservationCommand):
    """
    Encapsulates confirming a pending reservation.
    Transitions: Pending -> Confirmed
    Slot remains Reserved.
    """
    def __init__(self, reservation_id: int):
        super().__init__(reservation_id)
        self.action_name = "CONFIRM"

    def execute(self, db: Session) -> bool:
        reservation = db.query(Reservation).filter(Reservation.id == self.reservation_id).first()
        if not reservation:
            raise CommandExecutionError(f"Reservation {self.reservation_id} not found.")

        slot = db.query(ParkingSlot).filter(ParkingSlot.id == reservation.slot_id).first()
        if not slot:
            raise CommandExecutionError(f"Slot {reservation.slot_id} not found.")

        # Capture snapshot
        self.prev_state = reservation.status
        self.prev_slot_status = slot.availability_status

        # Delegate transition to State pattern context
        ctx = ReservationLifecycleContext(
            current_status=reservation.status,
            slot_status=slot.availability_status,
        )
        ctx.confirm()

        # Update models
        self.resulting_state = ctx.status_name
        self.resulting_slot_status = ctx.slot_status

        reservation.status = self.resulting_state
        slot.availability_status = self.resulting_slot_status

        self.snapshot_data = {
            "prev_state": self.prev_state,
            "prev_slot_status": self.prev_slot_status,
            "resulting_state": self.resulting_state,
            "resulting_slot_status": self.resulting_slot_status,
        }
        return True

    def undo(self, db: Session, action_record: ReservationAction) -> bool:
        reservation = db.query(Reservation).filter(Reservation.id == self.reservation_id).first()
        if not reservation:
            raise CommandExecutionError("Reservation not found during undo.")
        slot = db.query(ParkingSlot).filter(ParkingSlot.id == reservation.slot_id).first()
        if not slot:
            raise CommandExecutionError("Slot not found during undo.")

        snapshot = json.loads(action_record.snapshot_data or "{}")
        target_state = snapshot.get("prev_state", "Pending")
        target_slot_status = snapshot.get("prev_slot_status", "Reserved")

        reservation.status = target_state
        slot.availability_status = target_slot_status
        return True


class CheckInCommand(ReservationCommand):
    """
    Encapsulates driver arrival / check-in.
    Transitions: Confirmed -> Active
    Slot changes to Occupied.
    """
    def __init__(self, reservation_id: int):
        super().__init__(reservation_id)
        self.action_name = "CHECK_IN"

    def execute(self, db: Session) -> bool:
        reservation = db.query(Reservation).filter(Reservation.id == self.reservation_id).first()
        if not reservation:
            raise CommandExecutionError(f"Reservation {self.reservation_id} not found.")
        slot = db.query(ParkingSlot).filter(ParkingSlot.id == reservation.slot_id).first()
        if not slot:
            raise CommandExecutionError(f"Slot {reservation.slot_id} not found.")

        self.prev_state = reservation.status
        self.prev_slot_status = slot.availability_status

        ctx = ReservationLifecycleContext(
            current_status=reservation.status,
            slot_status=slot.availability_status,
        )
        ctx.enter()

        self.resulting_state = ctx.status_name
        self.resulting_slot_status = ctx.slot_status

        reservation.status = self.resulting_state
        reservation.checked_in_at = ctx.checked_in_at
        slot.availability_status = self.resulting_slot_status

        self.snapshot_data = {
            "prev_state": self.prev_state,
            "prev_slot_status": self.prev_slot_status,
            "resulting_state": self.resulting_state,
            "resulting_slot_status": self.resulting_slot_status,
        }
        return True

    def undo(self, db: Session, action_record: ReservationAction) -> bool:
        reservation = db.query(Reservation).filter(Reservation.id == self.reservation_id).first()
        slot = db.query(ParkingSlot).filter(ParkingSlot.id == reservation.slot_id).first()

        snapshot = json.loads(action_record.snapshot_data or "{}")
        reservation.status = snapshot.get("prev_state", "Confirmed")
        reservation.checked_in_at = None
        slot.availability_status = snapshot.get("prev_slot_status", "Reserved")
        return True


class CheckOutCommand(ReservationCommand):
    """
    Encapsulates driver departure / check-out.
    Transitions: Active -> Completed
    Slot is released to Available.
    """
    def __init__(self, reservation_id: int):
        super().__init__(reservation_id)
        self.action_name = "CHECK_OUT"

    def execute(self, db: Session) -> bool:
        reservation = db.query(Reservation).filter(Reservation.id == self.reservation_id).first()
        if not reservation:
            raise CommandExecutionError(f"Reservation {self.reservation_id} not found.")
        slot = db.query(ParkingSlot).filter(ParkingSlot.id == reservation.slot_id).first()
        if not slot:
            raise CommandExecutionError(f"Slot {reservation.slot_id} not found.")

        self.prev_state = reservation.status
        self.prev_slot_status = slot.availability_status

        ctx = ReservationLifecycleContext(
            current_status=reservation.status,
            slot_status=slot.availability_status,
        )
        ctx.exit()

        self.resulting_state = ctx.status_name
        self.resulting_slot_status = ctx.slot_status

        reservation.status = self.resulting_state
        reservation.checked_out_at = ctx.checked_out_at
        reservation.final_amount = reservation.estimated_amount
        slot.availability_status = self.resulting_slot_status

        self.snapshot_data = {
            "prev_state": self.prev_state,
            "prev_slot_status": self.prev_slot_status,
            "resulting_state": self.resulting_state,
            "resulting_slot_status": self.resulting_slot_status,
        }
        return True

    def undo(self, db: Session, action_record: ReservationAction) -> bool:
        reservation = db.query(Reservation).filter(Reservation.id == self.reservation_id).first()
        slot = db.query(ParkingSlot).filter(ParkingSlot.id == reservation.slot_id).first()

        snapshot = json.loads(action_record.snapshot_data or "{}")
        reservation.status = snapshot.get("prev_state", "Active")
        reservation.checked_out_at = None
        slot.availability_status = snapshot.get("prev_slot_status", "Occupied")
        return True


class CancelCommand(ReservationCommand):
    """
    Encapsulates cancellation before entry.
    Transitions: Pending -> Cancelled or Confirmed -> Cancelled
    Slot is released to Available.
    """
    def __init__(self, reservation_id: int):
        super().__init__(reservation_id)
        self.action_name = "CANCEL"

    def execute(self, db: Session) -> bool:
        reservation = db.query(Reservation).filter(Reservation.id == self.reservation_id).first()
        if not reservation:
            raise CommandExecutionError(f"Reservation {self.reservation_id} not found.")
        slot = db.query(ParkingSlot).filter(ParkingSlot.id == reservation.slot_id).first()
        if not slot:
            raise CommandExecutionError(f"Slot {reservation.slot_id} not found.")

        self.prev_state = reservation.status
        self.prev_slot_status = slot.availability_status

        ctx = ReservationLifecycleContext(
            current_status=reservation.status,
            slot_status=slot.availability_status,
        )
        ctx.cancel()

        self.resulting_state = ctx.status_name
        self.resulting_slot_status = ctx.slot_status

        reservation.status = self.resulting_state
        slot.availability_status = self.resulting_slot_status

        self.snapshot_data = {
            "prev_state": self.prev_state,
            "prev_slot_status": self.prev_slot_status,
            "resulting_state": self.resulting_state,
            "resulting_slot_status": self.resulting_slot_status,
        }
        return True

    def undo(self, db: Session, action_record: ReservationAction) -> bool:
        reservation = db.query(Reservation).filter(Reservation.id == self.reservation_id).first()
        slot = db.query(ParkingSlot).filter(ParkingSlot.id == reservation.slot_id).first()

        # Check if slot was reserved by someone else while this reservation was cancelled
        if slot.availability_status != "Available":
            raise CommandExecutionError(
                f"Cannot undo cancellation: Slot {slot.slot_code} is currently '{slot.availability_status}'."
            )

        snapshot = json.loads(action_record.snapshot_data or "{}")
        reservation.status = snapshot.get("prev_state", "Confirmed")
        slot.availability_status = snapshot.get("prev_slot_status", "Reserved")
        return True


class CommandInvoker:
    """
    Invoker in the Command pattern.
    Executes commands, updates audit history with snapshots, and provides undo capability.
    """
    def __init__(self):
        self._subject = create_default_subject()

    def run(self, command: ReservationCommand, db: Session) -> ReservationAction:
        """
        Executes a command within an atomic transaction.
        Invalidates previous undo availability for this reservation,
        records the new action with snapshot, and triggers observers.
        """
        # Execute command (State validation occurs inside execute)
        command.execute(db)

        # Invalidate previous actions' undo_available flags for this reservation
        db.query(ReservationAction).filter(
            ReservationAction.reservation_id == command.reservation_id,
            ReservationAction.undo_available == True,
        ).update({"undo_available": False})

        # Persist new action
        action_record = ReservationAction(
            reservation_id=command.reservation_id,
            action_type=command.action_name,
            previous_state=command.prev_state or "Unknown",
            resulting_state=command.resulting_state or "Unknown",
            success=True,
            undo_available=True,  # Most recent action is eligible for undo
            snapshot_data=json.dumps(command.snapshot_data),
        )
        db.add(action_record)
        db.flush()

        # Fetch reservation details for observers
        res = db.query(Reservation).filter(Reservation.id == command.reservation_id).first()
        if res:
            slot_code = res.slot.slot_code if res.slot else "Unknown"
            loc_name = res.location.name if res.location else "Unknown"
            self._subject.notify(
                event_type=command.action_name,
                reservation_id=res.id,
                reference_code=res.reference_code,
                driver_name=res.driver_name,
                driver_email=res.driver_email,
                driver_phone=res.driver_phone,
                slot_code=slot_code,
                location_name=loc_name,
                current_state=res.status,
                db=db,
            )

        return action_record

    def undo_last(self, reservation_id: int, db: Session) -> ReservationAction:
        """
        Undoes the most recent eligible action for the reservation.
        Restores state and slot status, marks action as undone, records UNDO action,
        and notifies observers.
        """
        last_action = db.query(ReservationAction).filter(
            ReservationAction.reservation_id == reservation_id,
            ReservationAction.undo_available == True,
            ReservationAction.success == True,
        ).order_id = db.query(ReservationAction).filter(
            ReservationAction.reservation_id == reservation_id,
            ReservationAction.undo_available == True,
            ReservationAction.success == True,
        ).order_by(ReservationAction.id.desc()).first()

        if not last_action:
            raise CommandExecutionError("No undoable action found for this reservation.")

        res = db.query(Reservation).filter(Reservation.id == reservation_id).first()
        if not res:
            raise CommandExecutionError("Reservation not found.")

        # Safety check: ensure current state matches the action's resulting state
        if res.status != last_action.resulting_state:
            raise CommandExecutionError(
                f"Cannot undo: reservation status has changed from '{last_action.resulting_state}' to '{res.status}'."
            )

        # Instantiate command based on action_type
        cmd_map = {
            "CONFIRM": ConfirmCommand(reservation_id),
            "CHECK_IN": CheckInCommand(reservation_id),
            "CHECK_OUT": CheckOutCommand(reservation_id),
            "CANCEL": CancelCommand(reservation_id),
        }
        cmd = cmd_map.get(last_action.action_type)
        if not cmd:
            raise CommandExecutionError(f"Undo not supported for action type '{last_action.action_type}'.")

        # Execute undo
        cmd.undo(db, last_action)

        # Mark original action as no longer undoable
        last_action.undo_available = False

        # Record undo in action audit history
        undo_action = ReservationAction(
            reservation_id=reservation_id,
            action_type="UNDO",
            previous_state=last_action.resulting_state,
            resulting_state=res.status,
            success=True,
            undo_available=False,
            snapshot_data=json.dumps({"undone_action_id": last_action.id, "undone_action_type": last_action.action_type}),
        )
        db.add(undo_action)
        db.flush()

        # Notify observers
        slot_code = res.slot.slot_code if res.slot else "Unknown"
        loc_name = res.location.name if res.location else "Unknown"
        self._subject.notify(
            event_type="UNDO",
            reservation_id=res.id,
            reference_code=res.reference_code,
            driver_name=res.driver_name,
            driver_email=res.driver_email,
            driver_phone=res.driver_phone,
            slot_code=slot_code,
            location_name=loc_name,
            current_state=res.status,
            db=db,
        )

        return undo_action
