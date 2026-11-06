from fastapi import APIRouter
from app.schemas.schemas import PricingEstimateRequest, PricingEstimateResponse
from app.services.pricing_service import PricingService

router = APIRouter(prefix="/pricing", tags=["Pricing"])


@router.post("/estimate", response_model=PricingEstimateResponse)
def estimate_pricing(request: PricingEstimateRequest):
    """
    Calculates estimated parking charge using the Strategy pattern.
    Supports DurationPricing, VehicleTypePricing, and LocationPricing strategies.
    """
    return PricingService.calculate_estimate(request)
