import {
  Injectable,
  ConflictException,
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { UsersService } from "../users/users.service";
import { SignUpDto } from "./dto/sign-up.dto";
import { AccessTokenPayload } from "./types/jwt-payload.type";
import { SignInDto } from "./dto/sign-in.dto";
import { Role, User } from "@prisma/client";
import { ConfigService } from "@nestjs/config";
import { Environment } from "@/config/schema";
import { PrismaService } from "@/infrastructure/prisma";
import { randomBytes, randomUUID, createHash } from "crypto";
import { parseDurationMs } from "./utils/parse-duration";

export interface IssuedTokenPair {
  accessToken: string;
  refreshToken: string;
  refreshTokenExpiresInMs: number;
}

type AuthenticatedUserRecord = Pick<User, "id" | "email" | "role">;

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
   * Sign in an existing user, starting a new session (refresh token family).
   * @param data - Sign in data
   * @returns Access token and raw refresh token value
   */
  async signIn(data: SignInDto): Promise<IssuedTokenPair> {
    const user = await this.validateUser(data.email, data.password);
    if (!user) {
      throw new BadRequestException("Invalid email or password");
    }

    return this.issueTokenPair(user, randomUUID());
  }

  /**
   * Rotate a presented refresh token, detecting reuse of an already-rotated
   * token as a theft signal.
   * @param rawToken - The raw refresh token value presented by the client
   * @returns Access token and new raw refresh token value
   */
  async refresh(rawToken: string): Promise<IssuedTokenPair> {
    const tokenHash = this.hashToken(rawToken);
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
    });

    if (!stored) {
      throw new UnauthorizedException("Invalid refresh token");
    }

    if (stored.revokedAt) {
      await this.prisma.refreshToken.updateMany({
        where: { familyId: stored.familyId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedException(
        "Refresh token reuse detected — session revoked",
      );
    }

    if (stored.expiresAt < new Date()) {
      throw new UnauthorizedException("Refresh token expired");
    }

    // A valid, unrevoked, unexpired row always has a live user: refresh
    // tokens are cascade-deleted with their owning user, so this can't
    // happen in practice. Guarded only to satisfy the compiler.
    const user = await this.usersService.findById(stored.userId);
    if (!user) {
      throw new Error(
        `Refresh token row ${stored.id} references a nonexistent user`,
      );
    }

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    return this.issueTokenPair(user, stored.familyId);
  }

  /**
   * End the calling session by revoking its refresh token family.
   * A missing or unrecognized token is treated as an idempotent no-op.
   * @param rawToken - The raw refresh token value presented by the client, if any
   * @param currentUserId - The id of the user making the request (from the access token)
   */
  async logout(
    rawToken: string | undefined,
    currentUserId: string,
  ): Promise<void> {
    if (!rawToken) {
      return;
    }

    const tokenHash = this.hashToken(rawToken);
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
    });

    if (!stored || stored.userId !== currentUserId) {
      return;
    }

    await this.prisma.refreshToken.updateMany({
      where: { familyId: stored.familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
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

  private hashToken(rawToken: string): string {
    return createHash("sha256").update(rawToken).digest("hex");
  }

  /**
   * Generate a JWT access token. Secret and expiry come from AuthModule's
   * JwtModule.registerAsync (ACCESS_TOKEN_SECRET / ACCESS_TOKEN_EXPIRATION).
   */
  private generateAccessToken(user: AuthenticatedUserRecord): string {
    const payload: AccessTokenPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    return this.jwtService.sign(payload);
  }

  /**
   * Issue a new access token and a new DB-backed opaque refresh token,
   * recording the refresh token under the given family.
   * @param familyId - Refresh token family id (stable across rotations within one session)
   */
  private async issueTokenPair(
    user: AuthenticatedUserRecord,
    familyId: string,
  ): Promise<IssuedTokenPair> {
    const accessToken = this.generateAccessToken(user);

    // High-entropy opaque value — not a JWT, since there's nothing to
    // self-describe once it's looked up by hash in the DB.
    const refreshToken = randomBytes(32).toString("hex");
    const refreshTokenExpiresInMs = parseDurationMs(
      this.configService.get("REFRESH_TOKEN_EXPIRATION") ?? "30d",
    );

    await this.prisma.refreshToken.create({
      data: {
        familyId,
        userId: user.id,
        expiresAt: new Date(Date.now() + refreshTokenExpiresInMs),
        tokenHash: this.hashToken(refreshToken),
      },
    });

    return { accessToken, refreshToken, refreshTokenExpiresInMs };
  }
}
