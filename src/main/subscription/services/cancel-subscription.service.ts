import { successResponse, TResponse } from '@/common/utils/response.util';
import { AppError } from '@/core/error/handle-error.app';
import { HandleError } from '@/core/error/handle-error.decorator';
import { PrismaService } from '@/lib/prisma/prisma.service';
import { StripeService } from '@/lib/stripe/stripe.service';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class CancelSubscriptionService {
  private readonly logger = new Logger(CancelSubscriptionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stripe: StripeService,
  ) {}

  @HandleError('Failed to cancel subscription')
  async cancelSubscriptionImmediately(
    userId: string,
  ): Promise<TResponse<null>> {
    const subscription = await this.prisma.client.userSubscription.findFirst({
      where: {
        userId,
        status: { in: ['ACTIVE', 'PENDING'] },
      },
      orderBy: [{ updatedAt: 'desc' }],
    });

    if (!subscription || !subscription.stripeSubscriptionId) {
      throw new AppError(400, 'No active subscription found');
    }

    // Cancel immediately on Stripe
    await this.stripe.cancelSubscription({
      subscriptionId: subscription.stripeSubscriptionId,
      atPeriodEnd: false,
    });

    // Sync DB
    await this.prisma.client.$transaction([
      this.prisma.client.userSubscription.update({
        where: { id: subscription.id },
        data: {
          status: 'CANCELED',
          endedAt: new Date(),
        },
      }),

      this.prisma.client.user.update({
        where: { id: userId },
        data: {
          subscriptionStatus: 'CANCELED',
        },
      }),
    ]);

    this.logger.log(
      `Subscription ${subscription.stripeSubscriptionId} cancelled immediately for user ${userId}`,
    );

    return successResponse(null, 'Subscription cancelled successfully');
  }
}
