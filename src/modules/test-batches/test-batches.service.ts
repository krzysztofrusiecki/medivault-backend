import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma, Role, TestBatch, TestBatchStatus } from "@prisma/client";
import { PrismaService } from "@/infrastructure/prisma";
import { UsersService } from "../users/users.service";
import { CreateTestBatchDto } from "./dto/create-test-batch.dto";
import { CreateLabVerifiedBatchDto } from "./dto/create-lab-verified-batch.dto";
import { TestBatchQueryDto } from "./dto/test-batch-query.dto";
import {
  TestBatchItemDto,
  TestBatchResponseDto,
} from "./dto/test-batch-response.dto";

@Injectable()
export class TestBatchesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
  ) {}

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

  async createLabVerified(
    labAdminUserId: string,
    dto: CreateLabVerifiedBatchDto,
  ): Promise<TestBatchItemDto> {
    const labId = await this.getOwnLabId(labAdminUserId);

    const patient = await this.usersService.findByEmail(dto.patientEmail);
    if (!patient || patient.role !== Role.USER) {
      throw new NotFoundException(
        `No patient account found with email "${dto.patientEmail}"`,
      );
    }

    const batch = await this.prisma.testBatch.create({
      data: {
        userId: patient.id,
        labId,
        sampleDate: dto.sampleDate,
        notes: dto.notes,
        status: TestBatchStatus.PENDING_ACCEPTANCE,
      },
    });

    return this.mapToResponseDto(batch);
  }

  async findAllForCaller(
    userId: string,
    role: Role,
    query: TestBatchQueryDto,
  ): Promise<TestBatchResponseDto> {
    if (role === Role.LAB_ADMIN) {
      const labId = await this.getOwnLabId(userId);
      return this.paginate({ labId }, query);
    }

    return this.paginate({ userId }, query);
  }

  private async paginate(
    scope: Pick<Prisma.TestBatchWhereInput, "userId" | "labId">,
    query: TestBatchQueryDto,
  ): Promise<TestBatchResponseDto> {
    const { status, page = 1, pageSize = 25, sortOrder = "DESC" } = query;

    const where: Prisma.TestBatchWhereInput = {
      ...scope,
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

  async accept(userId: string, batchId: string): Promise<TestBatchItemDto> {
    return this.transitionPendingBatch(
      userId,
      batchId,
      TestBatchStatus.ACCEPTED,
    );
  }

  async decline(userId: string, batchId: string): Promise<TestBatchItemDto> {
    return this.transitionPendingBatch(
      userId,
      batchId,
      TestBatchStatus.DECLINED,
    );
  }

  private async transitionPendingBatch(
    userId: string,
    batchId: string,
    status: TestBatchStatus,
  ): Promise<TestBatchItemDto> {
    try {
      // A single conditional write: only matches (and only then updates) a
      // batch that is both owned by this caller and still PENDING_ACCEPTANCE,
      // so a concurrent accept/decline on the same batch can't both succeed.
      const updated = await this.prisma.testBatch.update({
        where: {
          id: batchId,
          userId,
          status: TestBatchStatus.PENDING_ACCEPTANCE,
        },
        data: { status },
      });

      return this.mapToResponseDto(updated);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2025"
      ) {
        await this.rejectFailedTransition(userId, batchId);
      }
      throw error;
    }
  }

  private async rejectFailedTransition(
    userId: string,
    batchId: string,
  ): Promise<never> {
    const batch = await this.prisma.testBatch.findUnique({
      where: { id: batchId },
    });

    if (!batch || batch.userId !== userId) {
      throw new NotFoundException(`Test batch with ID "${batchId}" not found`);
    }

    throw new ConflictException(
      `Test batch with ID "${batchId}" is not pending acceptance`,
    );
  }

  private async getOwnLabId(labAdminUserId: string): Promise<string> {
    const labAdmin = await this.usersService.findById(labAdminUserId);

    if (!labAdmin?.labId) {
      throw new ForbiddenException("LAB_ADMIN is not attached to a lab");
    }

    return labAdmin.labId;
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
