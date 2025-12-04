import { GetUser, ValidateFarmOwner } from '@/core/jwt/jwt.decorator';
import { Body, Controller, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreateJobDto } from './dto/create-job.dto';
import { CreateJobService } from './services/create-job.service';

@ApiTags('Jobs')
@ApiBearerAuth()
@Controller('jobs')
export class JobsController {
  constructor(private readonly createJobService: CreateJobService) {}

  @ApiOperation({ summary: 'Create a new job' })
  @ValidateFarmOwner()
  @Post()
  async createJob(@GetUser('sub') userId: string, @Body() dto: CreateJobDto) {
    return this.createJobService.createJob(userId, dto);
  }
}
