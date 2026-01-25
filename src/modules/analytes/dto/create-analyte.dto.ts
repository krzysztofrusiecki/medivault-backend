import { ApiProperty } from "@nestjs/swagger";
import { IsEnum, IsNotEmpty, IsString } from "class-validator";
import { AnalyteValueType } from "@prisma/client";

export class CreateAnalyteDto {
  @ApiProperty({
    description: "Unique slug identifier for the analyte",
    example: "PRL",
  })
  @IsString()
  @IsNotEmpty()
  slug: string;

  @ApiProperty({
    description: "Human-readable name of the analyte",
    example: "Prolactin",
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: "Type of value this analyte represents.",
    enum: AnalyteValueType,
    example: AnalyteValueType.NUMERIC,
  })
  @IsEnum(AnalyteValueType)
  @IsNotEmpty()
  valueType: AnalyteValueType;
}
