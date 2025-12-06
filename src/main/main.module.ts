import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { ContactModule } from './contact/contact.module';
import { JobsModule } from './jobs/jobs.module';
import { UploadModule } from './upload/upload.module';

@Module({
  imports: [AuthModule, UploadModule, ContactModule, JobsModule],
})
export class MainModule {}
