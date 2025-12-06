import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { GetAllJobsService } from '../services/get-all-jobs.service';

@ApiTags('Get All Jobs')
@Controller('all-jobs')
export class GetAllJobsController {
  constructor(private readonly getAllJobsService: GetAllJobsService) {}

  @ApiOperation({ summary: 'Get job types with counts' })
  @Get('job-types-with-counts')
  async getAllJobs() {
    return this.getAllJobsService.getJobTypesWithCounts();
  }
}
