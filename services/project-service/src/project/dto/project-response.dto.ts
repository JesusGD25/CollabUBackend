import {
  ProjectType,
  ProjectStatus,
  LocationType,
  CompensationType,
} from '../entities/project.entity';

export class ProjectResponseDto {
  id: string;
  companyId: string;
  createdByUserId: string;
  title: string;
  slug: string;
  description: string;
  shortDescription?: string;
  projectType: ProjectType;
  status: ProjectStatus;
  durationMonths?: number;
  startDate?: Date;
  endDate?: Date;
  locationType?: LocationType;
  location?: string;
  compensationType?: CompensationType;
  compensationAmount?: number;
  currency: string;
  positionsAvailable: number;
  positionsFilled: number;
  applicationDeadline?: Date;
  academicProgram?: string;
  minimumSemester?: number;
  isActive: boolean;
  isFeatured: boolean;
  viewsCount: number;
  applicationsCount: number;
  createdAt: Date;
  updatedAt: Date;
  requirements?: any[];
  deliverables?: any[];
  tags?: any[];
  activities?: any[];
}

export class PaginatedProjectsResponseDto {
  data: ProjectResponseDto[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
