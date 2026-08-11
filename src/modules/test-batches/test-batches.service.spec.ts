import { Test, TestingModule } from "@nestjs/testing";
import { TestBatchStatus } from "@prisma/client";
import { PrismaService } from "@/infrastructure/prisma";
import { TestBatchesService } from "./test-batches.service";

describe("TestBatchesService", () => {
  let service: TestBatchesService;
  let prismaService: PrismaService;

  const mockUserId = "user123";
  const mockSampleDate = new Date("2025-06-15");

  const mockBatch = {
    id: "batch123",
    userId: mockUserId,
    labId: null,
    labLabel: "City Diagnostics",
    sampleDate: mockSampleDate,
    notes: "Poor sleep, high stress",
    status: TestBatchStatus.ACCEPTED,
    createdAt: mockSampleDate,
    updatedAt: mockSampleDate,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TestBatchesService,
        {
          provide: PrismaService,
          useValue: {
            testBatch: {
              create: jest.fn(),
              count: jest.fn(),
              findMany: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<TestBatchesService>(TestBatchesService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("createSelfReported", () => {
    const createDto = {
      labLabel: "City Diagnostics",
      sampleDate: mockSampleDate,
      notes: "Poor sleep, high stress",
    };

    it("should create a self-reported batch with ACCEPTED status", async () => {
      jest
        .spyOn(prismaService.testBatch, "create")
        .mockResolvedValue(mockBatch);

      const result = await service.createSelfReported(mockUserId, createDto);

      expect(prismaService.testBatch.create).toHaveBeenCalledWith({
        data: {
          userId: mockUserId,
          labLabel: "City Diagnostics",
          sampleDate: mockSampleDate,
          notes: "Poor sleep, high stress",
          status: TestBatchStatus.ACCEPTED,
        },
      });
      expect(result).toEqual({
        id: "batch123",
        labId: null,
        labLabel: "City Diagnostics",
        sampleDate: "2025-06-15",
        notes: "Poor sleep, high stress",
        status: TestBatchStatus.ACCEPTED,
      });
    });

    it("should never set labId for a self-reported batch", async () => {
      jest
        .spyOn(prismaService.testBatch, "create")
        .mockResolvedValue(mockBatch);

      await service.createSelfReported(mockUserId, createDto);

      expect(prismaService.testBatch.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.not.objectContaining({ labId: expect.anything() }),
        }),
      );
    });
  });

  describe("findAll", () => {
    it("should return paginated batches with defaults", async () => {
      jest.spyOn(prismaService.testBatch, "count").mockResolvedValue(1);
      jest
        .spyOn(prismaService.testBatch, "findMany")
        .mockResolvedValue([mockBatch]);

      const result = await service.findAll(mockUserId, {});

      expect(result.items).toHaveLength(1);
      expect(result.items[0]).toEqual({
        id: "batch123",
        labId: null,
        labLabel: "City Diagnostics",
        sampleDate: "2025-06-15",
        notes: "Poor sleep, high stress",
        status: TestBatchStatus.ACCEPTED,
      });
      expect(result.pagination).toEqual({ page: 1, pageSize: 25, total: 1 });
      expect(prismaService.testBatch.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: mockUserId } }),
      );
    });

    it("should filter by status", async () => {
      jest.spyOn(prismaService.testBatch, "count").mockResolvedValue(0);
      jest.spyOn(prismaService.testBatch, "findMany").mockResolvedValue([]);

      await service.findAll(mockUserId, {
        status: TestBatchStatus.DECLINED,
      });

      expect(prismaService.testBatch.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: mockUserId, status: TestBatchStatus.DECLINED },
        }),
      );
    });

    it("should scope results to the requesting user", async () => {
      jest.spyOn(prismaService.testBatch, "count").mockResolvedValue(0);
      jest.spyOn(prismaService.testBatch, "findMany").mockResolvedValue([]);

      await service.findAll("other-user", {});

      expect(prismaService.testBatch.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: "other-user" } }),
      );
    });

    it("should return empty results", async () => {
      jest.spyOn(prismaService.testBatch, "count").mockResolvedValue(0);
      jest.spyOn(prismaService.testBatch, "findMany").mockResolvedValue([]);

      const result = await service.findAll(mockUserId, {});

      expect(result.items).toEqual([]);
      expect(result.pagination).toEqual({ page: 1, pageSize: 25, total: 0 });
    });
  });
});
