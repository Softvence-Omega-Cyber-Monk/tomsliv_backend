import { ENVEnum } from '@/common/enum/env.enum';
import { QueueName } from '@/common/enum/queue-name.enum';
import { ShortlistMailService } from '@/lib/mail/services/shortlist-mail.service';
import { PrismaService } from '@/lib/prisma/prisma.service';
import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { Job } from 'bullmq';
import { ApplicationAIPayload } from '../interface/application-ai.payload';

@Processor(QueueName.APPLICATION_AI, { concurrency: 30 })
export class ApplicationAIWorkerService extends WorkerHost {
  private readonly logger = new Logger(ApplicationAIWorkerService.name);
  private readonly AI_URL: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly shortlistMailService: ShortlistMailService,
    private readonly configService: ConfigService,
  ) {
    super();
    this.AI_URL = this.configService.get<string>(ENVEnum.AI_URL) || '';
  }

  async process(job: Job<ApplicationAIPayload>): Promise<void> {
    this.logger.log(`Processing job`, JSON.stringify(job, null, 2));

    const { applicationId, triggerReason } = job.data;

    this.logger.log(
      `Processing AI analysis for application ${applicationId}, trigger: ${triggerReason}`,
    );

    try {
      if (triggerReason === 'application-shortlisted') {
        await this.handleShortlistEmail(applicationId);
        return;
      }

      if (!applicationId) {
        this.logger.warn(
          `No application ID provided for AI analysis, skipping`,
        );
        return;
      }

      // Fetch application with CV, job, and user details
      const application = await this.prisma.client.jobApplication.findUnique({
        where: { id: applicationId },
        include: {
          cv: { include: { experiences: true, educations: true } },
          job: { include: { farm: true, idealCandidates: true } },
          user: { select: { name: true, email: true } },
          applicationAIResults: true,
        },
      });

      if (!application || !application.cv || !application.job) {
        throw new Error(
          `Missing application, CV, or job for application ${applicationId}`,
        );
      }

      // Fetch ideal candidate if exists
      const idealCandidate = application.job.idealCandidates
        ? await this.prisma.client.idealCandidate.findUnique({
            where: { id: application.job.idealCandidates.id },
          })
        : null;

      // Build payloads for AI
      const jobDetails = {
        title: application.job.title,
        description: application.job.description,
        location:
          application.job.location || application.job.farm?.name || 'N/A',
        type: application.job.jobType || 'N/A',
        requirements: [], // can extend if you have job requirements stored
      };

      const idealCandidatePayload = idealCandidate
        ? {
            experience: `${idealCandidate.minimumExperienceYears}-${idealCandidate.maximumExperienceYears} years`,
            skills: idealCandidate.coreSkills,
            nonNegotiableSkills: idealCandidate.nonNegotiableSkills,
            personalityTraits: idealCandidate.desiredPersonalityTraits,
            recruiterValues: idealCandidate.recruiterValues,
            recruiterHobbies: idealCandidate.recruiterHobbies,
            recruiterPassions: idealCandidate.recruiterPassions,
          }
        : '';

      const cvJson = this.transformCvForAi(application.cv);

      // Call AI endpoint
      const aiResult = await this.callAiEndpoint(
        jobDetails,
        idealCandidatePayload,
        cvJson,
      );

      this.logger.log(
        `AI result for application ${applicationId}:`,
        JSON.stringify(aiResult, null, 2),
      );

      // Save or update AI result
      await this.prisma.client.applicationAIResult.upsert({
        where: { applicationId: application.id },
        create: {
          applicationId: application.id,
          summary: aiResult.AI_generated_summary,
          motivation: aiResult.cover_letter_insights?.motivation || '',
          jobFitScore: aiResult.AI_fit_score?.score || 0,
          suggestedQuestions:
            aiResult.AI_suggested_interview_questions?.questions || [],
          strengths: aiResult.strengths || [],
          areasOfImprovement: aiResult.areas_of_development || [],
          keyTraits: aiResult.cover_letter_insights?.key_traits || [],
        },
        update: {
          summary: aiResult.AI_generated_summary,
          motivation: aiResult.cover_letter_insights?.motivation || '',
          jobFitScore: aiResult.AI_fit_score?.score || 0,
          suggestedQuestions:
            aiResult.AI_suggested_interview_questions?.questions || [],
          strengths: aiResult.strengths || [],
          areasOfImprovement: aiResult.areas_of_development || [],
          keyTraits: aiResult.cover_letter_insights?.key_traits || [],
        },
      });

      this.logger.log(`AI analysis completed for application ${applicationId}`);
    } catch (err) {
      this.logger.error(
        `Job ${job.id} failed: ${(err as Error).message}`,
        (err as Error).stack,
      );
      throw err;
    }
  }

  private transformCvForAi(cv: any) {
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
        responsibilities: exp.summary
          ? exp.summary
              .split(/[\n•-]/)
              .map((s: string) => s.trim())
              .filter(Boolean)
          : [],
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

  private async callAiEndpoint(
    jobDetails: any,
    idealCandidate: any,
    cvJson: any,
  ) {
    if (!this.AI_URL) throw new Error('AI server URL not configured');

    try {
      const formData = new FormData();
      formData.append('job_details', JSON.stringify(jobDetails));
      formData.append(
        'ideal_candidate',
        idealCandidate ? JSON.stringify(idealCandidate) : '',
      );
      formData.append('cv_json', JSON.stringify(cvJson));
      formData.append('cv_file', ''); // not using file

      const { data } = await axios.post(
        `${this.AI_URL}/process-candidate`,
        formData,
        {
          timeout: 30_000,
        },
      );

      return data;
    } catch (err: unknown) {
      let message = 'AI service call failed';
      if (axios.isAxiosError(err)) {
        message = err.response?.data?.message || err.message || message;
      } else if (err instanceof Error) {
        message = err.message;
      }
      this.logger.error('AI service failed', err as any);
      throw new Error(message);
    }
  }

  private async handleShortlistEmail(applicationId: string) {
    const application = await this.prisma.client.jobApplication.findUnique({
      where: { id: applicationId },
      include: { cv: true, job: { include: { farm: true } } },
    });

    if (!application || !application.cv || !application.job?.farm) {
      this.logger.warn(
        `Missing data for shortlist email. App: ${applicationId}`,
      );
      return;
    }

    const { cv, job } = application;
    const candidateName = `${cv.firstName} ${cv.lastName}`;

    await this.shortlistMailService.sendShortlistEmail(
      cv.email,
      candidateName,
      job.title,
      job.farm.name,
      undefined,
    );

    this.logger.log(
      `Shortlist email sent to ${cv.email} for application ${applicationId}`,
    );
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.log(
      `AI analysis job ${job.id} completed for application ${job.data.applicationId}`,
    );
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, err: any) {
    this.logger.error(
      `AI analysis job ${job.id} failed for application ${job.data.applicationId}: ${err?.message}`,
    );
  }
}
