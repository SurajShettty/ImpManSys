from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app import models
from app.dependencies import require_permission
from app.services.access import accessible_client_ids
from app.services import analytics

router = APIRouter()


@router.get("/summary")
def analytics_summary(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_permission("dashboard.view")),
):
    client_ids = accessible_client_ids(db, current_user)
    return {
        "time_to_go_live": analytics.time_to_go_live(db, client_ids),
        "module_bottlenecks": analytics.module_bottlenecks(db, client_ids),
    }
