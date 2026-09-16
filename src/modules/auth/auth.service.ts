import {
  Injectable,
  ConflictException,
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
  ForbiddenException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { UsersService } from "../users/users.service";
import { SignUpDto } from "./dto/sign-up.dto";
import { AuthResponseDto } from "./dto/auth-response.dto";
import {
  AccessTokenPayload,
  RefreshTokenPayload,
} from "./types/jwt-payload.type";
import { SignInDto } from "./dto/sign-in.dto";
import { Role, User } from "@prisma/client";
import { ConfigService } from "@nestjs/config";
import { Environment } from "src/config/schema";
import { createId } from "@paralleldrive/cuid2";
import { Request, Response } from "express";
import { PrismaService } from "@/infrastructure/prisma";
import crypto from "crypto";

const REFRESH_TOKEN_EXPIRATION_DAYS = 7;
const DAY_MS = 1000 * 60 * 60 * 24;

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService<Environment>,
    private prisma: PrismaService,
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
  async signIn(data: SignInDto, res: Response): Promise<AuthResponseDto> {
    const user = await this.validateUser(data.email, data.password);
    if (!user) {
      throw new BadRequestException("Invalid email or password");
    }

    const { accessToken, refreshToken } = await this.issueTokenPair(
      user.id,
      user.email,
      user.role,
    );

    this.setRefreshTokenCookie(res, refreshToken);

    return {
      accessToken,
    };
  }

  /**
   * Refresh access token
   * @param req Request
   * @param res Response
   * @returns Access token
   */
  async refreshAccessToken(
    req: Request,
    res: Response,
  ): Promise<AuthResponseDto> {
    const token = req.cookies.refreshToken;
    if (!token) {
      throw new UnauthorizedException("No refresh token");
    }

    try {
      this.jwtService.verify(token, {
        secret: this.configService.get("REFRESH_TOKEN_SECRET"),
      });
    } catch {
      throw new ForbiddenException("Invalid refresh token");
    }

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const stored = await this.prisma.refreshToken.findFirst({
      where: {
        tokenHash,
      },
    });

    if (!stored) {
      throw new ForbiddenException("Invalid refresh token");
    }

    if (stored.revokedAt) {
      await this.prisma.refreshToken.updateMany({
        data: { revokedAt: new Date() },
        where: { familyId: stored.familyId },
      });
      throw new ForbiddenException(
        "Token reuse detected — all sessions revoked",
      );
    }

    await this.prisma.refreshToken.update({
      data: {
        revokedAt: new Date(),
      },
      where: { id: stored.id },
    });
    const user = await this.usersService.findById(stored.userId);

    if (!user) {
      throw new Error("User not found");
    }

    const { accessToken, refreshToken } = await this.issueTokenPair(
      user.id,
      user.email,
      user.role,
    );

    this.setRefreshTokenCookie(res, refreshToken);

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
   * Get refresh token in expiration
   * @returns Expiration in ms
   */
  private getRefreshTokenExpirationInMs(): number {
    return REFRESH_TOKEN_EXPIRATION_DAYS * DAY_MS;
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
    const payload: AccessTokenPayload = {
      sub: userId,
      email,
      role,
    };

    // Use the default secret and expiration from JWT module configuration
    return this.jwtService.sign(payload, {
      secret: this.configService.get("ACCESS_TOKEN_SECRET"),
      expiresIn: "15m",
    });
  }

  /**
   * Generate JWT refresh token
   * @param userId - User ID
   * @param familyId - Token family ID
   * @returns JWT refresh token string
   */
  private generateRefreshToken(userId: string, familyId: string): string {
    const payload: RefreshTokenPayload = {
      sub: userId,
      familyId,
    };

    return this.jwtService.sign(payload, {
      secret: this.configService.get("REFRESH_TOKEN_SECRET"),
      expiresIn: `${REFRESH_TOKEN_EXPIRATION_DAYS}d`,
    });
  }

  /**
   * Issue token pair
   * @param userId - User ID
   * @param email - User email
   * @param role - User role
   * @returns JWT access token string
   */
  private async issueTokenPair(
    userId: string,
    email: string,
    role: Role,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const accessToken = this.generateAccessToken(userId, email, role);

    const familyId = createId();

    const refreshToken = this.generateRefreshToken(userId, familyId);
    await this.prisma.refreshToken.create({
      data: {
        familyId,
        userId,
        expiresAt: new Date(Date.now() + this.getRefreshTokenExpirationInMs()),
        tokenHash: crypto
          .createHash("sha256")
          .update(refreshToken)
          .digest("hex"),
      },
    });

    return { accessToken, refreshToken };
  }

  /**
   * Set refresh token cookie
   * @param res Response
   * @param refreshToken refresh token
   */
  private setRefreshTokenCookie(res: Response, refreshToken: string): void {
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure:
        this.configService.get<Environment["NODE_ENV"]>("NODE_ENV") ===
        "production",
      sameSite: "strict",
      path: "/api/auth",
      maxAge: this.getRefreshTokenExpirationInMs(),
    });
  }
}
