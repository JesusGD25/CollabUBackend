import { Expose, Type } from 'class-transformer';

export class SkillResponseDto {
  @Expose() id: string;
  @Expose() name: string;
  @Expose() category: string;
  @Expose() proficiencyLevel: string;
  @Expose() yearsOfExperience: number;
  @Expose() isVerified: boolean;
  @Expose() displayOrder: number;
}

export class ExperienceResponseDto {
  @Expose() id: string;
  @Expose() type: string;
  @Expose() title: string;
  @Expose() companyName: string | null;
  @Expose() companyId: string | null;
  @Expose() description: string | null;
  @Expose() responsibilities: string | null;
  @Expose() startDate: Date;
  @Expose() endDate: Date | null;
  @Expose() isCurrent: boolean;
  @Expose() location: string | null;
  @Expose() workMode: string | null;
  @Expose() achievements: string[] | null;
  @Expose() technologiesUsed: string[] | null;
  @Expose() displayOrder: number;
}

export class EducationResponseDto {
  @Expose() id: string;
  @Expose() institution: string;
  @Expose() degree: string;
  @Expose() fieldOfStudy: string | null;
  @Expose() description: string | null;
  @Expose() startDate: Date;
  @Expose() endDate: Date | null;
  @Expose() isCurrent: boolean;
  @Expose() gpa: number | null;
  @Expose() achievements: string[] | null;
  @Expose() thesisTitle: string | null;
  @Expose() displayOrder: number;
}

export class CertificationResponseDto {
  @Expose() id: string;
  @Expose() name: string;
  @Expose() issuingOrganization: string;
  @Expose() description: string | null;
  @Expose() issueDate: Date;
  @Expose() expirationDate: Date | null;
  @Expose() isPermanent: boolean;
  @Expose() credentialId: string | null;
  @Expose() credentialUrl: string | null;
  @Expose() skillsAssociated: string[] | null;
  @Expose() displayOrder: number;
}

export class LanguageResponseDto {
  @Expose() id: string;
  @Expose() language: string;
  @Expose() proficiency: string;
  @Expose() isNative: boolean;
  @Expose() certificationName: string | null;
  @Expose() certificationScore: string | null;
  @Expose() displayOrder: number;
}

export class InterestResponseDto {
  @Expose() id: string;
  @Expose() area: string;
  @Expose() subArea: string | null;
  @Expose() description: string | null;
  @Expose() priority: number;
  @Expose() displayOrder: number;
}

export class StudentProfileResponseDto {
  @Expose() id: string;
  @Expose() userId: string;
  @Expose() program: string;
  @Expose() faculty: string;
  @Expose() semester: number;
  @Expose() studentCode: string | null;
  @Expose() enrollmentYear: number | null;
  @Expose() expectedGraduationYear: number | null;
  @Expose() gpa: number | null;
  @Expose() totalCreditsCompleted: number;
  @Expose() totalCreditsRequired: number | null;
  @Expose() bio: string | null;
  @Expose() headline: string | null;
  @Expose() cvUrl: string | null;
  @Expose() portfolioUrl: string | null;
  @Expose() githubUrl: string | null;
  @Expose() personalWebsiteUrl: string | null;
  @Expose() availability: string;
  @Expose() preferredWorkMode: string | null;
  @Expose() availableHoursPerWeek: number | null;
  @Expose() willingToRelocate: boolean;
  @Expose() hasCompletedInternship: boolean;
  @Expose() internshipCount: number;
  @Expose() averageRating: number;
  @Expose() totalRatings: number;
  @Expose() profileCompleteness: number;
  @Expose() isVisible: boolean;
  @Expose() lastCvGeneratedAt: Date | null;
  @Expose() createdAt: Date;
  @Expose() updatedAt: Date;

  @Expose() @Type(() => SkillResponseDto)
  skills: SkillResponseDto[];

  @Expose() @Type(() => ExperienceResponseDto)
  experiences: ExperienceResponseDto[];

  @Expose() @Type(() => EducationResponseDto)
  education: EducationResponseDto[];

  @Expose() @Type(() => CertificationResponseDto)
  certifications: CertificationResponseDto[];

  @Expose() @Type(() => LanguageResponseDto)
  languages: LanguageResponseDto[];

  @Expose() @Type(() => InterestResponseDto)
  interests: InterestResponseDto[];
}
