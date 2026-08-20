import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsDate,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
} from "class-validator";

export class CreateLabVerifiedBatchDto {
  @ApiProperty({
    description:
      "Email of the patient this batch belongs to. Must match an existing user account.",
    example: "patient@example.com",
  })
  @IsEmail()
  @IsNotEmpty()
  patientEmail: string;

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
    example: "Fasting sample",
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
