import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * PrismaService handles database connection lifecycle and provides
 * a singleton instance of PrismaClient across the application.
 *
 * Implements NestJS lifecycle hooks:
 * - OnModuleInit: Initializes database connection when module loads
 * - OnModuleDestroy: Gracefully closes connection when module unloads
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
