import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { UsersService } from "./users.service";
import { AttachLabAdminDto } from "./dto/attach-lab-admin.dto";
import { UserResponseDto } from "./dto/user-response.dto";
import { JwtGuard } from "../auth/guards/jwt.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "@/common/decorators";

@ApiTags("Users")
@ApiBearerAuth()
@UseGuards(JwtGuard, RolesGuard)
@Roles("SUPER_ADMIN")
@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post("/:id/actions/assign-lab")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Assign a user to a Lab as LAB_ADMIN",
    description:
      "Attach an existing user to a Lab, setting their role to LAB_ADMIN and their labId. Required role: SUPER_ADMIN",
  })
  @ApiOkResponse({
    description: "User successfully attached to the lab",
    type: UserResponseDto,
  })
  @ApiNotFoundResponse({
    description: "User or Lab not found",
  })
  @ApiConflictResponse({
    description: "User is a SUPER_ADMIN and cannot be attached to a Lab",
  })
  async attachToLab(
    @Param("id") id: string,
    @Body() attachLabAdminDto: AttachLabAdminDto,
  ): Promise<UserResponseDto> {
    return this.usersService.attachToLab(id, attachLabAdminDto.labId);
  }
}
