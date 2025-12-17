import { successResponse } from '@/common/utils/response.util';
import { HandleError } from '@/core/error/handle-error.decorator';
import { PrismaService } from '@/lib/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { NotificationSettings } from '@prisma';
import {
  AdminNotificationSettingsDto,
  FarmOwnerNotificationSettingsDto,
  UserNotificationSettingsDto,
} from '../dto/notification-setting.dto';

@Injectable()
export class AuthNotificationService {
  constructor(private readonly prisma: PrismaService) {}

  @HandleError('Farm Owner settings updated', 'NotificationSettings')
  async updateFarmOwnerSettings(
    userId: string,
    dto: FarmOwnerNotificationSettingsDto,
  ) {
    const user = await this.prisma.client.user.findUniqueOrThrow({
      where: { id: userId },
      include: { notificationSettings: true },
    });

    const updated = await this.prisma.client.notificationSettings.upsert({
      where: { id: user.notificationSettings?.id },
      create: { ...dto },
      update: { ...dto },
    });

    const filtered = this.filterFarmOwnerSettings(updated, userId);

    return successResponse(filtered, 'Farm Owner settings updated');
  }

  @HandleError('User settings updated', 'NotificationSettings')
  async updateUserSettings(userId: string, dto: UserNotificationSettingsDto) {
    const user = await this.prisma.client.user.findUniqueOrThrow({
      where: { id: userId },
      include: { notificationSettings: true },
    });

    const updated = await this.prisma.client.notificationSettings.upsert({
      where: { id: user.notificationSettings?.id },
      create: { ...dto },
      update: { ...dto },
    });

    const filtered = this.filterUserSettings(updated, userId);

    return successResponse(filtered, 'User settings updated');
  }

  @HandleError('Admin settings updated', 'NotificationSettings')
  async updateAdminNotificationSettings(
    userId: string,
    dto: AdminNotificationSettingsDto,
  ) {
    const user = await this.prisma.client.user.findUniqueOrThrow({
      where: { id: userId },
      include: { notificationSettings: true },
    });

    const updated = await this.prisma.client.notificationSettings.upsert({
      where: { id: user.notificationSettings?.id },
      create: { ...dto },
      update: { ...dto },
    });

    const filtered = this.filterAdminSettings(updated, userId);

    return successResponse(filtered, 'Admin settings updated');
  }

  private filterFarmOwnerSettings(
    settings: NotificationSettings,
    userId: string,
  ) {
    return {
      id: settings.id,
      userId,
      emailNotifications: settings.emailNotifications,
      weeklyDigest: settings.weeklyDigest,
      newApplicantAlert: settings.newApplicantAlert,
      updatesAndTips: settings.updatesAndTips,
    };
  }

  private filterUserSettings(settings: NotificationSettings, userId: string) {
    return {
      id: settings.id,
      userId,
      emailNotifications: settings.emailNotifications,
      weeklyDigest: settings.weeklyDigest,
      newRelatedJobsAlert: settings.newRelatedJobsAlert,
    };
  }

  private filterAdminSettings(settings: NotificationSettings, userId: string) {
    return {
      id: settings.id,
      userId,
      emailNotifications: settings.emailNotifications,
      weeklyDigest: settings.weeklyDigest,
      newEmployerJoin: settings.newEmployerJoin,
    };
  }
}
