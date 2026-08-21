import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";
import { AttachToBatchDto } from "./attach-to-batch.dto";

export class CreateTextTestResultDto extends AttachToBatchDto {
  @ApiProperty({
    description: "ID of the analyte being measured",
    example: "cuid123456",
  })
  @IsString()
  @IsNotEmpty()
  analyteId: string;

  @ApiProperty({
    description: "Text value of the test result",
    example: "Positive",
  })
  @IsString()
  @IsNotEmpty()
  value: string;
}
