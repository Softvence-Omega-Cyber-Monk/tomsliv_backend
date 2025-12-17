import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { ContactModule } from './contact/contact.module';
import { CvModule } from './cv/cv.module';
import { JobApplicationsModule } from './job-applications/job-applications.module';
import { JobsModule } from './jobs/jobs.module';
import { UploadModule } from './upload/upload.module';
import { AdminModule } from './admin/admin.module';

@Module({
  imports: [
    AuthModule,
    UploadModule,
    ContactModule,
    JobsModule,
    CvModule,
    JobApplicationsModule,
    AdminModule,
  ],
})
export class MainModule {}
