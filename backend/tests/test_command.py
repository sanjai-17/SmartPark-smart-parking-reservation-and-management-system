import pytest
from decimal import Decimal
from app.models.models import Reservation, ParkingSlot, ReservationAction
from app.patterns.command import (
    CommandInvoker,
    ConfirmCommand,
    CheckInCommand,
    CheckOutCommand,
    CancelCommand,
    CommandExecutionError,
)
from app.patterns.state import InvalidTransitionError


def test_command_execution_and_undo_flow(test_db):
    invoker = CommandInvoker()

    # Find an available slot and create a pending reservation
    slot = test_db.query(ParkingSlot).filter(ParkingSlot.availability_status == "Available").first()
    assert slot is not None

    slot.availability_status = "Reserved"
    res = Reservation(
        reference_code="SPK-CMD-001",
        driver_name="Test Driver",
        driver_email="driver@example.com",
        driver_phone="1234567890",
        vehicle_type="Car",
        location_id=slot.location_id,
        slot_id=slot.id,
        duration_hours=Decimal("2.0"),
        pricing_strategy="Duration",
        estimated_amount=Decimal("100.00"),
        status="Pending",
    )
    test_db.add(res)
    test_db.commit()
    test_db.refresh(res)

    # 1. Execute ConfirmCommand
    action = invoker.run(ConfirmCommand(res.id), test_db)
    test_db.commit()
    test_db.refresh(res)
    test_db.refresh(slot)

    assert res.status == "Confirmed"
    assert slot.availability_status == "Reserved"
    assert action.undo_available == True

    # 2. Undo ConfirmCommand
    undo_act = invoker.undo_last(res.id, test_db)
    test_db.commit()
    test_db.refresh(res)
    test_db.refresh(slot)

    assert res.status == "Pending"
    assert slot.availability_status == "Reserved"
    assert undo_act.action_type == "UNDO"
    assert undo_act.undo_available == False


def test_command_check_in_and_check_out(test_db):
    invoker = CommandInvoker()

    slot = test_db.query(ParkingSlot).filter(ParkingSlot.availability_status == "Available").first()
    slot.availability_status = "Reserved"
    res = Reservation(
        reference_code="SPK-CMD-002",
        driver_name="CheckIn Driver",
        driver_email="checkin@example.com",
        driver_phone="9988776655",
        vehicle_type="SUV",
        location_id=slot.location_id,
        slot_id=slot.id,
        duration_hours=Decimal("3.0"),
        pricing_strategy="VehicleType",
        estimated_amount=Decimal("300.00"),
        status="Confirmed",
    )
    test_db.add(res)
    test_db.commit()
    test_db.refresh(res)

    # Check In
    invoker.run(CheckInCommand(res.id), test_db)
    test_db.commit()
    test_db.refresh(res)
    test_db.refresh(slot)

    assert res.status == "Active"
    assert slot.availability_status == "Occupied"

    # Check Out
    invoker.run(CheckOutCommand(res.id), test_db)
    test_db.commit()
    test_db.refresh(res)
    test_db.refresh(slot)

    assert res.status == "Completed"
    assert slot.availability_status == "Available"


def test_invalid_command_raises_exception_without_recording(test_db):
    invoker = CommandInvoker()
    slot = test_db.query(ParkingSlot).filter(ParkingSlot.availability_status == "Available").first()
    res = Reservation(
        reference_code="SPK-CMD-003",
        driver_name="Invalid Cmd Driver",
        driver_email="invalid@example.com",
        driver_phone="1231231234",
        vehicle_type="Car",
        location_id=slot.location_id,
        slot_id=slot.id,
        duration_hours=Decimal("2.0"),
        pricing_strategy="Duration",
        estimated_amount=Decimal("100.00"),
        status="Pending",
    )
    test_db.add(res)
    test_db.commit()
    test_db.refresh(res)

    # Attempting to check-out while still Pending must fail
    with pytest.raises(InvalidTransitionError):
        invoker.run(CheckOutCommand(res.id), test_db)

    # Check that no successful action was logged
    acts = test_db.query(ReservationAction).filter(
        ReservationAction.reservation_id == res.id,
        ReservationAction.action_type == "CHECK_OUT"
    ).all()
    assert len(acts) == 0
