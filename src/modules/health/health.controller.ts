import { PrismaService } from "@/infrastructure/prisma";
import { Controller, Get } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import {
  HealthCheck,
  HealthCheckService,
  PrismaHealthIndicator,
} from "@nestjs/terminus";

@ApiTags("Health")
@Controller("health")
export class HealthController {
  constructor(
    private healthService: HealthCheckService,
    private db: PrismaHealthIndicator,
    private prisma: PrismaService,
  ) {}

  @Get("/")
  @HealthCheck()
  @ApiOperation({ summary: "Check application and database health" })
  @ApiResponse({ status: 200, description: "Application is healthy" })
  @ApiResponse({ status: 503, description: "Application is unhealthy" })
  check() {
    return this.healthService.check([
      () => this.db.pingCheck("database", this.prisma, { timeout: 1000 }),
    ]);
  }
}
