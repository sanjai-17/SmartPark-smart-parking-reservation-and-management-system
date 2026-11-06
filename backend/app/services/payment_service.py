from typing import List, Optional
from decimal import Decimal
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.models import Reservation, PaymentTransaction
from app.schemas.schemas import PaymentRequest, PaymentOut
from app.patterns.adapter import (
    get_payment_processor,
    UnknownPaymentMethodError,
    InvalidPaymentAmountError,
)


class PaymentService:
    @staticmethod
    def process_reservation_payment(
        db: Session,
        reservation_id: int,
        request: PaymentRequest,
    ) -> PaymentOut:
        reservation = db.query(Reservation).filter(Reservation.id == reservation_id).first()
        if not reservation:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reservation not found.")

        # Check if already paid
        existing_paid = db.query(PaymentTransaction).filter(
            PaymentTransaction.reservation_id == reservation_id,
            PaymentTransaction.status == "SUCCESS"
        ).first()
        if existing_paid:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Reservation {reservation.reference_code} has already been paid for (Txn: {existing_paid.transaction_reference})."
            )

        # Server-enforced amount: client cannot pay less than the estimated or final amount
        due_amount = reservation.final_amount or reservation.estimated_amount
        if request.amount is not None and request.amount != due_amount:
            # Enforce server-side pricing integrity
            amount_to_charge = due_amount
        else:
            amount_to_charge = due_amount

        # Resolve payment processor adapter
        try:
            processor = get_payment_processor(request.payment_method)
        except UnknownPaymentMethodError as e:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))

        try:
            result = processor.pay(amount=amount_to_charge, account=request.account_identifier)
        except InvalidPaymentAmountError as e:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

        # Record payment transaction
        txn = PaymentTransaction(
            transaction_reference=result.transaction_reference,
            reservation_id=reservation_id,
            payment_method=result.payment_method,
            amount=result.amount,
            status="SUCCESS" if result.success else "FAILED",
            gateway_reference=result.gateway_reference,
        )
        db.add(txn)
        db.commit()
        db.refresh(txn)

        if not result.success:
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail=f"Payment declined: {result.message}",
            )

        return PaymentOut(
            id=txn.id,
            transaction_reference=txn.transaction_reference,
            reservation_id=txn.reservation_id,
            payment_method=txn.payment_method,
            amount=txn.amount,
            status=txn.status,
            gateway_reference=txn.gateway_reference,
            created_at=txn.created_at,
            driver_name=reservation.driver_name,
            reference_code=reservation.reference_code,
        )

    @staticmethod
    def get_all_payments(db: Session) -> List[PaymentOut]:
        txns = db.query(PaymentTransaction).order_by(PaymentTransaction.id.desc()).all()
        results = []
        for t in txns:
            results.append(
                PaymentOut(
                    id=t.id,
                    transaction_reference=t.transaction_reference,
                    reservation_id=t.reservation_id,
                    payment_method=t.payment_method,
                    amount=t.amount,
                    status=t.status,
                    gateway_reference=t.gateway_reference,
                    created_at=t.created_at,
                    driver_name=t.reservation.driver_name if t.reservation else None,
                    reference_code=t.reservation.reference_code if t.reservation else None,
                )
            )
        return results
