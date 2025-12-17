import { PaginationDto } from '@/common/dto/pagination.dto';
import { ValidateAdmin } from '@/core/jwt/jwt.decorator';
import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { GetFarmOwnerJobsDto } from '../jobs/dto/get-jobs.dto';
import { JobsService } from './services/jobs.service';

@ApiTags('Admin Endpoints')
@ApiBearerAuth()
@ValidateAdmin()
@Controller('admin')
export class AdminController {
  constructor(private readonly jobsService: JobsService) {}

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
}
