import { successResponse } from '@/common/utils/response.util';
import { HandleError } from '@/core/error/handle-error.decorator';
import { PrismaService } from '@/lib/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { GetAllFarmDto } from '../dto/get-farm.dto';

@Injectable()
export class FarmOwnerService {
  constructor(private readonly prisma: PrismaService) {}

  @HandleError('Farm status updated successfully')
  async getAllFarmOwner(dto: GetAllFarmDto) {
    return this.prisma.client.farm.findMany();

    // transform format { famrname, totaljob posted , emplyname, emplye email, farm logo, timestame, location, }
  }

  @HandleError('Farm status updated successfully')
  async getFarmDetails(id: string) {
    return this.prisma.client.farm.findUniqueOrThrow({
      where: { id },
    });
    // transform format inclues recent active jobs, recent previous jobs, totlaNumberOfjobs, totalActiveJobs
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
