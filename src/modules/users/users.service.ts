import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../infrastructure/prisma/prisma.service";
import { CreateUserDto } from "./dto/create-user.dto";
import { UserResponseDto } from "./dto/user-response.dto";
import * as argon2 from "argon2";

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create a new user
   * @param data - The data for the new user
   * @returns The created user without passwordHash
   * @description Hashes the password and creates a new user with the given data
   */
  async create(data: CreateUserDto): Promise<UserResponseDto> {
    const hashedPassword = await argon2.hash(data.password);

    const newUser = await this.prisma.user.create({
      data: {
        email: data.email,
        passwordHash: hashedPassword,
        firstName: data.firstName,
        lastName: data.lastName,
        gender: data.gender,
        birthDate: data.birthDate,
        role: "USER",
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, ...userResponse } = newUser;
    return userResponse;
  }
}
