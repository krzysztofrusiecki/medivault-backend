import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../infrastructure/prisma/prisma.service";
import * as argon2 from "argon2";
import { Gender, User } from "@prisma/client";

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create a new user
   * @param data - The data for the new user
   * @returns The created user without passwordHash
   * @description Hashes the password and creates a new user with the given data
   */
  async create(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    gender?: Gender;
    birthDate: Date;
  }): Promise<Omit<User, "passwordHash">> {
    const hashedPassword = await argon2.hash(data.password);

    const newUser = await this.prisma.user.create({
      data: {
        email: data.email,
        passwordHash: hashedPassword,
        firstName: data.firstName,
        lastName: data.lastName,
        gender: data.gender,
        birthDate: new Date(data.birthDate),
        role: "USER",
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, ...userResponse } = newUser;
    return userResponse;
  }

  /**
   * Find a user by email
   * @param email - The email to search for
   * @returns The user if found, null otherwise
   */
  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  /**
   * Find a user by ID
   * @param id - The ID to search for
   * @returns The user if found, null otherwise
   */
  async findById(id: string): Promise<Omit<User, "passwordHash"> | null> {
    return this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        gender: true,
        birthDate: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  /**
   * Verify a password against a user's password hash
   * @param password - The plain password to verify
   * @param passwordHash - The hashed password to verify against
   * @returns True if the password matches, false otherwise
   */
  async verifyPassword(
    password: string,
    passwordHash: string,
  ): Promise<boolean> {
    return argon2.verify(passwordHash, password);
  }
}
