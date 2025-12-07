import { successResponse, TResponse } from '@/common/utils/response.util';
import { AppError } from '@/core/error/handle-error.app';
import { HandleError } from '@/core/error/handle-error.decorator';
import { PrismaService } from '@/lib/prisma/prisma.service';
import { AuthUtilsService } from '@/lib/utils/services/auth-utils.service';
import { Injectable } from '@nestjs/common';
import { UserRole } from '@prisma';
import { FarmRegisterDto, RegisterDto } from '../dto/register.dto';

@Injectable()
export class AuthRegisterService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly utils: AuthUtilsService,
  ) {}

  @HandleError('User Registration failed', 'User')
  async register(dto: RegisterDto): Promise<TResponse<any>> {
    const { email, password, name } = dto;

    // Check if user email already exists
    const existingUser = await this.prisma.client.user.findUnique({
      where: { email },
    });
    if (existingUser) {
      throw new AppError(400, 'User already exists with this email');
    }

    // Create new user
    const newUser = await this.prisma.client.user.create({
      data: {
        email,
        name,
        role: UserRole.USER,
        password: await this.utils.hash(password),
        isVerified: true,
        notificationSettings: {
          create: {},
        },
      },
    });

    // Removed verification flow as per requirement

    // Return sanitized response
    return successResponse(
      {
        email: newUser.email,
        isVerified: newUser.isVerified,
      },
      `Registration successful. Welcome to TomsLiv.`,
    );
  }

  @HandleError('Farm Owner Registration failed', 'Farm Owner')
  async farmRegister(dto: FarmRegisterDto): Promise<TResponse<any>> {
    const { email, password, name, farmName } = dto;

    // Check if user email already exists
    const existingUser = await this.prisma.client.user.findUnique({
      where: { email },
    });
    if (existingUser) {
      throw new AppError(400, 'User already exists with this email');
    }

    // Create new user with farm
    const newUser = await this.prisma.client.user.create({
      data: {
        email,
        name,
        role: UserRole.FARM_OWNER,
        password: await this.utils.hash(password),
        isVerified: true,
        farm: {
          create: {
            name: farmName,
          },
        },
        notificationSettings: {
          create: {},
        },
      },
      include: {
        farm: true,
      },
    });

    // Removed verification flow as per requirement

    // Return sanitized response
    return successResponse(
      {
        email: newUser.email,
        farm: newUser.farm,
        isVerified: newUser.isVerified,
      },
      `Registration successful. Welcome to TomsLiv.`,
    );
  }
}
