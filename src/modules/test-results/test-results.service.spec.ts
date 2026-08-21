import { Test, TestingModule } from "@nestjs/testing";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { AnalyteValueType, TestBatchStatus } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import { PrismaService } from "@/infrastructure/prisma";
import { AnalyteUnitsService } from "../analyte-units";
import { AnalytesService } from "../analytes";
import { TestBatchesService } from "../test-batches";
import { TestResultsService } from "./test-results.service";

describe("TestResultsService", () => {
  let service: TestResultsService;
  let prismaService: PrismaService;
  let analyteUnitsService: AnalyteUnitsService;
  let analytesService: AnalytesService;
  let testBatchesService: TestBatchesService;

  const mockUserId = "user123";
  const mockSampleDate = new Date("2025-06-15");

  const mockDbResult = {
    id: "result123",
    batchId: "batch123",
    analyteId: "analyte123",
    analyteUnitId: "unit123",
    valueText: null,
    value: new Decimal("5.25"),
    valueRaw: new Decimal("5.25"),
    factorSnapshot: new Decimal("1"),
    offsetSnapshot: new Decimal("0"),
    createdAt: mockSampleDate,
    updatedAt: mockSampleDate,
    batch: { sampleDate: mockSampleDate },
  };

  const mockFullBatch = {
    id: "batch123",
    userId: mockUserId,
    labId: null,
    labLabel: "City Diagnostics",
    sampleDate: mockSampleDate,
    notes: null,
    status: TestBatchStatus.ACCEPTED,
    createdAt: mockSampleDate,
    updatedAt: mockSampleDate,
  };

  const mockNumericAnalyte = {
    id: "analyte123",
    slug: "GLU",
    name: "Glucose",
    valueType: AnalyteValueType.NUMERIC,
    units: [],
    createdAt: mockSampleDate,
    updatedAt: mockSampleDate,
  };

  const mockTextAnalyte = {
    id: "analyte123",
    slug: "HBS",
    name: "HBsAg",
    valueType: AnalyteValueType.TEXT,
    units: [],
    createdAt: mockSampleDate,
    updatedAt: mockSampleDate,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TestResultsService,
        {
          provide: PrismaService,
          useValue: {
            testResult: {
              count: jest.fn(),
              findMany: jest.fn(),
              findFirst: jest.fn(),
              create: jest.fn(),
              delete: jest.fn(),
            },
            testBatch: {
              findFirst: jest.fn(),
            },
          },
        },
        {
          provide: AnalyteUnitsService,
          useValue: {
            getConversionFactors: jest.fn(),
          },
        },
        {
          provide: AnalytesService,
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: TestBatchesService,
          useValue: {
            createSelfReported: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<TestResultsService>(TestResultsService);
    prismaService = module.get<PrismaService>(PrismaService);
    analyteUnitsService = module.get<AnalyteUnitsService>(AnalyteUnitsService);
    analytesService = module.get<AnalytesService>(AnalytesService);
    testBatchesService = module.get<TestBatchesService>(TestBatchesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("findAll", () => {
    it("should return paginated results with defaults", async () => {
      jest.spyOn(prismaService.testResult, "count").mockResolvedValue(1);
      jest
        .spyOn(prismaService.testResult, "findMany")
        .mockResolvedValue([mockDbResult]);

      const result = await service.findAll(mockUserId, {});

      expect(result.items).toHaveLength(1);
      expect(result.items[0]).toEqual({
        id: "result123",
        batchId: "batch123",
        analyteId: "analyte123",
        analyteUnitId: "unit123",
        valueText: null,
        valueNumeric: 5.25,
        sampleDate: "2025-06-15",
      });
      expect(result.pagination).toEqual({ page: 1, pageSize: 25, total: 1 });
      expect(analyteUnitsService.getConversionFactors).not.toHaveBeenCalled();
    });

    it("should scope results to the caller's own batches", async () => {
      jest.spyOn(prismaService.testResult, "count").mockResolvedValue(0);
      jest.spyOn(prismaService.testResult, "findMany").mockResolvedValue([]);

      await service.findAll(mockUserId, {});

      expect(prismaService.testResult.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            batch: expect.objectContaining({ userId: mockUserId }),
          }),
        }),
      );
    });

    it("should apply conversion when unitId and analyteId provided", async () => {
      jest.spyOn(prismaService.testResult, "count").mockResolvedValue(1);
      jest
        .spyOn(prismaService.testResult, "findMany")
        .mockResolvedValue([mockDbResult]);
      jest
        .spyOn(analyteUnitsService, "getConversionFactors")
        .mockResolvedValue({ factor: 2, offset: 1 });

      const result = await service.findAll(mockUserId, {
        unitId: "unit123",
        analyteId: "analyte123",
      });

      // canonical=5.25, valueNumeric = (5.25 - 1) / 2 = 2.125
      expect(result.items[0].valueNumeric).toBe(2.125);
      expect(analyteUnitsService.getConversionFactors).toHaveBeenCalledWith(
        "unit123",
        "analyte123",
      );
    });

    it("should filter by analyteId", async () => {
      jest.spyOn(prismaService.testResult, "count").mockResolvedValue(0);
      jest.spyOn(prismaService.testResult, "findMany").mockResolvedValue([]);

      await service.findAll(mockUserId, { analyteId: "analyte123" });

      expect(prismaService.testResult.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ analyteId: "analyte123" }),
        }),
      );
    });

    it("should filter by date range through the batch relation", async () => {
      const from = new Date("2025-01-01");
      const to = new Date("2025-12-31");

      jest.spyOn(prismaService.testResult, "count").mockResolvedValue(0);
      jest.spyOn(prismaService.testResult, "findMany").mockResolvedValue([]);

      await service.findAll(mockUserId, { from, to });

      expect(prismaService.testResult.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            batch: expect.objectContaining({
              sampleDate: { gte: from, lte: to },
            }),
          }),
        }),
      );
    });

    it("should throw BadRequestException when unitId without analyteId", async () => {
      await expect(
        service.findAll(mockUserId, { unitId: "unit123" }),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw BadRequestException when from without to", async () => {
      await expect(
        service.findAll(mockUserId, { from: new Date("2025-01-01") }),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw BadRequestException when to without from", async () => {
      await expect(
        service.findAll(mockUserId, { to: new Date("2025-12-31") }),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw BadRequestException when from > to", async () => {
      await expect(
        service.findAll(mockUserId, {
          from: new Date("2025-12-31"),
          to: new Date("2025-01-01"),
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it("should return empty results", async () => {
      jest.spyOn(prismaService.testResult, "count").mockResolvedValue(0);
      jest.spyOn(prismaService.testResult, "findMany").mockResolvedValue([]);

      const result = await service.findAll(mockUserId, {});

      expect(result.items).toEqual([]);
      expect(result.pagination).toEqual({ page: 1, pageSize: 25, total: 0 });
    });
  });

  describe("createNumeric", () => {
    const numericDto = {
      analyteId: "analyte123",
      analyteUnitId: "unit123",
      sampleDate: mockSampleDate,
      value: 5.25,
    };

    const mockCreatedBatch = {
      id: "batch789",
      labId: null,
      labLabel: "Quick entry",
      sampleDate: "2025-06-15",
      notes: null,
      status: TestBatchStatus.ACCEPTED,
    };

    it("should auto-create a one-off self-reported batch when batchId is not given", async () => {
      jest
        .spyOn(analytesService, "findOne")
        .mockResolvedValue(mockNumericAnalyte);
      jest
        .spyOn(analyteUnitsService, "getConversionFactors")
        .mockResolvedValue({ factor: 2, offset: 1 });
      jest
        .spyOn(testBatchesService, "createSelfReported")
        .mockResolvedValue(mockCreatedBatch);

      // canonical = 5.25 * 2 + 1 = 11.5
      const createdResult = {
        id: "result789",
        batchId: "batch789",
        analyteId: "analyte123",
        analyteUnitId: "unit123",
        valueText: null,
        value: new Decimal("11.5"),
        valueRaw: new Decimal("5.25"),
        factorSnapshot: new Decimal("2"),
        offsetSnapshot: new Decimal("1"),
        createdAt: mockSampleDate,
        updatedAt: mockSampleDate,
      };
      jest
        .spyOn(prismaService.testResult, "create")
        .mockResolvedValue(createdResult);

      const result = await service.createNumeric(mockUserId, numericDto);

      expect(testBatchesService.createSelfReported).toHaveBeenCalledWith(
        mockUserId,
        expect.objectContaining({
          labLabel: "Quick entry",
          sampleDate: mockSampleDate,
        }),
      );
      expect(prismaService.testResult.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            batchId: "batch789",
            valueRaw: 5.25,
            value: 11.5,
            factorSnapshot: 2,
            offsetSnapshot: 1,
          }),
        }),
      );
      // valueNumeric = (11.5 - 1) / 2 = 5.25
      expect(result.valueNumeric).toBe(5.25);
      expect(result.batchId).toBe("batch789");
      expect(result.sampleDate).toBe("2025-06-15");
    });

    it("should attach to an existing batch and ignore sampleDate when batchId is given", async () => {
      jest
        .spyOn(analytesService, "findOne")
        .mockResolvedValue(mockNumericAnalyte);
      jest
        .spyOn(analyteUnitsService, "getConversionFactors")
        .mockResolvedValue({ factor: 2, offset: 1 });
      jest.spyOn(prismaService.testBatch, "findFirst").mockResolvedValue({
        ...mockFullBatch,
        id: "existingBatch1",
        sampleDate: new Date("2025-01-01"),
      });

      const createdResult = {
        id: "result789",
        batchId: "existingBatch1",
        analyteId: "analyte123",
        analyteUnitId: "unit123",
        valueText: null,
        value: new Decimal("11.5"),
        valueRaw: new Decimal("5.25"),
        factorSnapshot: new Decimal("2"),
        offsetSnapshot: new Decimal("1"),
        createdAt: mockSampleDate,
        updatedAt: mockSampleDate,
      };
      jest
        .spyOn(prismaService.testResult, "create")
        .mockResolvedValue(createdResult);

      const result = await service.createNumeric(mockUserId, {
        ...numericDto,
        batchId: "existingBatch1",
        sampleDate: new Date("2099-01-01"), // should be ignored
      });

      expect(prismaService.testBatch.findFirst).toHaveBeenCalledWith({
        where: { id: "existingBatch1", userId: mockUserId },
        select: { id: true, sampleDate: true },
      });
      expect(testBatchesService.createSelfReported).not.toHaveBeenCalled();
      expect(prismaService.testResult.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ batchId: "existingBatch1" }),
        }),
      );
      expect(result.sampleDate).toBe("2025-01-01");
    });

    it("should throw NotFoundException when batchId does not belong to the caller", async () => {
      jest
        .spyOn(analytesService, "findOne")
        .mockResolvedValue(mockNumericAnalyte);
      jest
        .spyOn(analyteUnitsService, "getConversionFactors")
        .mockResolvedValue({ factor: 1, offset: 0 });
      jest.spyOn(prismaService.testBatch, "findFirst").mockResolvedValue(null);

      await expect(
        service.createNumeric(mockUserId, {
          ...numericDto,
          batchId: "someoneElsesBatch",
        }),
      ).rejects.toThrow(NotFoundException);
      expect(prismaService.testResult.create).not.toHaveBeenCalled();
    });

    it("should throw BadRequestException when neither batchId nor sampleDate is given", async () => {
      jest
        .spyOn(analytesService, "findOne")
        .mockResolvedValue(mockNumericAnalyte);
      jest
        .spyOn(analyteUnitsService, "getConversionFactors")
        .mockResolvedValue({ factor: 1, offset: 0 });

      await expect(
        service.createNumeric(mockUserId, {
          ...numericDto,
          sampleDate: undefined,
        }),
      ).rejects.toThrow(BadRequestException);
      expect(testBatchesService.createSelfReported).not.toHaveBeenCalled();
      expect(prismaService.testResult.create).not.toHaveBeenCalled();
    });

    it("should throw BadRequestException if analyte is TEXT", async () => {
      jest.spyOn(analytesService, "findOne").mockResolvedValue(mockTextAnalyte);

      await expect(
        service.createNumeric(mockUserId, numericDto),
      ).rejects.toThrow(
        new BadRequestException("Analyte is not of type NUMERIC"),
      );
    });

    it("should propagate NotFoundException from analytesService.findOne", async () => {
      jest
        .spyOn(analytesService, "findOne")
        .mockRejectedValue(new NotFoundException("Analyte not found"));

      await expect(
        service.createNumeric(mockUserId, numericDto),
      ).rejects.toThrow(NotFoundException);
    });

    it("should propagate errors from getConversionFactors", async () => {
      jest
        .spyOn(analytesService, "findOne")
        .mockResolvedValue(mockNumericAnalyte);
      jest
        .spyOn(analyteUnitsService, "getConversionFactors")
        .mockRejectedValue(new BadRequestException("Unit not found"));

      await expect(
        service.createNumeric(mockUserId, numericDto),
      ).rejects.toThrow(BadRequestException);
      expect(testBatchesService.createSelfReported).not.toHaveBeenCalled();
    });
  });

  describe("createText", () => {
    const textDto = {
      analyteId: "analyte123",
      sampleDate: mockSampleDate,
      value: "Positive",
    };

    const mockCreatedBatch = {
      id: "batch456",
      labId: null,
      labLabel: "Quick entry",
      sampleDate: "2025-06-15",
      notes: null,
      status: TestBatchStatus.ACCEPTED,
    };

    it("should create text result", async () => {
      jest.spyOn(analytesService, "findOne").mockResolvedValue(mockTextAnalyte);
      jest
        .spyOn(testBatchesService, "createSelfReported")
        .mockResolvedValue(mockCreatedBatch);
      jest.spyOn(prismaService.testResult, "create").mockResolvedValue({
        id: "result456",
        batchId: "batch456",
        analyteId: "analyte123",
        analyteUnitId: null,
        valueText: "Positive",
        value: null,
        valueRaw: null,
        factorSnapshot: null,
        offsetSnapshot: null,
        createdAt: mockSampleDate,
        updatedAt: mockSampleDate,
      });

      const result = await service.createText(mockUserId, textDto);

      expect(prismaService.testResult.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            valueText: "Positive",
            analyteId: "analyte123",
            batchId: "batch456",
          }),
        }),
      );
      expect(result.valueText).toBe("Positive");
      expect(result.valueNumeric).toBeNull();
      expect(result.batchId).toBe("batch456");
    });

    it("should throw BadRequestException if analyte is NUMERIC", async () => {
      jest
        .spyOn(analytesService, "findOne")
        .mockResolvedValue(mockNumericAnalyte);

      await expect(service.createText(mockUserId, textDto)).rejects.toThrow(
        new BadRequestException("Analyte is not of type TEXT"),
      );
    });

    it("should propagate NotFoundException from analytesService.findOne", async () => {
      jest
        .spyOn(analytesService, "findOne")
        .mockRejectedValue(new NotFoundException("Analyte not found"));

      await expect(service.createText(mockUserId, textDto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("delete", () => {
    it("should delete a test result owned by the user", async () => {
      jest
        .spyOn(prismaService.testResult, "findFirst")
        .mockResolvedValue(mockDbResult);
      jest
        .spyOn(prismaService.testResult, "delete")
        .mockResolvedValue(mockDbResult);

      await service.delete(mockUserId, "result123");

      expect(prismaService.testResult.findFirst).toHaveBeenCalledWith({
        where: { id: "result123", batch: { userId: mockUserId } },
      });
      expect(prismaService.testResult.delete).toHaveBeenCalledWith({
        where: { id: "result123" },
      });
    });

    it("should throw NotFoundException if test result does not exist", async () => {
      jest.spyOn(prismaService.testResult, "findFirst").mockResolvedValue(null);

      await expect(service.delete(mockUserId, "nonexistent")).rejects.toThrow(
        NotFoundException,
      );

      expect(prismaService.testResult.delete).not.toHaveBeenCalled();
    });

    it("should throw NotFoundException if test result belongs to another user", async () => {
      jest.spyOn(prismaService.testResult, "findFirst").mockResolvedValue(null);

      await expect(service.delete("other-user", "result123")).rejects.toThrow(
        NotFoundException,
      );

      expect(prismaService.testResult.delete).not.toHaveBeenCalled();
    });
  });
});
