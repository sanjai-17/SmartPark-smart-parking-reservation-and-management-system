import pytest
from decimal import Decimal
from app.patterns.strategy import (
    PricingSession,
    DurationPricing,
    VehicleTypePricing,
    LocationPricing,
    PricingContext,
    get_pricing_strategy,
    InvalidPricingInputError,
    UnknownPricingStrategyError,
)


def test_duration_pricing_under_four_hours():
    strategy = DurationPricing()
    session = PricingSession(
        duration_hours=Decimal("2.5"),
        base_rate=Decimal("100.00"),
    )
    result = strategy.calculate(session)
    # 2.5 * 100 = 250.00
    assert result.final_amount == Decimal("250.00")
    assert result.breakdown["first_tier_hours"] == 2.5
    assert result.breakdown["excess_hours"] == 0.0


def test_duration_pricing_exactly_four_hours():
    strategy = DurationPricing()
    session = PricingSession(
        duration_hours=Decimal("4.0"),
        base_rate=Decimal("50.00"),
    )
    result = strategy.calculate(session)
    # 4.0 * 50 = 200.00
    assert result.final_amount == Decimal("200.00")
    assert result.breakdown["excess_hours"] == 0.0


def test_duration_pricing_over_four_hours():
    strategy = DurationPricing()
    session = PricingSession(
        duration_hours=Decimal("6.0"),
        base_rate=Decimal("100.00"),
    )
    result = strategy.calculate(session)
    # First 4 hrs: 4 * 100 = 400
    # Next 2 hrs at 70%: 2 * 70 = 140
    # Total = 540.00
    assert result.final_amount == Decimal("540.00")
    assert result.breakdown["first_tier_hours"] == 4.0
    assert result.breakdown["excess_hours"] == 2.0


def test_vehicle_type_pricing_bike():
    strategy = VehicleTypePricing()
    session = PricingSession(
        duration_hours=Decimal("3.0"),
        base_rate=Decimal("80.00"),
        vehicle_type="Bike",
    )
    # 3 * 80 * 0.5 = 120.00
    result = strategy.calculate(session)
    assert result.final_amount == Decimal("120.00")


def test_vehicle_type_pricing_car():
    strategy = VehicleTypePricing()
    session = PricingSession(
        duration_hours=Decimal("3.0"),
        base_rate=Decimal("80.00"),
        vehicle_type="Car",
    )
    # 3 * 80 * 1.0 = 240.00
    result = strategy.calculate(session)
    assert result.final_amount == Decimal("240.00")


def test_vehicle_type_pricing_suv():
    strategy = VehicleTypePricing()
    session = PricingSession(
        duration_hours=Decimal("3.0"),
        base_rate=Decimal("80.00"),
        vehicle_type="SUV",
    )
    # 3 * 80 * 1.5 = 360.00
    result = strategy.calculate(session)
    assert result.final_amount == Decimal("360.00")


def test_location_pricing_suburb():
    strategy = LocationPricing()
    session = PricingSession(
        duration_hours=Decimal("4.0"),
        base_rate=Decimal("50.00"),
        location_zone="Suburb",
    )
    # 4 * 50 * 1.0 = 200.00
    result = strategy.calculate(session)
    assert result.final_amount == Decimal("200.00")


def test_location_pricing_city_centre():
    strategy = LocationPricing()
    session = PricingSession(
        duration_hours=Decimal("4.0"),
        base_rate=Decimal("50.00"),
        location_zone="City Centre",
    )
    # 4 * 50 * 1.5 = 300.00
    result = strategy.calculate(session)
    assert result.final_amount == Decimal("300.00")


def test_location_pricing_airport():
    strategy = LocationPricing()
    session = PricingSession(
        duration_hours=Decimal("4.0"),
        base_rate=Decimal("50.00"),
        location_zone="Airport",
    )
    # 4 * 50 * 2.0 = 400.00
    result = strategy.calculate(session)
    assert result.final_amount == Decimal("400.00")


def test_pricing_strategy_registry_and_context():
    context = PricingContext()
    context.set_strategy_by_name("vehicletype")
    assert isinstance(context.strategy, VehicleTypePricing)

    context.set_strategy_by_name("location")
    assert isinstance(context.strategy, LocationPricing)

    with pytest.raises(UnknownPricingStrategyError):
        get_pricing_strategy("UnknownStrategy")


def test_negative_rates_and_durations_rejected():
    with pytest.raises(Exception):
        PricingSession(
            duration_hours=Decimal("-2.0"),
            base_rate=Decimal("50.00"),
        )

    with pytest.raises(Exception):
        PricingSession(
            duration_hours=Decimal("2.0"),
            base_rate=Decimal("-50.00"),
        )
