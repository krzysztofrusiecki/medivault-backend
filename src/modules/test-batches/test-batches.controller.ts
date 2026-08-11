import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { JwtGuard } from "../auth/guards/jwt.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { TestBatchesService } from "./test-batches.service";
import { CreateTestBatchDto } from "./dto/create-test-batch.dto";
import { TestBatchQueryDto } from "./dto/test-batch-query.dto";
import {
  TestBatchItemDto,
  TestBatchResponseDto,
} from "./dto/test-batch-response.dto";
import {
  type AuthenticatedUser,
  CurrentUser,
  Roles,
} from "@/common/decorators";

@ApiTags("Test Batches")
@Controller("test-batches")
@UseGuards(JwtGuard, RolesGuard)
@ApiBearerAuth()
export class TestBatchesController {
  constructor(private readonly testBatchesService: TestBatchesService) {}

  @Post("/")
  @Roles("SUPER_ADMIN", "USER")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Create a self-reported test batch" })
  @ApiCreatedResponse({
    description: "Test batch created successfully, immediately ACCEPTED",
    type: TestBatchItemDto,
  })
  @ApiResponse({ status: 400, description: "Bad request" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateTestBatchDto,
  ): Promise<TestBatchItemDto> {
    return this.testBatchesService.createSelfReported(user.id, dto);
  }

  @Get("/")
  @Roles("SUPER_ADMIN", "USER")
  @ApiOperation({ summary: "Get paginated test batches for the current user" })
  @ApiOkResponse({
    description: "Paginated list of test batches",
    type: TestBatchResponseDto,
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: TestBatchQueryDto,
  ): Promise<TestBatchResponseDto> {
    return this.testBatchesService.findAll(user.id, query);
  }
}
