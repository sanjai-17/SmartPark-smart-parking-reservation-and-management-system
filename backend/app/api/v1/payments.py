from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.schemas.schemas import PaymentRequest, PaymentOut
from app.services.payment_service import PaymentService

router = APIRouter(prefix="", tags=["Payments"])


@router.post("/reservations/{reservation_id}/payments", response_model=PaymentOut, status_code=status.HTTP_201_CREATED)
def process_payment(
    reservation_id: int,
    request: PaymentRequest,
    db: Session = Depends(get_db),
):
    """
    Simulates processing a payment for a reservation using the Adapter pattern.
    Supports UPI, Card, and Wallet payment adapters.
    """
    return PaymentService.process_reservation_payment(db, reservation_id, request)


@router.get("/payments", response_model=List[PaymentOut])
def list_payments(db: Session = Depends(get_db)):
    """Returns audit trail of all simulated payment transactions."""
    return PaymentService.get_all_payments(db)
