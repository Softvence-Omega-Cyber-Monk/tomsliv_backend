import { successResponse, TResponse } from '@/common/utils/response.util';
import { HandleError } from '@/core/error/handle-error.decorator';
import { PrismaService } from '@/lib/prisma/prisma.service';
import { Injectable, Logger } from '@nestjs/common';
import { CreateJobDto } from '../dto/create-job.dto';

@Injectable()
export class CreateJobService {
  private readonly logger = new Logger(CreateJobService.name);
  constructor(private readonly prisma: PrismaService) {}

  @HandleError('Failed to create job', 'Job')
  async createJob(userId: string, dto: CreateJobDto): Promise<TResponse<any>> {
    this.logger.log(`Creating job for user: ${userId}`, dto);

    return successResponse(null, 'Job created successfully');
  }
}
