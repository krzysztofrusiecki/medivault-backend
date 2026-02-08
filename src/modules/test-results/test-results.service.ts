import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "@/infrastructure/prisma";
import { AnalyteUnitsService } from "../analyte-units";
import { AnalytesService } from "../analytes";
import { AnalyteValueType, Prisma, TestResult } from "@prisma/client";
import { TestResultQueryDto } from "./dto/test-result-query.dto";
import {
  TestResultResponseDto,
  TestResultItemDto,
} from "./dto/test-result-response.dto";
import { CreateNumericTestResultDto } from "./dto/create-numeric-test-result.dto";
import { CreateTextTestResultDto } from "./dto/create-text-test-result.dto";

@Injectable()
export class TestResultsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly analyteUnitsService: AnalyteUnitsService,
    private readonly analytesService: AnalytesService,
  ) {}

  async findAll(
    userId: string,
    query: TestResultQueryDto,
  ): Promise<TestResultResponseDto> {
    const {
      analyteId,
      unitId,
      from,
      to,
      page = 1,
      pageSize = 25,
      sortOrder = "DESC",
      sortBy = "sampleDate",
    } = query;

    this.validateQueryParams(query);

    const conversion =
      unitId && analyteId
        ? await this.analyteUnitsService.getConversionFactors(unitId, analyteId)
        : null;

    const where = this.buildWhereClause(userId, { analyteId, from, to });

    const [total, results] = await Promise.all([
      this.prisma.testResult.count({ where }),
      this.prisma.testResult.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { [sortBy]: sortOrder.toLowerCase() as "asc" | "desc" },
        select: {
          id: true,
          analyteId: true,
          analyteUnitId: true,
          valueText: true,
          value: true,
          sampleDate: true,
        },
      }),
    ]);

    const items = results.map((r) =>
      this.mapToResponseDto(r, conversion?.factor, conversion?.offset),
    );

    return new TestResultResponseDto(items, page, pageSize, total);
  }

  async createNumeric(
    userId: string,
    dto: CreateNumericTestResultDto,
  ): Promise<TestResultItemDto> {
    const analyte = await this.analytesService.findOne(dto.analyteId);

    if (analyte.valueType !== AnalyteValueType.NUMERIC) {
      throw new BadRequestException("Analyte is not of type NUMERIC");
    }

    const { factor, offset } =
      await this.analyteUnitsService.getConversionFactors(
        dto.analyteUnitId,
        dto.analyteId,
      );

    const canonicalValue = dto.value * factor + offset;

    const result = await this.prisma.testResult.create({
      data: {
        userId,
        analyteId: dto.analyteId,
        analyteUnitId: dto.analyteUnitId,
        valueRaw: dto.value,
        value: canonicalValue,
        factorSnapshot: factor,
        offsetSnapshot: offset,
        sampleDate: dto.sampleDate,
      },
      select: {
        id: true,
        analyteId: true,
        analyteUnitId: true,
        valueText: true,
        value: true,
        sampleDate: true,
      },
    });

    return this.mapToResponseDto(result, factor, offset);
  }

  async createText(
    userId: string,
    dto: CreateTextTestResultDto,
  ): Promise<TestResultItemDto> {
    const analyte = await this.analytesService.findOne(dto.analyteId);

    if (analyte.valueType !== AnalyteValueType.TEXT) {
      throw new BadRequestException("Analyte is not of type TEXT");
    }

    const result = await this.prisma.testResult.create({
      data: {
        userId,
        analyteId: dto.analyteId,
        valueText: dto.value,
        sampleDate: dto.sampleDate,
      },
      select: {
        id: true,
        analyteId: true,
        analyteUnitId: true,
        valueText: true,
        value: true,
        sampleDate: true,
      },
    });

    return this.mapToResponseDto(result);
  }

  async delete(userId: string, id: string): Promise<void> {
    const result = await this.prisma.testResult.findFirst({
      where: { id, userId },
    });

    if (!result) {
      throw new NotFoundException("Test result not found");
    }

    await this.prisma.testResult.delete({ where: { id } });
  }

  private validateQueryParams(query: TestResultQueryDto): void {
    const { analyteId, unitId, from, to } = query;

    if (unitId && !analyteId) {
      throw new BadRequestException(
        "unitId requires analyteId to be specified",
      );
    }
    if (from && !to) {
      throw new BadRequestException(
        "to date is required when from date is specified",
      );
    }
    if (to && !from) {
      throw new BadRequestException(
        "from date is required when to date is specified",
      );
    }
    if (from && to && from > to) {
      throw new BadRequestException("from date must be before to date");
    }
  }

  private buildWhereClause(
    userId: string,
    filters: { analyteId?: string; from?: Date; to?: Date },
  ): Prisma.TestResultWhereInput {
    const { analyteId, from, to } = filters;
    return {
      userId,
      ...(analyteId && { analyteId }),
      ...(from || to
        ? { sampleDate: { ...(from && { gte: from }), ...(to && { lte: to }) } }
        : {}),
    };
  }

  private mapToResponseDto(
    result: Omit<
      TestResult,
      | "userId"
      | "valueRaw"
      | "factorSnapshot"
      | "offsetSnapshot"
      | "createdAt"
      | "updatedAt"
    >,
    factor?: number,
    offset?: number,
  ): TestResultItemDto {
    let valueNumeric: number | null = null;

    if (result.value !== null) {
      const canonical = Number(result.value);
      valueNumeric =
        factor !== undefined && offset !== undefined
          ? (canonical - offset) / factor
          : canonical;
    }

    return {
      id: result.id,
      analyteId: result.analyteId,
      analyteUnitId: result.analyteUnitId,
      valueText: result.valueText,
      valueNumeric,
      sampleDate: result.sampleDate.toISOString().split("T")[0],
    };
  }
}
