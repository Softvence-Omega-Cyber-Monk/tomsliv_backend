import {
  successPaginatedResponse,
  successResponse,
  TResponse,
} from '@/common/utils/response.util';
import { AppError } from '@/core/error/handle-error.app';
import { HandleError } from '@/core/error/handle-error.decorator';
import { PrismaService } from '@/lib/prisma/prisma.service';
import { ApplicationAITriggerService } from '@/lib/queue/trigger/application-ai-trigger.service';
import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { Prisma, UserRole } from '@prisma';
import { CreateJobDto } from '../dto/create-job.dto';
import { GetFarmOwnerJobsDto } from '../dto/get-jobs.dto';
import { ManageJobStatusDto } from '../dto/manage-job-status.dto';
import { UpdateJobDto } from '../dto/update-job.dto';

@Injectable()
export class JobService {
  private readonly logger = new Logger(JobService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly applicationAITrigger: ApplicationAITriggerService,
  ) {}

  @HandleError('Failed to create job', 'Job')
  async createJob(userId: string, dto: CreateJobDto): Promise<TResponse<any>> {
    const user = await this.prisma.client.user.findUniqueOrThrow({
      where: { id: userId },
      include: { farm: true },
    });

    const farm = user.farm;
    if (!farm) {
      this.logger.warn(`User with ID ${userId} has no associated farm.`);
      throw new AppError(HttpStatus.BAD_REQUEST, 'User has no associated farm');
    }

    const job = await this.prisma.client.job.create({
      data: {
        ...dto,
        farmId: farm.id,
      },
    });

    return successResponse(job, 'Job created successfully');
  }

  @HandleError('Failed to update job', 'Job')
  async updateJob(
    userId: string,
    jobId: string,
    dto: UpdateJobDto,
  ): Promise<TResponse<any>> {
    // Verify job exists and belongs to user's farm
    const job = await this.prisma.client.job.findUnique({
      where: { id: jobId },
      include: { farm: true },
    });

    if (!job) {
      throw new AppError(HttpStatus.NOT_FOUND, 'Job not found');
    }

    const user = await this.prisma.client.user.findUniqueOrThrow({
      where: { id: userId },
      include: { farm: true },
    });

    const farm = user.farm;
    if (!farm) {
      this.logger.warn(`User with ID ${userId} has no associated farm.`);
      throw new AppError(HttpStatus.BAD_REQUEST, 'User has no associated farm');
    }

    if (job.farmId !== farm.id) {
      this.logger.warn(
        `User ${userId} attempted to update job ${jobId} from another farm`,
      );
      throw new AppError(
        HttpStatus.FORBIDDEN,
        'You can only update jobs from your own farm',
      );
    }

    // Build update job data
    const updateData: Prisma.JobUpdateInput = {
      title: dto.title ? dto.title.trim() : job.title,
      description: dto.description ? dto.description.trim() : job.description,
      location: dto.location ? dto.location.trim() : job.location,
      benefits: dto.benefits ? dto.benefits.trim() : job.benefits,
      jobType: dto.jobType || job.jobType,
      numberOfPositions: dto.numberOfPositions || job.numberOfPositions,
      requiredExperience: dto.requiredExperience || job.requiredExperience,
      applicationDeadline: dto.applicationDeadline || job.applicationDeadline,
      salaryStart: dto.salaryStart || job.salaryStart,
      salaryEnd: dto.salaryEnd || job.salaryEnd,
      requiredSkills: dto.requiredSkills || job.requiredSkills,
      certifications: dto.certifications || job.certifications,
      machineryExperience: dto.machineryExperience || job.machineryExperience,
    };

    // Update the job
    const updatedJob = await this.prisma.client.job.update({
      where: { id: jobId },
      data: updateData,
    });

    // Trigger AI analysis for all applications of this job
    await this.applicationAITrigger.triggerForJobUpdate(jobId);

    return successResponse(updatedJob, 'Job updated successfully');
  }

  @HandleError('Failed to manage job status', 'Job')
  async manageStatus(
    userId: string,
    jobId: string,
    dto: ManageJobStatusDto,
  ): Promise<TResponse<any>> {
    const job = await this.prisma.client.job.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      throw new AppError(HttpStatus.NOT_FOUND, 'Job not found');
    }

    const user = await this.prisma.client.user.findUnique({
      where: { id: userId },
      include: { farm: true },
    });

    if (!user) {
      throw new AppError(HttpStatus.UNAUTHORIZED, 'User not found');
    }

    // allow ADMIN or owner of the farm to change status
    const isAdmin =
      user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN;
    const isOwnerOfFarm = !!user.farm && user.farm.id === job.farmId;

    if (!isAdmin && !isOwnerOfFarm) {
      this.logger.warn(
        `User ${userId} attempted to change status of job ${jobId} without permission`,
      );
      throw new AppError(
        HttpStatus.FORBIDDEN,
        'Not authorized to change job status',
      );
    }

    const updated = await this.prisma.client.job.update({
      where: { id: jobId },
      data: {
        status: dto.status,
      },
    });

    // Trigger AI analysis for all applications of this job
    await this.applicationAITrigger.triggerForJobUpdate(jobId);

    return successResponse(updated, `Job status updated to ${dto.status}`);
  }

  @HandleError('Failed to get farm owner jobs', 'Job')
  async getFarmOwnerJobs(userId: string, dto: GetFarmOwnerJobsDto) {
    const page = dto?.page && dto.page > 0 ? +dto.page : 1;
    const limit = dto?.limit && dto.limit > 0 ? +dto.limit : 10;
    const skip = (page - 1) * limit;

    const user = await this.prisma.client.user.findUniqueOrThrow({
      where: { id: userId },
      include: { farm: true },
    });

    const farm = user.farm;
    if (!farm) {
      this.logger.warn(`User with ID ${userId} has no associated farm.`);
      throw new AppError(HttpStatus.BAD_REQUEST, 'User has no associated farm');
    }

    const where: any = { farmId: farm.id };

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

    return successPaginatedResponse(
      jobs,
      {
        page,
        limit,
        total,
      },
      'Jobs fetched successfully',
    );
  }

  @HandleError('Failed to get job details', 'Job')
  async getSingleJob(jobId: string): Promise<TResponse<any>> {
    const job = await this.prisma.client.job.findUniqueOrThrow({
      where: { id: jobId },
      include: {
        farm: true,
        idealCandidates: true,
      },
    });

    return successResponse(job, 'Job details fetched successfully');
  }
}
