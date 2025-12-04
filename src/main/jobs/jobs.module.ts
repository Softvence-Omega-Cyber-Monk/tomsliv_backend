import { Module } from '@nestjs/common';
import { JobsController } from './jobs.controller';
import { CreateJobService } from './services/create-job.service';

@Module({
  controllers: [JobsController],
  providers: [CreateJobService],
})
export class JobsModule {}
