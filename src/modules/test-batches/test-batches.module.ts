import { Module } from "@nestjs/common";
import { PrismaModule } from "@/infrastructure/prisma";
import { TestBatchesService } from "./test-batches.service";
import { TestBatchesController } from "./test-batches.controller";

@Module({
  imports: [PrismaModule],
  controllers: [TestBatchesController],
  providers: [TestBatchesService],
  exports: [TestBatchesService],
})
export class TestBatchesModule {}
