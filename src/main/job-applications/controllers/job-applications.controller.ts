import { GetUser, ValidateAuth } from '@/core/jwt/jwt.decorator';
import { MulterService } from '@/lib/file/services/multer.service';
import { Body, Controller, Param, Post, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { FileType } from '@prisma';
import { JobApplicationsService } from '../services/job-applications.service';
import { CreateCvDto } from '@/main/cv/dto/cv.dto';

@ApiTags('Job Applications')
@ApiBearerAuth()
@ValidateAuth()
@Controller('job-applications')
export class JobApplicationsController {
  constructor(
    private readonly jobApplicationsService: JobApplicationsService,
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
  @ApiConsumes('multipart/form-data')
  @Post()
  @UseInterceptors(
    FileInterceptor(
      'file',
      new MulterService().createMulterOptions('./temp', 'temp', FileType.docs),
    ),
  )
  @Post('apply-new/:jobId')
  async applyWithNewCv(
    @GetUser('sub') userId: string,
    @Body() dto: CreateCvDto,
    @Param('jobId') jobId: string,
  ) {
    return this.jobApplicationsService.applyWithNewCv(userId, dto, jobId);
  }
}
