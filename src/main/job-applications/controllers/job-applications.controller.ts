import { GetUser, ValidateAuth } from '@/core/jwt/jwt.decorator';
import { Body, Controller, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApplyAsGuestDto, ApplyWithSavedCvDto } from '../dto/apply-job.dto';
import { JobApplicationsService } from '../services/job-applications.service';

@ApiTags('Job Applications')
@ApiBearerAuth()
@ValidateAuth()
@Controller('job-applications')
export class JobApplicationsController {
  constructor(
    private readonly jobApplicationsService: JobApplicationsService,
  ) {}

  @ApiOperation({ summary: 'Apply with user saved CV' })
  @Post('apply-saved')
  async applyWithSavedCv(
    @GetUser('sub') userId: string,
    @Body() dto: ApplyWithSavedCvDto,
  ) {
    return this.jobApplicationsService.applyWithSavedCv(userId, dto);
  }

  @ApiOperation({ summary: 'Apply with new CV' })
  @Post('apply-new')
  async applyWithNewCv(
    @GetUser('sub') userId: string,
    @Body() dto: ApplyAsGuestDto,
  ) {
    return this.jobApplicationsService.applyWithNewCv(userId, dto);
  }
}
