import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsNumber, IsString } from "class-validator";
import { AttachToBatchDto } from "./attach-to-batch.dto";

export class CreateNumericTestResultDto extends AttachToBatchDto {
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
    description: "Numeric value of the measurement in the specified unit",
    example: 5.25,
  })
  @IsNumber()
  @IsNotEmpty()
  value: number;
}
