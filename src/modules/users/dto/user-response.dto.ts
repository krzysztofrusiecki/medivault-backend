import { ApiProperty } from "@nestjs/swagger";
import { Gender, Role } from "@prisma/client";

export class UserResponseDto {
  @ApiProperty({
    description: "Unique identifier of the user",
    example: "cuid123456",
  })
  id: string;

  @ApiProperty({
    description: "Email address of the user",
    example: "jane.doe@example.com",
  })
  email: string;

  @ApiProperty({
    description: "First name of the user",
    example: "Jane",
  })
  firstName: string;

  @ApiProperty({
    description: "Last name of the user",
    example: "Doe",
  })
  lastName: string;

  @ApiProperty({
    description: "Gender of the user",
    enum: Gender,
    example: Gender.FEMALE,
    required: false,
    nullable: true,
  })
  gender: Gender | null;

  @ApiProperty({
    description: "Date of birth of the user",
    example: "1990-01-01T00:00:00Z",
    required: false,
    nullable: true,
  })
  birthDate: Date | null;

  @ApiProperty({
    description: "Role of the user",
    enum: Role,
    example: Role.LAB_ADMIN,
  })
  role: Role;

  @ApiProperty({
    description:
      "ID of the Lab this user is attached to as staff (LAB_ADMIN only)",
    example: "cuid123456",
    required: false,
    nullable: true,
  })
  labId: string | null;

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
