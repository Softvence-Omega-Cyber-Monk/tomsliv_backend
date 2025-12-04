import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { UploadModule } from './upload/upload.module';
import { ContactModule } from './contact/contact.module';

@Module({
  imports: [AuthModule, UploadModule, ContactModule],
})
export class MainModule {}
