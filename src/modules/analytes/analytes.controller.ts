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
import { AnalytesService } from "./analytes.service";
import { CreateAnalyteDto } from "./dto/create-analyte.dto";
import { UpdateAnalyteDto } from "./dto/update-analyte.dto";
import { AnalyteResponseDto } from "./dto/analyte-response.dto";
import { JwtGuard } from "../auth/guards/jwt.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "@/common/decorators";

@ApiTags("Analytes")
@ApiBearerAuth()
@UseGuards(JwtGuard, RolesGuard)
@Controller("analytes")
export class AnalytesController {
  constructor(private readonly analytesService: AnalytesService) {}

  @Post("/")
  @Roles("SUPER_ADMIN")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: "Create a new analyte",
    description: "Create a new analyte. Required role: SUPER_ADMIN",
  })
  @ApiCreatedResponse({
    description: "Analyte successfully created",
    type: AnalyteResponseDto,
  })
  async create(
    @Body() createAnalyteDto: CreateAnalyteDto,
  ): Promise<AnalyteResponseDto> {
    return this.analytesService.create(createAnalyteDto);
  }

  @Get("/")
  @Roles("SUPER_ADMIN", "USER")
  @ApiOperation({
    summary: "Get all analytes",
    description:
      "Retrieve a list of all analytes. Required role: SUPER_ADMIN or USER",
  })
  @ApiOkResponse({
    description: "List of analytes",
    type: [AnalyteResponseDto],
  })
  async findAll(): Promise<AnalyteResponseDto[]> {
    return this.analytesService.findAll();
  }

  @Get("/:id")
  @Roles("SUPER_ADMIN", "USER")
  @ApiOperation({
    summary: "Get analyte by ID",
    description:
      "Retrieve a specific analyte by its ID. Required role: SUPER_ADMIN or USER",
  })
  @ApiOkResponse({
    description: "Analyte found",
    type: AnalyteResponseDto,
  })
  @ApiNotFoundResponse({
    description: "Analyte not found",
  })
  async findOne(@Param("id") id: string): Promise<AnalyteResponseDto> {
    return this.analytesService.findOne(id);
  }

  @Patch("/:id")
  @Roles("SUPER_ADMIN")
  @ApiOperation({
    summary: "Update an analyte",
    description: "Update an existing analyte. Required role: SUPER_ADMIN",
  })
  @ApiOkResponse({
    description: "Analyte successfully updated",
    type: AnalyteResponseDto,
  })
  @ApiNotFoundResponse({
    description: "Analyte not found",
  })
  async update(
    @Param("id") id: string,
    @Body() updateAnalyteDto: UpdateAnalyteDto,
  ): Promise<AnalyteResponseDto> {
    return this.analytesService.update(id, updateAnalyteDto);
  }

  @Delete("/:id")
  @Roles("SUPER_ADMIN")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: "Delete an analyte",
    description: "Delete an existing analyte. Required role: SUPER_ADMIN",
  })
  @ApiNoContentResponse({
    description: "Analyte successfully deleted",
  })
  @ApiNotFoundResponse({
    description: "Analyte not found",
  })
  async remove(@Param("id") id: string): Promise<void> {
    await this.analytesService.remove(id);
  }
}
