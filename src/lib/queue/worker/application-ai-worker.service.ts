import { QueueName } from '@/common/enum/queue-name.enum';
import { ShortlistMailService } from '@/lib/mail/services/shortlist-mail.service';
import { PrismaService } from '@/lib/prisma/prisma.service';
import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job } from 'bullmq';
import { ApplicationAIPayload } from '../interface/application-ai.payload';

@Processor(QueueName.APPLICATION_AI, { concurrency: 3 })
export class ApplicationAIWorkerService extends WorkerHost {
  private readonly logger = new Logger(ApplicationAIWorkerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly shortlistMailService: ShortlistMailService,
    private readonly configService: ConfigService,
  ) {
    super();
  }

  async process(job: Job<ApplicationAIPayload>): Promise<void> {
    const { applicationId, jobId, cvId, idealCandidateId, triggerReason } =
      job.data;

    this.logger.log(
      `Processing AI analysis for application ${applicationId}, trigger: ${triggerReason}`,
    );

    try {
      if (triggerReason === 'application-shortlisted') {
        await this.handleShortlistEmail(applicationId);
        return;
      }

      // TODO: In the future, this will:
      // 1. Fetch application, job, CV, and ideal candidate data from database
      // 2. Call external AI service API with the data
      // 3. Parse AI response
      // 4. Create or update ApplicationAIResult record with:
      //    - summary
      //    - motivation
      //    - jobFitScore
      //    - suggestedQuestions
      //    - strengths
      //    - areasOfImprovement
      //    - keyTraits

      this.logger.log(
        `[PLACEHOLDER] Would analyze application ${applicationId} for job ${jobId} with CV ${cvId}`,
      );
      this.logger.log(
        `[PLACEHOLDER] Trigger reason: ${triggerReason}, Ideal Candidate: ${idealCandidateId || 'N/A'}`,
      );

      // Simulate processing time
      await new Promise((resolve) => setTimeout(resolve, 100));

      this.logger.log(
        `AI analysis placeholder completed for application ${applicationId}`,
      );
    } catch (err) {
      this.logger.error(
        `Job ${job.id} failed: ${(err as Error).message}`,
        (err as Error).stack,
      );
      throw err; // allows retry/backoff
    }
  }

  private async handleShortlistEmail(applicationId: string) {
    const application = await this.prisma.client.jobApplication.findUnique({
      where: { id: applicationId },
      include: {
        cv: true,
        job: {
          include: {
            farm: true,
          },
        },
      },
    });

    if (
      !application ||
      !application.cv ||
      !application.job ||
      !application.job.farm
    ) {
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
      // Placeholder for AI generated personalized content
      undefined,
    );

    this.logger.log(
      `Shortlist email sent to ${cv.email} for application ${application.id}`,
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
