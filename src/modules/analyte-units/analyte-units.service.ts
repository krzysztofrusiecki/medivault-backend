import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { AnalyteUnit, AnalyteValueType, Prisma } from "@prisma/client";
import { PrismaService } from "@/infrastructure/prisma";
import { CreateAnalyteUnitDto } from "./dto/create-analyte-unit.dto";
import { UpdateAnalyteUnitDto } from "./dto/update-analyte-unit.dto";
import { AnalyteUnitResponseDto } from "./dto/analyte-unit-response.dto";

@Injectable()
export class AnalyteUnitsService {
  constructor(private prisma: PrismaService) {}

  async create(
    analyteId: string,
    createAnalyteUnitDto: CreateAnalyteUnitDto,
  ): Promise<AnalyteUnitResponseDto> {
    const analyte = await this.prisma.analyte.findUnique({
      where: { id: analyteId },
    });

    if (!analyte) {
      throw new NotFoundException(`Analyte with ID "${analyteId}" not found`);
    }

    if (analyte.valueType !== AnalyteValueType.NUMERIC) {
      throw new BadRequestException(
        "Units can only be added to NUMERIC analytes",
      );
    }

    // check if canonical unit already exists
    if (createAnalyteUnitDto.isCanonical) {
      const canonicalUnit = await this.prisma.analyteUnit.findFirst({
        where: { analyteId, isCanonical: true },
      });

      if (canonicalUnit) {
        throw new ConflictException(
          "Canonical unit already exists for this analyte",
        );
      }
    }

    const {
      unit,
      factorToCanonical,
      offset = 0,
      isCanonical = false,
    } = createAnalyteUnitDto;

    try {
      const analyteUnit = await this.prisma.analyteUnit.create({
        data: {
          analyteId,
          unit,
          factorToCanonical,
          offset,
          isCanonical,
        },
      });

      return this.mapToResponseDto(analyteUnit);
    } catch (error) {
      // Handle unique constraint violation on (analyteId, unit)
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new ConflictException(
          `Unit "${unit}" already exists for this analyte`,
        );
      }
      throw error;
    }
  }

  async findByAnalyteId(analyteId: string): Promise<AnalyteUnitResponseDto[]> {
    const analyte = await this.prisma.analyte.findUnique({
      where: { id: analyteId },
    });

    if (!analyte) {
      throw new NotFoundException(`Analyte with ID "${analyteId}" not found`);
    }

    const units = await this.prisma.analyteUnit.findMany({
      where: { analyteId },
      orderBy: {
        isCanonical: "desc", // Canonical first
      },
    });

    return units.map((unit) => this.mapToResponseDto(unit));
  }

  async update(
    analyteId: string,
    unitId: string,
    updateAnalyteUnitDto: UpdateAnalyteUnitDto,
  ): Promise<AnalyteUnitResponseDto> {
    // Validate that unit exists and belongs to the analyte
    const analyteUnit = await this.prisma.analyteUnit.findUnique({
      where: { id: unitId },
    });

    if (!analyteUnit || !this.belongsToAnalyte(analyteUnit, analyteId)) {
      throw new NotFoundException(
        `Unit with ID "${unitId}" not found for analyte "${analyteId}"`,
      );
    }

    try {
      const updated = await this.prisma.analyteUnit.update({
        where: { id: unitId },
        data: updateAnalyteUnitDto,
      });

      return this.mapToResponseDto(updated);
    } catch (error) {
      // Handle unique constraint violation on (analyteId, unit)
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new ConflictException(
          `Unit "${updateAnalyteUnitDto.unit}" already exists for this analyte`,
        );
      }
      throw error;
    }
  }

  async remove(analyteId: string, unitId: string): Promise<void> {
    const analyteUnit = await this.prisma.analyteUnit.findUnique({
      where: { id: unitId },
    });

    if (!analyteUnit || !this.belongsToAnalyte(analyteUnit, analyteId)) {
      throw new NotFoundException(
        `Unit with ID "${unitId}" not found for analyte "${analyteId}"`,
      );
    }

    await this.prisma.analyteUnit.delete({
      where: { id: unitId },
    });
  }

  private belongsToAnalyte(
    analyteUnit: AnalyteUnit,
    analyteId: string,
  ): boolean {
    return analyteUnit.analyteId === analyteId;
  }

  public mapToResponseDto(analyteUnit: AnalyteUnit): AnalyteUnitResponseDto {
    return {
      id: analyteUnit.id,
      unit: analyteUnit.unit,
      isCanonical: analyteUnit.isCanonical,
      factorToCanonical: Number(analyteUnit.factorToCanonical),
      offset: Number(analyteUnit.offset),
    };
  }

  async getConversionFactors(
    unitId: string,
    analyteId: string,
  ): Promise<{ factor: number; offset: number }> {
    const unit = await this.prisma.analyteUnit.findUnique({
      where: { id: unitId },
      select: { analyteId: true, factorToCanonical: true, offset: true },
    });

    if (!unit) {
      throw new NotFoundException(`Unit with ID "${unitId}" not found`);
    }

    if (unit.analyteId !== analyteId) {
      throw new BadRequestException(
        "Unit does not belong to the specified analyte",
      );
    }

    return {
      factor: Number(unit.factorToCanonical),
      offset: Number(unit.offset),
    };
  }
}
