import { ApiProperty } from "@nestjs/swagger";
import { Gender } from "@prisma/client";
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from "class-validator";

export class CreateReferenceRangeDto {
  @ApiProperty({
    description: "Free-form label for the band",
    example: "Sufficient",
  })
  @IsString()
  @IsNotEmpty()
  label: string;

  @ApiProperty({
    description: "Gender scope for the band",
    enum: Gender,
    required: false,
  })
  @IsEnum(Gender)
  @IsOptional()
  gender?: Gender;

  @ApiProperty({
    description: "Minimum age (whole years, inclusive) this band applies to",
    example: 18,
    required: false,
  })
  @IsInt()
  @IsOptional()
  minAge?: number;

  @ApiProperty({
    description: "Maximum age (whole years, inclusive) this band applies to",
    example: 65,
    required: false,
  })
  @IsInt()
  @IsOptional()
  maxAge?: number;

  @ApiProperty({
    description: "Lower bound of the band, in the analyte's canonical unit",
    example: 30,
    type: "number",
    required: false,
  })
  @IsNumber()
  @IsOptional()
  minValue?: number;

  @ApiProperty({
    description: "Upper bound of the band, in the analyte's canonical unit",
    example: 100,
    type: "number",
    required: false,
  })
  @IsNumber()
  @IsOptional()
  maxValue?: number;
}
