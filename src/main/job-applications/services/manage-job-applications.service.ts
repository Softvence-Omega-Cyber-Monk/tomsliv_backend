import { successResponse, TResponse } from '@/common/utils/response.util';
import { AppError } from '@/core/error/handle-error.app';
import { HandleError } from '@/core/error/handle-error.decorator';
import { PrismaService } from '@/lib/prisma/prisma.service';
import { HttpStatus, Injectable } from '@nestjs/common';
import { ApplicationStatus } from '@prisma';
import { ManageApplicationStatusDto } from '../dto/manage-application-status.dto';

@Injectable()
export class ManageJobApplicationsService {
  constructor(private readonly prisma: PrismaService) {}

  @HandleError('Failed to get application', 'JobApplication')
  async getApplication(
    userId: string,
    applicationId: string,
  ): Promise<TResponse<any>> {
    // 1. Verify ownership and fetch application
    const application =
      await this.prisma.client.jobApplication.findUniqueOrThrow({
        where: { id: applicationId },
        include: {
          job: true,
          cv: {
            include: {
              customCV: true,
            },
          },
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              profilePictureId: true,
              profilePicture: true,
            },
          },
          applicationAIResults: true,
        },
      });

    // Check if the job belongs to the user's (farm owner's) farm
    const user = await this.prisma.client.user.findUnique({
      where: { id: userId },
      select: { farmId: true },
    });

    if (!user?.farmId || application.job.farmId !== user.farmId) {
      throw new AppError(
        HttpStatus.FORBIDDEN,
        "You don't have permission to view this application",
      );
    }

    // 2. If status is NEW, update to REVIEWED
    if (application.status === ApplicationStatus.NEW) {
      const updatedApp = await this.prisma.client.jobApplication.update({
        where: { id: applicationId },
        data: { status: ApplicationStatus.REVIEWED },
        include: {
          job: true,
          cv: { include: { customCV: true } },
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              profilePictureId: true,
              profilePicture: true,
            },
          },
          applicationAIResults: true,
        },
      });
      return successResponse(updatedApp, 'Application details fetched');
    }

    return successResponse(application, 'Application details fetched');
  }

  @HandleError('Failed to update application status', 'JobApplication')
  async updateStatus(
    userId: string,
    applicationId: string,
    dto: ManageApplicationStatusDto,
  ): Promise<TResponse<any>> {
    // 1. Verify ownership
    const application =
      await this.prisma.client.jobApplication.findUniqueOrThrow({
        where: { id: applicationId },
        include: { job: true },
      });

    const user = await this.prisma.client.user.findUnique({
      where: { id: userId },
      select: { farmId: true },
    });

    if (!user?.farmId || application.job.farmId !== user.farmId) {
      throw new AppError(
        HttpStatus.FORBIDDEN,
        "You don't have permission to update this application",
      );
    }

    // 2. Update Status
    const updatedApp = await this.prisma.client.jobApplication.update({
      where: { id: applicationId },
      data: { status: dto.status },
    });

    return successResponse(updatedApp, 'Application status updated');
  }
}
