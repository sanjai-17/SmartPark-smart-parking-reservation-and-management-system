import pytest
from app.patterns.state import (
    ReservationLifecycleContext,
    PendingState,
    ConfirmedState,
    ActiveState,
    CompletedState,
    CancelledState,
    InvalidTransitionError,
)


def test_standard_reservation_lifecycle_flow():
    # Start in Pending
    ctx = ReservationLifecycleContext(current_status="Pending", slot_status="Reserved")
    assert isinstance(ctx.state, PendingState)
    assert ctx.status_name == "Pending"

    # Pending -> Confirmed
    prev, nxt = ctx.confirm()
    assert prev == "Pending"
    assert nxt == "Confirmed"
    assert isinstance(ctx.state, ConfirmedState)
    assert ctx.slot_status == "Reserved"

    # Confirmed -> Active (Check-in)
    prev, nxt = ctx.enter()
    assert prev == "Confirmed"
    assert nxt == "Active"
    assert isinstance(ctx.state, ActiveState)
    assert ctx.slot_status == "Occupied"
    assert ctx.checked_in_at is not None

    # Active -> Completed (Check-out)
    prev, nxt = ctx.exit()
    assert prev == "Active"
    assert nxt == "Completed"
    assert isinstance(ctx.state, CompletedState)
    assert ctx.slot_status == "Available"
    assert ctx.checked_out_at is not None


def test_cancel_from_pending():
    ctx = ReservationLifecycleContext(current_status="Pending", slot_status="Reserved")
    prev, nxt = ctx.cancel()
    assert prev == "Pending"
    assert nxt == "Cancelled"
    assert isinstance(ctx.state, CancelledState)
    assert ctx.slot_status == "Available"


def test_cancel_from_confirmed():
    ctx = ReservationLifecycleContext(current_status="Confirmed", slot_status="Reserved")
    prev, nxt = ctx.cancel()
    assert prev == "Confirmed"
    assert nxt == "Cancelled"
    assert isinstance(ctx.state, CancelledState)
    assert ctx.slot_status == "Available"


def test_forbidden_transitions_raise_invalid_transition():
    # Cannot enter directly from Pending
    ctx = ReservationLifecycleContext(current_status="Pending", slot_status="Reserved")
    with pytest.raises(InvalidTransitionError) as exc:
        ctx.enter()
    assert "Cannot perform action 'check-in' on reservation currently in 'Pending'" in str(exc.value)

    # Cannot exit from Pending
    with pytest.raises(InvalidTransitionError):
        ctx.exit()

    # Cannot exit from Confirmed without checking in first
    ctx2 = ReservationLifecycleContext(current_status="Confirmed", slot_status="Reserved")
    with pytest.raises(InvalidTransitionError):
        ctx2.exit()

    # Cannot cancel once Active
    ctx3 = ReservationLifecycleContext(current_status="Active", slot_status="Occupied")
    with pytest.raises(InvalidTransitionError):
        ctx3.cancel()

    # Terminal state Completed rejects all operations
    ctx4 = ReservationLifecycleContext(current_status="Completed", slot_status="Available")
    with pytest.raises(InvalidTransitionError):
        ctx4.confirm()
    with pytest.raises(InvalidTransitionError):
        ctx4.enter()
    with pytest.raises(InvalidTransitionError):
        ctx4.exit()
    with pytest.raises(InvalidTransitionError):
        ctx4.cancel()

    # Terminal state Cancelled rejects all operations
    ctx5 = ReservationLifecycleContext(current_status="Cancelled", slot_status="Available")
    with pytest.raises(InvalidTransitionError):
        ctx5.confirm()
    with pytest.raises(InvalidTransitionError):
        ctx5.cancel()
