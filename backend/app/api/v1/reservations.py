from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.schemas.schemas import ReservationCreate, ReservationOut
from app.services.reservation_service import ReservationService

router = APIRouter(prefix="/reservations", tags=["Reservations"])


@router.get("", response_model=List[ReservationOut])
def list_reservations(
    status: Optional[str] = Query(None, description="Filter by status (Pending, Confirmed, Active, Completed, Cancelled)"),
    db: Session = Depends(get_db),
):
    reservations = ReservationService.get_reservations(db, status_filter=status)
    return [ReservationService.enrich_reservation_out(r, db) for r in reservations]


@router.get("/{reservation_id}", response_model=ReservationOut)
def get_reservation(reservation_id: int, db: Session = Depends(get_db)):
    res = ReservationService.get_reservation_by_id(db, reservation_id)
    if not res:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Reservation with ID {reservation_id} not found."
        )
    return ReservationService.enrich_reservation_out(res, db)


@router.post("", response_model=ReservationOut, status_code=status.HTTP_201_CREATED)
def create_reservation(data: ReservationCreate, db: Session = Depends(get_db)):
    """
    Creates a new reservation.
    Holds the slot, computes initial estimate using Strategy pattern, and sets state to Pending.
    """
    res = ReservationService.create_reservation(db, data)
    return ReservationService.enrich_reservation_out(res, db)


@router.post("/{reservation_id}/confirm", response_model=ReservationOut)
def confirm_reservation(reservation_id: int, db: Session = Depends(get_db)):
    """
    Confirms a pending reservation.
    Executes ConfirmCommand via Command pattern; delegates lifecycle to ConfirmedState via State pattern;
    triggers simulated notifications via Observer pattern.
    """
    res = ReservationService.confirm_reservation(db, reservation_id)
    return ReservationService.enrich_reservation_out(res, db)


@router.post("/{reservation_id}/check-in", response_model=ReservationOut)
def check_in_reservation(reservation_id: int, db: Session = Depends(get_db)):
    """
    Checks in an arriving driver.
    Executes CheckInCommand; transitions from Confirmed -> Active; updates slot to Occupied.
    """
    res = ReservationService.check_in_reservation(db, reservation_id)
    return ReservationService.enrich_reservation_out(res, db)


@router.post("/{reservation_id}/check-out", response_model=ReservationOut)
def check_out_reservation(reservation_id: int, db: Session = Depends(get_db)):
    """
    Checks out a departing driver.
    Executes CheckOutCommand; transitions from Active -> Completed; releases slot to Available.
    """
    res = ReservationService.check_out_reservation(db, reservation_id)
    return ReservationService.enrich_reservation_out(res, db)


@router.post("/{reservation_id}/cancel", response_model=ReservationOut)
def cancel_reservation(reservation_id: int, db: Session = Depends(get_db)):
    """
    Cancels a pending or confirmed reservation.
    Executes CancelCommand; transitions to Cancelled; releases slot to Available.
    """
    res = ReservationService.cancel_reservation(db, reservation_id)
    return ReservationService.enrich_reservation_out(res, db)


@router.post("/{reservation_id}/undo", response_model=ReservationOut)
def undo_last_reservation_action(reservation_id: int, db: Session = Depends(get_db)):
    """
    Undoes the most recent eligible reservation command.
    Restores the previous reservation state and slot status using snapshot audit records.
    """
    res = ReservationService.undo_last_action(db, reservation_id)
    return ReservationService.enrich_reservation_out(res, db)
