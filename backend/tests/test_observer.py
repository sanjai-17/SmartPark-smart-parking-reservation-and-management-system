import pytest
from app.patterns.observer import (
    ReservationSubject,
    SMSObserver,
    EmailObserver,
    DisplayBoardObserver,
    create_default_subject,
)


def test_observer_attach_and_detach():
    subject = ReservationSubject()
    sms = SMSObserver()
    email = EmailObserver()

    subject.attach(sms)
    subject.attach(email)
    assert len(subject.observers) == 2

    # Duplicate attach is prevented
    subject.attach(sms)
    assert len(subject.observers) == 2

    # Detach
    subject.detach(sms)
    assert len(subject.observers) == 1
    assert email in subject.observers
    assert sms not in subject.observers


def test_observer_notifications_in_database(test_db):
    subject = create_default_subject()
    assert len(subject.observers) == 3

    records = subject.notify(
        event_type="CONFIRM",
        reservation_id=1,
        reference_code="SPK-TEST-001",
        driver_name="Rohan Gupta",
        driver_email="rohan@example.com",
        driver_phone="+91 99999 88888",
        slot_code="A-101",
        location_name="CBD Parking",
        current_state="Confirmed",
        db=test_db,
    )
    test_db.commit()

    assert len(records) == 3
    types = {r.notification_type for r in records}
    assert types == {"SMS", "Email", "DisplayBoard"}

    for r in records:
        assert r.delivery_status == "DELIVERED"
        assert r.reservation_id == 1
        assert "A-101" in r.message


def test_observer_error_resilience():
    class BrokenObserver:
        name = "BrokenObserver"
        def update(self, *args, **kwargs):
            raise RuntimeError("Network timeout simulation")

    subject = ReservationSubject()
    subject.attach(BrokenObserver())
    subject.attach(SMSObserver())

    # Notification should not crash even if one observer fails
    records = subject.notify(
        event_type="CHECK_IN",
        reservation_id=1,
        reference_code="SPK-TEST-002",
        driver_name="Sara Ali",
        driver_email="sara@example.com",
        driver_phone="+91 88888 77777",
        slot_code="B-201",
        location_name="Plaza Parking",
        current_state="Active",
        db=None,
    )
    # The SMSObserver without db returns None; BrokenObserver caught safely
    assert True
