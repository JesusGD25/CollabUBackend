export enum ApplicationStatus {
  PENDING = 'pending',
  UNDER_REVIEW = 'under_review',
  SHORTLISTED = 'shortlisted',
  INTERVIEW = 'interview',
  ACCEPTED = 'accepted',
  PENDING_SUPERVISOR = 'pending_supervisor',
  REJECTED = 'rejected',
  WITHDRAWN = 'withdrawn',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum InterviewType {
  PHONE = 'phone',
  VIDEO = 'video',
  IN_PERSON = 'in_person',
  TECHNICAL = 'technical',
}

export enum InterviewStatus {
  SCHEDULED = 'scheduled',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  RESCHEDULED = 'rescheduled',
  NO_SHOW = 'no_show',
}

export enum InterviewResolution {
  PASSED = 'passed',
  FAILED = 'failed',
}

export enum DeliverableStatus {
  PENDING = 'pending',
  SUBMITTED = 'submitted',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  NEEDS_REVISION = 'needs_revision',
}

export enum DeliverableType {
  REPORT = 'report',
  PRESENTATION = 'presentation',
  CODE = 'code',
  DOCUMENT = 'document',
  VIDEO = 'video',
  OTHER = 'other',
}

/** Quién solicitó el entregable — determina visibilidad (la empresa no ve los del asesor). */
export enum RequesterType {
  COMPANY = 'company',
  ASESOR = 'asesor',
}
