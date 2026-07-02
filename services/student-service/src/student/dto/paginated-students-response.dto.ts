import { Expose, Type } from 'class-transformer';
import { StudentProfileResponseDto } from './student-profile-response.dto';

export class PaginatedStudentsResponseDto {
  @Expose()
  @Type(() => StudentProfileResponseDto)
  data: StudentProfileResponseDto[];

  @Expose()
  total: number;

  @Expose()
  page: number;

  @Expose()
  limit: number;

  @Expose()
  totalPages: number;
}
