"""Implementation template generation and progress roll-up.

The module template catalogue maps each predefined module to the activities that
should be auto-created when the module is added to a phase. The default Kickoff
module is created automatically for every new phase.
"""
from datetime import date

from sqlalchemy.orm import Session
from app import models

# Module name -> ordered list of default activities. Module names are taken
# from the implementation sheet supplied by the product team.
MODULE_ACTIVITY_TEMPLATES: dict[str, list[str]] = {
    "Kickoff": [
        "Requirement Gathering",
        "Stakeholder Identification",
        "Scope Confirmation",
        "Timeline Approval",
    ],
    "Master data Managament": [
        "Receiving details for Instance Configuration",
        "Configuration of Instance",
        "Receiving Department, Program and Course data",
        "Demo and Configuration of Department, program and Course data",
        "Receiving data of Faculty members and Staff",
        "Demo and Configuration of Faculty members and Staff data",
        "Demo and traning for Term Creation",
    ],
    "Admission Mangagement": [
        "Business Process Mapping",
        "Kick off meeting with CRM",
        "Sharing API for integration",
        "Defining Trigger Point to transfer data to CollPoll",
        "Share Admission Form details to CollPoll",
        "Configuration of Admission form on CollPoll as per form configured on NPF",
        "Testing of integration",
        "Demo and Training",
        "Discussion on the format of Registration iD",
        "Receiving registration ID format from the Partner",
        "Configuration of Registration No.",
        "Demo and Training",
        "Integration with ID Card printing device/PDF of student ID card",
        "Go-Live support",
    ],
    "Finance Managament": [
        "Business Process Mapping",
        "Kick off meeting withfor the gateway",
        "Receiving payment gateway details",
        "Integration with payment gateway",
        "Penny test",
        "Demo and training with Implementation of finance module",
        "Implementation of penalty",
        "Implementation of Scholarship",
        "Implementation of Installments",
        "Implementation of Dues",
        "Going live with finance module",
    ],
    "Infrastructure Management": [
        "Receiving Infrastructure Data",
        "Infrastructure Configuration",
        "Demo and Training",
        "Data to be configured for all venues",
        "Demo and Training for Venue booking",
    ],
    "Institutional Calendar": [
        "Demo of the functionality",
    ],
    "Academic Management System": [
        "Business Process Mapping",
        "Curriculum/Learning Pathway Management",
        "Outcome-Based Education",
        "Choice-based Credit System",
        "Time-table Management",
        "Attendance Management",
    ],
    "Feedback Management": [
        "Demo and Training of the functionality",
        "Template configuration",
        "Report and Analytics",
    ],
    "Examination Management System": [
        "Business Process Mapping",
        "Demo and Training of the functionality",
        "List of assesments and component to be configured",
        "CWA generation",
        "Demo and Training of the functionality",
        "Exam Schema Creation",
        "Grading Schema Creation",
        "Demo and Training of the functionality",
        "Exam Enrollment and Registration",
        "Hall Ticket Generation",
        "Demo and Training of the functionality",
        "Seating Arrangement",
        "Question Paper Configuration",
        "Answer Sheet Masking",
        "Exam Attendance Sheet",
        "Invigilator Mapping",
        "Demo and Training of the functionality",
        "Demo and Training of the functionality",
        "Demo and Training of the functionality",
    ],
    "Learning Managment System": [
        "Syllabus and Session Planning",
        "Resource Upload",
        "Quiz, Assignment and Discussion Forum",
        "Analytics and Gradebook",
    ],
    "Hostel Managament": [
        "Demo and Training of the module",
        "Hostel Allotment",
        "Go-Live support",
    ],
    "Placement and Internship": [
        "Demo and Training of the functionality",
        "Setting up Basic configurations (Registration required, Placement cycle, placement type)",
        "Bulk registration of students / registration by students",
    ],
    "Transportation Management": [
        "Demo and Training of the functionality",
        "Transport Fee Setup - Pickup point wise",
        "Route & Pickpoint selection option",
    ],
    "Member Records (student, faculty,staff,parent)": [
        "Admin Records",
        "E-Portfolio",
        "User Management",
        "Role Based Privilege Management",
    ],
    "Campus Help Center": [
        "Demo of the functionality",
        "Demo of Workflow Configuration format",
        "Configuring Workflow",
    ],
    "HR Management": [
        "Biometric Integration",
        "Attendance Management",
        "Leave Management",
    ],
    "Booth Mangmeent": [
        "Feed",
    ],
    "Koha": [
        "Integration",
    ],
}


# A completed activity contributes 100%; anything else contributes its own progress.
COMPLETED_STATUS = "Completed"


def _ensure_module(db: Session, name: str, category: str | None = None) -> models.Module:
    """Return the master-catalogue module, creating it if it does not exist."""
    module = db.query(models.Module).filter(models.Module.name == name, models.Module.is_deleted == False).first()
    if not module:
        module = models.Module(name=name, category=category)
        db.add(module)
        db.flush()
    return module


def _create_phase_module_with_activities(
    db: Session, phase: models.Phase, module_name: str, category: str | None = None
) -> models.PhaseModule:
    """Create a phase module instance and generate its default activities."""
    module = _ensure_module(db, module_name, category)
    phase_module = models.PhaseModule(phase=phase, module=module)
    db.add(phase_module)
    db.flush()
    _generate_activities_for_module(db, phase_module)
    return phase_module


def _generate_activities_for_module(db: Session, phase_module: models.PhaseModule) -> None:
    """Create default activities for a module instance based on its template."""
    module_name = phase_module.module.name
    titles = MODULE_ACTIVITY_TEMPLATES.get(module_name, [])
    for seq, title in enumerate(titles, start=1):
        db.add(
            models.Activity(
                phase_module=phase_module,
                title=title,
                sequence=seq,
            )
        )
    db.flush()
    recompute_client_kickoff_date(db, phase_module.phase.client)


def recompute_client_kickoff_date(db: Session, client: models.Client | None) -> None:
    """Stamp the client's kickoff date with when their first-ever activity was created.

    Only fills in a blank date - it won't override one set manually on the
    client (e.g. at client creation).
    """
    if not client or client.is_deleted or client.kickoff_meeting_date is not None:
        return

    first_activity = (
        db.query(models.Activity)
        .join(models.PhaseModule, models.Activity.phase_module_id == models.PhaseModule.id)
        .join(models.Phase, models.PhaseModule.phase_id == models.Phase.id)
        .filter(models.Phase.client_id == client.id, models.Activity.is_deleted == False)
        .order_by(models.Activity.created_at.asc(), models.Activity.id.asc())
        .first()
    )
    if first_activity:
        client.kickoff_meeting_date = first_activity.created_at.date()


def recompute_phase_start_date(db: Session, phase: models.Phase | None) -> None:
    """Stamp the phase's start date the first time any of its activities leaves 'Not Started'.

    Only fills in a blank date - it won't override one set manually.
    """
    if not phase or phase.is_deleted or phase.start_date is not None:
        return

    phase.start_date = date.today()


def create_default_kickoff_module(db: Session, phase: models.Phase) -> None:
    """Every phase gets a Kickoff module with the standard onboarding activities."""
    _create_phase_module_with_activities(db, phase, "Kickoff", "Onboarding")
    recompute_phase_progress(db, phase)


def add_module_to_phase(
    db: Session, phase: models.Phase, module: models.Module
) -> models.PhaseModule:
    """Add a selected module to a phase and generate its default activities."""
    phase_module = models.PhaseModule(phase=phase, module=module)
    db.add(phase_module)
    db.flush()
    _generate_activities_for_module(db, phase_module)
    recompute_phase_module_progress(db, phase_module)
    recompute_phase_progress(db, phase)
    return phase_module


def _activity_progress(activity: models.Activity) -> float:
    if activity.status == COMPLETED_STATUS:
        return 100.0
    return activity.progress or 0.0


def recompute_phase_module_progress(
    db: Session, phase_module: models.PhaseModule
) -> None:
    """Roll activity progress up to the module, then to the parent phase.

    Cancelled activities are excluded from the overall progress calculation.
    """
    activities = [
        a
        for a in phase_module.activities
        if a.status != "Cancelled" and not a.is_deleted
    ]
    if activities:
        phase_module.progress = round(
            sum(_activity_progress(a) for a in activities) / len(activities), 2
        )
    else:
        phase_module.progress = 0.0

    if phase_module.progress >= 100:
        phase_module.status = "Completed"
    elif phase_module.progress > 0:
        phase_module.status = "In Progress"
    else:
        phase_module.status = "Not Started"

    recompute_phase_progress(db, phase_module.phase)


def recompute_phase_progress(db: Session, phase: models.Phase) -> None:
    """Average module progress into the parent phase's progress and status."""
    modules = [m for m in phase.phase_modules if not m.is_deleted]
    if modules:
        phase.progress = round(
            sum(m.progress or 0.0 for m in modules) / len(modules), 2
        )
    else:
        phase.progress = 0.0

    # Derive status from progress, mirroring module behaviour. "On Hold" and
    # "Cancelled" are manual overrides, so don't stomp them automatically.
    if phase.status not in ("On Hold", "Cancelled"):
        if phase.progress >= 100:
            phase.status = "Completed"
        elif phase.progress > 0:
            phase.status = "In Progress"
        else:
            phase.status = "Not Started"

    recompute_client_implementation_state(db, phase.client)


def recompute_client_implementation_state(
    db: Session, client: models.Client | None
) -> None:
    """Derive implementation state / status from phase progress.

    All phases at 100% -> Go Live / Completed, stamping billing_date (the
    "Billing / Go-Live Date") with today's date the moment the client first
    reaches that state. Any phase with progress but not all complete (e.g. a
    new phase/module was added after completion) -> Ongoing / Active.
    "Churned", "On Hold", and "Cancelled" are manual overrides, so don't
    stomp them.
    """
    if not client or client.is_deleted:
        return

    if client.status in ("Churned", "On Hold", "Cancelled"):
        return

    phases = [p for p in client.phases if not p.is_deleted]
    if not phases:
        return

    if all(phase.progress >= 100 for phase in phases):
        if client.status != "Completed":
            client.billing_date = date.today()
        client.implementation_state = "Go Live"
        client.status = "Completed"
    elif any(phase.progress > 0 for phase in phases):
        client.implementation_state = "Ongoing"
        client.status = "Active"
