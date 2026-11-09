import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule, HttpService } from '@nestjs/axios';
import { MicroserviceHttpClient } from '@collab-u/shared';

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
    HttpModule,
  ],
  controllers: [CompanyController, CompanyInternalController],
  providers: [
    CompanyService,
    {
      provide: MicroserviceHttpClient,
      useFactory: (httpService: HttpService) => new MicroserviceHttpClient(httpService as any),
      inject: [HttpService],
    },
  ],
  exports: [CompanyService],
})
export class CompanyModule {}
