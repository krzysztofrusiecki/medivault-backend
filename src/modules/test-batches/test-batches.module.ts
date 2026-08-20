import { Module } from "@nestjs/common";
import { PrismaModule } from "@/infrastructure/prisma";
import { UsersModule } from "../users/users.module";
import { TestBatchesService } from "./test-batches.service";
import { TestBatchesController } from "./test-batches.controller";

@Module({
  imports: [PrismaModule, UsersModule],
  controllers: [TestBatchesController],
  providers: [TestBatchesService],
  exports: [TestBatchesService],
})
export class TestBatchesModule {}
