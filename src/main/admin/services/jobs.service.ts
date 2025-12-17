import { successPaginatedResponse } from '@/common/utils/response.util';
import { PrismaService } from '@/lib/prisma/prisma.service';
import { GetFarmOwnerJobsDto } from '@/main/jobs/dto/get-jobs.dto';
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma';

@Injectable()
export class JobsService {
  constructor(private readonly prisma: PrismaService) {}

  async getJobs(dto: GetFarmOwnerJobsDto) {
    const page = dto?.page && dto.page > 0 ? +dto.page : 1;
    const limit = dto?.limit && dto.limit > 0 ? +dto.limit : 10;
    const skip = (page - 1) * limit;

    const where: Prisma.JobWhereInput = {};

    if (dto.status) {
      where.status = dto.status;
    }

    if (dto.search) {
      where.OR = [
        { title: { contains: dto.search, mode: 'insensitive' } },
        { description: { contains: dto.search, mode: 'insensitive' } },
        { location: { contains: dto.search, mode: 'insensitive' } },
      ];
    }

    const [total, jobs] = await this.prisma.client.$transaction([
      this.prisma.client.job.count({ where }),
      this.prisma.client.job.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    // transform output format {
    //   id: string;
    //   title: string;
    //   description: string;
    //   location: string;
    //   status: JobStatus;
    // farmName: string;
    // employerName: string;
    // employEmail: string;
    // total applications: number;
    //   createdAt: Date;
    //   updatedAt: Date;
    // }

    return successPaginatedResponse(
      jobs,
      {
        page,
        limit,
        total,
      },
      'Successfully found',
    );
  }
}
