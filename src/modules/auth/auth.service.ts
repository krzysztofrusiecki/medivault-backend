import {
  Injectable,
  ConflictException,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { UsersService } from "../users/users.service";
import { SignUpDto } from "./dto/sign-up.dto";
import { AuthResponseDto } from "./dto/auth-response.dto";
import { JwtPayload } from "./types/jwt-payload.type";
import { SignInDto } from "./dto/sign-in.dto";
import { Role, User } from "@prisma/client";

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  /**
   * Sign up a new user
   * @param signUpDto - Sign up data
   * @returns void
   */
  async signUp(data: SignUpDto): Promise<void> {
    // Check if user already exists
    const existingUser = await this.usersService.findByEmail(data.email);
    if (existingUser) {
      throw new ConflictException("Email already registered");
    }

    const arePasswordsEqual = data.password === data.confirmPassword;
    if (!arePasswordsEqual) {
      throw new BadRequestException("Passwords do not match");
    }

    // Create new user
    await this.usersService.create({
      email: data.email,
      password: data.password,
      firstName: data.firstName,
      lastName: data.lastName,
      gender: data.gender,
      birthDate: data.birthDate,
    });
  }

  /**
   * Sign in an existing user
   * @param data - Sign in data
   * @returns Access token
   */
  async signIn(data: SignInDto): Promise<AuthResponseDto> {
    const user = await this.validateUser(data.email, data.password);
    if (!user) {
      throw new BadRequestException("Invalid email or password");
    }

    const accessToken = this.generateAccessToken(
      user.id,
      user.email,
      user.role,
    );

    return {
      accessToken,
    };
  }

  /**
   * Get user details
   * @param userId - User ID
   * @returns User details
   */
  async getUserDetails(userId: string): Promise<Omit<User, "passwordHash">> {
    const user = await this.usersService.findById(userId);

    if (!user) {
      throw new NotFoundException("User not found");
    }

    return user;
  }

  /**
   * Validate user credentials
   * @param email - User email
   * @param password - User password (plain text)
   * @returns User data if valid, null otherwise
   */
  async validateUser(
    email: string,
    password: string,
  ): Promise<{ id: string; email: string; role: Role } | null> {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      return null;
    }

    const isPasswordValid = await this.usersService.verifyPassword(
      password,
      user.passwordHash,
    );
    if (!isPasswordValid) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
    };
  }

  /**
   * Generate JWT access token
   * @param userId - User ID
   * @param email - User email
   * @param role - User role
   * @returns JWT access token string
   */
  private generateAccessToken(
    userId: string,
    email: string,
    role: Role,
  ): string {
    const payload: JwtPayload = {
      sub: userId,
      email,
      role,
    };

    // Use the default secret and expiration from JWT module configuration
    return this.jwtService.sign(payload);
  }
}
