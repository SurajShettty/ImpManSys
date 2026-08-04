from datetime import date, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app import models
from app.dependencies import require_role
from app.services.access import accessible_client_ids, SCOPED_ROLES

router = APIRouter()

FOLLOW_UP_LOOKAHEAD_DAYS = 14
GO_LIVE_LOOKAHEAD_DAYS = 30
OPEN_PHASE_STATUSES_EXCLUDED = ("Completed", "Cancelled")
OPEN_ACTIVITY_STATUSES_EXCLUDED = ("Completed", "Cancelled")


def _scope_clients(query, client_ids: set[int] | None):
    if client_ids is None:
        return query
    return query.filter(models.Client.id.in_(client_ids))


@router.get("/my-clients")
def my_clients_workspace(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role(*SCOPED_ROLES)),
):
    """A CSM/RM's single-page worklist: their clients, meeting follow-ups,
    overdue activities, and delayed phases - all scoped to clients assigned
    to them via client_csms/client_rms (accessible_client_ids)."""
    today = date.today()
    followup_horizon = today + timedelta(days=FOLLOW_UP_LOOKAHEAD_DAYS)
    go_live_horizon = today + timedelta(days=GO_LIVE_LOOKAHEAD_DAYS)
    client_ids = accessible_client_ids(db, current_user)

    client_query = _scope_clients(
        db.query(models.Client).filter(models.Client.is_deleted == False), client_ids
    ).order_by(models.Client.name)
    clients = client_query.all()

    client_rows = []
    for client in clients:
        phases = [p for p in client.phases if not p.is_deleted]
        progress = round(sum(p.progress or 0.0 for p in phases) / len(phases), 2) if phases else 0.0
        client_rows.append(
            {
                "id": client.id,
                "name": client.name,
                "status": client.status,
                "implementation_state": client.implementation_state,
                "priority": client.priority,
                "progress": progress,
                "phase_count": len(phases),
                "go_live_date": client.go_live_date,
                "agreed_go_live_date": client.agreed_go_live_date,
                "kickoff_meeting_date": client.kickoff_meeting_date,
                "region": client.region,
                "state": client.state,
            }
        )

    # Meeting follow-ups due within the lookahead window (includes overdue).
    meeting_rows = (
        _scope_clients(
            db.query(models.Meeting)
            .join(models.Phase, models.Meeting.phase_id == models.Phase.id)
            .join(models.Client, models.Phase.client_id == models.Client.id)
            .filter(
                models.Meeting.is_deleted == False,
                models.Phase.is_deleted == False,
                models.Client.is_deleted == False,
                models.Meeting.next_follow_up.isnot(None),
                models.Meeting.next_follow_up <= followup_horizon,
            ),
            client_ids,
        )
        .order_by(models.Meeting.next_follow_up.asc())
        .all()
    )
    follow_ups = [
        {
            "meeting_id": m.id,
            "title": m.title,
            "next_follow_up": m.next_follow_up,
            "overdue": m.next_follow_up < today,
            "due_today": m.next_follow_up == today,
            "phase_id": m.phase_id,
            "client_id": m.phase.client_id,
            "client_name": m.phase.client.name,
        }
        for m in meeting_rows
    ]

    # Activities due today or overdue across every phase of the CSM's clients.
    activity_rows = (
        _scope_clients(
            db.query(models.Activity)
            .join(models.PhaseModule, models.Activity.phase_module_id == models.PhaseModule.id)
            .join(models.Phase, models.PhaseModule.phase_id == models.Phase.id)
            .join(models.Client, models.Phase.client_id == models.Client.id)
            .filter(
                models.Activity.is_deleted == False,
                models.PhaseModule.is_deleted == False,
                models.Phase.is_deleted == False,
                models.Client.is_deleted == False,
                models.Activity.due_date.isnot(None),
                models.Activity.due_date <= today,
                models.Activity.status.notin_(OPEN_ACTIVITY_STATUSES_EXCLUDED),
            ),
            client_ids,
        )
        .order_by(models.Activity.due_date.asc())
        .all()
    )
    activities_due = [
        {
            "id": a.id,
            "title": a.title,
            "due_date": a.due_date,
            "overdue": a.due_date < today,
            "status": a.status,
            "priority": a.priority,
            "owner_name": a.owner.name if a.owner else None,
            "phase_id": a.phase_module.phase_id,
            "client_id": a.phase_module.phase.client_id,
            "client_name": a.phase_module.phase.client.name,
        }
        for a in activity_rows
    ]

    # Phases past their planned end date and not yet wrapped up.
    phase_rows = (
        _scope_clients(
            db.query(models.Phase)
            .join(models.Client, models.Phase.client_id == models.Client.id)
            .filter(
                models.Phase.is_deleted == False,
                models.Client.is_deleted == False,
                models.Phase.end_date.isnot(None),
                models.Phase.end_date < today,
                models.Phase.status.notin_(OPEN_PHASE_STATUSES_EXCLUDED),
            ),
            client_ids,
        )
        .order_by(models.Phase.end_date.asc())
        .all()
    )
    delayed_phases = [
        {
            "id": p.id,
            "name": p.name,
            "end_date": p.end_date,
            "status": p.status,
            "progress": p.progress,
            "client_id": p.client_id,
            "client_name": p.client.name,
        }
        for p in phase_rows
    ]

    go_live_soon = (
        _scope_clients(
            db.query(models.Client).filter(models.Client.is_deleted == False),
            client_ids,
        )
        .filter(
            (
                models.Client.go_live_date.isnot(None)
                & (models.Client.go_live_date >= today)
                & (models.Client.go_live_date <= go_live_horizon)
            )
            | (
                models.Client.agreed_go_live_date.isnot(None)
                & (models.Client.agreed_go_live_date >= today)
                & (models.Client.agreed_go_live_date <= go_live_horizon)
            )
        )
        .count()
    )

    return {
        "clients": client_rows,
        "follow_ups": follow_ups,
        "activities_due": activities_due,
        "delayed_phases": delayed_phases,
        "counts": {
            "clients": len(client_rows),
            "overdue_follow_ups": sum(1 for f in follow_ups if f["overdue"] or f["due_today"]),
            "activities_due": len(activities_due),
            "delayed_phases": len(delayed_phases),
            "go_live_soon": go_live_soon,
        },
    }
