import { successResponse } from '@/common/utils/response.util';
import { AppError } from '@/core/error/handle-error.app';
import { HandleError } from '@/core/error/handle-error.decorator';
import { S3Service } from '@/lib/file/services/s3.service';
import { PrismaService } from '@/lib/prisma/prisma.service';
import { AuthUtilsService } from '@/lib/utils/services/auth-utils.service';
import { Injectable } from '@nestjs/common';
import { FileInstance } from '@prisma';
import { UpdateProfileDto } from '../dto/update-profile.dto';

@Injectable()
export class AuthUpdateProfileService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authUtils: AuthUtilsService,
    private readonly s3: S3Service,
  ) {}

  @HandleError('Failed to update profile', 'User')
  async updateProfile(
    userId: string,
    dto: UpdateProfileDto,
    file?: Express.Multer.File,
  ) {
    const user = await this.prisma.client.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppError(404, 'User not found');
    }

    // * If phone is provided, remove + and check uniqueness
    if (dto.phone?.trim()) {
      dto.phone = dto.phone.replace('+', '').trim();
      const existingUserWithPhone = await this.prisma.client.user.findUnique({
        where: { phone: dto.phone },
      });

      if (existingUserWithPhone && existingUserWithPhone.id !== userId) {
        throw new AppError(400, 'Phone number is already in use');
      }
    }

    // * if image is provided, upload to S3 and update user
    let fileInstance: FileInstance | undefined;
    if (file) {
      const uploadFile = await this.s3.uploadFile(file);

      if (uploadFile) {
        fileInstance = uploadFile;
      }
    }

    const updatedUser = await this.prisma.client.user.update({
      where: { id: userId },
      data: {
        name: dto.name?.trim() ? dto.name.trim() : user.name,
        ...(fileInstance && {
          profilePicture: {
            connect: fileInstance,
          },
        }),
        phone: dto.phone?.trim() ? dto.phone : user.phone,
      },
      include: { profilePicture: true },
    });

    return successResponse(
      await this.authUtils.sanitizeUser(updatedUser),
      'Profile updated successfully',
    );
  }
}
