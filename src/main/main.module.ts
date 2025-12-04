import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { UploadModule } from './upload/upload.module';
import { JobsModule } from './jobs/jobs.module';

@Module({
  imports: [AuthModule, UploadModule, JobsModule],
})
export class MainModule {}
