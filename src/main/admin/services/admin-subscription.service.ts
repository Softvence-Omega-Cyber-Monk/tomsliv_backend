import { PaginationDto } from '@/common/dto/pagination.dto';
import {
  successPaginatedResponse,
  successResponse,
} from '@/common/utils/response.util';
import { HandleError } from '@/core/error/handle-error.decorator';
import { PrismaService } from '@/lib/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { DateTime } from 'luxon';

@Injectable()
export class AdminSubscriptionService {
  constructor(private readonly prisma: PrismaService) {}

  @HandleError('Error getting stats')
  async getStats() {
    const now = DateTime.now();

    // Total revenue
    const totalRevenueResult = await this.prisma.client.invoice.aggregate({
      _sum: { amount: true },
      where: { status: 'PAID' },
    });

    const totalRevenue = totalRevenueResult._sum.amount ?? 0;

    // Total revenue this week
    const startOfWeek = now.startOf('week').toJSDate();
    const endOfWeek = now.endOf('week').toJSDate();

    const weeklyRevenueResult = await this.prisma.client.invoice.aggregate({
      _sum: { amount: true },
      where: {
        status: 'PAID',
        paidAt: { gte: startOfWeek, lte: endOfWeek },
      },
    });

    const weeklyRevenue = weeklyRevenueResult._sum.amount ?? 0;

    // Total transactions (paid invoices)
    const totalTransactions = await this.prisma.client.invoice.count({
      where: { status: 'PAID' },
    });

    // Running subscriptions
    const runningSubscriptions =
      await this.prisma.client.userSubscription.count({
        where: { status: 'ACTIVE' },
      });

    const stats = {
      totalRevenue,
      weeklyRevenue,
      totalTransactions,
      runningSubscriptions,
    };

    return successResponse(stats, 'Stats fetched successfully');
  }

  @HandleError('Error getting revenue last 7 days')
  async getRevenueLast7Days() {
    const today = DateTime.now().startOf('day');
    const revenueData: { label: string; value: number; date: string }[] = [];

    for (let i = 6; i >= 0; i--) {
      const day = today.minus({ days: i });
      const start = day.startOf('day').toJSDate();
      const end = day.endOf('day').toJSDate();

      const sumResult = await this.prisma.client.invoice.aggregate({
        _sum: { amount: true },
        where: { status: 'PAID', paidAt: { gte: start, lte: end } },
      });

      revenueData.push({
        label: day.toFormat('ccc dd'), // e.g., "Mon 15"
        value: sumResult._sum.amount ?? 0,
        date: day.toISODate(),
      });
    }

    return successResponse(revenueData, 'Revenue last 7 days fetched');
  }

  @HandleError('Error getting revenue last 6 months')
  async getRevenueLast6Months() {
    const now = DateTime.now();
    const revenueData: { label: string; value: number; month: string }[] = [];

    for (let i = 5; i >= 0; i--) {
      const month = now.minus({ months: i });
      const start = month.startOf('month').toJSDate();
      const end = month.endOf('month').toJSDate();

      const sumResult = await this.prisma.client.invoice.aggregate({
        _sum: { amount: true },
        where: { status: 'PAID', paidAt: { gte: start, lte: end } },
      });

      revenueData.push({
        label: month.toFormat('LLL yyyy'), // e.g., "Dec 2025"
        value: sumResult._sum.amount ?? 0,
        month: month.toISODate(),
      });
    }

    return successResponse(revenueData, 'Revenue last 6 months fetched');
  }

  @HandleError('Error getting payment history')
  async getPaymentHistory(dto: PaginationDto) {
    const page = dto.page && dto.page > 0 ? +dto.page : 1;
    const limit = dto.limit && dto.limit > 0 ? +dto.limit : 10;
    const skip = (page - 1) * limit;

    const invoices = await this.prisma.client.invoice.findMany({
      orderBy: { issuedAt: 'desc' },
      skip,
      take: limit,
      include: {
        subscription: { include: { plan: true } },
        user: true,
      },
    });

    let data = invoices.map((inv) => ({
      id: inv.id,
      user: inv.user
        ? {
            name: inv.user.name,
            email: inv.user.email,
          }
        : { name: 'Unknown', email: '' },
      subscription: inv.subscription?.plan
        ? { plan: { title: inv.subscription.plan.title } }
        : { plan: { title: 'Unknown Plan' } },
      amount: inv.amount,
      currency: inv.currency,
      status: inv.status,
      issuedAt: inv.issuedAt,
      paidAt: inv.paidAt,
    }));

    // If no data, return two dummy rows
    if (data.length === 0) {
      const now = new Date();
      data = [
        {
          id: 'dummy1',
          user: { name: 'John Doe', email: 'john@example.com' },
          subscription: { plan: { title: 'Sample Plan' } },
          amount: 1000,
          currency: 'USD',
          status: 'PAID',
          issuedAt: now,
          paidAt: now,
        },
        {
          id: 'dummy2',
          user: { name: 'Jane Doe', email: 'jane@example.com' },
          subscription: { plan: { title: 'Sample Plan' } },
          amount: 500,
          currency: 'USD',
          status: 'PENDING',
          issuedAt: now,
          paidAt: null,
        },
      ];
    }

    return successPaginatedResponse(
      data,
      {
        page,
        limit,
        total: await this.prisma.client.invoice.count(),
      },
      'Successfully found',
    );
  }
}
