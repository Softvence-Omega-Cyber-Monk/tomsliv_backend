import { successResponse, TResponse } from '@/common/utils/response.util';
import { AppError } from '@/core/error/handle-error.app';
import { HandleError } from '@/core/error/handle-error.decorator';
import { PrismaService } from '@/lib/prisma/prisma.service';
import { HttpStatus, Injectable } from '@nestjs/common';
import { CreateCvDto } from '../dto/cv.dto';

@Injectable()
export class CvService {
  constructor(private readonly prisma: PrismaService) {}

  @HandleError('Failed to save CV', 'CV')
  async upsertCv(userId: string, dto: CreateCvDto): Promise<TResponse<any>> {
    // 1. Get user to check existence (and maybe if they already have a saved CV, though upsert handles it)
    const user = await this.prisma.client.user.findUniqueOrThrow({
      where: { id: userId },
      include: { savedCV: true },
    });

    // 2. Prepare data for create/update
    // We need to handle nested relations (Experience, Education)
    // For update, it's easier to delete existing relations and recreate them,
    // or we could try to update them if they have IDs.
    // Given the DTO structure (no IDs for nested items), complete replacement of nested items is safer/easier.

    const cvData = {
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
      customCVId: dto.customCVId,
      isSaved: true, // This is the user's saved CV
      // user: { connect: { id: userId } }, // Handled explicitly below because FK is on User
    };

    const experiencesRel = dto.experiences?.map((exp) => ({
      jobTitle: exp.jobTitle,
      jobType: exp.jobType,
      company: exp.company,
      summary: exp.summary,
      startDate: exp.startDate,
      endDate: exp.endDate,
      isOngoing: exp.isOngoing,
    }));

    const educationsRel = dto.educations?.map((edu) => ({
      degree: edu.degree,
      institution: edu.institution,
      startDate: edu.startDate,
      endDate: edu.endDate,
      isOngoing: edu.isOngoing,
    }));

    let cv;

    if (user.savedCVId) {
      // Update existing
      cv = await this.prisma.client.cV.update({
        where: { id: user.savedCVId },
        data: {
          ...cvData,
          user: undefined, // Already connected
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

      // Link back to user if not automatically handled by the `user: { connect ... }` in create
      // Actually `user: { connect: { id: userId } }` implies the User relation on CV side.
      // But User has `savedCVId` unique relation.
      // The schema says:
      // User: savedCVId String? @unique, savedCV CV? @relation(...)
      // CV: user User?
      // Since it's a 1-to-1 where User holds the FK, we should update User to point to this CV,
      // OR if the relation is bidirectional, connecting from CV side might work if Prisma handles it.
      // Safest is to Connect from User side or let Prisma handle via the `user` field on CV if mapped correctly.
      // Let's re-read schema.
      // User: savedCV CV? @relation(fields: [savedCVId], references: [id])
      // CV: user User?
      // So CV does NOT have userId column. User has savedCVId.
      // So we must update User to point to CV, OR creating CV with `user: { connect: { id: userId } }` will fail because CV doesn't have FK.
      // Wait, `CV` model in schema.prisma (`cv.prisma`):
      // model CV { ... user User? } -- No `userId` field.
      // model User { ... savedCVId String? @unique, savedCV CV? ... }
      // The relation is defined on User side.
      // So when creating CV, we cannot `connect` User because CV has no FK.
      // We must create CV, then update User.

      await this.prisma.client.user.update({
        where: { id: userId },
        data: { savedCVId: cv.id },
      });
    }

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

    // Disconnect from user first (or delete directly if cascade? OnDelete is SetNull in User)
    // User schema: savedCV CV? @relation(..., onDelete: SetNull)
    // So deleting CV will set User.savedCVId to null.

    await this.prisma.client.cV.delete({
      where: { id: user.savedCVId },
    });

    return successResponse(null, 'CV deleted successfully');
  }
}
