import { Module } from "@nestjs/common";
import { UsersService } from "./users.service";
import { UsersController } from "./users.controller";
import { PrismaModule } from "../../infrastructure/prisma/prisma.module";
import { LabsModule } from "../labs/labs.module";

@Module({
  imports: [PrismaModule, LabsModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
