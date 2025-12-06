import { successResponse, TResponse } from '@/common/utils/response.util';
import { HandleError } from '@/core/error/handle-error.decorator';
import { PrismaService } from '@/lib/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { JobType } from '@prisma';

@Injectable()
export class GetAllJobsService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly jobTypeLabels: Record<JobType, string> = {
    FULL_TIME: 'Full Time',
    PART_TIME: 'Part Time',
    CONTRACT: 'Contract',
    SEASONAL: 'Seasonal',
    TEMPORARY: 'Temporary',
    INTERN: 'Intern',
  };

  @HandleError('Failed to get job types with counts', 'Jobs')
  async getJobTypesWithCounts(): Promise<TResponse<any>> {
    // Group jobs by enum value
    const counts = await this.prisma.client.job.groupBy({
      by: ['jobType'],
      _count: { jobType: true },
    });

    // Map counts for easy lookup
    const map = Object.fromEntries(
      counts.map((c) => [c.jobType, c._count.jobType]),
    );

    // Build final array with readable labels
    const jobTypes = Object.values(JobType).map((t) => ({
      type: t,
      label: this.jobTypeLabels[t],
      count: map[t] ?? 0,
    }));

    return successResponse(
      jobTypes,
      'Fetched job types with counts successfully',
    );
  }
}
