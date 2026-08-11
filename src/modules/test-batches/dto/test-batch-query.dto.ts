import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsOptional } from "class-validator";
import { TestBatchStatus } from "@prisma/client";
import { PaginationQueryDto } from "@/common/dto";

export class TestBatchQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: "Filter by batch status",
    enum: TestBatchStatus,
  })
  @IsOptional()
  @IsEnum(TestBatchStatus)
  status?: TestBatchStatus;
}
