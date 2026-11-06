from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.models import ReservationAction
from app.schemas.schemas import ReservationActionOut

router = APIRouter(prefix="", tags=["Activity"])


@router.get("/activity", response_model=List[ReservationActionOut])
def list_all_activity(
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    actions = db.query(ReservationAction).order_by(ReservationAction.id.desc()).limit(limit).all()
    return [
        ReservationActionOut(
            id=a.id,
            reservation_id=a.reservation_id,
            action_type=a.action_type,
            previous_state=a.previous_state,
            resulting_state=a.resulting_state,
            success=a.success,
            undo_available=a.undo_available,
            created_at=a.created_at,
            reference_code=a.reservation.reference_code if a.reservation else None,
            driver_name=a.reservation.driver_name if a.reservation else None,
        )
        for a in actions
    ]


@router.get("/reservations/{reservation_id}/activity", response_model=List[ReservationActionOut])
def list_reservation_activity(
    reservation_id: int,
    db: Session = Depends(get_db),
):
    actions = db.query(ReservationAction).filter(
        ReservationAction.reservation_id == reservation_id
    ).order_by(ReservationAction.id.desc()).all()
    return [
        ReservationActionOut(
            id=a.id,
            reservation_id=a.reservation_id,
            action_type=a.action_type,
            previous_state=a.previous_state,
            resulting_state=a.resulting_state,
            success=a.success,
            undo_available=a.undo_available,
            created_at=a.created_at,
            reference_code=a.reservation.reference_code if a.reservation else None,
            driver_name=a.reservation.driver_name if a.reservation else None,
        )
        for a in actions
    ]
