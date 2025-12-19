import { successResponse, TResponse } from '@/common/utils/response.util';
import { HandleError } from '@/core/error/handle-error.decorator';
import { PrismaService } from '@/lib/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { InvoiceStatus, UserRole } from '@prisma';
import { DateTime } from 'luxon';

@Injectable()
export class AdminStatsService {
  constructor(private readonly prisma: PrismaService) {}

  @HandleError('Failed to get system admin statistics', 'AdminStats')
  async getAdminStats(): Promise<TResponse<any>> {
    const now = DateTime.now();
    const currentMonthStart = now.startOf('month');
    const lastMonthStart = now.minus({ months: 1 }).startOf('month');

    // PMTD (Previous Month To Date)
    const lastMonthEnd = now.minus({ months: 1 });
    const pmtdEnd =
      lastMonthEnd > now.minus({ months: 1 }).endOf('month')
        ? now.minus({ months: 1 }).endOf('month')
        : lastMonthEnd;

    const currentStats = await this.getStatsForPeriod(
      currentMonthStart.toJSDate(),
      now.toJSDate(),
    );
    const lastMonthStats = await this.getStatsForPeriod(
      lastMonthStart.toJSDate(),
      pmtdEnd.toJSDate(),
    );

    const formatStat = (
      label: string,
      value: number,
      change: number,
      isCurrency = false,
    ) => ({
      label,
      value,
      formattedValue: isCurrency ? `$${(value / 100).toFixed(2)}` : `${value}`,
      change,
      changeLabel: `${change}%`,
      trend: change > 0 ? 'up' : change < 0 ? 'down' : 'neutral',
    });

    const stats = {
      totalUsers: formatStat(
        'New Job Seekers',
        currentStats.totalUsers,
        this.calculatePercentageChange(
          currentStats.totalUsers,
          lastMonthStats.totalUsers,
        ),
      ),
      totalFarms: formatStat(
        'New Employers',
        currentStats.totalFarms,
        this.calculatePercentageChange(
          currentStats.totalFarms,
          lastMonthStats.totalFarms,
        ),
      ),
      totalJobs: formatStat(
        'New Jobs Posted',
        currentStats.totalJobs,
        this.calculatePercentageChange(
          currentStats.totalJobs,
          lastMonthStats.totalJobs,
        ),
      ),
      revenue: formatStat(
        'Revenue',
        currentStats.revenue,
        this.calculatePercentageChange(
          currentStats.revenue,
          lastMonthStats.revenue,
        ),
        true,
      ),
    };

    return successResponse(stats, 'Admin statistics fetched successfully');
  }

  @HandleError('Failed to get user analytics graph', 'AdminStats')
  async getUserAnalyticsGraph(): Promise<TResponse<any>> {
    const thirtyDaysAgo = DateTime.now().minus({ days: 30 }).startOf('day');

    const users = await this.prisma.client.user.findMany({
      where: {
        createdAt: { gte: thirtyDaysAgo.toJSDate() },
        role: UserRole.USER,
      },
      select: { createdAt: true },
    });

    // Group by day
    const graphData = Array.from({ length: 30 }).map((_, i) => {
      const date = thirtyDaysAgo.plus({ days: i });
      const count = users.filter((u) => {
        const userDate = DateTime.fromJSDate(u.createdAt);
        return userDate.hasSame(date, 'day');
      }).length;

      return {
        date: date.toFormat('MMM dd'),
        count,
      };
    });

    return successResponse(
      graphData,
      'User analytics graph fetched successfully',
    );
  }

  private async getStatsForPeriod(start: Date, end: Date) {
    const [totalUsers, totalFarms, totalJobs, revenueResult] =
      await this.prisma.client.$transaction([
        this.prisma.client.user.count({
          where: { role: UserRole.USER, createdAt: { gte: start, lte: end } },
        }),
        this.prisma.client.farm.count({
          where: { createdAt: { gte: start, lte: end } },
        }),
        this.prisma.client.job.count({
          where: { createdAt: { gte: start, lte: end } },
        }),
        this.prisma.client.invoice.aggregate({
          where: {
            status: InvoiceStatus.PAID,
            paidAt: { gte: start, lte: end },
          },
          _sum: { amount: true },
        }),
      ]);

    return {
      totalUsers,
      totalFarms,
      totalJobs,
      revenue: revenueResult._sum.amount || 0,
    };
  }

  private calculatePercentageChange(current: number, previous: number): number {
    if (previous === 0) {
      return current > 0 ? 100 : 0;
    }
    return parseFloat((((current - previous) / previous) * 100).toFixed(2));
  }
}
