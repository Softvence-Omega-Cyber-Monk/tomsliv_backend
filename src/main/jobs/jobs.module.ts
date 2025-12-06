import { Module } from '@nestjs/common';
import { GetAllJobsController } from './controllers/get-all-jobs.controller';
import { JobsController } from './controllers/jobs.controller';
import { GetAllJobsStatsService } from './services/get-all-jobs-stats.service';
import { JobService } from './services/job.service';
import { GetAllJobsService } from './services/get-all-jobs.service';

@Module({
  controllers: [JobsController, GetAllJobsController],
  providers: [JobService, GetAllJobsStatsService, GetAllJobsService],
})
export class JobsModule {}
