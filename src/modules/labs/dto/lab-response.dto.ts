import { ApiProperty } from "@nestjs/swagger";

export class LabResponseDto {
  @ApiProperty({
    description: "Unique identifier of the lab",
    example: "cuid123456",
  })
  id: string;

  @ApiProperty({
    description: "Name of the laboratory organization",
    example: "Acme Diagnostics",
  })
  name: string;

  @ApiProperty({
    description: "Creation timestamp",
    example: "2025-11-20T10:00:00Z",
  })
  createdAt: Date;

  @ApiProperty({
    description: "Last update timestamp",
    example: "2025-11-20T10:00:00Z",
  })
  updatedAt: Date;
}
