import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { CreateAnalyteDto } from "./dto/create-analyte.dto";
import { UpdateAnalyteDto } from "./dto/update-analyte.dto";
import { AnalyteResponseDto } from "./dto/analyte-response.dto";
import { Analyte, Prisma } from "@prisma/client";
import { PrismaService } from "@/infrastructure/prisma";

@Injectable()
export class AnalytesService {
  constructor(private prisma: PrismaService) {}

  async create(
    createAnalyteDto: CreateAnalyteDto,
  ): Promise<AnalyteResponseDto> {
    const { code, name, valueType } = createAnalyteDto;

    try {
      const analyte = await this.prisma.analyte.create({
        data: {
          code,
          name,
          valueType,
        },
      });

      return this.mapToResponseDto(analyte);
    } catch (error) {
      // Handle unique constraint violation on code
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new ConflictException(
          `Analyte with code "${code}" already exists`,
        );
      }
      throw error;
    }
  }

  async findAll(): Promise<AnalyteResponseDto[]> {
    const analytes = await this.prisma.analyte.findMany();

    return analytes.map((analyte) => this.mapToResponseDto(analyte));
  }

  async findOne(id: string): Promise<AnalyteResponseDto> {
    const analyte = await this.prisma.analyte.findUnique({
      where: { id },
    });

    if (!analyte) {
      throw new NotFoundException(`Analyte with ID "${id}" not found`);
    }

    return this.mapToResponseDto(analyte);
  }

  async update(
    id: string,
    updateAnalyteDto: UpdateAnalyteDto,
  ): Promise<AnalyteResponseDto> {
    const existingAnalyte = await this.prisma.analyte.findUnique({
      where: { id },
    });

    if (!existingAnalyte) {
      throw new NotFoundException(`Analyte with ID "${id}" not found`);
    }

    try {
      const analyte = await this.prisma.analyte.update({
        where: { id },
        data: updateAnalyteDto,
      });

      return this.mapToResponseDto(analyte);
    } catch (error) {
      // Handle unique constraint violation on code
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new ConflictException(
          `Analyte with code "${updateAnalyteDto.code}" already exists`,
        );
      }
      throw error;
    }
  }

  async remove(id: string): Promise<void> {
    const analyte = await this.prisma.analyte.findUnique({
      where: { id },
    });

    if (!analyte) {
      throw new NotFoundException(`Analyte with ID "${id}" not found`);
    }

    await this.prisma.analyte.delete({
      where: { id },
    });
  }

  private mapToResponseDto(analyte: Analyte): AnalyteResponseDto {
    return {
      id: analyte.id,
      code: analyte.code,
      name: analyte.name,
      valueType: analyte.valueType,
      createdAt: analyte.createdAt,
      updatedAt: analyte.updatedAt,
    };
  }
}
