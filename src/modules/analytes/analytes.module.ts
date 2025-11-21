import { Module } from "@nestjs/common";
import { PrismaModule } from "@/infrastructure/prisma";
import { AnalytesService } from "./analytes.service";
import { AnalytesController } from "./analytes.controller";

@Module({
  imports: [PrismaModule],
  controllers: [AnalytesController],
  providers: [AnalytesService],
  exports: [AnalytesService],
})
export class AnalytesModule {}
