import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsDate, IsNotEmpty, IsString } from "class-validator";

export class CreateTextTestResultDto {
  @ApiProperty({
    description: "ID of the analyte being measured",
    example: "cuid123456",
  })
  @IsString()
  @IsNotEmpty()
  analyteId: string;

  @ApiProperty({
    description: "Date when the sample was taken",
    example: "2025-06-15",
  })
  @IsNotEmpty()
  @Type(() => Date)
  @IsDate()
  sampleDate: Date;

  @ApiProperty({
    description: "Text value of the test result",
    example: "Positive",
  })
  @IsString()
  @IsNotEmpty()
  value: string;
}
