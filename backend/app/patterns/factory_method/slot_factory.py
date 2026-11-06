from abc import ABC, abstractmethod
from decimal import Decimal
from typing import Dict, Type, Optional


class UnknownSlotTypeError(ValueError):
    """Raised when an unknown slot type is requested."""
    pass


class SlotProduct(ABC):
    """
    Abstract Product interface for parking slots created via Factory Method.
    Encapsulates slot type specific attributes and capabilities.
    """
    def __init__(
        self,
        slot_code: str,
        location_id: int,
        slot_type: str,
        base_rate: Decimal,
        description: str,
        features: str,
    ):
        self.slot_code = slot_code
        self.location_id = location_id
        self.slot_type = slot_type
        self.base_rate = base_rate
        self.description = description
        self.features = features

    def to_dict(self) -> dict:
        return {
            "slot_code": self.slot_code,
            "location_id": self.location_id,
            "slot_type": self.slot_type,
            "base_rate": self.base_rate,
            "description": self.description,
            "features": self.features,
        }


class RegularSlot(SlotProduct):
    """Concrete Product: Regular Parking Slot"""
    def __init__(
        self,
        slot_code: str,
        location_id: int,
        base_rate: Optional[Decimal] = None,
        description: Optional[str] = None,
        features: Optional[str] = None,
    ):
        super().__init__(
            slot_code=slot_code,
            location_id=location_id,
            slot_type="Regular",
            base_rate=base_rate if base_rate is not None else Decimal("50.00"),
            description=description or "Standard parking slot suitable for sedans, hatchbacks, and compact vehicles.",
            features=features or "Standard vehicle space, CCTV surveillance, 24/7 security",
        )


class EVSlot(SlotProduct):
    """Concrete Product: Electric Vehicle Parking Slot with Charging"""
    def __init__(
        self,
        slot_code: str,
        location_id: int,
        base_rate: Optional[Decimal] = None,
        description: Optional[str] = None,
        features: Optional[str] = None,
    ):
        super().__init__(
            slot_code=slot_code,
            location_id=location_id,
            slot_type="Electric Vehicle",
            base_rate=base_rate if base_rate is not None else Decimal("90.00"),
            description=description or "Equipped with dedicated high-speed EV charging stations and safety monitoring.",
            features=features or "50kW Type-2 EV Fast Charger, Dedicated power metering, Surge protection",
        )


class DisabledSlot(SlotProduct):
    """Concrete Product: Accessible / Disabled Parking Slot"""
    def __init__(
        self,
        slot_code: str,
        location_id: int,
        base_rate: Optional[Decimal] = None,
        description: Optional[str] = None,
        features: Optional[str] = None,
    ):
        super().__init__(
            slot_code=slot_code,
            location_id=location_id,
            slot_type="Disabled",
            base_rate=base_rate if base_rate is not None else Decimal("40.00"),
            description=description or "Reserved priority slot engineered with accessibility ramps and extra clearance.",
            features=features or "Extra-wide bay, Wheelchair ramp access, Close to elevator/entrance",
        )


class PremiumSlot(SlotProduct):
    """Concrete Product: Premium VIP Parking Slot"""
    def __init__(
        self,
        slot_code: str,
        location_id: int,
        base_rate: Optional[Decimal] = None,
        description: Optional[str] = None,
        features: Optional[str] = None,
    ):
        super().__init__(
            slot_code=slot_code,
            location_id=location_id,
            slot_type="Premium",
            base_rate=base_rate if base_rate is not None else Decimal("120.00"),
            description=description or "Exclusive premium bay located at prime entry with priority access and canopy protection.",
            features=features or "Valet concierge, Shaded VIP canopy, Priority entry lane",
        )


class SlotCreator(ABC):
    """
    Abstract Creator declaring the factory method.
    Subclasses override create_slot to instantiate concrete SlotProduct types.
    """
    @abstractmethod
    def create_slot(
        self,
        slot_code: str,
        location_id: int,
        base_rate: Optional[Decimal] = None,
        description: Optional[str] = None,
        features: Optional[str] = None,
    ) -> SlotProduct:
        pass


class RegularSlotCreator(SlotCreator):
    def create_slot(
        self,
        slot_code: str,
        location_id: int,
        base_rate: Optional[Decimal] = None,
        description: Optional[str] = None,
        features: Optional[str] = None,
    ) -> SlotProduct:
        return RegularSlot(
            slot_code=slot_code,
            location_id=location_id,
            base_rate=base_rate,
            description=description,
            features=features,
        )


class EVSlotCreator(SlotCreator):
    def create_slot(
        self,
        slot_code: str,
        location_id: int,
        base_rate: Optional[Decimal] = None,
        description: Optional[str] = None,
        features: Optional[str] = None,
    ) -> SlotProduct:
        return EVSlot(
            slot_code=slot_code,
            location_id=location_id,
            base_rate=base_rate,
            description=description,
            features=features,
        )


class DisabledSlotCreator(SlotCreator):
    def create_slot(
        self,
        slot_code: str,
        location_id: int,
        base_rate: Optional[Decimal] = None,
        description: Optional[str] = None,
        features: Optional[str] = None,
    ) -> SlotProduct:
        return DisabledSlot(
            slot_code=slot_code,
            location_id=location_id,
            base_rate=base_rate,
            description=description,
            features=features,
        )


class PremiumSlotCreator(SlotCreator):
    def create_slot(
        self,
        slot_code: str,
        location_id: int,
        base_rate: Optional[Decimal] = None,
        description: Optional[str] = None,
        features: Optional[str] = None,
    ) -> SlotProduct:
        return PremiumSlot(
            slot_code=slot_code,
            location_id=location_id,
            base_rate=base_rate,
            description=description,
            features=features,
        )


# Registry mapping canonical slot type identifiers to their creators
_CREATOR_REGISTRY: Dict[str, SlotCreator] = {
    "regular": RegularSlotCreator(),
    "electric vehicle": EVSlotCreator(),
    "ev": EVSlotCreator(),
    "disabled": DisabledSlotCreator(),
    "accessible": DisabledSlotCreator(),
    "premium": PremiumSlotCreator(),
    "vip": PremiumSlotCreator(),
}


def get_creator(slot_type: str) -> SlotCreator:
    """
    Factory registry resolver.
    Returns the creator corresponding to the normalized slot type string.
    Raises UnknownSlotTypeError if the slot type is unrecognized.
    """
    if not slot_type or not isinstance(slot_type, str):
        raise UnknownSlotTypeError(f"Invalid slot type format: {slot_type}")
    
    normalized = slot_type.strip().lower()
    creator = _CREATOR_REGISTRY.get(normalized)
    if not creator:
        valid_types = ["Regular", "Electric Vehicle", "Disabled", "Premium"]
        raise UnknownSlotTypeError(
            f"Unknown slot type '{slot_type}'. Valid slot types are: {', '.join(valid_types)}"
        )
    return creator


def register_creator(slot_type: str, creator: SlotCreator) -> None:
    """Allows dynamic registration of custom slot creators."""
    _CREATOR_REGISTRY[slot_type.strip().lower()] = creator
