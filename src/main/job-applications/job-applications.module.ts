import { Module } from '@nestjs/common';
import { JobApplicationsController } from './controllers/job-applications.controller';
import { GetFarmOwnerApplicationsService } from './services/get-farm-owner-applications.service';
import { JobApplicationsService } from './services/job-applications.service';

@Module({
  controllers: [JobApplicationsController],
  providers: [JobApplicationsService, GetFarmOwnerApplicationsService],
  exports: [JobApplicationsService, GetFarmOwnerApplicationsService],
})
export class JobApplicationsModule {}
