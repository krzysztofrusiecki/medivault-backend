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
import { Role } from "@prisma/client";
import { JwtGuard } from "../auth/guards/jwt.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { TestBatchesService } from "./test-batches.service";
import { CreateTestBatchDto } from "./dto/create-test-batch.dto";
import { CreateLabVerifiedBatchDto } from "./dto/create-lab-verified-batch.dto";
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

  @Post("/self-reported")
  @Roles("SUPER_ADMIN", "USER")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Create a self-reported test batch" })
  @ApiCreatedResponse({
    description: "Test batch created successfully, immediately ACCEPTED",
    type: TestBatchItemDto,
  })
  @ApiResponse({ status: 400, description: "Bad request" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async createSelfReported(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateTestBatchDto,
  ): Promise<TestBatchItemDto> {
    return this.testBatchesService.createSelfReported(user.id, dto);
  }

  @Get("/")
  @Roles("SUPER_ADMIN", "USER", "LAB_ADMIN")
  @ApiOperation({
    summary: "Get paginated test batches visible to the current caller",
    description:
      "For USER/SUPER_ADMIN, lists the caller's own batches. For LAB_ADMIN, lists batches created for the caller's own attached lab.",
  })
  @ApiOkResponse({
    description: "Paginated list of test batches",
    type: TestBatchResponseDto,
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: TestBatchQueryDto,
  ): Promise<TestBatchResponseDto> {
    return this.testBatchesService.findAllForCaller(
      user.id,
      user.role as Role,
      query,
    );
  }

  @Post("/lab-verified")
  @Roles("LAB_ADMIN")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: "Create a lab-verified test batch for a patient",
    description:
      "Looks up the patient by email; the batch's lab is taken from the calling LAB_ADMIN's own attached lab. Required role: LAB_ADMIN",
  })
  @ApiCreatedResponse({
    description: "Test batch created successfully, PENDING_ACCEPTANCE",
    type: TestBatchItemDto,
  })
  @ApiResponse({ status: 400, description: "Bad request" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({
    status: 404,
    description: "No patient account matches the given email",
  })
  async createLabVerified(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateLabVerifiedBatchDto,
  ): Promise<TestBatchItemDto> {
    return this.testBatchesService.createLabVerified(user.id, dto);
  }
}
