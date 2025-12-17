import { AppError } from '@/common/error/handle-error.app';
import { HandleError } from '@/common/error/handle-error.decorator';
import { successResponse, TResponse } from '@/common/utils/response.util';
import { PrismaService } from '@/lib/prisma/prisma.service';
import { StripeService } from '@/lib/stripe/stripe.service';
import { StripePaymentMetadata } from '@/lib/stripe/stripe.types';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class CreateIntentService {
  private readonly logger = new Logger(CreateIntentService.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly stripeService: StripeService,
  ) {}

  @HandleError('Failed to create setup intent', 'Subscription')
  async createSetupIntent(
    userId: string,
    planId: string,
  ): Promise<TResponse<any>> {
    // 0. Normalize current time
    const now = new Date();

    // 1. Get user
    const user = await this.prismaService.client.user.findUniqueOrThrow({
      where: { id: userId },
    });

    // 2. Check for truly active subscription
    const activeSub =
      await this.prismaService.client.userSubscription.findFirst({
        where: { userId: user.id, status: 'ACTIVE', planEndedAt: { gt: now } },
      });

    if (activeSub) {
      throw new AppError(
        400,
        `User already has an active subscription until ${activeSub.planEndedAt.toISOString()}`,
      );
    }

    // 3. Get plan
    const plan =
      await this.prismaService.client.subscriptionPlan.findUniqueOrThrow({
        where: { id: planId, isActive: true },
      });

    // 4. Clean up old pending subscriptions for this plan
    await this.prismaService.client.userSubscription.updateMany({
      where: { userId: user.id, planId: plan.id, status: 'PENDING' },
      data: { status: 'FAILED', failedAt: now },
    });

    // 5. Create metadata for Stripe
    const metadata: StripePaymentMetadata = {
      userId: user.id,
      email: user.email,
      name: user.name || user.username,
      planId: plan.id,
      planTitle: plan.title,
      stripeProductId: plan.stripeProductId,
      stripePriceId: plan.stripePriceId,
    };

    // 6. Create SetupIntent
    const setupIntent = await this.stripeService.createSetupIntent(metadata);

    // 7. Calculate plan period
    const planStartedAt = now;
    let planEndedAt: Date;

    switch (plan.billingPeriod) {
      case 'MONTHLY':
        planEndedAt = new Date(planStartedAt);
        planEndedAt.setMonth(planEndedAt.getMonth() + 1);
        if (planEndedAt.getDate() !== planStartedAt.getDate()) {
          planEndedAt = new Date(
            planEndedAt.getFullYear(),
            planEndedAt.getMonth() + 1,
            0,
          );
        }
        break;

      case 'BIANNUAL':
        planEndedAt = new Date(planStartedAt);
        planEndedAt.setMonth(planEndedAt.getMonth() + 6);
        if (planEndedAt.getDate() !== planStartedAt.getDate()) {
          planEndedAt = new Date(
            planEndedAt.getFullYear(),
            planEndedAt.getMonth() + 1,
            0,
          );
        }
        break;

      case 'YEARLY':
        planEndedAt = new Date(planStartedAt);
        planEndedAt.setFullYear(planEndedAt.getFullYear() + 1);
        break;

      default:
        throw new AppError(400, 'Unknown billing period');
    }

    // 8. Save subscription record
    await this.prismaService.client.userSubscription.create({
      data: {
        user: { connect: { id: user.id } },
        plan: { connect: { id: plan.id } },
        planStartedAt,
        planEndedAt,
        stripeTransactionId: setupIntent.id, // SetupIntent -> local subscription link
        status: 'PENDING', // waiting for invoice.paid
      },
    });

    this.logger.log(
      `Created setup intent ${setupIntent.id} for user ${user.email}`,
    );

    // 9. Return SetupIntent client_secret
    return successResponse(
      {
        setupIntentId: setupIntent.id,
        setupIntentSecret: setupIntent.client_secret,
        amount: plan.priceCents,
        currency: plan.currency,
        planTitle: plan.title,
      },
      'Created setup intent to connect payment method',
    );
  }
}
