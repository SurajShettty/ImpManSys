# Database Design Document

## Core Tables

### clients

client_id (PK) name crm_id status contract_start contract_end
go_live_date

### projects

project_id (PK) client_id (FK) name type status start_date end_date
progress

### modules

module_id (PK) name category

### project_modules

project_module_id (PK) project_id (FK) module_id (FK) status progress

### phases

phase_id (PK) project_module_id (FK) name sequence

### tasks

task_id (PK) phase_id (FK) parent_task_id owner_id reviewer_id title
description priority status start_date due_date estimated_hours
actual_hours progress

### checklist_items

checklist_id (PK) task_id (FK) item completed

### task_dependencies

dependency_id (PK) task_id depends_on_task_id

### risks

risk_id project_id description impact probability owner status

### issues

issue_id project_id module_id severity status resolution

### meetings

meeting_id project_id date mom

### communication_logs

log_id project_id created_by notes

### documents

document_id project_id module_id file_name version

### notifications

notification_id user_id type status

### users

user_id name email role_id

### roles

role_id role_name

### activity_logs

log_id user_id entity action timestamp

## Relationships

Client -\> Projects -\> Modules -\> Phases -\> Tasks -\> Checklist
Projects -\> Risks Projects -\> Issues Projects -\> Meetings Projects
-\> Documents Users -\> Tasks
