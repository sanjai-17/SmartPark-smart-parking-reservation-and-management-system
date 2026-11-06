from decimal import Decimal
from fastapi import HTTPException, status

from app.schemas.schemas import PricingEstimateRequest, PricingEstimateResponse
from app.patterns.strategy import (
    PricingSession,
    get_pricing_strategy,
    InvalidPricingInputError,
    UnknownPricingStrategyError,
)


class PricingService:
    @staticmethod
    def calculate_estimate(request: PricingEstimateRequest) -> PricingEstimateResponse:
        """
        Calculates parking pricing estimate using the Strategy design pattern.
        Selects the appropriate pricing strategy algorithm dynamically.
        """
        try:
            strategy = get_pricing_strategy(request.pricing_strategy)
        except UnknownPricingStrategyError as e:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=str(e),
            )

        session = PricingSession(
            duration_hours=request.duration_hours,
            base_rate=request.base_rate,
            vehicle_type=request.vehicle_type,
            location_zone=request.location_zone,
        )

        try:
            result = strategy.calculate(session)
        except InvalidPricingInputError as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(e),
            )

        return PricingEstimateResponse(
            strategy_name=result.strategy_name,
            duration_hours=result.duration_hours,
            base_rate=result.base_rate,
            final_amount=result.final_amount,
            breakdown=result.breakdown,
            formula_description=result.formula_description,
        )
