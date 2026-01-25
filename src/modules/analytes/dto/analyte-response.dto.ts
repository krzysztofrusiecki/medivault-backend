import { ApiProperty } from "@nestjs/swagger";
import { AnalyteValueType } from "@prisma/client";
import { AnalyteUnitResponseDto } from "../../analyte-units/dto/analyte-unit-response.dto";

export class AnalyteResponseDto {
  @ApiProperty({
    description: "Unique identifier of the analyte",
    example: "cuid123456",
  })
  id: string;

  @ApiProperty({
    description: "Unique slug identifier for the analyte",
    example: "PRL",
  })
  slug: string;

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

  @ApiProperty({
    description:
      "Available units for this analyte (only for NUMERIC value types)",
    type: [AnalyteUnitResponseDto],
    required: false,
  })
  units?: AnalyteUnitResponseDto[];
}
