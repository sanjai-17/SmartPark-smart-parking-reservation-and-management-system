from fastapi import APIRouter
from app.api.v1.health import router as health_router
from app.api.v1.dashboard import router as dashboard_router
from app.api.v1.locations import router as locations_router
from app.api.v1.slots import router as slots_router
from app.api.v1.pricing import router as pricing_router
from app.api.v1.reservations import router as reservations_router
from app.api.v1.payments import router as payments_router
from app.api.v1.notifications import router as notifications_router
from app.api.v1.activity import router as activity_router

api_router = APIRouter()
api_router.include_router(health_router)
api_router.include_router(dashboard_router)
api_router.include_router(locations_router)
api_router.include_router(slots_router)
api_router.include_router(pricing_router)
api_router.include_router(reservations_router)
api_router.include_router(payments_router)
api_router.include_router(notifications_router)
api_router.include_router(activity_router)
