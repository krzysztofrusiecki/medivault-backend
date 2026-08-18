import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform, TransformFnParams, Type } from "class-transformer";
import { IsDate, IsNotEmpty, IsOptional, IsString } from "class-validator";

export class CreateTestBatchDto {
  @ApiProperty({
    description: "Free-text label for the lab this batch was reported from",
    example: "City Diagnostics",
  })
  @IsString()
  @Transform(({ value }: TransformFnParams): unknown =>
    typeof value === "string" ? value.trim() : value,
  )
  @IsNotEmpty()
  labLabel: string;

  @ApiProperty({
    description: "Date the sample was taken",
    example: "2025-06-15",
  })
  @IsNotEmpty()
  @Type(() => Date)
  @IsDate()
  sampleDate: Date;

  @ApiPropertyOptional({
    description: "Optional free-text notes about this batch",
    example: "Poor sleep, high stress",
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
