from fastapi import APIRouter
from app.schemas import HealthCheck

router = APIRouter()


@router.get("/health", response_model=HealthCheck)
def health_check():
    return HealthCheck(status="ok")
