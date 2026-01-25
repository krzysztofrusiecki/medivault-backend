import { ApiProperty } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";

export class UpdateAnalyteDto {
  @ApiProperty({
    description: "Unique slug identifier for the analyte",
    example: "PRL",
    required: false,
  })
  @IsString()
  @IsOptional()
  slug?: string;

  @ApiProperty({
    description: "Human-readable name of the analyte",
    example: "Prolactin",
    required: false,
  })
  @IsString()
  @IsOptional()
  name?: string;
}
