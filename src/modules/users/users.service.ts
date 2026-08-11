import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../../infrastructure/prisma/prisma.service";
import * as argon2 from "argon2";
import { Gender, Role, User } from "@prisma/client";
import { LabsService } from "../labs/labs.service";

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private labsService: LabsService,
  ) {}

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
        labId: true,
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

  /**
   * Attach an existing user to a Lab as LAB_ADMIN staff
   * @param userId - The ID of the user to attach
   * @param labId - The ID of the Lab to attach the user to
   * @returns The updated user without passwordHash
   */
  async attachToLab(
    userId: string,
    labId: string,
  ): Promise<Omit<User, "passwordHash">> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException(`User with ID "${userId}" not found`);
    }

    if (user.role === Role.SUPER_ADMIN) {
      throw new ConflictException(
        `User with ID "${userId}" is a SUPER_ADMIN and cannot be attached to a Lab`,
      );
    }

    // Throws NotFoundException if the lab doesn't exist
    await this.labsService.findOne(labId);

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: { role: Role.LAB_ADMIN, labId },
    });

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, ...userResponse } = updatedUser;
    return userResponse;
  }
}
