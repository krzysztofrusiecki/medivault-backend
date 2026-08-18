import { BadRequestException, Injectable } from "@nestjs/common";
import { Prisma, TestBatch, TestBatchStatus } from "@prisma/client";
import { PrismaService } from "@/infrastructure/prisma";
import { CreateTestBatchDto } from "./dto/create-test-batch.dto";
import { TestBatchQueryDto } from "./dto/test-batch-query.dto";
import {
  TestBatchItemDto,
  TestBatchResponseDto,
} from "./dto/test-batch-response.dto";

@Injectable()
export class TestBatchesService {
  constructor(private readonly prisma: PrismaService) {}

  async createSelfReported(
    userId: string,
    dto: CreateTestBatchDto,
  ): Promise<TestBatchItemDto> {
    this.assertExactlyOneLabReference(null, dto.labLabel);

    const batch = await this.prisma.testBatch.create({
      data: {
        userId,
        labLabel: dto.labLabel,
        sampleDate: dto.sampleDate,
        notes: dto.notes,
        status: TestBatchStatus.ACCEPTED,
      },
    });

    return this.mapToResponseDto(batch);
  }

  async findAll(
    userId: string,
    query: TestBatchQueryDto,
  ): Promise<TestBatchResponseDto> {
    const { status, page = 1, pageSize = 25, sortOrder = "DESC" } = query;

    const where: Prisma.TestBatchWhereInput = {
      userId,
      ...(status && { status }),
    };

    const [total, batches] = await Promise.all([
      this.prisma.testBatch.count({ where }),
      this.prisma.testBatch.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { sampleDate: sortOrder.toLowerCase() as "asc" | "desc" },
      }),
    ]);

    const items = batches.map((b) => this.mapToResponseDto(b));

    return new TestBatchResponseDto(items, page, pageSize, total);
  }

  private assertExactlyOneLabReference(
    labId: string | null | undefined,
    labLabel: string | null | undefined,
  ): void {
    if (labId && labLabel) {
      throw new BadRequestException(
        "A batch cannot have both a labId and a labLabel",
      );
    }
    if (!labId && !labLabel) {
      throw new BadRequestException(
        "A batch must have either a labId or a labLabel",
      );
    }
  }

  private mapToResponseDto(batch: TestBatch): TestBatchItemDto {
    return {
      id: batch.id,
      labId: batch.labId,
      labLabel: batch.labLabel,
      sampleDate: batch.sampleDate.toISOString().split("T")[0],
      notes: batch.notes,
      status: batch.status,
    };
  }
}
