import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { StudentProfile } from './entities/student-profile.entity';
import { Skill } from './entities/skill.entity';
import { Experience } from './entities/experience.entity';
import { Education } from './entities/education.entity';
import { Certification } from './entities/certification.entity';
import { Language } from './entities/language.entity';
import { Interest } from './entities/interest.entity';

import { StudentService } from './student.service';
import { StudentController } from './student.controller';
import { StudentInternalController } from './student-internal.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      StudentProfile,
      Skill,
      Experience,
      Education,
      Certification,
      Language,
      Interest,
    ]),
  ],
  controllers: [StudentController, StudentInternalController],
  providers: [StudentService],
  exports: [StudentService],
})
export class StudentModule {}
