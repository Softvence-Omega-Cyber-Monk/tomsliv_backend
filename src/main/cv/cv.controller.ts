import { GetUser, ValidateAuth } from '@/core/jwt/jwt.decorator';
import { Body, Controller, Delete, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreateCvBodyDto } from './dto/create-cv.dto';
import { CvService } from './services/cv.service';

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
  @Post()
  async saveCv(@GetUser('sub') userId: string, @Body() data: CreateCvBodyDto) {
    return this.cvService.upsertCv(userId, data);
  }

  @ApiOperation({ summary: 'Delete saved CV' })
  @Delete()
  async deleteCv(@GetUser('sub') userId: string) {
    return this.cvService.deleteCv(userId);
  }
}
