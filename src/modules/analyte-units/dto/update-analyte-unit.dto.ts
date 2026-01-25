import { ApiProperty } from "@nestjs/swagger";
import { IsBoolean, IsNumber, IsOptional, IsString } from "class-validator";

export class UpdateAnalyteUnitDto {
  @ApiProperty({
    description: "Unit symbol or name",
    example: "mIU/L",
    required: false,
  })
  @IsString()
  @IsOptional()
  unit?: string;

  @ApiProperty({
    description:
      "Conversion factor to canonical unit (value * factor + offset = canonical)",
    example: "1.0",
    type: "number",
    required: false,
  })
  @IsNumber()
  @IsOptional()
  factorToCanonical?: number;

  @ApiProperty({
    description: "Offset value for unit conversion",
    example: "0",
    type: "number",
    required: false,
  })
  @IsNumber()
  @IsOptional()
  offset?: number;

  @ApiProperty({
    description:
      "Whether this is the canonical (standard) unit for this analyte",
    example: true,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  isCanonical?: boolean;
}
