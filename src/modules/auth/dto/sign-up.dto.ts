import { ApiProperty } from "@nestjs/swagger";
import { Gender } from "@prisma/client";
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from "class-validator";

export class SignUpDto {
  @ApiProperty({ example: "user@example.com" })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: "SecurePass123" })
  @IsString()
  @MinLength(8, { message: "Password must be at least 8 characters long" })
  password: string;

  @ApiProperty({ example: "SecurePass123" })
  @IsString()
  @MinLength(8, { message: "Password must be at least 8 characters long" })
  confirmPassword: string;

  @ApiProperty({ example: "John" })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ example: "Doe" })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({ example: "MALE", enum: Gender, required: false })
  @IsEnum(Gender)
  @IsOptional()
  gender?: Gender;

  @ApiProperty({ example: "1990-01-01" })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: "Invalid date format" })
  birthDate: Date;
}
