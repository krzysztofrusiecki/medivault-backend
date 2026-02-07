import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from "@nestjs/swagger";
import { AuthService } from "./auth.service";
import { SignUpDto } from "./dto/sign-up.dto";
import { SignInDto } from "./dto/sign-in.dto";
import { AuthResponseDto } from "./dto/auth-response.dto";
import { JwtGuard } from "./guards/jwt.guard";
import { LocalGuard } from "./guards/local.guard";
import { User } from "@prisma/client";
import { type AuthenticatedUser, CurrentUser } from "@/common/decorators";

@ApiTags("Auth")
@Controller("auth")
export class AuthController {
  constructor(private authService: AuthService) {}

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
  async signIn(@Body() signInDto: SignInDto): Promise<AuthResponseDto> {
    return this.authService.signIn(signInDto);
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
}
