import { HandleError } from '@/core/error/handle-error.decorator';
import { PrismaService } from '@/lib/prisma/prisma.service';
import { Injectable, Logger } from '@nestjs/common';
import { GetAllJobsDto } from '../dto/get-jobs.dto';

@Injectable()
export class GetAllJobsService {
  private logger = new Logger(GetAllJobsService.name);

  constructor(private readonly prisma: PrismaService) {}

  @HandleError('Failed to get all jobs')
  async getAllJobs(query: GetAllJobsDto) {
    this.logger.log('Fetching all jobs with query: ' + JSON.stringify(query));

    return this.prisma.client.job.findMany();
  }
}
