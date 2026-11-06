from abc import ABC, abstractmethod
from typing import TYPE_CHECKING, Tuple, Optional
import datetime

if TYPE_CHECKING:
    from app.models.models import Reservation, ParkingSlot


class InvalidTransitionError(Exception):
    """Raised when an illegal reservation state transition is attempted."""
    def __init__(self, current_state: str, action: str, details: str = ""):
        self.current_state = current_state
        self.action = action
        self.details = details
        msg = f"Cannot perform action '{action}' on reservation currently in '{current_state}' state."
        if details:
            msg += f" {details}"
        super().__init__(msg)


class ReservationState(ABC):
    """
    Abstract State in the State pattern.
    Defines methods for all possible lifecycle operations.
    Default implementations raise InvalidTransitionError.
    """
    name: str

    def confirm(self, context: "ReservationLifecycleContext") -> Tuple[str, str]:
        raise InvalidTransitionError(self.name, "confirm", "Only Pending reservations can be confirmed.")

    def enter(self, context: "ReservationLifecycleContext") -> Tuple[str, str]:
        raise InvalidTransitionError(self.name, "check-in", "Only Confirmed reservations can be checked in.")

    def exit(self, context: "ReservationLifecycleContext") -> Tuple[str, str]:
        raise InvalidTransitionError(self.name, "check-out", "Only Active (checked-in) reservations can be checked out.")

    def cancel(self, context: "ReservationLifecycleContext") -> Tuple[str, str]:
        raise InvalidTransitionError(self.name, "cancel", "Completed or already Cancelled reservations cannot be cancelled.")

    def __repr__(self) -> str:
        return f"<{self.__class__.__name__}>"


class PendingState(ReservationState):
    """
    Reservation is created and slot is temporarily held.
    Allowed transitions:
      - confirm() -> ConfirmedState
      - cancel()  -> CancelledState
    """
    name = "Pending"

    def confirm(self, context: "ReservationLifecycleContext") -> Tuple[str, str]:
        # Transition: Pending -> Confirmed
        # Slot status remains "Reserved"
        context.set_state(ConfirmedState())
        context.slot_status = "Reserved"
        return self.name, ConfirmedState.name

    def cancel(self, context: "ReservationLifecycleContext") -> Tuple[str, str]:
        # Transition: Pending -> Cancelled
        # Slot status reverts to "Available"
        context.set_state(CancelledState())
        context.slot_status = "Available"
        return self.name, CancelledState.name


class ConfirmedState(ReservationState):
    """
    Reservation has been confirmed. Slot is reserved for user.
    Allowed transitions:
      - enter()  -> ActiveState (Driver arrives at the parking lot)
      - cancel() -> CancelledState (Driver cancels before arrival)
    """
    name = "Confirmed"

    def enter(self, context: "ReservationLifecycleContext") -> Tuple[str, str]:
        # Transition: Confirmed -> Active
        # Slot status changes to "Occupied"
        context.set_state(ActiveState())
        context.slot_status = "Occupied"
        context.checked_in_at = datetime.datetime.now(datetime.timezone.utc)
        return self.name, ActiveState.name

    def cancel(self, context: "ReservationLifecycleContext") -> Tuple[str, str]:
        # Transition: Confirmed -> Cancelled
        # Slot status reverts to "Available"
        context.set_state(CancelledState())
        context.slot_status = "Available"
        return self.name, CancelledState.name


class ActiveState(ReservationState):
    """
    Driver has checked in and vehicle is parked.
    Allowed transitions:
      - exit() -> CompletedState (Driver departs)
    """
    name = "Active"

    def exit(self, context: "ReservationLifecycleContext") -> Tuple[str, str]:
        # Transition: Active -> Completed
        # Slot status reverts to "Available"
        context.set_state(CompletedState())
        context.slot_status = "Available"
        context.checked_out_at = datetime.datetime.now(datetime.timezone.utc)
        return self.name, CompletedState.name


class CompletedState(ReservationState):
    """
    Terminal state: Parking session has ended and slot has been freed.
    No further forward transitions permitted.
    """
    name = "Completed"


class CancelledState(ReservationState):
    """
    Terminal state: Reservation cancelled before check-in.
    No further forward transitions permitted.
    """
    name = "Cancelled"


def state_from_string(status_name: str) -> ReservationState:
    """Map status string to its concrete ReservationState class."""
    norm = (status_name or "").strip().lower()
    if norm == "pending":
        return PendingState()
    elif norm == "confirmed":
        return ConfirmedState()
    elif norm == "active":
        return ActiveState()
    elif norm == "completed":
        return CompletedState()
    elif norm == "cancelled":
        return CancelledState()
    else:
        raise ValueError(f"Unknown reservation status string: '{status_name}'")


class ReservationLifecycleContext:
    """
    Context in the State pattern.
    Holds reference to current concrete State and delegates lifecycle actions to it.
    Can be initialized with a Reservation model or domain values.
    """
    def __init__(
        self,
        current_status: str = "Pending",
        slot_status: str = "Reserved",
        checked_in_at: Optional[datetime.datetime] = None,
        checked_out_at: Optional[datetime.datetime] = None,
    ):
        self._state: ReservationState = state_from_string(current_status)
        self.slot_status: str = slot_status
        self.checked_in_at: Optional[datetime.datetime] = checked_in_at
        self.checked_out_at: Optional[datetime.datetime] = checked_out_at

    @property
    def state(self) -> ReservationState:
        return self._state

    @property
    def status_name(self) -> str:
        return self._state.name

    def set_state(self, state: ReservationState) -> None:
        self._state = state

    def confirm(self) -> Tuple[str, str]:
        return self._state.confirm(self)

    def enter(self) -> Tuple[str, str]:
        return self._state.enter(self)

    def exit(self) -> Tuple[str, str]:
        return self._state.exit(self)

    def cancel(self) -> Tuple[str, str]:
        return self._state.cancel(self)
