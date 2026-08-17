export enum MatchFactor {
  SKILLS_MATCH = 'skills_match',
  PROFICIENCY_MATCH = 'proficiency_match',
  PROGRAM_MATCH = 'program_match',
  SEMESTER_MATCH = 'semester_match',
  AVAILABILITY_MATCH = 'availability_match',
  LANGUAGE_MATCH = 'language_match',
}

export enum WeightScope {
  GLOBAL = 'global',
  COMPANY = 'company',
  PROJECT = 'project',
}

export enum CompatibilityLevel {
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
}

export enum TargetType {
  STUDENT = 'student',
  COMPANY = 'company',
}

export enum RecommendationType {
  PROJECT_FOR_STUDENT = 'project_for_student',
  STUDENT_FOR_PROJECT = 'student_for_project',
}

export enum FeedbackType {
  HELPFUL = 'helpful',
  NOT_HELPFUL = 'not_helpful',
  WRONG = 'wrong',
}
