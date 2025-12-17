import { HandleError } from '@/common/error/handle-error.decorator';
import { successResponse, TResponse } from '@/common/utils/response.util';
import { PrismaService } from '@/lib/prisma/prisma.service';
import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma';
import { DateTime } from 'luxon';

@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);

  constructor(private readonly prismaService: PrismaService) {}

  @HandleError('Error getting plans for user')
  async getPlansForUser() {
    const orderBy = [
      { updatedAt: Prisma.SortOrder.desc },
      { createdAt: Prisma.SortOrder.desc },
    ];

    const [monthlyPlan, biannualPlan, yearlyPlan] =
      await this.prismaService.client.$transaction([
        this.prismaService.client.subscriptionPlan.findFirst({
          where: {
            billingPeriod: 'MONTHLY',
            isActive: true,
          },
          orderBy,
        }),
        this.prismaService.client.subscriptionPlan.findFirst({
          where: {
            billingPeriod: 'BIANNUAL',
            isActive: true,
          },
          orderBy,
        }),
        this.prismaService.client.subscriptionPlan.findFirst({
          where: {
            billingPeriod: 'YEARLY',
            isActive: true,
          },
          orderBy,
        }),
      ]);

    this.logger.log('Plans fetched successfully');

    return successResponse(
      {
        monthlyPlan,
        biannualPlan,
        yearlyPlan,
      },
      'Plans fetched successfully',
    );
  }

  @HandleError('Error getting subscription status')
  async getCurrentSubscriptionStatus(userId: string): Promise<TResponse<any>> {
    this.logger.log('Getting subscription status for user');
    const userSubscription =
      await this.prismaService.client.userSubscription.findFirst({
        where: { userId, status: { in: ['ACTIVE', 'PENDING'] } },
        orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
        include: { plan: true },
      });

    if (!userSubscription) {
      return successResponse(
        {
          status: 'NONE',
          message: 'No active subscription found.',
          canSubscribe: true,
          period: { startedAt: null, endedAt: null, remainingDays: null },
          plan: null,
        },
        'No subscription found',
      );
    }

    this.logger.log(
      'Subscription status fetched successfully',
      userSubscription,
    );

    const now = DateTime.now();
    const start = userSubscription.planStartedAt
      ? DateTime.fromJSDate(userSubscription.planStartedAt)
      : null;
    const end = userSubscription.planEndedAt
      ? DateTime.fromJSDate(userSubscription.planEndedAt)
      : null;
    const isExpired = end ? end < now : false;

    const status =
      userSubscription.status === 'ACTIVE' && !isExpired
        ? 'ACTIVE'
        : userSubscription.status === 'PENDING'
          ? 'PENDING'
          : isExpired
            ? 'EXPIRED'
            : userSubscription.status;

    const canSubscribe = status !== 'ACTIVE' && status !== 'PENDING';

    return successResponse(
      {
        status,
        canSubscribe,
        plan: userSubscription.plan
          ? {
              title: userSubscription.plan.title,
              price: Math.round(userSubscription.plan.priceCents / 100),
              currency: userSubscription.plan.currency,
              billingPeriod: userSubscription.plan.billingPeriod,
            }
          : null,
        period: {
          startedAt: start?.toISODate() || null,
          endedAt: end?.toISODate() || null,
          remainingDays: end
            ? Math.max(end.diff(now, 'days').days, 0).toFixed(0)
            : null,
        },
        message:
          status === 'ACTIVE'
            ? `Your ${userSubscription.plan.title} plan is active until ${end?.toFormat('DDD')}.`
            : status === 'EXPIRED'
              ? `Your subscription expired on ${end?.toFormat('DDD')}.`
              : 'No active subscription found.',
      },
      'Subscription status fetched successfully',
    );
  }
}
