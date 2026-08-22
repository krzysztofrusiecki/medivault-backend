import { Test, TestingModule } from "@nestjs/testing";
import { ReferenceRangesService } from "./reference-ranges.service";
import { PrismaService } from "@/infrastructure/prisma";
import { AnalyteValueType, Gender } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import { BadRequestException, NotFoundException } from "@nestjs/common";

describe("ReferenceRangesService", () => {
  let service: ReferenceRangesService;
  let prismaService: PrismaService;

  const mockAnalyte = {
    id: "analyte123",
    slug: "D3",
    name: "Vitamin D3",
    valueType: AnalyteValueType.NUMERIC,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockReferenceRange = {
    id: "range123",
    analyteId: "analyte123",
    label: "Sufficient",
    gender: null,
    minAge: null,
    maxAge: null,
    minValue: new Decimal("30"),
    maxValue: new Decimal("100"),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReferenceRangesService,
        {
          provide: PrismaService,
          useValue: {
            analyte: {
              findUnique: jest.fn(),
            },
            referenceRange: {
              create: jest.fn(),
              findMany: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<ReferenceRangesService>(ReferenceRangesService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("create", () => {
    it("should create a reference range for a NUMERIC analyte", async () => {
      const createDto = {
        label: "Sufficient",
        minValue: 30,
        maxValue: 100,
      };

      jest
        .spyOn(prismaService.analyte, "findUnique")
        .mockResolvedValue(mockAnalyte);
      jest
        .spyOn(prismaService.referenceRange, "create")
        .mockResolvedValue(mockReferenceRange);

      const result = await service.create("analyte123", createDto);

      expect(result).toEqual({
        id: "range123",
        label: "Sufficient",
        gender: null,
        minAge: null,
        maxAge: null,
        minValue: 30,
        maxValue: 100,
      });
      expect(prismaService.referenceRange.create).toHaveBeenCalledWith({
        data: {
          analyteId: "analyte123",
          ...createDto,
        },
      });
    });

    it("should throw NotFoundException if analyte does not exist", async () => {
      jest.spyOn(prismaService.analyte, "findUnique").mockResolvedValue(null);

      await expect(
        service.create("nonexistent", { label: "Sufficient", minValue: 30 }),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw BadRequestException for a TEXT analyte", async () => {
      const textAnalyte = { ...mockAnalyte, valueType: AnalyteValueType.TEXT };
      jest
        .spyOn(prismaService.analyte, "findUnique")
        .mockResolvedValue(textAnalyte);

      await expect(
        service.create("analyte123", { label: "Sufficient", minValue: 30 }),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw BadRequestException if neither minValue nor maxValue is provided", async () => {
      jest
        .spyOn(prismaService.analyte, "findUnique")
        .mockResolvedValue(mockAnalyte);

      await expect(
        service.create("analyte123", { label: "Sufficient" }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("findByAnalyteId", () => {
    it("should return reference ranges for an analyte", async () => {
      jest
        .spyOn(prismaService.analyte, "findUnique")
        .mockResolvedValue(mockAnalyte);
      jest
        .spyOn(prismaService.referenceRange, "findMany")
        .mockResolvedValue([mockReferenceRange]);

      const result = await service.findByAnalyteId("analyte123");

      expect(result).toEqual([
        {
          id: "range123",
          label: "Sufficient",
          gender: null,
          minAge: null,
          maxAge: null,
          minValue: 30,
          maxValue: 100,
        },
      ]);
    });

    it("should throw NotFoundException if analyte does not exist", async () => {
      jest.spyOn(prismaService.analyte, "findUnique").mockResolvedValue(null);

      await expect(service.findByAnalyteId("nonexistent")).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should return empty array if no reference ranges exist", async () => {
      jest
        .spyOn(prismaService.analyte, "findUnique")
        .mockResolvedValue(mockAnalyte);
      jest
        .spyOn(prismaService.referenceRange, "findMany")
        .mockResolvedValue([]);

      const result = await service.findByAnalyteId("analyte123");

      expect(result).toEqual([]);
    });
  });

  describe("update", () => {
    it("should update a reference range", async () => {
      const updateDto = { label: "Insufficient", gender: Gender.FEMALE };
      const updated = { ...mockReferenceRange, ...updateDto };

      jest
        .spyOn(prismaService.referenceRange, "findUnique")
        .mockResolvedValue(mockReferenceRange);
      jest
        .spyOn(prismaService.referenceRange, "update")
        .mockResolvedValue(updated);

      const result = await service.update("analyte123", "range123", updateDto);

      expect(result).toEqual({
        id: "range123",
        label: "Insufficient",
        gender: Gender.FEMALE,
        minAge: null,
        maxAge: null,
        minValue: 30,
        maxValue: 100,
      });
    });

    it("should throw NotFoundException if reference range does not exist", async () => {
      jest
        .spyOn(prismaService.referenceRange, "findUnique")
        .mockResolvedValue(null);

      await expect(
        service.update("analyte123", "nonexistent", { label: "New" }),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw NotFoundException if reference range belongs to a different analyte", async () => {
      const wrongRange = { ...mockReferenceRange, analyteId: "other123" };
      jest
        .spyOn(prismaService.referenceRange, "findUnique")
        .mockResolvedValue(wrongRange);

      await expect(
        service.update("analyte123", "range123", { label: "New" }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("remove", () => {
    it("should delete a reference range", async () => {
      jest
        .spyOn(prismaService.referenceRange, "findUnique")
        .mockResolvedValue(mockReferenceRange);
      jest
        .spyOn(prismaService.referenceRange, "delete")
        .mockResolvedValue(mockReferenceRange);

      await service.remove("analyte123", "range123");

      expect(prismaService.referenceRange.delete).toHaveBeenCalledWith({
        where: { id: "range123" },
      });
    });

    it("should throw NotFoundException if reference range does not exist", async () => {
      jest
        .spyOn(prismaService.referenceRange, "findUnique")
        .mockResolvedValue(null);

      await expect(service.remove("analyte123", "nonexistent")).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should throw NotFoundException if reference range belongs to a different analyte", async () => {
      const wrongRange = { ...mockReferenceRange, analyteId: "other123" };
      jest
        .spyOn(prismaService.referenceRange, "findUnique")
        .mockResolvedValue(wrongRange);

      await expect(service.remove("analyte123", "range123")).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
