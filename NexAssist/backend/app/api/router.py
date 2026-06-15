from fastapi import APIRouter

from app.api.v1 import agent, companies, feedback, health, ingestion, manuals, media, products, sessions


router = APIRouter()
router.include_router(health.router, prefix="/api/v1/health", tags=["health"])
router.include_router(companies.router, prefix="/api/v1/companies", tags=["companies"])
router.include_router(products.router, prefix="/api/v1/products", tags=["products"])
router.include_router(manuals.router, prefix="/api/v1/manuals", tags=["manuals"])
router.include_router(ingestion.router, prefix="/api/v1/ingestion", tags=["ingestion"])
router.include_router(sessions.router, prefix="/api/v1/sessions", tags=["sessions"])
router.include_router(agent.router, prefix="/api/v1/agent", tags=["agent"])
router.include_router(media.router, prefix="/api/v1/media", tags=["media"])
router.include_router(feedback.router, prefix="/api/v1/feedback", tags=["feedback"])
