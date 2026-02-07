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
import { AnalyteUnitsService } from "./analyte-units.service";
import { CreateAnalyteUnitDto } from "./dto/create-analyte-unit.dto";
import { UpdateAnalyteUnitDto } from "./dto/update-analyte-unit.dto";
import { AnalyteUnitResponseDto } from "./dto/analyte-unit-response.dto";
import { JwtGuard } from "../auth/guards/jwt.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "@/common/decorators";

@ApiTags("Analyte Units")
@ApiBearerAuth()
@UseGuards(JwtGuard, RolesGuard)
@Roles("SUPER_ADMIN")
@Controller("analytes/:analyteId/units")
export class AnalyteUnitsController {
  constructor(private readonly analyteUnitsService: AnalyteUnitsService) {}

  @Post("/")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: "Create a new unit for an analyte",
    description:
      "Create a new unit for a specific analyte. Required role: SUPER_ADMIN",
  })
  @ApiCreatedResponse({
    description: "Unit successfully created",
    type: AnalyteUnitResponseDto,
  })
  @ApiNotFoundResponse({
    description: "Analyte not found",
  })
  async create(
    @Param("analyteId") analyteId: string,
    @Body() createAnalyteUnitDto: CreateAnalyteUnitDto,
  ): Promise<AnalyteUnitResponseDto> {
    return this.analyteUnitsService.create(analyteId, createAnalyteUnitDto);
  }

  @Get("/")
  @ApiOperation({
    summary: "Get all units for an analyte",
    description:
      "Retrieve all units for a specific analyte. Required role: SUPER_ADMIN",
  })
  @ApiOkResponse({
    description: "List of units",
    type: [AnalyteUnitResponseDto],
  })
  @ApiNotFoundResponse({
    description: "Analyte not found",
  })
  async findByAnalyteId(
    @Param("analyteId") analyteId: string,
  ): Promise<AnalyteUnitResponseDto[]> {
    return this.analyteUnitsService.findByAnalyteId(analyteId);
  }

  @Patch("/:unitId")
  @ApiOperation({
    summary: "Update a unit",
    description:
      "Update an existing unit for an analyte. Required role: SUPER_ADMIN",
  })
  @ApiOkResponse({
    description: "Unit successfully updated",
    type: AnalyteUnitResponseDto,
  })
  @ApiNotFoundResponse({
    description: "Unit not found",
  })
  async update(
    @Param("analyteId") analyteId: string,
    @Param("unitId") unitId: string,
    @Body() updateAnalyteUnitDto: UpdateAnalyteUnitDto,
  ): Promise<AnalyteUnitResponseDto> {
    return this.analyteUnitsService.update(
      analyteId,
      unitId,
      updateAnalyteUnitDto,
    );
  }

  @Delete("/:unitId")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: "Delete a unit",
    description:
      "Delete an existing unit from an analyte. Required role: SUPER_ADMIN",
  })
  @ApiNoContentResponse({
    description: "Unit successfully deleted",
  })
  @ApiNotFoundResponse({
    description: "Unit not found",
  })
  async remove(
    @Param("analyteId") analyteId: string,
    @Param("unitId") unitId: string,
  ): Promise<void> {
    await this.analyteUnitsService.remove(analyteId, unitId);
  }
}
