import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { TestBatchStatus } from "@prisma/client";
import { PaginatedResponseDto, PaginationMetaDto } from "@/common/dto";

export class TestBatchItemDto {
  @ApiProperty({
    description: "Unique identifier of the test batch",
    example: "cuid123456",
  })
  id: string;

  @ApiPropertyOptional({
    description: "ID of the registered lab this batch came from, if any",
    example: "cuid789012",
    nullable: true,
  })
  labId: string | null;

  @ApiPropertyOptional({
    description: "Free-text lab label for a self-reported batch",
    example: "City Diagnostics",
    nullable: true,
  })
  labLabel: string | null;

  @ApiProperty({
    description: "Date the sample was taken (YYYY-MM-DD)",
    example: "2025-06-15",
  })
  sampleDate: string;

  @ApiPropertyOptional({
    description: "Free-text notes about this batch",
    example: "Poor sleep, high stress",
    nullable: true,
  })
  notes: string | null;

  @ApiProperty({
    description: "Status of the batch",
    enum: TestBatchStatus,
    example: TestBatchStatus.ACCEPTED,
  })
  status: TestBatchStatus;
}

export class TestBatchResponseDto extends PaginatedResponseDto<TestBatchItemDto> {
  @ApiProperty({
    description: "List of test batches",
    type: [TestBatchItemDto],
  })
  declare items: TestBatchItemDto[];

  @ApiProperty({
    description: "Pagination metadata",
    type: PaginationMetaDto,
  })
  declare pagination: PaginationMetaDto;
}
