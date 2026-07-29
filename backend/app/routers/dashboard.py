from datetime import date
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app import models
from app.dependencies import get_current_active_user, require_permission

router = APIRouter()

ACTIVE_PHASE_STATUSES = ("Not Started", "In Progress", "On Hold")


@router.get("/summary")
def dashboard_summary(
    client_status: str | None = Query(default=None),
    region: str | None = Query(default=None),
    phase_status: str | None = Query(default=None),
    owner_id: int | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_permission("dashboard.view")),
):
    """Management dashboard cards (SOP section 16 / UI-UX dashboard)."""
    today = date.today()
    month_start = today.replace(day=1)
    if today.month == 12:
        next_month = today.replace(year=today.year + 1, month=1, day=1)
    else:
        next_month = today.replace(month=today.month + 1, day=1)

    client_query = db.query(models.Client).filter(models.Client.is_deleted == False)
    if client_status:
        client_query = client_query.filter(models.Client.status == client_status)
    if region:
        client_query = client_query.filter(models.Client.region == region)
    if owner_id is not None:
        client_query = client_query.filter(
            (models.Client.csm_id == owner_id) | (models.Client.pm_id == owner_id)
        )

    phase_query = db.query(models.Phase).join(models.Client).filter(
        models.Phase.is_deleted == False,
        models.Client.is_deleted == False,
    )
    if client_status:
        phase_query = phase_query.filter(models.Client.status == client_status)
    if region:
        phase_query = phase_query.filter(models.Client.region == region)
    if owner_id is not None:
        phase_query = phase_query.filter(
            (models.Client.csm_id == owner_id) | (models.Client.pm_id == owner_id)
        )
    if phase_status:
        phase_query = phase_query.filter(models.Phase.status == phase_status)

    total_clients = client_query.count()
    total_phases = phase_query.count()

    active_phases = (
        phase_query
        .filter(models.Phase.status.in_(ACTIVE_PHASE_STATUSES))
        .count()
    )

    # Delayed: not completed and past its planned end date.
    delayed_phases = (
        phase_query
        .filter(
            models.Phase.status != "Completed",
            models.Phase.status != "Cancelled",
            models.Phase.end_date.isnot(None),
            models.Phase.end_date < today,
        )
        .count()
    )

    go_live_this_month = (
        client_query
        .filter(
            models.Client.go_live_date.isnot(None),
            models.Client.go_live_date >= month_start,
            models.Client.go_live_date < next_month,
        )
        .count()
    )

    return {
        "total_clients": total_clients,
        "total_phases": total_phases,
        "active_phases": active_phases,
        "delayed_phases": delayed_phases,
        "go_live_this_month": go_live_this_month,
    }
