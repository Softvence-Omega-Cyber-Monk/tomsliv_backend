import {
  successPaginatedResponse,
  successResponse,
} from '@/common/utils/response.util';
import { HandleError } from '@/core/error/handle-error.decorator';
import { PrismaService } from '@/lib/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { FarmStatus, Prisma } from '@prisma';
import { GetAllFarmDto } from '../dto/get-farm.dto';

@Injectable()
export class FarmOwnerService {
  constructor(private readonly prisma: PrismaService) {}

  @HandleError('Farm status updated successfully')
  async getAllFarmOwner(dto: GetAllFarmDto) {
    const page = dto?.page && dto.page > 0 ? +dto.page : 1;
    const limit = dto?.limit && dto.limit > 0 ? +dto.limit : 10;
    const skip = (page - 1) * limit;

    const where: Prisma.FarmWhereInput = {};

    if (dto.status) where.status = dto.status as FarmStatus;
    if (dto.search) {
      where.OR = [
        { name: { contains: dto.search, mode: 'insensitive' } },
        { location: { contains: dto.search, mode: 'insensitive' } },
      ];
    }

    const [farms, total] = await Promise.all([
      this.prisma.client.farm.findMany({
        include: {
          users: { select: { name: true, email: true } },
          jobs: true,
          logo: true,
        },
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.client.farm.count({ where }),
    ]);

    const transformed = farms.map((farm) => ({
      id: farm.id,
      farmName: farm.name,
      farmLogo: farm.logo?.url ?? null,
      location: farm.location ?? null,
      employeeName: farm.users?.name ?? null,
      employeeEmail: farm.users?.email ?? null,
      status: farm.status,
      totalJobsPosted: farm.jobs?.length ?? 0,
      totalActiveJobs:
        farm.jobs?.filter((j) => j.status === 'ACTIVE').length ?? 0,
      createdAt: farm.createdAt,
      updatedAt: farm.updatedAt,
    }));

    return successPaginatedResponse(
      transformed,
      {
        page,
        limit,
        total,
      },
      'Farms fetched successfully',
    );
  }

  @HandleError('Failed to fetch farm details')
  async getFarmDetails(id: string) {
    const farm = await this.prisma.client.farm.findUniqueOrThrow({
      where: { id },
      include: {
        users: {
          select: { name: true, email: true },
        },
        jobs: {
          orderBy: { createdAt: 'desc' },
          take: 25, // recent jobs
        },
        _count: {
          select: { jobs: true },
        },
      },
    });

    const recentActiveJobs = farm.jobs.filter((j) => j.status === 'ACTIVE');
    const recentPreviousJobs = farm.jobs.filter((j) => j.status !== 'ACTIVE');

    return successResponse(
      {
        id: farm.id,
        farmName: farm.name,
        farmLogo: farm.logoId ?? null,
        location: farm.location ?? null,
        employeeName: farm.users?.name ?? null,
        employeeEmail: farm.users?.email ?? null,
        totalJobs: farm._count.jobs,
        status: farm.status,
        totalActiveJobs: recentActiveJobs.length,
        recentActiveJobs: recentActiveJobs.map((j) => ({
          id: j.id,
          title: j.title,
          status: j.status,
          createdAt: j.createdAt,
        })),
        recentPreviousJobs: recentPreviousJobs.map((j) => ({
          id: j.id,
          title: j.title,
          status: j.status,
          createdAt: j.createdAt,
        })),
        createdAt: farm.createdAt,
        updatedAt: farm.updatedAt,
      },
      'Farm details fetched successfully',
    );
  }

  @HandleError('Farm status updated successfully')
  async toggleFarmOwnerSuspend(id: string) {
    const farm = await this.prisma.client.farm.findUniqueOrThrow({
      where: { id },
    });

    if (farm.status === 'INACTIVE') {
      await this.prisma.client.farm.update({
        where: { id },
        data: { status: 'ACTIVE' },
      });
    } else {
      await this.prisma.client.farm.update({
        where: { id },
        data: { status: 'INACTIVE' },
      });
    }

    return successResponse(null, 'Farm status updated successfully');
  }
}
