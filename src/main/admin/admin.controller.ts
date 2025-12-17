import { PaginationDto } from '@/common/dto/pagination.dto';
import { ValidateAdmin } from '@/core/jwt/jwt.decorator';
import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { GetFarmOwnerJobsDto } from '../jobs/dto/get-jobs.dto';
import { FarmOwnerService } from './services/farm-owner.service';
import { JobsService } from './services/jobs.service';

@ApiTags('Admin Endpoints')
@ApiBearerAuth()
@ValidateAdmin()
@Controller('admin')
export class AdminController {
  constructor(
    private readonly jobsService: JobsService,
    private readonly farmOwnerService: FarmOwnerService,
  ) {}

  @ApiOperation({ summary: 'Get all jobs' })
  @Get('jobs')
  async getJobs(@Query() dto: GetFarmOwnerJobsDto) {
    return this.jobsService.getJobs(dto);
  }

  @ApiOperation({ summary: 'Get single job' })
  @Get('jobs/:jobId')
  async getAdminSingleJob(@Param('jobId') jobId: string) {
    return this.jobsService.getAdminSingleJob(jobId);
  }

  @ApiOperation({ summary: 'Get job applications' })
  @Get('jobs/:jobId/applications')
  async getAdminJobApplications(
    @Param('jobId') jobId: string,
    dt: PaginationDto,
  ) {
    return this.jobsService.getAdminJobApplications(jobId, dt);
  }

  @ApiOperation({ summary: 'Toggle job status' })
  @Get('jobs/:jobId/status')
  async toggleSuspendJob(@Param('jobId') jobId: string) {
    return this.jobsService.toggleSuspendJob(jobId);
  }

  @ApiOperation({ summary: 'Get all farm owner jobs' })
  @Get('farms')
  async getAllFarmOwner(@Query() dto: GetFarmOwnerJobsDto) {
    return this.farmOwnerService.getAllFarmOwner(dto);
  }

  @ApiOperation({ summary: 'Get single farm owner' })
  @Get('farms/:farmId')
  async getFarmDetails(@Param('farmId') id: string) {
    return this.farmOwnerService.getFarmDetails(id);
  }

  @ApiOperation({ summary: 'Toggle farm owner status' })
  @Get('farms/:farmId/status')
  async toggleFarmOwnerSuspend(@Param('farmId') id: string) {
    return this.farmOwnerService.toggleFarmOwnerSuspend(id);
  }
}
