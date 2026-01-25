import { ApiProperty } from "@nestjs/swagger";

export class AnalyteUnitResponseDto {
  @ApiProperty({
    description: "Unique identifier of the analyte unit",
    example: "cuid789012",
  })
  id: string;

  @ApiProperty({
    description: "Unit symbol or name",
    example: "mIU/L",
  })
  unit: string;

  @ApiProperty({
    description:
      "Whether this is the canonical (standard) unit for this analyte",
    example: true,
  })
  isCanonical: boolean;

  @ApiProperty({
    description:
      "Conversion factor to canonical unit (value * factor + offset = canonical)",
    example: "1.0",
  })
  factorToCanonical: number;

  @ApiProperty({
    description: "Offset value for unit conversion",
    example: "0",
  })
  offset: number;
}
