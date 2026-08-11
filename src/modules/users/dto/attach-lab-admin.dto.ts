import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

export class AttachLabAdminDto {
  @ApiProperty({
    description: "ID of the Lab to attach the user to as LAB_ADMIN staff",
    example: "cuid123456",
  })
  @IsString()
  @IsNotEmpty()
  labId: string;
}
