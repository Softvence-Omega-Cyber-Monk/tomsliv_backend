import { successResponse, TResponse } from '@/common/utils/response.util';
import { AppError } from '@/core/error/handle-error.app';
import { HandleError } from '@/core/error/handle-error.decorator';
import { PrismaService } from '@/lib/prisma/prisma.service';
import { ApplicationAITriggerService } from '@/lib/queue/trigger/application-ai-trigger.service';
import { CreateCvDto } from '@/main/cv/dto/cv.dto';
import { HttpStatus, Injectable } from '@nestjs/common';

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
    dto: CreateCvDto,
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

    // 2. Create new CV (not saving to user profile, just for this application)
    // Structure similar to CvService but create-only
    const cv = await this.prisma.client.cV.create({
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        phone: dto.phone,
        location: dto.location,
        summary: dto.summary,
        jobTitle: dto.jobTitle,
        jobType: dto.jobType,
        availability: dto.availability,
        hasDrivingLicense: dto.hasDrivingLicense,
        eligibleToWorkInNZ: dto.eligibleToWorkInNZ,
        workPermitType: dto.workPermitType,
        isSaved: false, // Explicitly not the "Saved CV"

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
        userId,
        jobId,
        cvId: cv.id,
        isAppliedWithSavedCV: false,
      },
    });

    // Trigger AI analysis for this new application
    await this.applicationAITrigger.triggerAIAnalysis(
      application.id,
      'new-application',
    );

    return successResponse(application, 'Applied successfully with new CV');
  }
}
