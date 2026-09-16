import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  HttpCode,
  HttpStatus,
  Res,
  Req,
  UnauthorizedException,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from "@nestjs/swagger";
import { ConfigService } from "@nestjs/config";
import { AuthService } from "./auth.service";
import { SignUpDto } from "./dto/sign-up.dto";
import { SignInDto } from "./dto/sign-in.dto";
import { AuthResponseDto } from "./dto/auth-response.dto";
import { JwtGuard } from "./guards/jwt.guard";
import { LocalGuard } from "./guards/local.guard";
import { User } from "@prisma/client";
import { type AuthenticatedUser, CurrentUser } from "@/common/decorators";
import { type Request, type Response } from "express";
import { Environment } from "@/config/schema";
import {
  REFRESH_TOKEN_COOKIE_NAME,
  getRefreshTokenCookieOptions,
} from "./refresh-token-cookie";

@ApiTags("Auth")
@Controller("auth")
export class AuthController {
  constructor(
    private authService: AuthService,
    private configService: ConfigService<Environment>,
  ) {}

  @Post("/sign-up")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Register a new user" })
  @ApiResponse({
    status: 201,
    description: "User successfully registered",
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: 409,
    description: "Email already registered",
  })
  @ApiResponse({
    status: 400,
    description: "Invalid request data",
  })
  async signUp(@Body() signUpDto: SignUpDto): Promise<void> {
    return this.authService.signUp(signUpDto);
  }

  @Post("/sign-in")
  @HttpCode(HttpStatus.OK)
  @UseGuards(LocalGuard)
  @ApiOperation({ summary: "Sign in with email and password" })
  @ApiBody({ type: SignInDto })
  @ApiResponse({
    status: 200,
    description: "User successfully signed in",
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: "Invalid credentials",
  })
  async signIn(
    @Body() signInDto: SignInDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    const { accessToken, refreshToken, refreshTokenExpiresInMs } =
      await this.authService.signIn(signInDto);

    this.setRefreshTokenCookie(res, refreshToken, refreshTokenExpiresInMs);

    return { accessToken };
  }

  @Post("/refresh")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Rotate the refresh token and issue a new access token",
  })
  @ApiResponse({
    status: 200,
    description: "Access token successfully generated",
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: "Missing, invalid, expired, or reused refresh token",
  })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    const token = this.getRefreshTokenFromRequest(req);
    if (!token) {
      throw new UnauthorizedException("No refresh token");
    }

    const { accessToken, refreshToken, refreshTokenExpiresInMs } =
      await this.authService.refresh(token);

    this.setRefreshTokenCookie(res, refreshToken, refreshTokenExpiresInMs);

    return { accessToken };
  }

  @Post("/logout")
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Log out of the current session" })
  @ApiResponse({
    status: 204,
    description:
      "Session logged out (idempotent — succeeds even with no active session)",
  })
  @ApiResponse({
    status: 401,
    description: "Unauthorized",
  })
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    const token = this.getRefreshTokenFromRequest(req);

    await this.authService.logout(token, user.id);

    res.clearCookie(
      REFRESH_TOKEN_COOKIE_NAME,
      getRefreshTokenCookieOptions(this.configService),
    );
  }

  @Get("/me")
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get current user profile" })
  @ApiResponse({
    status: 200,
    description: "Current user profile",
  })
  @ApiResponse({
    status: 401,
    description: "Unauthorized",
  })
  async getProfile(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Omit<User, "passwordHash">> {
    return this.authService.getUserDetails(user.id);
  }

  private getRefreshTokenFromRequest(req: Request): string | undefined {
    return req.cookies?.[REFRESH_TOKEN_COOKIE_NAME] as string | undefined;
  }

  private setRefreshTokenCookie(
    res: Response,
    refreshToken: string,
    maxAge: number,
  ): void {
    res.cookie(REFRESH_TOKEN_COOKIE_NAME, refreshToken, {
      ...getRefreshTokenCookieOptions(this.configService),
      maxAge,
    });
  }
}
