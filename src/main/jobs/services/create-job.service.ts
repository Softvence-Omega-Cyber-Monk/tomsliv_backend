import { successResponse, TResponse } from '@/common/utils/response.util';
import { AppError } from '@/core/error/handle-error.app';
import { HandleError } from '@/core/error/handle-error.decorator';
import { PrismaService } from '@/lib/prisma/prisma.service';
import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { CreateJobDto } from '../dto/create-job.dto';

@Injectable()
export class CreateJobService {
  private readonly logger = new Logger(CreateJobService.name);
  constructor(private readonly prisma: PrismaService) {}

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
        title: dto.title,
        description: dto.description,
        benefits: dto.benefits,
        location: dto.location,
        jobType: dto.jobType,
        numberOfPositions: dto.numberOfPositions,
        requiredExperience: dto.requiredExperience,
        applicationDeadline: dto.applicationDeadline,
        salaryStart: dto.salaryStart,
        salaryEnd: dto.salaryEnd,
        requiredSkills: dto.requiredSkills,
        certifications: dto.certifications,
        machineryExperience: dto.machineryExperience,
        farmId: farm.id,
      },
    });

    return successResponse(job, 'Job created successfully');
  }
}
