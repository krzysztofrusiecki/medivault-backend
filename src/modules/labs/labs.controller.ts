import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { LabsService } from "./labs.service";
import { CreateLabDto } from "./dto/create-lab.dto";
import { LabResponseDto } from "./dto/lab-response.dto";
import { JwtGuard } from "../auth/guards/jwt.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "@/common/decorators";

@ApiTags("Labs")
@ApiBearerAuth()
@UseGuards(JwtGuard, RolesGuard)
@Roles("SUPER_ADMIN")
@Controller("labs")
export class LabsController {
  constructor(private readonly labsService: LabsService) {}

  @Post("/")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: "Register a new lab",
    description:
      "Register a new laboratory organization. Required role: SUPER_ADMIN",
  })
  @ApiCreatedResponse({
    description: "Lab successfully created",
    type: LabResponseDto,
  })
  async create(@Body() createLabDto: CreateLabDto): Promise<LabResponseDto> {
    return this.labsService.create(createLabDto);
  }

  @Get("/")
  @ApiOperation({
    summary: "Get all labs",
    description:
      "Retrieve a list of all registered labs. Required role: SUPER_ADMIN",
  })
  @ApiOkResponse({
    description: "List of labs",
    type: [LabResponseDto],
  })
  async findAll(): Promise<LabResponseDto[]> {
    return this.labsService.findAll();
  }

  @Get("/:id")
  @ApiOperation({
    summary: "Get lab by ID",
    description:
      "Retrieve a specific lab by its ID. Required role: SUPER_ADMIN",
  })
  @ApiOkResponse({
    description: "Lab found",
    type: LabResponseDto,
  })
  @ApiNotFoundResponse({
    description: "Lab not found",
  })
  async findOne(@Param("id") id: string): Promise<LabResponseDto> {
    return this.labsService.findOne(id);
  }
}
