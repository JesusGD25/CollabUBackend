// Auth Service Events
export const AUTH_EVENTS = {
  USER_CREATED: 'auth.user.created',
  USER_VERIFIED: 'auth.user.verified',
  USER_DEACTIVATED: 'auth.user.deactivated',
} as const;

// User Service Events
export const USER_EVENTS = {
  PROFILE_UPDATED: 'user.profile.updated',
  SETTINGS_UPDATED: 'user.settings.updated',
} as const;

// Student Service Events
export const STUDENT_EVENTS = {
  PROFILE_CREATED: 'student.profile.created',
  PROFILE_UPDATED: 'student.profile.updated',
  SKILLS_UPDATED: 'student.skills.updated',
} as const;

// Company Service Events
export const COMPANY_EVENTS = {
  PROFILE_CREATED: 'company.profile.created',
  PROFILE_UPDATED: 'company.profile.updated',
  VERIFICATION_REQUESTED: 'company.verification.requested',
} as const;

// Project Service Events
export const PROJECT_EVENTS = {
  CREATED: 'project.created',
  PUBLISHED: 'project.published',
  UPDATED: 'project.updated',
  CLOSED: 'project.closed',
  CANCELLED: 'project.cancelled',
} as const;

// Application Service Events
export const APPLICATION_EVENTS = {
  CREATED: 'application.created',
  STATUS_CHANGED: 'application.status.changed',
  WITHDRAWN: 'application.withdrawn',
  DELIVERABLE_SUBMITTED: 'application.deliverable.submitted',
  DELIVERABLE_REVIEWED: 'application.deliverable.reviewed',
} as const;

// Matching Service Events
export const MATCHING_EVENTS = {
  CALCULATED: 'matching.calculated',
  BATCH_COMPLETED: 'matching.batch.completed',
  RECOMMENDATIONS_GENERATED: 'matching.recommendations.generated',
} as const;

// Evaluation Service Events
export const EVALUATION_EVENTS = {
  CREATED: 'evaluation.created',
  RESPONSE_CREATED: 'evaluation.response.created',
} as const;

// Notification Service Events
export const NOTIFICATION_EVENTS = {
  EMAIL_SENT: 'notification.email.sent',
  EMAIL_FAILED: 'notification.email.failed',
} as const;

// Chat Service Events
export const CHAT_EVENTS = {
  MESSAGE_SENT: 'chat.message.sent',
  CONVERSATION_CREATED: 'chat.conversation.created',
} as const;

// Admin Service Events
export const ADMIN_EVENTS = {
  COMPANY_VERIFIED: 'admin.company.verified',
  SUPERVISOR_ASSIGNED: 'admin.supervisor.assigned',
  PERIOD_CREATED: 'admin.period.created',
} as const;

// Storage Service Events
export const STORAGE_EVENTS = {
  FILE_UPLOADED: 'storage.file.uploaded',
  FILE_DELETED: 'storage.file.deleted',
} as const;
