"""Implementation template generation and progress roll-up.

The standard module implementation template mirrors
docs/Implementation_Management_System_SOP.md section 6.
"""
from sqlalchemy.orm import Session
from app import models

# Section 6 - Standard Module Implementation Template.
# Each phase maps to its default set of tasks.
STANDARD_TEMPLATE: list[tuple[str, list[str]]] = [
    ("Kickoff", [
        "Requirement Gathering",
        "Stakeholder Identification",
        "Scope Confirmation",
        "Timeline Approval",
    ]),
    ("Configuration", [
        "System Configuration",
        "User Roles",
        "Permissions",
        "Academic Setup",
    ]),
    ("Data Preparation", [
        "Student Import",
        "Faculty Import",
        "Programme Mapping",
        "Timetable Upload",
    ]),
    ("Testing", [
        "Functional Testing",
        "UAT",
        "Issue Resolution",
    ]),
    ("Training", [
        "Admin Training",
        "Faculty Training",
        "Student Orientation",
    ]),
    ("Go-Live", [
        "Production Enablement",
        "Monitoring",
    ]),
    ("Hypercare", [
        "Daily Monitoring",
        "Bug Fixes",
        "Client Support",
    ]),
]

# A completed task contributes 100%; anything else contributes its own progress.
COMPLETED_STATUS = "Completed"


def generate_module_plan(db: Session, project_module: models.ProjectModule) -> None:
    """Create the standard phases and tasks for a freshly-added project module.

    Objects are added to the session but not committed; the caller commits.
    """
    for sequence, (phase_name, task_titles) in enumerate(STANDARD_TEMPLATE, start=1):
        phase = models.Phase(
            project_module=project_module,
            name=phase_name,
            sequence=sequence,
        )
        db.add(phase)
        for title in task_titles:
            db.add(models.Task(phase=phase, title=title))


def _task_progress(task: models.Task) -> float:
    if task.status == COMPLETED_STATUS:
        return 100.0
    return task.progress or 0.0


def recompute_project_module_progress(
    db: Session, project_module: models.ProjectModule
) -> None:
    """Roll task progress up to the project module, then to the project.

    Cancelled tasks are excluded from the overall progress calculation.
    """
    tasks = [
        t
        for phase in project_module.phases
        for t in phase.tasks
        if t.status != "Cancelled" and not t.is_deleted
    ]
    if tasks:
        project_module.progress = round(
            sum(_task_progress(t) for t in tasks) / len(tasks), 2
        )
    else:
        project_module.progress = 0.0

    if project_module.progress >= 100:
        project_module.status = "Completed"
    elif project_module.progress > 0:
        project_module.status = "In Progress"
    else:
        project_module.status = "Not Started"

    recompute_project_progress(db, project_module.project)


def recompute_project_progress(db: Session, project: models.Project) -> None:
    """Average module progress into the parent project's progress and status."""
    modules = [m for m in project.project_modules if not m.is_deleted]
    if modules:
        project.progress = round(
            sum(m.progress or 0.0 for m in modules) / len(modules), 2
        )
    else:
        project.progress = 0.0

    # Derive status from progress, mirroring module behaviour. "On Hold" and
    # "Cancelled" are manual overrides, so don't stomp them automatically.
    if project.status not in ("On Hold", "Cancelled"):
        if project.progress >= 100:
            project.status = "Completed"
        elif project.progress > 0:
            project.status = "In Progress"
        else:
            project.status = "Not Started"
