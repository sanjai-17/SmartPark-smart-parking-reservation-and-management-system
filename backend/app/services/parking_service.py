from typing import List, Optional
from decimal import Decimal
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException, status

from app.models.models import ParkingLocation, ParkingSlot
from app.schemas.schemas import LocationCreate, SlotCreate
from app.patterns.factory_method import get_creator, UnknownSlotTypeError


class ParkingService:
    @staticmethod
    def get_locations(db: Session) -> List[ParkingLocation]:
        return db.query(ParkingLocation).all()

    @staticmethod
    def get_location_by_id(db: Session, location_id: int) -> Optional[ParkingLocation]:
        return db.query(ParkingLocation).filter(ParkingLocation.id == location_id).first()

    @staticmethod
    def create_location(db: Session, data: LocationCreate) -> ParkingLocation:
        location = ParkingLocation(
            name=data.name.strip(),
            address=data.address.strip(),
            zone=data.zone.strip(),
            description=data.description,
        )
        db.add(location)
        db.commit()
        db.refresh(location)
        return location

    @staticmethod
    def get_slots(
        db: Session,
        location_id: Optional[int] = None,
        slot_type: Optional[str] = None,
        availability: Optional[str] = None,
        min_rate: Optional[Decimal] = None,
        max_rate: Optional[Decimal] = None,
    ) -> List[ParkingSlot]:
        query = db.query(ParkingSlot)
        if location_id is not None:
            query = query.filter(ParkingSlot.location_id == location_id)
        if slot_type:
            query = query.filter(ParkingSlot.slot_type.ilike(f"%{slot_type.strip()}%"))
        if availability:
            query = query.filter(ParkingSlot.availability_status == availability.strip())
        if min_rate is not None:
            query = query.filter(ParkingSlot.base_rate >= min_rate)
        if max_rate is not None:
            query = query.filter(ParkingSlot.base_rate <= max_rate)
        return query.order_by(ParkingSlot.id.asc()).all()

    @staticmethod
    def get_slot_by_id(db: Session, slot_id: int) -> Optional[ParkingSlot]:
        return db.query(ParkingSlot).filter(ParkingSlot.id == slot_id).first()

    @staticmethod
    def create_slot(db: Session, data: SlotCreate) -> ParkingSlot:
        """
        Creates a new parking slot using the Factory Method pattern.
        The concrete slot product is constructed by the resolved SlotCreator.
        """
        # Validate that location exists
        location = db.query(ParkingLocation).filter(ParkingLocation.id == data.location_id).first()
        if not location:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Location with ID {data.location_id} does not exist."
            )

        # Check unique slot_code per location
        existing = db.query(ParkingSlot).filter(
            ParkingSlot.location_id == data.location_id,
            ParkingSlot.slot_code == data.slot_code.strip()
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Slot code '{data.slot_code}' already exists at location '{location.name}'."
            )

        # Resolve creator via Factory Method registry
        try:
            creator = get_creator(data.slot_type)
        except UnknownSlotTypeError as e:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=str(e)
            )

        # Instantiate concrete product
        slot_product = creator.create_slot(
            slot_code=data.slot_code.strip(),
            location_id=data.location_id,
            base_rate=data.base_rate,
            description=data.description,
            features=data.features,
        )

        # Persist to database
        db_slot = ParkingSlot(
            slot_code=slot_product.slot_code,
            location_id=slot_product.location_id,
            slot_type=slot_product.slot_type,
            base_rate=slot_product.base_rate,
            availability_status="Available",
            description=slot_product.description,
            features=slot_product.features,
        )
        db.add(db_slot)
        try:
            db.commit()
            db.refresh(db_slot)
        except IntegrityError:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Slot code '{data.slot_code}' already exists at this location."
            )
        return db_slot
