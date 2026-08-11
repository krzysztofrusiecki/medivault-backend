import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Lab, Prisma } from "@prisma/client";
import { PrismaService } from "@/infrastructure/prisma";
import { CreateLabDto } from "./dto/create-lab.dto";
import { LabResponseDto } from "./dto/lab-response.dto";

@Injectable()
export class LabsService {
  constructor(private prisma: PrismaService) {}

  async create(createLabDto: CreateLabDto): Promise<LabResponseDto> {
    const { name } = createLabDto;

    try {
      const lab = await this.prisma.lab.create({
        data: { name },
      });

      return this.mapToResponseDto(lab);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new ConflictException(`Lab with name "${name}" already exists`);
      }
      throw error;
    }
  }

  async findAll(): Promise<LabResponseDto[]> {
    const labs = await this.prisma.lab.findMany();

    return labs.map((lab) => this.mapToResponseDto(lab));
  }

  async findOne(id: string): Promise<LabResponseDto> {
    const lab = await this.prisma.lab.findUnique({
      where: { id },
    });

    if (!lab) {
      throw new NotFoundException(`Lab with ID "${id}" not found`);
    }

    return this.mapToResponseDto(lab);
  }

  private mapToResponseDto(lab: Lab): LabResponseDto {
    return {
      id: lab.id,
      name: lab.name,
      createdAt: lab.createdAt,
      updatedAt: lab.updatedAt,
    };
  }
}
