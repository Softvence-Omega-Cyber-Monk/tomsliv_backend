import { QueueEventsEnum } from '@/common/enum/queue-events.enum';
import {
  successPaginatedResponse,
  successResponse,
  TResponse,
} from '@/common/utils/response.util';
import { AppError } from '@/core/error/handle-error.app';
import { HandleError } from '@/core/error/handle-error.decorator';
import { PrismaService } from '@/lib/prisma/prisma.service';
import { QueuePayload } from '@/lib/queue/interface/queue.payload';
import { ApplicationAITriggerService } from '@/lib/queue/trigger/application-ai-trigger.service';
import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
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
    private readonly eventEmitter: EventEmitter2,
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

    if (farm.status === 'INACTIVE') {
      throw new AppError(HttpStatus.BAD_REQUEST, 'Farm is inactive');
    }

    const job = await this.prisma.client.job.create({
      data: {
        ...dto,
        farmId: farm.id,
      },
    });

    // Notify users interested in new jobs
    this.notifyNewJob(job.id, job.title, farm.name);

    return successResponse(job, 'Job created successfully');
  }

  private async notifyNewJob(
    jobId: string,
    jobTitle: string,
    farmName: string,
  ) {
    const interestedUsers = await this.prisma.client.user.findMany({
      where: {
        role: UserRole.USER,
        notificationSettings: {
          newRelatedJobsAlert: true,
        },
      },
      select: { id: true },
    });

    if (interestedUsers.length === 0) return;

    // Use notifyAllUsers logic via generic queue if needed, but for now specific users
    // Since recipients might be large, we might want to split or just let QueueGateway handle it
    // QueuePayload recipients is {id: string}[].

    // Check if list is too large? QueueGateway iterates.
    // If > 1000, maybe chunk? For now assuming simple.

    const payload: QueuePayload = {
      recipients: interestedUsers,
      type: QueueEventsEnum.NOTIFICATION,
      title: 'New Job Posted',
      message: `A new job "${jobTitle}" at ${farmName} matches your interests.`,
      createdAt: new Date(),
      meta: {
        performedBy: 'system',
        recordType: 'Job',
        recordId: jobId,
      },
    };

    this.eventEmitter.emit(QueueEventsEnum.NOTIFICATION, payload);
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
      benefits: dto.benefits ? dto.benefits.trim() : job.benefits,
      farmSize: dto.farmSize ?? job.farmSize,
      herdSize: dto.herdSize ?? job.herdSize,
      onFarmStaff: dto.onFarmStaff ?? job.onFarmStaff,
      location: dto.location ? dto.location.trim() : job.location,
      jobType: dto.jobType ?? job.jobType,
      role: dto.role ? dto.role.trim() : job.role,
      numberOfPositions: dto.numberOfPositions ?? job.numberOfPositions,
      requiredExperience: dto.requiredExperience ?? job.requiredExperience,
      applicationDeadline: dto.applicationDeadline ?? job.applicationDeadline,
      positionStartDate: dto.positionStartDate ?? job.positionStartDate,
      // hourType: dto.hourType ?? job.hourType,
      hoursPerWeek: dto.hoursPerWeek ?? job.hoursPerWeek,
      roster: dto.roster ? dto.roster.trim() : job.roster,
      remunerationPaidBy: dto.remunerationPaidBy
        ? dto.remunerationPaidBy.trim()
        : job.remunerationPaidBy,
      remunerationType: dto.remunerationType ?? job.remunerationType,
      remunerationStart: dto.remunerationStart ?? job.remunerationStart,
      remunerationEnd: dto.remunerationEnd ?? job.remunerationEnd,
      totalPackageValue: dto.totalPackageValue ?? job.totalPackageValue,
      perKgMSDollarValue: dto.perKgMSDollarValue ?? job.perKgMSDollarValue,
      percentageOfMilkCheque:
        dto.percentageOfMilkCheque ?? job.percentageOfMilkCheque,
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

    const where: Prisma.JobWhereInput = { farmId: farm.id };

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
        include: {
          _count: {
            select: {
              jobApplications: true,
            },
          },
          jobApplications: {
            select: {
              status: true,
              applicationAIResults: {
                select: {
                  jobFitScore: true,
                },
              },
            },
          },
        },
      }),
    ]);

    const jobsWithStats = jobs.map((job) => {
      const applicants = job._count.jobApplications;
      const shortlisted = job.jobApplications.filter(
        (app) => app.status === 'SHORTLISTED',
      ).length;

      const scores = job.jobApplications
        .map((app) => app.applicationAIResults?.jobFitScore)
        .filter(
          (score): score is number => score !== undefined && score !== null,
        );

      const averageScore =
        scores.length > 0
          ? scores.reduce((a, b) => a + b, 0) / scores.length
          : 0;

      // Remove jobApplications from the response object to keep it clean
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { jobApplications, ...jobData } = job;

      return {
        ...jobData,
        views: job.viewCount,
        applicants,
        shortlisted,
        averageScore: parseFloat(averageScore.toFixed(2)),
      };
    });

    return successPaginatedResponse(
      jobsWithStats,
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
    const job = await this.prisma.client.job.update({
      where: { id: jobId },
      data: {
        viewCount: {
          increment: 1,
        },
      },
      include: {
        farm: true,
        idealCandidates: true,
        jobApplications: {
          select: {
            status: true,
            applicationAIResults: {
              select: {
                jobFitScore: true,
              },
            },
          },
        },
        _count: {
          select: {
            jobApplications: true,
          },
        },
      },
    });

    const applicants = job._count.jobApplications;
    const shortlisted = job.jobApplications.filter(
      (app) => app.status === 'SHORTLISTED',
    ).length;

    const scores = job.jobApplications
      .map((app) => app.applicationAIResults?.jobFitScore)
      .filter(
        (score): score is number => score !== undefined && score !== null,
      );

    const averageScore =
      scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

    // Remove jobApplications from the response object to keep it clean
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { jobApplications, ...jobData } = job;

    const jobWithStats = {
      ...jobData,
      views: job.viewCount,
      applicants,
      shortlisted,
      averageScore: parseFloat(averageScore.toFixed(2)),
    };

    return successResponse(
      jobWithStats,
      'Job details fetched successfully with stats',
    );
  }
}
