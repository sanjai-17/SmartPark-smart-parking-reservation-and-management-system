from abc import ABC, abstractmethod
from decimal import Decimal, ROUND_HALF_UP
from typing import Dict, Any, Optional
from pydantic import BaseModel, Field


class InvalidPricingInputError(ValueError):
    """Raised when duration or rate is negative or invalid."""
    pass


class UnknownPricingStrategyError(ValueError):
    """Raised when an unrecognized pricing strategy is requested."""
    pass


class PricingSession(BaseModel):
    duration_hours: Decimal = Field(..., gt=0, description="Parking duration in hours, must be positive")
    base_rate: Decimal = Field(..., ge=0, description="Base hourly rate in INR, must be non-negative")
    vehicle_type: str = Field(default="Car", description="Bike, Car, or SUV")
    location_zone: str = Field(default="City Centre", description="Suburb, City Centre, or Airport")


class PricingResult(BaseModel):
    strategy_name: str
    duration_hours: Decimal
    base_rate: Decimal
    final_amount: Decimal
    breakdown: Dict[str, Any]
    formula_description: str


class PricingStrategy(ABC):
    """Abstract Strategy interface for calculating parking fees."""
    name: str

    @abstractmethod
    def calculate(self, session: PricingSession) -> PricingResult:
        pass


def _quantize_inr(val: Decimal) -> Decimal:
    return val.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


class DurationPricing(PricingStrategy):
    """
    Tiered duration pricing strategy.
    First 4 hours charged at full base rate.
    Hours beyond 4 charged at 70% discount rate (0.7 * base_rate).
    """
    name = "Duration"

    def calculate(self, session: PricingSession) -> PricingResult:
        if session.duration_hours <= 0:
            raise InvalidPricingInputError("Duration must be greater than zero hours.")
        if session.base_rate < 0:
            raise InvalidPricingInputError("Base rate cannot be negative.")

        h = session.duration_hours
        r = session.base_rate

        first_tier_hours = min(h, Decimal("4.0"))
        excess_hours = max(h - Decimal("4.0"), Decimal("0.0"))

        tier1_cost = first_tier_hours * r
        tier2_cost = excess_hours * (r * Decimal("0.70"))
        total = _quantize_inr(tier1_cost + tier2_cost)

        return PricingResult(
            strategy_name=self.name,
            duration_hours=h,
            base_rate=r,
            final_amount=total,
            breakdown={
                "first_tier_hours": float(first_tier_hours),
                "first_tier_rate": float(r),
                "first_tier_subtotal": float(_quantize_inr(tier1_cost)),
                "excess_hours": float(excess_hours),
                "excess_discount_rate": float(_quantize_inr(r * Decimal("0.70"))),
                "excess_subtotal": float(_quantize_inr(tier2_cost)),
                "discount_applied": "30% off after 4 hours" if excess_hours > 0 else "None",
            },
            formula_description=f"min({h}, 4) * ₹{r} + max({h}-4, 0) * (₹{r} * 0.70)",
        )


class VehicleTypePricing(PricingStrategy):
    """
    Vehicle category based pricing strategy.
    Multipliers:
      Bike: 0.5
      Car: 1.0
      SUV: 1.5
    Total = H * R * vehicle_multiplier
    """
    name = "VehicleType"

    VEHICLE_MULTIPLIERS = {
        "bike": Decimal("0.5"),
        "car": Decimal("1.0"),
        "suv": Decimal("1.5"),
    }

    def calculate(self, session: PricingSession) -> PricingResult:
        if session.duration_hours <= 0:
            raise InvalidPricingInputError("Duration must be greater than zero hours.")
        if session.base_rate < 0:
            raise InvalidPricingInputError("Base rate cannot be negative.")

        veh_key = (session.vehicle_type or "").strip().lower()
        multiplier = self.VEHICLE_MULTIPLIERS.get(veh_key, Decimal("1.0"))

        raw_total = session.duration_hours * session.base_rate * multiplier
        total = _quantize_inr(raw_total)

        return PricingResult(
            strategy_name=self.name,
            duration_hours=session.duration_hours,
            base_rate=session.base_rate,
            final_amount=total,
            breakdown={
                "vehicle_type": session.vehicle_type,
                "vehicle_multiplier": float(multiplier),
                "effective_hourly_rate": float(_quantize_inr(session.base_rate * multiplier)),
                "total_hours": float(session.duration_hours),
            },
            formula_description=f"{session.duration_hours} hrs * ₹{session.base_rate} * {multiplier} ({session.vehicle_type} multiplier)",
        )


class LocationPricing(PricingStrategy):
    """
    Zone-based location pricing strategy.
    Multipliers:
      Suburb: 1.0
      City Centre: 1.5
      Airport: 2.0
    Total = H * R * location_multiplier
    """
    name = "Location"

    LOCATION_MULTIPLIERS = {
        "suburb": Decimal("1.0"),
        "city centre": Decimal("1.5"),
        "city center": Decimal("1.5"),
        "airport": Decimal("2.0"),
    }

    def calculate(self, session: PricingSession) -> PricingResult:
        if session.duration_hours <= 0:
            raise InvalidPricingInputError("Duration must be greater than zero hours.")
        if session.base_rate < 0:
            raise InvalidPricingInputError("Base rate cannot be negative.")

        loc_key = (session.location_zone or "").strip().lower()
        multiplier = self.LOCATION_MULTIPLIERS.get(loc_key, Decimal("1.0"))

        raw_total = session.duration_hours * session.base_rate * multiplier
        total = _quantize_inr(raw_total)

        return PricingResult(
            strategy_name=self.name,
            duration_hours=session.duration_hours,
            base_rate=session.base_rate,
            final_amount=total,
            breakdown={
                "location_zone": session.location_zone,
                "location_multiplier": float(multiplier),
                "effective_hourly_rate": float(_quantize_inr(session.base_rate * multiplier)),
                "total_hours": float(session.duration_hours),
            },
            formula_description=f"{session.duration_hours} hrs * ₹{session.base_rate} * {multiplier} ({session.location_zone} zone)",
        )


# Strategy Registry
_STRATEGY_REGISTRY: Dict[str, PricingStrategy] = {
    "duration": DurationPricing(),
    "vehicletype": VehicleTypePricing(),
    "vehicle_type": VehicleTypePricing(),
    "vehicle": VehicleTypePricing(),
    "location": LocationPricing(),
    "zone": LocationPricing(),
}


def get_pricing_strategy(strategy_name: str) -> PricingStrategy:
    """Retrieve pricing strategy by name."""
    if not strategy_name or not isinstance(strategy_name, str):
        raise UnknownPricingStrategyError("Strategy name must be a non-empty string.")
    
    clean_key = strategy_name.strip().lower().replace(" ", "").replace("_", "")
    strategy = _STRATEGY_REGISTRY.get(clean_key)
    if not strategy:
        valid = ["Duration", "VehicleType", "Location"]
        raise UnknownPricingStrategyError(
            f"Unknown pricing strategy '{strategy_name}'. Valid strategies: {', '.join(valid)}"
        )
    return strategy


class PricingContext:
    """Context in the Strategy pattern that delegates calculation to the chosen strategy."""
    def __init__(self, strategy: Optional[PricingStrategy] = None):
        self._strategy = strategy or DurationPricing()

    @property
    def strategy(self) -> PricingStrategy:
        return self._strategy

    @strategy.setter
    def strategy(self, strategy: PricingStrategy):
        self._strategy = strategy

    def set_strategy_by_name(self, name: str) -> None:
        self._strategy = get_pricing_strategy(name)

    def calculate(self, session: PricingSession) -> PricingResult:
        return self._strategy.calculate(session)
