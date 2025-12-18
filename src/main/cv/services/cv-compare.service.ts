import { ENVEnum } from '@/common/enum/env.enum';
import { successResponse, TResponse } from '@/common/utils/response.util';
import { AppError } from '@/core/error/handle-error.app';
import { HandleError } from '@/core/error/handle-error.decorator';
import { PrismaService } from '@/lib/prisma/prisma.service';
import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { CompareCvDto } from '../dto/compare-cv.dto';

@Injectable()
export class CvComparisonService {
  private readonly AI_URL;
  private readonly logger = new Logger(CvComparisonService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.AI_URL = this.configService.getOrThrow(ENVEnum.AI_URL);
  }

  @HandleError('Failed to compare CVs', 'CV')
  async compareCVs(dto: CompareCvDto): Promise<TResponse<any>> {
    const { cvId1, cvId2 } = dto;

    const [cv1, cv2] = await this.prisma.client.$transaction([
      this.prisma.client.cV.findUnique({
        where: { id: cvId1 },
        include: {
          experiences: true,
          educations: true,
          user: { select: { name: true, email: true, profilePicture: true } },
        },
      }),
      this.prisma.client.cV.findUnique({
        where: { id: cvId2 },
        include: {
          experiences: true,
          educations: true,
          user: { select: { name: true, email: true, profilePicture: true } },
        },
      }),
    ]);

    if (!cv1 || !cv2) {
      throw new AppError(HttpStatus.NOT_FOUND, 'One or both CVs not found');
    }

    const payload = {
      cv_a: this.transformCvToAiFormat(cv1),
      cv_b: this.transformCvToAiFormat(cv2),
    };

    const aiResult = await this.callAiCompareEndpoint(payload);

    return successResponse(aiResult, 'CVs compared successfully');
  }

  private transformCvToAiFormat(cv: any) {
    return {
      name: `${cv.firstName} ${cv.lastName}`,
      skills: this.extractSkills(cv),
      certifications: cv.educations?.map((e: any) => e.degree) || [],
      work_experience: cv.experiences.map((exp: any) => ({
        role: exp.jobTitle,
        duration: this.formatDuration(
          exp.startDate,
          exp.endDate,
          exp.isOngoing,
        ),
        responsibilities: this.splitResponsibilities(exp.summary),
      })),
    };
  }

  private extractSkills(cv: any): string[] {
    const sources: string[] = [
      cv.jobTitle,
      cv.summary,
      ...cv.experiences.map((e: any) => e.summary),
    ].filter((s): s is string => typeof s === 'string');
    return [
      ...new Set(
        sources
          .join(' ')
          .split(/[,.\n]/)
          .map((s) => s.trim())
          .filter((s) => s.length > 3),
      ),
    ];
  }

  private formatDuration(start: Date, end?: Date, isOngoing?: boolean): string {
    const startYear = new Date(start).getFullYear();
    const endYear = isOngoing || !end ? 'Present' : new Date(end).getFullYear();
    return `${startYear}-${endYear}`;
  }

  private splitResponsibilities(summary: string): string[] {
    if (!summary) return [];
    return summary
      .split(/[\n•-]/)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  private async callAiCompareEndpoint(payload: any) {
    if (!this.AI_URL) {
      throw new AppError(
        HttpStatus.INTERNAL_SERVER_ERROR,
        'AI server URL is not configured',
      );
    }

    try {
      const { data } = await axios.post(`${this.AI_URL}/compare-cvs`, payload, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30_000, // 30 seconds
      });
      return data;
    } catch (err: unknown) {
      let message = 'AI CV comparison service failed';
      if (axios.isAxiosError(err)) {
        message = err.response?.data?.message || err.message || message;
        this.logger.error(
          'AI CV comparison service failed',
          err.response?.data || err.message,
        );
      } else if (err instanceof Error) {
        message = err.message;
        this.logger.error('AI CV comparison service failed', err);
      } else {
        this.logger.error('AI CV comparison service failed', err);
      }

      throw new AppError(HttpStatus.BAD_GATEWAY, message);
    }
  }
}
