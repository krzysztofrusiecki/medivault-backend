import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "@/infrastructure/prisma";
import { AnalyteUnitsService } from "../analyte-units";
import { AnalytesService } from "../analytes";
import { TestBatchesService } from "../test-batches";
import { AnalyteValueType, Prisma } from "@prisma/client";
import { TestResultQueryDto } from "./dto/test-result-query.dto";
import {
  TestResultResponseDto,
  TestResultItemDto,
} from "./dto/test-result-response.dto";
import { CreateNumericTestResultDto } from "./dto/create-numeric-test-result.dto";
import { CreateTextTestResultDto } from "./dto/create-text-test-result.dto";

// Ad-hoc single-result entry doesn't collect a lab name, so the one-off
// self-reported batch created behind the scenes needs a sentinel label.
const AD_HOC_BATCH_LABEL = "Quick entry";

const RESULT_SELECT = {
  id: true,
  batchId: true,
  analyteId: true,
  analyteUnitId: true,
  valueText: true,
  value: true,
} satisfies Prisma.TestResultSelect;

type SelectedResult = Prisma.TestResultGetPayload<{
  select: typeof RESULT_SELECT;
}>;

interface ResolvedBatch {
  id: string;
  sampleDate: Date;
}

@Injectable()
export class TestResultsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly analyteUnitsService: AnalyteUnitsService,
    private readonly analytesService: AnalytesService,
    private readonly testBatchesService: TestBatchesService,
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
      sortBy = "sampleDate",
      sortOrder = "DESC",
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
        orderBy: {
          batch: { [sortBy]: sortOrder.toLowerCase() as "asc" | "desc" },
        },
        select: { ...RESULT_SELECT, batch: { select: { sampleDate: true } } },
      }),
    ]);

    const items = results.map((r) =>
      this.mapToResponseDto(
        { ...r, sampleDate: r.batch.sampleDate },
        conversion?.factor,
        conversion?.offset,
      ),
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

    const batch = await this.resolveBatch(userId, dto.batchId, dto.sampleDate);

    const result = await this.prisma.testResult.create({
      data: {
        batchId: batch.id,
        analyteId: dto.analyteId,
        analyteUnitId: dto.analyteUnitId,
        valueRaw: dto.value,
        value: canonicalValue,
        factorSnapshot: factor,
        offsetSnapshot: offset,
      },
      select: RESULT_SELECT,
    });

    return this.mapToResponseDto(
      { ...result, sampleDate: batch.sampleDate },
      factor,
      offset,
    );
  }

  async createText(
    userId: string,
    dto: CreateTextTestResultDto,
  ): Promise<TestResultItemDto> {
    const analyte = await this.analytesService.findOne(dto.analyteId);

    if (analyte.valueType !== AnalyteValueType.TEXT) {
      throw new BadRequestException("Analyte is not of type TEXT");
    }

    const batch = await this.resolveBatch(userId, dto.batchId, dto.sampleDate);

    const result = await this.prisma.testResult.create({
      data: {
        batchId: batch.id,
        analyteId: dto.analyteId,
        valueText: dto.value,
      },
      select: RESULT_SELECT,
    });

    return this.mapToResponseDto({ ...result, sampleDate: batch.sampleDate });
  }

  async delete(userId: string, id: string): Promise<void> {
    const result = await this.prisma.testResult.findFirst({
      where: { id, batch: { userId } },
    });

    if (!result) {
      throw new NotFoundException("Test result not found");
    }

    await this.prisma.testResult.delete({ where: { id } });
  }

  /**
   * Either verifies the caller owns the given batch, or — when no batchId is
   * supplied — creates a one-off self-reported batch on their behalf. Run
   * last among a create*'s steps so a validation failure earlier never
   * leaves behind an orphaned auto-created batch.
   */
  private async resolveBatch(
    userId: string,
    batchId: string | undefined,
    sampleDate: Date | undefined,
  ): Promise<ResolvedBatch> {
    if (batchId) {
      const batch = await this.prisma.testBatch.findFirst({
        where: { id: batchId, userId },
        select: { id: true, sampleDate: true },
      });

      if (!batch) {
        throw new NotFoundException(
          `Test batch with ID "${batchId}" not found`,
        );
      }

      return batch;
    }

    if (!sampleDate) {
      throw new BadRequestException(
        "sampleDate is required when batchId is not provided",
      );
    }

    const created = await this.testBatchesService.createSelfReported(userId, {
      labLabel: AD_HOC_BATCH_LABEL,
      sampleDate,
    });

    return { id: created.id, sampleDate };
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
      batch: {
        userId,
        ...(from || to
          ? {
              sampleDate: {
                ...(from && { gte: from }),
                ...(to && { lte: to }),
              },
            }
          : {}),
      },
      ...(analyteId && { analyteId }),
    };
  }

  private mapToResponseDto(
    result: SelectedResult & { sampleDate: Date },
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
      batchId: result.batchId,
      analyteId: result.analyteId,
      analyteUnitId: result.analyteUnitId,
      valueText: result.valueText,
      valueNumeric,
      sampleDate: result.sampleDate.toISOString().split("T")[0],
    };
  }
}
