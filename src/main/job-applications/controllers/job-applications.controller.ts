import {
  GetUser,
  ValidateAuth,
  ValidateFarmOwner,
} from '@/core/jwt/jwt.decorator';
import { CreateCvBodyDto } from '@/main/cv/dto/create-cv.dto';
import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { GetAppliedJobsDto } from '../dto/get-applied-jobs.dto';
import { GetFarmOwnerApplicationsDto } from '../dto/get-farm-owner-applications.dto';
import { GetFarmOwnerApplicationsService } from '../services/get-farm-owner-applications.service';
import { JobApplicationsService } from '../services/job-applications.service';

@ApiTags('Job Applications')
@ApiBearerAuth()
@ValidateAuth()
@Controller('job-applications')
export class JobApplicationsController {
  constructor(
    private readonly jobApplicationsService: JobApplicationsService,
    private readonly getFarmOwnerApplicationsService: GetFarmOwnerApplicationsService,
  ) {}

  @ApiOperation({ summary: 'Apply with user saved CV' })
  @Post('apply-saved/:jobId')
  async applyWithSavedCv(
    @GetUser('sub') userId: string,
    @Param('jobId') jobId: string,
  ) {
    return this.jobApplicationsService.applyWithSavedCv(userId, jobId);
  }

  @ApiOperation({ summary: 'Apply with new CV' })
  @Post('apply-new/:jobId')
  async applyWithNewCv(
    @GetUser('sub') userId: string,
    @Body() dto: CreateCvBodyDto,
    @Param('jobId') jobId: string,
  ) {
    return this.jobApplicationsService.applyWithNewCv(userId, dto, jobId);
  }

  @ApiOperation({ summary: 'Get applied jobs' })
  @Get('applied-jobs')
  async getAppliedJobs(
    @GetUser('sub') userId: string,
    @Query() dto: GetAppliedJobsDto,
  ) {
    return this.jobApplicationsService.getAppliedJobs(userId, dto);
  }

  @ApiOperation({ summary: 'Get farm owner applications' })
  @ValidateFarmOwner()
  @Get('farm-owner')
  async getFarmOwnerApplications(
    @GetUser('sub') userId: string,
    @Query() dto: GetFarmOwnerApplicationsDto,
  ) {
    return this.getFarmOwnerApplicationsService.getApplications(userId, dto);
  }
}
