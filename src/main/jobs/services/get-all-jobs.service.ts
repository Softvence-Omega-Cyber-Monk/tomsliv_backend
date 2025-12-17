import { successPaginatedResponse } from '@/common/utils/response.util';
import { HandleError } from '@/core/error/handle-error.decorator';
import { PrismaService } from '@/lib/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma';
import { GetAllJobsDto, JobSortOptionEnum } from '../dto/get-jobs.dto';

@Injectable()
export class GetAllJobsService {
  constructor(private readonly prisma: PrismaService) {}

  @HandleError('Failed to get all jobs')
  async getAllJobs(query: GetAllJobsDto) {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 10;
    const skip = (page - 1) * limit;

    const {
      jobTypes,
      roles,
      locations,
      remunerationRange,
      search,
      status,
      sortOption,
    } = query;

    // ---------------- Filters ----------------
    const where: Prisma.JobWhereInput = {};

    if (status) {
      where.status = status;
    } else {
      where.status = { not: 'SUSPENDED' };
    }

    if (jobTypes?.length) where.jobType = { in: jobTypes };
    if (roles?.length) where.title = { in: roles };
    if (locations?.length) where.location = { in: locations };

    if (remunerationRange?.length) {
      // OR multiple remuneration ranges
      where.OR = remunerationRange.map((r) => ({
        remunerationStart: { gte: r.min },
        remunerationEnd: { lte: r.max },
      }));
    }

    if (search) {
      where.OR = [
        ...(where.OR || []),
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    // ---------------- Sorting ----------------
    let orderBy: Prisma.JobOrderByWithRelationInput = { createdAt: 'desc' }; // default

    if (sortOption) {
      switch (sortOption) {
        case JobSortOptionEnum.MOST_RECENT:
          orderBy = { createdAt: 'desc' };
          break;
        case JobSortOptionEnum.REMUNERATION_HIGH_TO_LOW:
          orderBy = { remunerationStart: 'desc' };
          break;
        case JobSortOptionEnum.REMUNERATION_LOW_TO_HIGH:
          orderBy = { remunerationStart: 'asc' };
          break;
        case JobSortOptionEnum.DEADLINE_SOON:
          orderBy = { applicationDeadline: 'asc' };
          break;
      }
    }

    // ---------------- Fetch jobs ----------------
    const [jobs, total] = await this.prisma.client.$transaction([
      this.prisma.client.job.findMany({
        where,
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.client.job.count({ where }),
    ]);

    return successPaginatedResponse(jobs, { page, limit, total }, 'Jobs found');
  }
}
