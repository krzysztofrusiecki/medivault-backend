import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { validateEnv } from "./config/configuration";
import { Environment } from "./config/schema";
import { PrismaModule } from "./infrastructure/prisma/prisma.module";
import { UsersModule } from "./modules/users/users.module";
import { AuthModule } from "./modules/auth/auth.module";
import { AnalytesModule } from "./modules/analytes/analytes.module";
import { AnalyteUnitsModule } from "./modules/analyte-units/analyte-units.module";
import { TestResultsModule } from "./modules/test-results/test-results.module";
import { LabsModule } from "./modules/labs/labs.module";
import { TestBatchesModule } from "./modules/test-batches/test-batches.module";
import { ReferenceRangesModule } from "./modules/reference-ranges/reference-ranges.module";
import { ThrottlerModule } from "@nestjs/throttler";
import { HealthModule } from "./modules/health/health.module";
import { APP_FILTER } from "@nestjs/core";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ".env",
      validate: validateEnv,
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService<Environment>) => ({
        throttlers: [{ name: "default", ttl: 60_000, limit: 20 }],
        // The e2e/unit suites reuse one IP and, in some files, one email
        // across many requests per run — real rate limiting there would
        // make the suite flaky rather than testing anything meaningful.
        skipIf: () => configService.get("NODE_ENV") === "test",
      }),
    }),
    PrismaModule,
    UsersModule,
    AuthModule,
    AnalytesModule,
    AnalyteUnitsModule,
    TestResultsModule,
    LabsModule,
    TestBatchesModule,
    ReferenceRangesModule,
    HealthModule,
  ],
  controllers: [],
  providers: [
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
  ],
})
export class AppModule {}
