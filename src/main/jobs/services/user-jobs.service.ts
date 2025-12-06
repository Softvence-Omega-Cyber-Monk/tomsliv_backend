import { successResponse } from '@/common/utils/response.util';
import { HandleError } from '@/core/error/handle-error.decorator';
import { PrismaService } from '@/lib/prisma/prisma.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class UserJobsService {
  constructor(private readonly prisma: PrismaService) {}

  @HandleError("Failed to toggle job's saved status")
  async toggleJobSavedStatus(userId: string, jobId: string) {
    const existingEntry = await this.prisma.client.savedJobs.findUnique({
      where: {
        userId_jobId: {
          userId,
          jobId,
        },
      },
    });

    if (existingEntry) {
      // If the job is already saved, remove it from saved jobs
      await this.prisma.client.savedJobs.delete({
        where: {
          userId_jobId: {
            userId,
            jobId,
          },
        },
      });
    } else {
      // If the job is not saved, add it to saved jobs
      await this.prisma.client.savedJobs.create({
        data: {
          userId,
          jobId,
        },
      });
    }

    return successResponse(
      null,
      `${existingEntry ? 'Removed from' : 'Added to'} saved jobs successfully`,
    );
  }
}
