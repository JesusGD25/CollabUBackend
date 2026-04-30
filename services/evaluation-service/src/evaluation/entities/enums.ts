export enum CriterionCategory {
  TECHNICAL = 'technical',
  SOFT_SKILLS = 'soft_skills',
  PROFESSIONAL = 'professional',
  ACADEMIC = 'academic',
  GENERAL = 'general',
}

export enum EvaluationType {
  COMPANY_EVALUATES_STUDENT = 'company_evaluates_student',
  STUDENT_EVALUATES_COMPANY = 'student_evaluates_company',
  SUPERVISOR_EVALUATES_STUDENT = 'supervisor_evaluates_student',
  SELF_EVALUATION = 'self_evaluation',
}

export enum RatingScale {
  ONE_TO_FIVE = '1_to_5',
  ONE_TO_TEN = '1_to_10',
  PERCENTAGE = 'percentage',
}

export enum EvaluationStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  EXPIRED = 'expired',
}
