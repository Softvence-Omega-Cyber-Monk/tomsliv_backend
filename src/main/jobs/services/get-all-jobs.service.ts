import { PrismaService } from '@/lib/prisma/prisma.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class GetAllJobsService {
  constructor(private readonly prisma: PrismaService) {}
}
