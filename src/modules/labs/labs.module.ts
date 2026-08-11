import { Module } from "@nestjs/common";
import { PrismaModule } from "@/infrastructure/prisma";
import { LabsService } from "./labs.service";
import { LabsController } from "./labs.controller";

@Module({
  imports: [PrismaModule],
  controllers: [LabsController],
  providers: [LabsService],
  exports: [LabsService],
})
export class LabsModule {}
