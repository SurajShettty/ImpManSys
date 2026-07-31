import csv
import io
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app import models, schemas
from app.dependencies import get_current_active_user, require_permission
from app.utils.audit import log_activity
from app.services.access import ensure_client_access, filter_clients_query, is_scoped
from app.services.notifications import notify_client_assignment

router = APIRouter()

EXPORT_COLUMNS = [
    "Name", "CRM ID", "Institution Type", "Region", "State", "Priority", "Status",
    "Implementation State", "New/Recurring", "CSM", "RM", "PM", "Sales Owner",
    "Contract Start", "Contract End", "Go-Live Date", "Kickoff Meeting Date",
    "Billing/Go-Live Date", "Total Users", "Master Data Status", "Instance Link",
    "Tracker Link", "Phases",
]


def _export_row(client: models.Client) -> list:
    return [
        client.name,
        client.crm_id or "",
        client.institution_type or "",
        client.region or "",
        client.state or "",
        client.priority,
        client.status,
        client.implementation_state or "",
        client.new_recurring or "",
        "; ".join(u.name for u in client.csms),
        "; ".join(u.name for u in client.rms),
        client.pm.name if client.pm else "",
        client.sales_owner or "",
        client.contract_start or "",
        client.contract_end or "",
        client.go_live_date or "",
        client.kickoff_meeting_date or "",
        client.billing_date or "",
        client.total_users if client.total_users is not None else "",
        client.master_data_status or "",
        client.instance_link or "",
        client.tracker_link or "",
        len([p for p in client.phases if not p.is_deleted]),
    ]


def _with_counts(client: models.Client) -> models.Client:
    client.phase_count = len([p for p in client.phases if not p.is_deleted])
    return client


def _assign_relations(db: Session, client: models.Client, csm_ids: list[int], rm_ids: list[int]) -> None:
    if csm_ids:
        client.csms = db.query(models.User).filter(models.User.id.in_(csm_ids)).all()
    else:
        client.csms = []
    if rm_ids:
        client.rms = db.query(models.User).filter(models.User.id.in_(rm_ids)).all()
    else:
        client.rms = []


@router.get("/")
def list_clients(
    region: str | None = None,
    status_: str | None = Query(default=None, alias="status"),
    implementation_state: str | None = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    query = db.query(models.Client).filter(models.Client.is_deleted == False)
    query = filter_clients_query(query, db, current_user)
    if region:
        query = query.filter(models.Client.region == region)
    if status_:
        query = query.filter(models.Client.status == status_)
    if implementation_state:
        query = query.filter(models.Client.implementation_state == implementation_state)
    query = query.order_by(models.Client.name)

    total = query.count()
    clients = query.offset((page - 1) * page_size).limit(page_size).all()

    return {
        "items": [
            schemas.ClientResponse.model_validate(_with_counts(c)).model_dump()
            for c in clients
        ],
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": (total + page_size - 1) // page_size if total else 1,
    }


@router.post("/", response_model=schemas.ClientResponse, status_code=status.HTTP_201_CREATED)
def create_client(
    payload: schemas.ClientCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_permission("client.create")),
):
    data = payload.model_dump()
    csm_ids = set(data.pop("csm_ids"))
    rm_ids = set(data.pop("rm_ids"))

    # A scoped CSM/RM who creates a client shouldn't immediately lose visibility into it.
    if is_scoped(current_user):
        if current_user.role.name == "Customer Success Manager":
            csm_ids.add(current_user.id)
        elif current_user.role.name == "Relationship Manager":
            rm_ids.add(current_user.id)

    client = models.Client(**data)
    _assign_relations(db, client, list(csm_ids), list(rm_ids))
    db.add(client)
    db.commit()
    db.refresh(client)
    log_activity(db, current_user.id, "client", "create", f"Created client '{client.name}'")

    for uid in csm_ids:
        if uid != current_user.id:
            notify_client_assignment(db, client, uid, "CSM")
    for uid in rm_ids:
        if uid != current_user.id:
            notify_client_assignment(db, client, uid, "RM")

    return _with_counts(client)


@router.get("/export")
def export_clients(
    region: str | None = None,
    status_: str | None = Query(default=None, alias="status"),
    implementation_state: str | None = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    """All clients matching the current filters (no pagination), as CSV."""
    query = db.query(models.Client).filter(models.Client.is_deleted == False)
    query = filter_clients_query(query, db, current_user)
    if region:
        query = query.filter(models.Client.region == region)
    if status_:
        query = query.filter(models.Client.status == status_)
    if implementation_state:
        query = query.filter(models.Client.implementation_state == implementation_state)
    clients = query.order_by(models.Client.name).all()

    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(EXPORT_COLUMNS)
    for client in clients:
        writer.writerow(_export_row(client))

    return Response(
        content=buffer.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=clients.csv"},
    )


@router.get("/{client_id}", response_model=schemas.ClientResponse)
def get_client(
    client_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    client = db.query(models.Client).filter(models.Client.id == client_id, models.Client.is_deleted == False).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    ensure_client_access(db, current_user, client_id)
    return _with_counts(client)


@router.put("/{client_id}", response_model=schemas.ClientResponse)
def update_client(
    client_id: int,
    payload: schemas.ClientUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_permission("client.update")),
):
    client = db.query(models.Client).filter(models.Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    ensure_client_access(db, current_user, client_id)

    previous_csm_ids = {u.id for u in client.csms}
    previous_rm_ids = {u.id for u in client.rms}

    data = payload.model_dump(exclude_unset=True)
    csm_ids = data.pop("csm_ids", None)
    rm_ids = data.pop("rm_ids", None)
    for field, value in data.items():
        setattr(client, field, value)

    new_csm_ids: set[int] = set()
    new_rm_ids: set[int] = set()
    if csm_ids is not None or rm_ids is not None:
        final_csm_ids = csm_ids if csm_ids is not None else list(previous_csm_ids)
        final_rm_ids = rm_ids if rm_ids is not None else list(previous_rm_ids)
        _assign_relations(db, client, final_csm_ids, final_rm_ids)
        new_csm_ids = set(final_csm_ids) - previous_csm_ids
        new_rm_ids = set(final_rm_ids) - previous_rm_ids

    db.commit()
    db.refresh(client)
    log_activity(db, current_user.id, "client", "update", f"Updated client '{client.name}'")

    for uid in new_csm_ids:
        if uid != current_user.id:
            notify_client_assignment(db, client, uid, "CSM")
    for uid in new_rm_ids:
        if uid != current_user.id:
            notify_client_assignment(db, client, uid, "RM")

    return _with_counts(client)


@router.delete("/{client_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_client(
    client_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_permission("client.delete")),
):
    client = db.query(models.Client).filter(models.Client.id == client_id, models.Client.is_deleted == False).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    now = models.utc_now()
    client.is_deleted = True
    client.deleted_at = now
    for phase in client.phases:
        phase.is_deleted = True
        phase.deleted_at = now
        for meeting in phase.meetings:
            meeting.is_deleted = True
            meeting.deleted_at = now
        for phase_module in phase.phase_modules:
            phase_module.is_deleted = True
            phase_module.deleted_at = now
            for activity in phase_module.activities:
                activity.is_deleted = True
                activity.deleted_at = now
                for item in activity.checklist_items:
                    item.is_deleted = True
                    item.deleted_at = now

    db.commit()
    log_activity(db, current_user.id, "client", "delete", f"Deleted client #{client_id}")


@router.get("/{client_id}/meetings", response_model=List[schemas.MeetingResponse])
def list_client_meetings(
    client_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    """All meetings across all phases for this client."""
    client = db.query(models.Client).filter(models.Client.id == client_id, models.Client.is_deleted == False).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    ensure_client_access(db, current_user, client_id)

    phase_ids = [p.id for p in client.phases if not p.is_deleted]
    if not phase_ids:
        return []

    return (
        db.query(models.Meeting)
        .filter(
            models.Meeting.phase_id.in_(phase_ids),
            models.Meeting.is_deleted == False,
        )
        .order_by(models.Meeting.meeting_date.desc(), models.Meeting.created_at.desc())
        .all()
    )


@router.get("/{client_id}/phases", response_model=List[schemas.PhaseResponse])
def list_client_phases(
    client_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    client = db.query(models.Client).filter(models.Client.id == client_id, models.Client.is_deleted == False).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    ensure_client_access(db, current_user, client_id)
    phases = (
        db.query(models.Phase)
        .filter(models.Phase.client_id == client_id, models.Phase.is_deleted == False)
        .order_by(models.Phase.created_at.desc())
        .all()
    )
    return phases
