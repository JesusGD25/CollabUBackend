import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CompanyProfile } from './entities/company-profile.entity';
import { CompanyLocation } from './entities/company-location.entity';
import { CompanyContact } from './entities/company-contact.entity';
import { BusinessArea } from './entities/business-area.entity';

import { CompanyService } from './company.service';
import { CompanyController } from './company.controller';
import { CompanyInternalController } from './company-internal.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CompanyProfile,
      CompanyLocation,
      CompanyContact,
      BusinessArea,
    ]),
  ],
  controllers: [CompanyController, CompanyInternalController],
  providers: [CompanyService],
  exports: [CompanyService],
})
export class CompanyModule {}
