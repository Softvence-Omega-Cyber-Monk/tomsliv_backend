import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { GetAllJobsStatsService } from '../services/get-all-jobs.service';
import { PaginationDto } from '@/common/dto/pagination.dto';

@ApiTags('Get All Jobs')
@Controller('all-jobs')
export class GetAllJobsController {
  constructor(
    private readonly getAllJobsStatsService: GetAllJobsStatsService,
  ) {}

  @ApiOperation({ summary: 'Get job types with counts' })
  @Get('job-types-with-counts')
  async getAllJobs() {
    return this.getAllJobsStatsService.getJobTypesWithCounts();
  }

  @ApiOperation({ summary: 'Get salary buckets' })
  @Get('salary-buckets')
  async getSalaryBuckets() {
    return this.getAllJobsStatsService.getSalaryBuckets();
  }

  @ApiOperation({ summary: 'Get job roles with counts' })
  @Get('job-roles-with-counts')
  async getJobRolesWithCounts(@Query() pg: PaginationDto) {
    return this.getAllJobsStatsService.getJobRolesWithCounts(pg);
  }

  @ApiOperation({ summary: 'Get locations with counts' })
  @Get('locations-with-counts')
  async getLocationsWithCounts(@Query() pg: PaginationDto) {
    return this.getAllJobsStatsService.getJobLocationsWithCounts(pg);
  }
}
