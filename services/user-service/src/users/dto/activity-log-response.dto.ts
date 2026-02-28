import { Expose } from 'class-transformer';

export class ActivityLogResponseDto {
  @Expose()
  id: string;

  @Expose()
  userId: string;

  @Expose()
  activityType: string;

  @Expose()
  description: string | null;

  @Expose()
  metadata: Record<string, any> | null;

  @Expose()
  ipAddress: string | null;

  @Expose()
  createdAt: Date;
}

export class PaginatedActivityLogResponseDto {
  @Expose()
  data: ActivityLogResponseDto[];

  @Expose()
  total: number;

  @Expose()
  page: number;

  @Expose()
  limit: number;

  @Expose()
  totalPages: number;
}
