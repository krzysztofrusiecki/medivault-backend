import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { JwtGuard } from "../auth/guards/jwt.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { TestResultsService } from "./test-results.service";
import { TestResultQueryDto } from "./dto/test-result-query.dto";
import {
  TestResultItemDto,
  TestResultResponseDto,
} from "./dto/test-result-response.dto";
import { CreateNumericTestResultDto } from "./dto/create-numeric-test-result.dto";
import { CreateTextTestResultDto } from "./dto/create-text-test-result.dto";
import {
  type AuthenticatedUser,
  CurrentUser,
  Roles,
} from "@/common/decorators";

@ApiTags("Test Results")
@Controller("test-results")
@UseGuards(JwtGuard, RolesGuard)
@ApiBearerAuth()
export class TestResultsController {
  constructor(private readonly testResultsService: TestResultsService) {}

  @Get("/")
  @Roles("SUPER_ADMIN", "USER")
  @ApiOperation({ summary: "Get paginated test results for the current user" })
  @ApiResponse({
    status: 200,
    description: "Paginated list of test results",
    type: TestResultResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: "Bad request (e.g., unitId without analyteId)",
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: TestResultQueryDto,
  ): Promise<TestResultResponseDto> {
    return this.testResultsService.findAll(user.id, query);
  }

  @Post("/numeric")
  @Roles("SUPER_ADMIN", "USER")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Create a numeric test result" })
  @ApiCreatedResponse({
    description: "Numeric test result created successfully",
    type: TestResultItemDto,
  })
  @ApiResponse({ status: 400, description: "Bad request" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async createNumeric(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateNumericTestResultDto,
  ): Promise<TestResultItemDto> {
    return this.testResultsService.createNumeric(user.id, dto);
  }

  @Post("/text")
  @Roles("SUPER_ADMIN", "USER")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Create a text test result" })
  @ApiCreatedResponse({
    description: "Text test result created successfully",
    type: TestResultItemDto,
  })
  @ApiResponse({ status: 400, description: "Bad request" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async createText(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateTextTestResultDto,
  ): Promise<TestResultItemDto> {
    return this.testResultsService.createText(user.id, dto);
  }

  @Delete("/:id")
  @Roles("SUPER_ADMIN", "USER")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Delete a test result" })
  @ApiResponse({ status: 204, description: "Test result deleted successfully" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 404, description: "Test result not found" })
  async delete(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
  ): Promise<void> {
    return this.testResultsService.delete(user.id, id);
  }
}
