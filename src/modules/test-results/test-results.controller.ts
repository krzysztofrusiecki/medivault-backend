import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { JwtGuard } from "../auth/guards/jwt.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { TestResultsService } from "./test-results.service";
import { TestResultQueryDto } from "./dto/test-result-query.dto";
import { TestResultResponseDto } from "./dto/test-result-response.dto";
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
}
