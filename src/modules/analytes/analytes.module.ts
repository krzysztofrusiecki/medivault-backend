import { Module } from "@nestjs/common";
import { PrismaModule } from "@/infrastructure/prisma";
import { AnalytesService } from "./analytes.service";
import { AnalytesController } from "./analytes.controller";
import { AnalyteUnitsModule } from "../analyte-units";

@Module({
  imports: [PrismaModule, AnalyteUnitsModule],
  controllers: [AnalytesController],
  providers: [AnalytesService],
  exports: [AnalytesService],
})
export class AnalytesModule {}
