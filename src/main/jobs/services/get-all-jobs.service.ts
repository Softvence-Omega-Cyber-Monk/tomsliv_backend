import { successResponse, TResponse } from '@/common/utils/response.util';
import { HandleError } from '@/core/error/handle-error.decorator';
import { PrismaService } from '@/lib/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { JobType } from '@prisma';

@Injectable()
export class GetAllJobsService {
  constructor(private readonly prisma: PrismaService) {}

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

  @HandleError('Failed to get salary buckets', 'Jobs')
  async getSalaryBuckets(): Promise<TResponse<any>> {
    // Fetch all jobs with salaries
    const jobs = await this.prisma.client.job.findMany({
      select: { salaryStart: true },
      where: { salaryStart: { not: null } },
    });

    // Calculate counts for each bucket
    const buckets = this.salaryBuckets.map((bucket) => {
      const count = jobs.filter(
        (j) => j.salaryStart! >= bucket.min && j.salaryStart! <= bucket.max,
      ).length;

      const rangeLabel =
        bucket.max === Infinity
          ? `${this.formatSalary(bucket.min)}+`
          : `${this.formatSalary(bucket.min)} - ${this.formatSalary(bucket.max)}`;

      return {
        range:
          bucket.max === Infinity
            ? `${bucket.min}+`
            : `${bucket.min}-${bucket.max}`,
        count,
        label: `${rangeLabel} (${count})`,
      };
    });

    return successResponse(buckets, 'Fetched jobs salary buckets successfully');
  }

  private readonly jobTypeLabels: Record<JobType, string> = {
    FULL_TIME: 'Full Time',
    PART_TIME: 'Part Time',
    CONTRACT: 'Contract',
    SEASONAL: 'Seasonal',
    TEMPORARY: 'Temporary',
    INTERN: 'Intern',
  };

  private readonly salaryBuckets: { min: number; max: number }[] = [
    { min: 0, max: 5000 },
    { min: 5001, max: 15000 },
    { min: 15001, max: 25000 },
    { min: 25001, max: 40000 },
    { min: 40001, max: 55000 },
    { min: 55001, max: 70000 },
    { min: 70001, max: 85000 },
    { min: 85001, max: 100000 },
    { min: 100001, max: Infinity },
  ];

  private readonly formatSalary = (value: number): string => {
    return `${Math.floor(value / 1000)}K`;
  };
}
