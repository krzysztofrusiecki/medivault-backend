import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { AnalyteValueType, ReferenceRange } from "@prisma/client";
import { PrismaService } from "@/infrastructure/prisma";
import { CreateReferenceRangeDto } from "./dto/create-reference-range.dto";
import { UpdateReferenceRangeDto } from "./dto/update-reference-range.dto";
import { ReferenceRangeResponseDto } from "./dto/reference-range-response.dto";

@Injectable()
export class ReferenceRangesService {
  constructor(private prisma: PrismaService) {}

  async create(
    analyteId: string,
    createReferenceRangeDto: CreateReferenceRangeDto,
  ): Promise<ReferenceRangeResponseDto> {
    const analyte = await this.prisma.analyte.findUnique({
      where: { id: analyteId },
    });

    if (!analyte) {
      throw new NotFoundException(`Analyte with ID "${analyteId}" not found`);
    }

    if (analyte.valueType !== AnalyteValueType.NUMERIC) {
      throw new BadRequestException(
        "Reference ranges can only be added to NUMERIC analytes",
      );
    }

    const { minValue, maxValue } = createReferenceRangeDto;

    if (minValue === undefined && maxValue === undefined) {
      throw new BadRequestException(
        "At least one of minValue or maxValue must be provided",
      );
    }

    const referenceRange = await this.prisma.referenceRange.create({
      data: {
        analyteId,
        ...createReferenceRangeDto,
      },
    });

    return this.mapToResponseDto(referenceRange);
  }

  async findByAnalyteId(
    analyteId: string,
  ): Promise<ReferenceRangeResponseDto[]> {
    const analyte = await this.prisma.analyte.findUnique({
      where: { id: analyteId },
    });

    if (!analyte) {
      throw new NotFoundException(`Analyte with ID "${analyteId}" not found`);
    }

    const referenceRanges = await this.prisma.referenceRange.findMany({
      where: { analyteId },
    });

    return referenceRanges.map((range) => this.mapToResponseDto(range));
  }

  async update(
    analyteId: string,
    rangeId: string,
    updateReferenceRangeDto: UpdateReferenceRangeDto,
  ): Promise<ReferenceRangeResponseDto> {
    const referenceRange = await this.prisma.referenceRange.findUnique({
      where: { id: rangeId },
    });

    if (!referenceRange || !this.belongsToAnalyte(referenceRange, analyteId)) {
      throw new NotFoundException(
        `Reference range with ID "${rangeId}" not found for analyte "${analyteId}"`,
      );
    }

    const updated = await this.prisma.referenceRange.update({
      where: { id: rangeId },
      data: updateReferenceRangeDto,
    });

    return this.mapToResponseDto(updated);
  }

  async remove(analyteId: string, rangeId: string): Promise<void> {
    const referenceRange = await this.prisma.referenceRange.findUnique({
      where: { id: rangeId },
    });

    if (!referenceRange || !this.belongsToAnalyte(referenceRange, analyteId)) {
      throw new NotFoundException(
        `Reference range with ID "${rangeId}" not found for analyte "${analyteId}"`,
      );
    }

    await this.prisma.referenceRange.delete({
      where: { id: rangeId },
    });
  }

  private belongsToAnalyte(
    referenceRange: ReferenceRange,
    analyteId: string,
  ): boolean {
    return referenceRange.analyteId === analyteId;
  }

  public mapToResponseDto(
    referenceRange: ReferenceRange,
  ): ReferenceRangeResponseDto {
    return {
      id: referenceRange.id,
      label: referenceRange.label,
      gender: referenceRange.gender,
      minAge: referenceRange.minAge,
      maxAge: referenceRange.maxAge,
      minValue:
        referenceRange.minValue === null
          ? null
          : Number(referenceRange.minValue),
      maxValue:
        referenceRange.maxValue === null
          ? null
          : Number(referenceRange.maxValue),
    };
  }
}
