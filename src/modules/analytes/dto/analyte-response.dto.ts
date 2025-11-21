import { ApiProperty } from "@nestjs/swagger";
import { AnalyteValueType } from "@prisma/client";

export class AnalyteResponseDto {
  @ApiProperty({
    description: "Unique identifier of the analyte",
    example: "cuid123456",
  })
  id: string;

  @ApiProperty({
    description: "Unique code identifier for the analyte",
    example: "PRL",
  })
  code: string;

  @ApiProperty({
    description: "Human-readable name of the analyte",
    example: "Prolactin",
  })
  name: string;

  @ApiProperty({
    description: "Type of value this analyte represents",
    enum: AnalyteValueType,
    example: AnalyteValueType.NUMERIC,
  })
  valueType: AnalyteValueType;

  @ApiProperty({
    description: "Creation timestamp",
    example: "2025-11-20T10:00:00Z",
  })
  createdAt: Date;

  @ApiProperty({
    description: "Last update timestamp",
    example: "2025-11-20T10:00:00Z",
  })
  updatedAt: Date;
}
