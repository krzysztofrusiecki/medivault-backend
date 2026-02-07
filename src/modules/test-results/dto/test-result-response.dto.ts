import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { PaginatedResponseDto, PaginationMetaDto } from "@/common/dto";

export class TestResultItemDto {
  @ApiProperty({
    description: "Unique identifier of the test result",
    example: "cuid123456",
  })
  id: string;

  @ApiProperty({
    description: "ID of the analyte measured",
    example: "cuid789012",
  })
  analyteId: string;

  @ApiPropertyOptional({
    description: "ID of the unit used for this measurement",
    example: "cuid345678",
    nullable: true,
  })
  analyteUnitId: string | null;

  @ApiPropertyOptional({
    description: "Text value for non-numeric analytes",
    example: "Positive",
    nullable: true,
  })
  valueText: string | null;

  @ApiPropertyOptional({
    description: "Numeric value in canonical units",
    example: 5.25,
    nullable: true,
  })
  valueNumeric: number | null;

  @ApiProperty({
    description: "Date when the sample was taken (YYYY-MM-DD)",
    example: "2025-06-15",
  })
  sampleDate: string;
}

export class TestResultResponseDto extends PaginatedResponseDto<TestResultItemDto> {
  @ApiProperty({
    description: "List of test results",
    type: [TestResultItemDto],
  })
  declare items: TestResultItemDto[];

  @ApiProperty({
    description: "Pagination metadata",
    type: PaginationMetaDto,
  })
  declare pagination: PaginationMetaDto;
}
