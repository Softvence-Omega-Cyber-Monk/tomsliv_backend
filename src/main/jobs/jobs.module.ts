import { Module } from '@nestjs/common';
import { JobsController } from './jobs.controller';
import { GetAllJobsService } from './services/get-all-jobs.service';
import { JobService } from './services/job.service';

@Module({
  controllers: [JobsController],
  providers: [JobService, GetAllJobsService],
})
export class JobsModule {}
