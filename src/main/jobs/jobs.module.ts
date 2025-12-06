import { Module } from '@nestjs/common';
import { JobsController } from './jobs.controller';
import { JobService } from './services/job.service';

@Module({
  controllers: [JobsController],
  providers: [JobService],
})
export class JobsModule {}
