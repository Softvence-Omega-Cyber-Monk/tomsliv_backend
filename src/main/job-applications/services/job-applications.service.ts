import {
  successPaginatedResponse,
  successResponse,
  TResponse,
} from '@/common/utils/response.util';
import { AppError } from '@/core/error/handle-error.app';
import { HandleError } from '@/core/error/handle-error.decorator';
import { PrismaService } from '@/lib/prisma/prisma.service';
import { ApplicationAITriggerService } from '@/lib/queue/trigger/application-ai-trigger.service';
import { CreateCvBodyDto } from '@/main/cv/dto/create-cv.dto';
import { HttpStatus, Injectable } from '@nestjs/common';
import {
  AppliedJobSortOptionEnum,
  GetAppliedJobsDto,
} from '../dto/get-applied-jobs.dto';

@Injectable()
export class JobApplicationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly applicationAITrigger: ApplicationAITriggerService,
  ) {}

  @HandleError('Failed to apply with saved CV', 'JobApplication')
  async applyWithSavedCv(
    userId: string,
    jobId: string,
  ): Promise<TResponse<any>> {
    // 1. Check if user has a saved CV
    const user = await this.prisma.client.user.findUnique({
      where: { id: userId },
      select: { savedCVId: true },
    });

    if (!user || !user.savedCVId) {
      throw new AppError(HttpStatus.BAD_REQUEST, 'No saved CV found for user');
    }

    // 2. Check if already applied
    const existingApplication =
      await this.prisma.client.jobApplication.findUnique({
        where: {
          userId_jobId: {
            userId,
            jobId,
          },
        },
      });

    if (existingApplication) {
      throw new AppError(HttpStatus.CONFLICT, 'Already applied to this job');
    }

    // 3. Create Application
    const application = await this.prisma.client.jobApplication.create({
      data: {
        userId,
        jobId,
        cvId: user.savedCVId,
        isAppliedWithSavedCV: true,
      },
    });

    // Trigger AI analysis for this new application
    await this.applicationAITrigger.triggerAIAnalysis(
      application.id,
      'new-application',
    );

    return successResponse(application, 'Applied successfully with saved CV');
  }

  @HandleError('Failed to apply with new CV', 'JobApplication')
  async applyWithNewCv(
    userId: string,
    dto: CreateCvBodyDto,
    jobId: string,
  ): Promise<TResponse<any>> {
    // 1. Check if already applied
    const existingApplication =
      await this.prisma.client.jobApplication.findUnique({
        where: {
          userId_jobId: {
            userId,
            jobId,
          },
        },
      });

    if (existingApplication) {
      throw new AppError(HttpStatus.CONFLICT, 'Already applied to this job');
    }

    // If fileId is provided check its existence
    if (dto.fileId) {
      const file = await this.prisma.client.fileInstance.findUnique({
        where: { id: dto.fileId },
      });

      if (!file) {
        throw new AppError(HttpStatus.NOT_FOUND, 'File not found');
      }
    }

    // 2. Create new CV (not saving to user profile, just for this application)
    // Structure similar to CvService but create-only
    const cv = await this.prisma.client.cV.create({
      data: {
        firstName: dto.coreInfo.firstName,
        lastName: dto.coreInfo.lastName,
        email: dto.coreInfo.email,
        phone: dto.coreInfo.phone,
        location: dto.coreInfo.location,
        summary: dto.coreInfo.summary,
        jobTitle: dto.coreInfo.jobTitle,
        jobType: dto.coreInfo.jobType,
        availability: dto.coreInfo.availability,
        hasDrivingLicense: dto.coreInfo.hasDrivingLicense,
        eligibleToWorkInNZ: dto.coreInfo.eligibleToWorkInNZ,
        workPermitType: dto.coreInfo.workPermitType,
        isSaved: false,
        user: { connect: { id: userId } },
        ...(dto.fileId && {
          customCV: {
            connect: { id: dto.fileId },
          },
        }),
        experiences: {
          create: dto.experiences?.map((exp) => ({
            jobTitle: exp.jobTitle,
            jobType: exp.jobType,
            company: exp.company,
            summary: exp.summary,
            startDate: exp.startDate,
            endDate: exp.endDate,
            isOngoing: exp.isOngoing,
          })),
        },
        educations: {
          create: dto.educations?.map((edu) => ({
            degree: edu.degree,
            institution: edu.institution,
            startDate: edu.startDate,
            endDate: edu.endDate,
            isOngoing: edu.isOngoing,
          })),
        },
      },
    });

    // 3. Create Application linked to this new CV
    const application = await this.prisma.client.jobApplication.create({
      data: {
        user: { connect: { id: userId } },
        job: { connect: { id: jobId } },
        cv: { connect: { id: cv.id } },
        isAppliedWithSavedCV: false,
        applicationAIResults: {
          create: {
            motivation: '',
            jobFitScore: 0,
            keyTraits: [],
            summary: '',
            areasOfImprovement: [],
            strengths: [],
          },
        },
      },
    });

    // Trigger AI analysis for this new application
    await this.applicationAITrigger.triggerAIAnalysis(
      application.id,
      'new-application',
    );

    return successResponse(application, 'Applied successfully with new CV');
  }

  @HandleError('Failed to get applied jobs', 'JobApplication')
  async getAppliedJobs(userId: string, dto: GetAppliedJobsDto) {
    const page = dto?.page && dto.page > 0 ? +dto.page : 1;
    const limit = dto?.limit && dto.limit > 0 ? +dto.limit : 10;
    const skip = (page - 1) * limit;

    const where: any = { userId };

    if (dto.search) {
      where.job = {
        OR: [
          { title: { contains: dto.search, mode: 'insensitive' } },
          { description: { contains: dto.search, mode: 'insensitive' } },
        ],
      };
    }

    let orderBy: any = { appliedAt: 'desc' };

    if (dto.sortOption) {
      switch (dto.sortOption) {
        case AppliedJobSortOptionEnum.MOST_RECENT:
          orderBy = { appliedAt: 'desc' };
          break;
        case AppliedJobSortOptionEnum.FIT_SCORE_HIGH_TO_LOW:
          orderBy = { applicationAIResults: { jobFitScore: 'desc' } };
          break;
        case AppliedJobSortOptionEnum.FIT_SCORE_LOW_TO_HIGH:
          orderBy = { applicationAIResults: { jobFitScore: 'asc' } };
          break;
        case AppliedJobSortOptionEnum.EXPERIENCE_HIGH_TO_LOW:
          orderBy = { job: { requiredExperience: 'desc' } };
          break;
        case AppliedJobSortOptionEnum.EXPERIENCE_LOW_TO_HIGH:
          orderBy = { job: { requiredExperience: 'asc' } };
          break;
      }
    }

    const [total, applications] = await this.prisma.client.$transaction([
      this.prisma.client.jobApplication.count({ where }),
      this.prisma.client.jobApplication.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          job: {
            include: {
              farm: true,
            },
          },
          applicationAIResults: true,
        },
      }),
    ]);

    return successPaginatedResponse(
      applications,
      {
        page,
        limit,
        total,
      },
      'Applied jobs fetched successfully',
    );
  }
}
