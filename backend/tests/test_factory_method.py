import pytest
from decimal import Decimal
from app.patterns.factory_method import (
    RegularSlotCreator,
    EVSlotCreator,
    DisabledSlotCreator,
    PremiumSlotCreator,
    RegularSlot,
    EVSlot,
    DisabledSlot,
    PremiumSlot,
    get_creator,
    UnknownSlotTypeError,
)


def test_regular_slot_creator():
    creator = RegularSlotCreator()
    slot = creator.create_slot(slot_code="R-1", location_id=1)
    assert isinstance(slot, RegularSlot)
    assert slot.slot_type == "Regular"
    assert slot.base_rate == Decimal("50.00")
    assert "sedan" in slot.description.lower()
    assert "CCTV" in slot.features


def test_ev_slot_creator():
    creator = EVSlotCreator()
    slot = creator.create_slot(slot_code="EV-1", location_id=1)
    assert isinstance(slot, EVSlot)
    assert slot.slot_type == "Electric Vehicle"
    assert slot.base_rate == Decimal("90.00")
    assert "charging" in slot.description.lower()
    assert "Fast Charger" in slot.features


def test_disabled_slot_creator():
    creator = DisabledSlotCreator()
    slot = creator.create_slot(slot_code="D-1", location_id=1)
    assert isinstance(slot, DisabledSlot)
    assert slot.slot_type == "Disabled"
    assert slot.base_rate == Decimal("40.00")
    assert "ramp" in slot.features.lower()


def test_premium_slot_creator():
    creator = PremiumSlotCreator()
    slot = creator.create_slot(slot_code="P-1", location_id=1, base_rate=Decimal("150.00"))
    assert isinstance(slot, PremiumSlot)
    assert slot.slot_type == "Premium"
    assert slot.base_rate == Decimal("150.00")
    assert "valet" in slot.features.lower()


def test_creator_registry_resolution():
    assert isinstance(get_creator("regular"), RegularSlotCreator)
    assert isinstance(get_creator("Electric Vehicle"), EVSlotCreator)
    assert isinstance(get_creator("ev"), EVSlotCreator)
    assert isinstance(get_creator("disabled"), DisabledSlotCreator)
    assert isinstance(get_creator("premium"), PremiumSlotCreator)


def test_unknown_slot_type_rejection():
    with pytest.raises(UnknownSlotTypeError) as exc:
        get_creator("HovercraftBay")
    assert "Unknown slot type 'HovercraftBay'" in str(exc.value)

    with pytest.raises(UnknownSlotTypeError):
        get_creator("")
