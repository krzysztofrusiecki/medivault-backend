import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { ReferenceRangesService } from "./reference-ranges.service";
import { CreateReferenceRangeDto } from "./dto/create-reference-range.dto";
import { UpdateReferenceRangeDto } from "./dto/update-reference-range.dto";
import { ReferenceRangeResponseDto } from "./dto/reference-range-response.dto";
import { JwtGuard } from "../auth/guards/jwt.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "@/common/decorators";

@ApiTags("Reference Ranges")
@ApiBearerAuth()
@UseGuards(JwtGuard, RolesGuard)
@Controller("analytes/:analyteId/reference-ranges")
export class ReferenceRangesController {
  constructor(
    private readonly referenceRangesService: ReferenceRangesService,
  ) {}

  @Post("/")
  @Roles("SUPER_ADMIN")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: "Create a new reference range for an analyte",
    description:
      "Create a new labeled band for a specific analyte. Required role: SUPER_ADMIN",
  })
  @ApiCreatedResponse({
    description: "Reference range successfully created",
    type: ReferenceRangeResponseDto,
  })
  @ApiNotFoundResponse({
    description: "Analyte not found",
  })
  async create(
    @Param("analyteId") analyteId: string,
    @Body() createReferenceRangeDto: CreateReferenceRangeDto,
  ): Promise<ReferenceRangeResponseDto> {
    return this.referenceRangesService.create(
      analyteId,
      createReferenceRangeDto,
    );
  }

  @Get("/")
  @Roles("SUPER_ADMIN", "USER")
  @ApiOperation({
    summary: "Get all reference ranges for an analyte",
    description:
      "Retrieve all labeled bands for a specific analyte. Required role: SUPER_ADMIN, USER",
  })
  @ApiOkResponse({
    description: "List of reference ranges",
    type: [ReferenceRangeResponseDto],
  })
  @ApiNotFoundResponse({
    description: "Analyte not found",
  })
  async findByAnalyteId(
    @Param("analyteId") analyteId: string,
  ): Promise<ReferenceRangeResponseDto[]> {
    return this.referenceRangesService.findByAnalyteId(analyteId);
  }

  @Patch("/:rangeId")
  @Roles("SUPER_ADMIN")
  @ApiOperation({
    summary: "Update a reference range",
    description:
      "Update an existing labeled band for an analyte. Required role: SUPER_ADMIN",
  })
  @ApiOkResponse({
    description: "Reference range successfully updated",
    type: ReferenceRangeResponseDto,
  })
  @ApiNotFoundResponse({
    description: "Reference range not found",
  })
  async update(
    @Param("analyteId") analyteId: string,
    @Param("rangeId") rangeId: string,
    @Body() updateReferenceRangeDto: UpdateReferenceRangeDto,
  ): Promise<ReferenceRangeResponseDto> {
    return this.referenceRangesService.update(
      analyteId,
      rangeId,
      updateReferenceRangeDto,
    );
  }

  @Delete("/:rangeId")
  @Roles("SUPER_ADMIN")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: "Delete a reference range",
    description:
      "Delete an existing labeled band from an analyte. Required role: SUPER_ADMIN",
  })
  @ApiNoContentResponse({
    description: "Reference range successfully deleted",
  })
  @ApiNotFoundResponse({
    description: "Reference range not found",
  })
  async remove(
    @Param("analyteId") analyteId: string,
    @Param("rangeId") rangeId: string,
  ): Promise<void> {
    await this.referenceRangesService.remove(analyteId, rangeId);
  }
}
