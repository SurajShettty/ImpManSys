"""Client-level analytics: average time-to-go-live and per-module bottleneck
analysis, computed from whatever date/status fields are actually populated
today rather than fields that are mostly blank (see module docstring notes
inline below for why each metric is defined the way it is).
"""
from datetime import date

from sqlalchemy.orm import Session

from app import models

OPEN_ACTIVITY_STATUSES_EXCLUDED = ("Completed", "Cancelled")


def _scoped_clients(db: Session, client_ids: set[int] | None) -> list[models.Client]:
    query = db.query(models.Client).filter(models.Client.is_deleted == False)
    if client_ids is not None:
        query = query.filter(models.Client.id.in_(client_ids))
    return query.all()


def time_to_go_live(db: Session, client_ids: set[int] | None) -> dict:
    """For clients that have gone live (implementation_state == "Go Live"),
    the span from kickoff to go-live, using the most reliable field
    available - real go_live_date/kickoff_meeting_date first, falling back
    to phase dates (much better populated in practice) or record timestamps
    as a last resort. Each result is labeled with which basis produced it.
    """
    included = []
    excluded = []

    for client in _scoped_clients(db, client_ids):
        if client.implementation_state != "Go Live":
            continue

        phases = sorted(
            (p for p in client.phases if not p.is_deleted),
            key=lambda p: p.created_at,
        )

        start_date, start_basis = None, None
        if client.kickoff_meeting_date:
            start_date, start_basis = client.kickoff_meeting_date, "kickoff_meeting_date"
        elif phases and phases[0].start_date:
            start_date, start_basis = phases[0].start_date, "phase span"
        elif phases:
            start_date, start_basis = phases[0].created_at.date(), "phase span"

        end_date, end_basis = None, None
        if client.go_live_date:
            end_date, end_basis = client.go_live_date, "go_live_date"
        elif client.billing_date:
            end_date, end_basis = client.billing_date, "billing_date"
        elif phases and phases[-1].end_date:
            end_date, end_basis = phases[-1].end_date, "phase span"
        elif phases:
            end_date, end_basis = phases[-1].updated_at.date(), "phase span"

        if start_date is None or end_date is None:
            excluded.append({"client_id": client.id, "client_name": client.name, "reason": "No usable dates"})
            continue

        days = (end_date - start_date).days
        if days < 0:
            excluded.append({"client_id": client.id, "client_name": client.name, "reason": "Dates out of order"})
            continue

        basis = start_basis if start_basis == end_basis else f"{start_basis} → {end_basis}"
        included.append({
            "client_id": client.id,
            "client_name": client.name,
            "days": days,
            "start_date": start_date,
            "end_date": end_date,
            "basis": basis,
        })

    average_days = round(sum(r["days"] for r in included) / len(included), 1) if included else None
    return {"average_days": average_days, "included": included, "excluded": excluded}


def module_bottlenecks(db: Session, client_ids: set[int] | None) -> list[dict]:
    """Per catalogue module, across every phase it's used in (for in-scope
    clients): completion rate and how often it's currently stuck with
    overdue activities. Duration-based "average days late" isn't computable
    today - Activity has no start_date populated at all - so this ranks by
    what the data actually supports.
    """
    today = date.today()
    modules = db.query(models.Module).filter(models.Module.is_deleted == False).all()

    results = []
    for module in modules:
        phase_modules = [
            pm for pm in db.query(models.PhaseModule).filter(
                models.PhaseModule.module_id == module.id,
                models.PhaseModule.is_deleted == False,
            ).all()
            if not pm.phase.is_deleted
            and not pm.phase.client.is_deleted
            and (client_ids is None or pm.phase.client_id in client_ids)
        ]
        if not phase_modules:
            continue

        instance_count = len(phase_modules)
        completed_count = sum(1 for pm in phase_modules if pm.status == "Completed")

        overdue_activity_count = 0
        for pm in phase_modules:
            for activity in pm.activities:
                if (
                    not activity.is_deleted
                    and activity.due_date
                    and activity.due_date <= today
                    and activity.status not in OPEN_ACTIVITY_STATUSES_EXCLUDED
                ):
                    overdue_activity_count += 1

        results.append({
            "module_id": module.id,
            "module_name": module.name,
            "instance_count": instance_count,
            "completed_count": completed_count,
            "completion_rate": round(completed_count / instance_count * 100, 1),
            "stuck_count": instance_count - completed_count,
            "overdue_activity_count": overdue_activity_count,
        })

    results.sort(key=lambda r: (-r["overdue_activity_count"], -r["stuck_count"]))
    return results
