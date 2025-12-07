import { successResponse, TResponse } from '@/common/utils/response.util';
import { AppError } from '@/core/error/handle-error.app';
import { HandleError } from '@/core/error/handle-error.decorator';
import { S3Service } from '@/lib/file/services/s3.service';
import { PrismaService } from '@/lib/prisma/prisma.service';
import { ApplicationAITriggerService } from '@/lib/queue/trigger/application-ai-trigger.service';
import { HttpStatus, Injectable } from '@nestjs/common';
import { FileInstance, Prisma } from '@prisma';
import { CreateCvDto } from '../dto/cv.dto';

@Injectable()
export class CvService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3: S3Service,
    private readonly applicationAITrigger: ApplicationAITriggerService,
  ) {}

  @HandleError('Failed to save CV', 'CV')
  async upsertCv(
    userId: string,
    dto: CreateCvDto,
    file?: Express.Multer.File,
  ): Promise<TResponse<any>> {
    // 1. Get user to check existence
    const user = await this.prisma.client.user.findUniqueOrThrow({
      where: { id: userId },
      include: { savedCV: true },
    });

    // 2. Handle file upload if provided
    let fileInstance: FileInstance | undefined;
    if (file) {
      const uploadFile = await this.s3.uploadFile(file);
      if (uploadFile) {
        fileInstance = uploadFile;
      }
    }

    // 3. Prepare data for create/update
    const cvData: Prisma.CVCreateInput = {
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
      isSaved: true,
    };

    const experiencesRel: Prisma.ExperienceCreateWithoutCvInput[] =
      dto.experiences?.map((exp) => ({
        jobTitle: exp.jobTitle,
        jobType: exp.jobType,
        company: exp.company,
        summary: exp.summary,
        startDate: exp.startDate,
        endDate: exp.endDate,
        isOngoing: exp.isOngoing,
      })) || [];

    const educationsRel: Prisma.EducationCreateWithoutCvInput[] =
      dto.educations?.map((edu) => ({
        degree: edu.degree,
        institution: edu.institution,
        startDate: edu.startDate,
        endDate: edu.endDate,
        isOngoing: edu.isOngoing,
      })) || [];

    let cv;

    if (user.savedCVId) {
      // Update existing
      cv = await this.prisma.client.cV.update({
        where: { id: user.savedCVId },
        data: {
          ...cvData,
          ...(fileInstance && {
            customCV: {
              connect: fileInstance,
            },
          }),
          experiences: {
            deleteMany: {}, // Clear old
            create: experiencesRel, // Add new
          },
          educations: {
            deleteMany: {}, // Clear old
            create: educationsRel, // Add new
          },
        },
        include: {
          experiences: true,
          educations: true,
          customCV: true,
        },
      });
    } else {
      // Create new and connect to user
      cv = await this.prisma.client.cV.create({
        data: {
          ...cvData,
          ...(fileInstance && {
            customCV: {
              connect: fileInstance,
            },
          }),
          experiences: {
            create: experiencesRel,
          },
          educations: {
            create: educationsRel,
          },
        },
        include: {
          experiences: true,
          educations: true,
          customCV: true,
        },
      });

      await this.prisma.client.user.update({
        where: { id: userId },
        data: { savedCVId: cv.id },
      });
    }

    // Trigger AI analysis for all applications using this CV
    await this.applicationAITrigger.triggerForCVUpdate(cv.id);

    return successResponse(cv, 'CV saved successfully');
  }

  @HandleError('Failed to get CV', 'CV')
  async getCv(userId: string): Promise<TResponse<any>> {
    const user = await this.prisma.client.user.findUniqueOrThrow({
      where: { id: userId },
      include: {
        savedCV: {
          include: {
            experiences: true,
            educations: true,
            customCV: true,
          },
        },
      },
    });

    if (!user.savedCV) {
      throw new AppError(HttpStatus.NOT_FOUND, 'CV not found');
    }

    return successResponse(user.savedCV, 'CV fetched successfully');
  }

  @HandleError('Failed to delete CV', 'CV')
  async deleteCv(userId: string): Promise<TResponse<any>> {
    const user = await this.prisma.client.user.findUniqueOrThrow({
      where: { id: userId },
      include: { savedCV: true },
    });

    if (!user.savedCVId) {
      throw new AppError(HttpStatus.NOT_FOUND, 'CV not found');
    }

    await this.prisma.client.cV.delete({
      where: { id: user.savedCVId },
    });

    return successResponse(null, 'CV deleted successfully');
  }
}
