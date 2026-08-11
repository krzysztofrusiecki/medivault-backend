import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { validateEnv } from "./config/configuration";
import { PrismaModule } from "./infrastructure/prisma/prisma.module";
import { UsersModule } from "./modules/users/users.module";
import { AuthModule } from "./modules/auth/auth.module";
import { AnalytesModule } from "./modules/analytes/analytes.module";
import { AnalyteUnitsModule } from "./modules/analyte-units/analyte-units.module";
import { TestResultsModule } from "./modules/test-results/test-results.module";
import { LabsModule } from "./modules/labs/labs.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ".env",
      validate: validateEnv,
    }),
    PrismaModule,
    UsersModule,
    AuthModule,
    AnalytesModule,
    AnalyteUnitsModule,
    TestResultsModule,
    LabsModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
