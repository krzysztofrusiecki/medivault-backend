import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

export class CreateLabDto {
  @ApiProperty({
    description: "Name of the laboratory organization",
    example: "Acme Diagnostics",
  })
  @IsString()
  @IsNotEmpty()
  name: string;
}
