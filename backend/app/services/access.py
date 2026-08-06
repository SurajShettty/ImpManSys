"""Row-level client visibility for scoped roles (Customer Success Manager,
Relationship Manager): they only see clients they're assigned to via
client_csms/client_rms. Every other role keeps full visibility, gated only
by their existing permission codes.

The "Client" role is scoped too, but to exactly one client (the institution
their login is linked to via User.client_id) rather than an assignment
table. It's kept out of SCOPED_ROLES because that set also drives the
internal CSM/RM "My Clients" worklist (see routers/workspace.py), which a
Client-role user should never reach.
"""
from fastapi import HTTPException
from sqlalchemy.orm import Query, Session
from app import models

SCOPED_ROLES = {"Customer Success Manager", "Relationship Manager"}


def is_scoped(user: models.User) -> bool:
    return user.role.name in SCOPED_ROLES or user.role.name == "Client"


def accessible_client_ids(db: Session, user: models.User) -> set[int] | None:
    """None means unrestricted (see everything); otherwise the client ids
    this user may access."""
    if not is_scoped(user):
        return None

    if user.role.name == "Client":
        return {user.client_id} if user.client_id is not None else set()

    csm_ids = {
        row.client_id
        for row in db.query(models.ClientCSM.client_id).filter(models.ClientCSM.user_id == user.id)
    }
    rm_ids = {
        row.client_id
        for row in db.query(models.ClientRM.client_id).filter(models.ClientRM.user_id == user.id)
    }
    return csm_ids | rm_ids


def filter_clients_query(query: Query, db: Session, user: models.User) -> Query:
    """Query must already select/filter on models.Client."""
    ids = accessible_client_ids(db, user)
    if ids is None:
        return query
    return query.filter(models.Client.id.in_(ids))


def filter_phases_query(query: Query, db: Session, user: models.User) -> Query:
    """Query must already select/filter on models.Phase."""
    ids = accessible_client_ids(db, user)
    if ids is None:
        return query
    return query.filter(models.Phase.client_id.in_(ids))


def ensure_client_access(db: Session, user: models.User, client_id: int) -> None:
    """Raise 404 if this user is scoped and not assigned to client_id.

    404 (not 403) so a restricted user can't distinguish "not assigned" from
    "doesn't exist".
    """
    ids = accessible_client_ids(db, user)
    if ids is not None and client_id not in ids:
        raise HTTPException(status_code=404, detail="Client not found")
