from typing import List, Optional
from decimal import Decimal
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.schemas.schemas import SlotCreate, SlotOut
from app.services.parking_service import ParkingService

router = APIRouter(prefix="/slots", tags=["Slots"])


@router.get("", response_model=List[SlotOut])
def list_slots(
    location_id: Optional[int] = Query(None, description="Filter by location ID"),
    slot_type: Optional[str] = Query(None, description="Filter by slot type (Regular, EV, etc.)"),
    availability: Optional[str] = Query(None, description="Filter by status (Available, Reserved, Occupied)"),
    min_rate: Optional[Decimal] = Query(None, description="Minimum base hourly rate"),
    max_rate: Optional[Decimal] = Query(None, description="Maximum base hourly rate"),
    db: Session = Depends(get_db),
):
    slots = ParkingService.get_slots(
        db,
        location_id=location_id,
        slot_type=slot_type,
        availability=availability,
        min_rate=min_rate,
        max_rate=max_rate,
    )
    return [
        SlotOut(
            id=s.id,
            slot_code=s.slot_code,
            location_id=s.location_id,
            slot_type=s.slot_type,
            base_rate=s.base_rate,
            availability_status=s.availability_status,
            description=s.description,
            features=s.features,
            created_at=s.created_at,
            location_name=s.location.name if s.location else None,
            location_zone=s.location.zone if s.location else None,
        )
        for s in slots
    ]


@router.get("/{slot_id}", response_model=SlotOut)
def get_slot(slot_id: int, db: Session = Depends(get_db)):
    slot = ParkingService.get_slot_by_id(db, slot_id)
    if not slot:
        from fastapi import HTTPException
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Parking slot with ID {slot_id} not found."
        )
    return SlotOut(
        id=slot.id,
        slot_code=slot.slot_code,
        location_id=slot.location_id,
        slot_type=slot.slot_type,
        base_rate=slot.base_rate,
        availability_status=slot.availability_status,
        description=slot.description,
        features=slot.features,
        created_at=slot.created_at,
        location_name=slot.location.name if slot.location else None,
        location_zone=slot.location.zone if slot.location else None,
    )


@router.post("", response_model=SlotOut, status_code=status.HTTP_201_CREATED)
def create_slot(data: SlotCreate, db: Session = Depends(get_db)):
    """
    Creates a new parking slot using the Factory Method design pattern.
    Dispatches to concrete SlotCreator (Regular, EV, Disabled, Premium) based on slot_type.
    """
    created_slot = ParkingService.create_slot(db, data)
    return SlotOut(
        id=created_slot.id,
        slot_code=created_slot.slot_code,
        location_id=created_slot.location_id,
        slot_type=created_slot.slot_type,
        base_rate=created_slot.base_rate,
        availability_status=created_slot.availability_status,
        description=created_slot.description,
        features=created_slot.features,
        created_at=created_slot.created_at,
        location_name=created_slot.location.name if created_slot.location else None,
        location_zone=created_slot.location.zone if created_slot.location else None,
    )
