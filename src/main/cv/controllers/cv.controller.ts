import { GetUser } from '@/core/jwt/jwt.decorator';
import { Body, Controller, Delete, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreateCvDto } from '../dto/cv.dto';
import { CvService } from '../services/cv.service';

@ApiTags('CV')
@ApiBearerAuth()
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
  async saveCv(@GetUser('sub') userId: string, @Body() dto: CreateCvDto) {
    return this.cvService.upsertCv(userId, dto);
  }

  @ApiOperation({ summary: 'Delete saved CV' })
  @Delete()
  async deleteCv(@GetUser('sub') userId: string) {
    return this.cvService.deleteCv(userId);
  }
}
