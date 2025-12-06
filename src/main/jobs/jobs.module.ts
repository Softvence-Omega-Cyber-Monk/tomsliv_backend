import { Module } from '@nestjs/common';
import { JobsController } from './controllers/jobs.controller';
import { GetAllJobsService } from './services/get-all-jobs.service';
import { JobService } from './services/job.service';
import { GetAllJobsController } from './controllers/get-all-jobs.controller';

@Module({
  controllers: [JobsController, GetAllJobsController],
  providers: [JobService, GetAllJobsService],
})
export class JobsModule {}
