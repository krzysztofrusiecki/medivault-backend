import { ApiProperty } from "@nestjs/swagger";
import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from "class-validator";

export class CreateAnalyteUnitDto {
  @ApiProperty({
    description: "Unit symbol or name",
    example: "mIU/L",
  })
  @IsString()
  @IsNotEmpty()
  unit: string;

  @ApiProperty({
    description:
      "Conversion factor to canonical unit (value * factor + offset = canonical)",
    example: "1.0",
    type: "number",
  })
  @IsNumber()
  @IsNotEmpty()
  factorToCanonical: number;

  @ApiProperty({
    description: "Offset value for unit conversion",
    example: "0",
    type: "number",
    required: false,
    default: 0,
  })
  @IsNumber()
  @IsOptional()
  offset?: number;

  @ApiProperty({
    description:
      "Whether this is the canonical (standard) unit for this analyte",
    example: true,
    required: false,
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  isCanonical?: boolean;
}
