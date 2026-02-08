import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsDate, IsNotEmpty, IsNumber, IsString } from "class-validator";

export class CreateNumericTestResultDto {
  @ApiProperty({
    description: "ID of the analyte being measured",
    example: "cuid123456",
  })
  @IsString()
  @IsNotEmpty()
  analyteId: string;

  @ApiProperty({
    description: "ID of the unit used for this measurement",
    example: "cuid789012",
  })
  @IsString()
  @IsNotEmpty()
  analyteUnitId: string;

  @ApiProperty({
    description: "Date when the sample was taken",
    example: "2025-06-15",
  })
  @IsNotEmpty()
  @Type(() => Date)
  @IsDate()
  sampleDate: Date;

  @ApiProperty({
    description: "Numeric value of the measurement in the specified unit",
    example: 5.25,
  })
  @IsNumber()
  @IsNotEmpty()
  value: number;
}
