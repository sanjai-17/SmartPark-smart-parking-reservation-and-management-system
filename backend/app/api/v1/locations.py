from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.models import ParkingSlot
from app.schemas.schemas import LocationCreate, LocationOut, SlotOut
from app.services.parking_service import ParkingService

router = APIRouter(prefix="/locations", tags=["Locations"])


@router.get("", response_model=List[LocationOut])
def list_locations(db: Session = Depends(get_db)):
    locations = ParkingService.get_locations(db)
    result = []
    for loc in locations:
        total = len(loc.slots)
        available = sum(1 for s in loc.slots if s.availability_status == "Available")
        loc_out = LocationOut(
            id=loc.id,
            name=loc.name,
            address=loc.address,
            zone=loc.zone,
            description=loc.description,
            created_at=loc.created_at,
            total_slots=total,
            available_slots=available,
        )
        result.append(loc_out)
    return result


@router.get("/{location_id}", response_model=LocationOut)
def get_location(location_id: int, db: Session = Depends(get_db)):
    loc = ParkingService.get_location_by_id(db, location_id)
    if not loc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Location with ID {location_id} not found."
        )
    total = len(loc.slots)
    available = sum(1 for s in loc.slots if s.availability_status == "Available")
    return LocationOut(
        id=loc.id,
        name=loc.name,
        address=loc.address,
        zone=loc.zone,
        description=loc.description,
        created_at=loc.created_at,
        total_slots=total,
        available_slots=available,
    )


@router.post("", response_model=LocationOut, status_code=status.HTTP_201_CREATED)
def create_location(data: LocationCreate, db: Session = Depends(get_db)):
    loc = ParkingService.create_location(db, data)
    return LocationOut(
        id=loc.id,
        name=loc.name,
        address=loc.address,
        zone=loc.zone,
        description=loc.description,
        created_at=loc.created_at,
        total_slots=0,
        available_slots=0,
    )


@router.get("/{location_id}/slots", response_model=List[SlotOut])
def get_location_slots(location_id: int, db: Session = Depends(get_db)):
    loc = ParkingService.get_location_by_id(db, location_id)
    if not loc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Location with ID {location_id} not found."
        )
    slots = ParkingService.get_slots(db, location_id=location_id)
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
            location_name=loc.name,
            location_zone=loc.zone,
        )
        for s in slots
    ]
