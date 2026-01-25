import { Module } from "@nestjs/common";
import { PrismaModule } from "@/infrastructure/prisma";
import { AnalyteUnitsService } from "./analyte-units.service";
import { AnalyteUnitsController } from "./analyte-units.controller";

@Module({
  imports: [PrismaModule],
  controllers: [AnalyteUnitsController],
  providers: [AnalyteUnitsService],
  exports: [AnalyteUnitsService],
})
export class AnalyteUnitsModule {}
