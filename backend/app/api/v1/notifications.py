from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.models import NotificationRecord
from app.schemas.schemas import NotificationOut

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("", response_model=List[NotificationOut])
def list_notifications(
    reservation_id: Optional[int] = Query(None, description="Filter by reservation ID"),
    db: Session = Depends(get_db),
):
    query = db.query(NotificationRecord)
    if reservation_id is not None:
        query = query.filter(NotificationRecord.reservation_id == reservation_id)
    records = query.order_by(NotificationRecord.id.desc()).all()
    return [
        NotificationOut(
            id=r.id,
            reservation_id=r.reservation_id,
            notification_type=r.notification_type,
            message=r.message,
            delivery_status=r.delivery_status,
            created_at=r.created_at,
            reference_code=r.reservation.reference_code if r.reservation else None,
        )
        for r in records
    ]
