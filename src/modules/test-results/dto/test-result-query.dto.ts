import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsDate, IsIn, IsOptional, IsString } from "class-validator";
import { PaginationQueryDto } from "@/common/dto";

export class TestResultQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: "Sort by field",
    example: "sampleDate",
    enum: ["sampleDate"],
  })
  @IsOptional()
  @IsIn(["sampleDate"])
  sortBy?: "sampleDate";

  @ApiPropertyOptional({
    description: "Filter by analyte ID",
    example: "cuid123456",
  })
  @IsOptional()
  @IsString()
  analyteId?: string;

  @ApiPropertyOptional({
    description: "Filter by unit ID (requires analyteId)",
    example: "cuid789012",
  })
  @IsOptional()
  @IsString()
  unitId?: string;

  @ApiPropertyOptional({
    description: "Filter results from this date (inclusive)",
    example: "2025-01-01",
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  from?: Date;

  @ApiPropertyOptional({
    description: "Filter results to this date (inclusive)",
    example: "2025-12-31",
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  to?: Date;
}
