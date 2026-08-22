import { ApiProperty } from "@nestjs/swagger";
import { Gender } from "@prisma/client";

export class ReferenceRangeResponseDto {
  @ApiProperty({
    description: "Unique identifier of the reference range",
    example: "cuid789012",
  })
  id: string;

  @ApiProperty({
    description: "Free-form label for the band",
    example: "Sufficient",
  })
  label: string;

  @ApiProperty({
    description: "Gender scope for the band",
    enum: Gender,
    nullable: true,
  })
  gender: Gender | null;

  @ApiProperty({
    description: "Minimum age (whole years, inclusive) this band applies to",
    example: 18,
    nullable: true,
  })
  minAge: number | null;

  @ApiProperty({
    description: "Maximum age (whole years, inclusive) this band applies to",
    example: 65,
    nullable: true,
  })
  maxAge: number | null;

  @ApiProperty({
    description: "Lower bound of the band, in the analyte's canonical unit",
    example: 30,
    nullable: true,
  })
  minValue: number | null;

  @ApiProperty({
    description: "Upper bound of the band, in the analyte's canonical unit",
    example: 100,
    nullable: true,
  })
  maxValue: number | null;
}
