import { GetUser, ValidateAuth } from '@/core/jwt/jwt.decorator';
import { MulterService } from '@/lib/file/services/multer.service';
import {
  Body,
  Controller,
  Delete,
  Get,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { FileType } from '@prisma';
import { CreateCvDto } from '../dto/cv.dto';
import { CvService } from '../services/cv.service';

@ApiTags('CV')
@ApiBearerAuth()
@ValidateAuth()
@Controller('cv')
export class CvController {
  constructor(private readonly cvService: CvService) {}

  @ApiOperation({ summary: 'Get current user saved CV' })
  @Get()
  async getMyCv(@GetUser('sub') userId: string) {
    return this.cvService.getCv(userId);
  }

  @ApiOperation({ summary: 'Save or Update CV' })
  @ApiConsumes('multipart/form-data')
  @Post()
  @UseInterceptors(
    FileInterceptor(
      'file',
      new MulterService().createMulterOptions('./temp', 'temp', FileType.docs),
    ),
  )
  async saveCv(
    @GetUser('sub') userId: string,
    @Body() data: CreateCvDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.cvService.upsertCv(userId, data, file);
  }

  @ApiOperation({ summary: 'Delete saved CV' })
  @Delete()
  async deleteCv(@GetUser('sub') userId: string) {
    return this.cvService.deleteCv(userId);
  }
}
