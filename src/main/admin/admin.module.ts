import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { UserService } from './services/user.service';
import { FarmOwnerService } from './services/farm-owner.service';
import { JobsService } from './services/jobs.service';
import { PaymentService } from './services/payment.service';

@Module({
  controllers: [AdminController],
  providers: [UserService, FarmOwnerService, JobsService, PaymentService],
})
export class AdminModule {}
