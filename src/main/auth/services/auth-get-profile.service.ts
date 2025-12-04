import { successResponse, TResponse } from '@/common/utils/response.util';
import { HandleError } from '@/core/error/handle-error.decorator';
import { PrismaService } from '@/lib/prisma/prisma.service';
import { AuthUtilsService } from '@/lib/utils/services/auth-utils.service';
import { Injectable } from '@nestjs/common';
import { NotificationSettings, UserRole } from '@prisma';

@Injectable()
export class AuthGetProfileService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authUtils: AuthUtilsService,
  ) {}

  @HandleError("Can't get user profile")
  async getProfile(userId: string) {
    const user = await this.findUserBy('id', userId);
    return user;
  }

  private async findUserBy(
    key: 'id' | 'email',
    value: string,
  ): Promise<TResponse<any>> {
    const where: any = {};
    where[key] = value;

    const user = await this.prisma.client.user.findUniqueOrThrow({
      where,
      include: {
        farm: {
          include: {
            logo: true,
          },
        },
        notificationSettings: true,
      },
    });

    // Extract only the main user fields
    const { notificationSettings, farm, ...mainUser } = user;

    const sanitizedUser = await this.authUtils.sanitizeUser(mainUser);

    // Format notification settings based on user role
    const formattedNotificationSettings = this.formatNotificationSettings(
      sanitizedUser.role,
      notificationSettings,
    );

    // Build final response
    const data = {
      ...sanitizedUser,
      farm,
      notificationSettings: formattedNotificationSettings,
    };

    return successResponse(data, 'User data fetched successfully');
  }

  private formatNotificationSettings(
    userRole: UserRole,
    settings: NotificationSettings | null,
  ) {
    if (!settings) return null;

    const common = {
      emailNotifications: settings.emailNotifications,
      weeklyDigest: settings.weeklyDigest,
    };

    if (userRole === 'FARM_OWNER') {
      return {
        ...common,
        newApplicantAlert: settings.newApplicantAlert,
        updatesAndTips: settings.updatesAndTips,
      };
    }

    if (userRole === 'USER') {
      return {
        ...common,
        newRelatedJobsAlert: settings.newRelatedJobsAlert,
      };
    }

    return common;
  }
}
