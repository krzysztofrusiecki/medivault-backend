import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsDate, IsNotEmpty, IsOptional, IsString } from "class-validator";

export abstract class AttachToBatchDto {
  @ApiPropertyOptional({
    description:
      "ID of an existing batch to attach this result to. When set, the batch's own sampleDate is used and sampleDate below is ignored.",
    example: "cuid567890",
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  batchId?: string;

  @ApiPropertyOptional({
    description:
      "Date when the sample was taken. Required unless batchId is provided.",
    example: "2025-06-15",
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  sampleDate?: Date;
}
