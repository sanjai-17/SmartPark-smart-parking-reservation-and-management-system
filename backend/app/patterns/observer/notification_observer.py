import logging
from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.models.models import NotificationRecord

logger = logging.getLogger(__name__)


class NotificationObserver(ABC):
    """
    Observer interface.
    Concrete observers define how to react when a reservation state transition occurs.
    """
    name: str

    @abstractmethod
    def update(
        self,
        event_type: str,
        reservation_id: int,
        reference_code: str,
        driver_name: str,
        driver_email: str,
        driver_phone: str,
        slot_code: str,
        location_name: str,
        current_state: str,
        db: Optional[Session] = None,
        extra_data: Optional[Dict[str, Any]] = None,
    ) -> Optional[NotificationRecord]:
        pass


class SMSObserver(NotificationObserver):
    """
    Simulates sending SMS alerts to the driver upon reservation events.
    Records delivery status in the database.
    """
    name = "SMS"

    def update(
        self,
        event_type: str,
        reservation_id: int,
        reference_code: str,
        driver_name: str,
        driver_email: str,
        driver_phone: str,
        slot_code: str,
        location_name: str,
        current_state: str,
        db: Optional[Session] = None,
        extra_data: Optional[Dict[str, Any]] = None,
    ) -> Optional[NotificationRecord]:
        msg_template = {
            "CONFIRM": f"[SmartPark SMS] Hi {driver_name}, reservation {reference_code} for slot {slot_code} at {location_name} is CONFIRMED. Safe travels!",
            "CHECK_IN": f"[SmartPark SMS] Welcome {driver_name}! You have checked in to slot {slot_code} at {location_name}. Parking session is ACTIVE.",
            "CHECK_OUT": f"[SmartPark SMS] Thank you {driver_name}. You checked out from slot {slot_code}. Reservation {reference_code} is COMPLETED.",
            "CANCEL": f"[SmartPark SMS] Notice: Reservation {reference_code} for slot {slot_code} at {location_name} has been CANCELLED.",
            "UNDO": f"[SmartPark SMS] Notice: Recent action on reservation {reference_code} was UNDONE. Current state is {current_state}.",
        }
        message = msg_template.get(
            event_type,
            f"[SmartPark SMS] Status update for {reference_code}: State changed to {current_state}."
        )

        record = None
        if db is not None:
            record = NotificationRecord(
                reservation_id=reservation_id,
                notification_type="SMS",
                message=message,
                delivery_status="DELIVERED",
            )
            db.add(record)
        return record


class EmailObserver(NotificationObserver):
    """
    Simulates sending detailed HTML/Plaintext confirmation emails to the driver.
    """
    name = "Email"

    def update(
        self,
        event_type: str,
        reservation_id: int,
        reference_code: str,
        driver_name: str,
        driver_email: str,
        driver_phone: str,
        slot_code: str,
        location_name: str,
        current_state: str,
        db: Optional[Session] = None,
        extra_data: Optional[Dict[str, Any]] = None,
    ) -> Optional[NotificationRecord]:
        msg_template = {
            "CONFIRM": f"[SmartPark Email to {driver_email}] Subject: Booking Confirmed ({reference_code}) — Dear {driver_name}, your parking slot {slot_code} at {location_name} has been booked successfully.",
            "CHECK_IN": f"[SmartPark Email to {driver_email}] Subject: Check-In Acknowledged ({reference_code}) — Entry recorded at {location_name}. Your timer is active.",
            "CHECK_OUT": f"[SmartPark Email to {driver_email}] Subject: Parking Receipt & Check-Out ({reference_code}) — You have successfully checked out. Hope you had a smooth parking experience!",
            "CANCEL": f"[SmartPark Email to {driver_email}] Subject: Reservation Cancelled ({reference_code}) — Your reservation for slot {slot_code} has been cancelled.",
            "UNDO": f"[SmartPark Email to {driver_email}] Subject: Action Reversal ({reference_code}) — The previous action was undone. Your reservation status is now {current_state}.",
        }
        message = msg_template.get(
            event_type,
            f"[SmartPark Email to {driver_email}] Reservation {reference_code} updated to {current_state}."
        )

        record = None
        if db is not None:
            record = NotificationRecord(
                reservation_id=reservation_id,
                notification_type="Email",
                message=message,
                delivery_status="DELIVERED",
            )
            db.add(record)
        return record


class DisplayBoardObserver(NotificationObserver):
    """
    Simulates IoT LED Matrix display boards at entrance gates.
    Displays live slot status and guidance to incoming drivers.
    """
    name = "DisplayBoard"

    def update(
        self,
        event_type: str,
        reservation_id: int,
        reference_code: str,
        driver_name: str,
        driver_email: str,
        driver_phone: str,
        slot_code: str,
        location_name: str,
        current_state: str,
        db: Optional[Session] = None,
        extra_data: Optional[Dict[str, Any]] = None,
    ) -> Optional[NotificationRecord]:
        board_messages = {
            "CONFIRM": f"[GATE DISPLAY: {location_name}] Bay {slot_code} RESERVED for {driver_name} ({reference_code[-4:]}). Welcome!",
            "CHECK_IN": f"[GATE DISPLAY: {location_name}] Bay {slot_code} OCCUPIED. Driver on-site.",
            "CHECK_OUT": f"[GATE DISPLAY: {location_name}] Bay {slot_code} VACATED. Available for next driver.",
            "CANCEL": f"[GATE DISPLAY: {location_name}] Bay {slot_code} RESERVATION CLEARED. Bay is now OPEN.",
            "UNDO": f"[GATE DISPLAY: {location_name}] Bay {slot_code} SYNC: Status reverted to {current_state}.",
        }
        message = board_messages.get(
            event_type,
            f"[GATE DISPLAY: {location_name}] Slot {slot_code} updated -> {current_state}."
        )

        record = None
        if db is not None:
            record = NotificationRecord(
                reservation_id=reservation_id,
                notification_type="DisplayBoard",
                message=message,
                delivery_status="DELIVERED",
            )
            db.add(record)
        return record


class ReservationSubject:
    """
    Subject in the Observer pattern.
    Maintains a list of observers and notifies them on reservation events.
    """
    def __init__(self):
        self._observers: List[NotificationObserver] = []

    def attach(self, observer: NotificationObserver) -> None:
        if observer not in self._observers:
            self._observers.append(observer)

    def detach(self, observer: NotificationObserver) -> None:
        if observer in self._observers:
            self._observers.remove(observer)

    @property
    def observers(self) -> List[NotificationObserver]:
        return list(self._observers)

    def notify(
        self,
        event_type: str,
        reservation_id: int,
        reference_code: str,
        driver_name: str,
        driver_email: str,
        driver_phone: str,
        slot_code: str,
        location_name: str,
        current_state: str,
        db: Optional[Session] = None,
        extra_data: Optional[Dict[str, Any]] = None,
    ) -> List[NotificationRecord]:
        """
        Notifies all attached observers safely.
        Records errors without raising them to protect core reservation flow.
        """
        created_records: List[NotificationRecord] = []
        for observer in self._observers:
            try:
                rec = observer.update(
                    event_type=event_type,
                    reservation_id=reservation_id,
                    reference_code=reference_code,
                    driver_name=driver_name,
                    driver_email=driver_email,
                    driver_phone=driver_phone,
                    slot_code=slot_code,
                    location_name=location_name,
                    current_state=current_state,
                    db=db,
                    extra_data=extra_data,
                )
                if rec:
                    created_records.append(rec)
            except Exception as e:
                logger.error(f"Observer {observer.name} failed during notify: {e}", exc_info=True)
                if db is not None:
                    fail_rec = NotificationRecord(
                        reservation_id=reservation_id,
                        notification_type=observer.name,
                        message=f"Failed to deliver notification: {str(e)}",
                        delivery_status="FAILED",
                    )
                    db.add(fail_rec)
                    created_records.append(fail_rec)
        return created_records


def create_default_subject() -> ReservationSubject:
    """Instantiate a subject with SMS, Email, and DisplayBoard observers registered."""
    subject = ReservationSubject()
    subject.attach(SMSObserver())
    subject.attach(EmailObserver())
    subject.attach(DisplayBoardObserver())
    return subject
