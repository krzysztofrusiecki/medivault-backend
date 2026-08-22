import { Module } from "@nestjs/common";
import { PrismaModule } from "@/infrastructure/prisma";
import { ReferenceRangesService } from "./reference-ranges.service";
import { ReferenceRangesController } from "./reference-ranges.controller";

@Module({
  imports: [PrismaModule],
  controllers: [ReferenceRangesController],
  providers: [ReferenceRangesService],
  exports: [ReferenceRangesService],
})
export class ReferenceRangesModule {}
