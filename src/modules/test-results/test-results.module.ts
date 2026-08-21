import { Module } from "@nestjs/common";
import { AnalyteUnitsModule } from "../analyte-units";
import { AnalytesModule } from "../analytes";
import { TestBatchesModule } from "../test-batches";
import { TestResultsController } from "./test-results.controller";
import { TestResultsService } from "./test-results.service";
import { PrismaModule } from "@/infrastructure/prisma";

@Module({
  imports: [
    PrismaModule,
    AnalyteUnitsModule,
    AnalytesModule,
    TestBatchesModule,
  ],
  controllers: [TestResultsController],
  providers: [TestResultsService],
  exports: [TestResultsService],
})
export class TestResultsModule {}
