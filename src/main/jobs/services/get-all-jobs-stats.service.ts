import { PaginationDto } from '@/common/dto/pagination.dto';
import {
  successPaginatedResponse,
  successResponse,
  TResponse,
} from '@/common/utils/response.util';
import { HandleError } from '@/core/error/handle-error.decorator';
import { PrismaService } from '@/lib/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { JobType } from '@prisma';

@Injectable()
export class GetAllJobsStatsService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------------- Job Type ----------------
  @HandleError('Failed to get job types with counts', 'Jobs')
  async getJobTypesWithCounts(): Promise<TResponse<any>> {
    const counts = await this.prisma.client.job.groupBy({
      by: ['jobType'],
      _count: { jobType: true },
    });

    const map = Object.fromEntries(
      counts.map((c) => [c.jobType, c._count.jobType]),
    );

    const jobTypes = Object.values(JobType).map((t) => {
      const count = map[t] ?? 0;
      return {
        type: t,
        label: `${this.jobTypeLabels[t]} (${count})`,
        count,
      };
    });

    return successResponse(
      jobTypes,
      'Fetched job types with counts successfully',
    );
  }

  // ---------------- Salary Buckets ----------------
  @HandleError('Failed to get salary buckets', 'Jobs')
  async getSalaryBuckets(): Promise<TResponse<any>> {
    const jobs = await this.prisma.client.job.findMany({
      select: { salaryStart: true },
      where: { salaryStart: { not: null } },
    });

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

  // ---------------- Job Roles ----------------
  @HandleError('Failed to get job roles with counts', 'Jobs')
  async getJobRolesWithCounts(pg: PaginationDto): Promise<TResponse<any>> {
    const page = pg.page && pg.page > 0 ? pg.page : 1;
    const limit = pg.limit && pg.limit > 0 ? pg.limit : 10;
    const skip = (page - 1) * limit;

    const counts = await this.prisma.client.job.groupBy({
      by: ['title'],
      _count: { title: true },
    });

    const roles = counts.map((c) => ({
      role: c.title,
      count: c._count.title,
      label: `${c.title} (${c._count.title})`,
    }));

    const paginatedRoles = roles.slice(skip, skip + limit);

    return successPaginatedResponse(
      paginatedRoles,
      {
        page,
        limit,
        total: roles.length,
      },
      'Fetched job roles with counts successfully',
    );
  }

  // ---------------- Locations ----------------
  @HandleError('Failed to get job locations with counts', 'Jobs')
  async getJobLocationsWithCounts(pg: PaginationDto): Promise<TResponse<any>> {
    const page = pg.page && pg.page > 0 ? pg.page : 1;
    const limit = pg.limit && pg.limit > 0 ? pg.limit : 10;
    const skip = (page - 1) * limit;

    const counts = await this.prisma.client.job.groupBy({
      by: ['location'],
      _count: { location: true },
    });

    const locations = counts.map((c) => ({
      location: c.location,
      count: c._count.location,
      label: `${c.location} (${c._count.location})`,
    }));

    const paginatedLocations = locations.slice(skip, skip + limit);

    return successPaginatedResponse(
      paginatedLocations,
      {
        page,
        limit,
        total: locations.length,
      },
      'Fetched job locations with counts successfully',
    );
  }

  // ---------------- Helpers ----------------
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
