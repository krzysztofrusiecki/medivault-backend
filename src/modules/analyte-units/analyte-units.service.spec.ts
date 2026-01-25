import { Test, TestingModule } from "@nestjs/testing";
import { AnalyteUnitsService } from "./analyte-units.service";
import { PrismaService } from "@/infrastructure/prisma";
import { AnalyteValueType, Prisma } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from "@nestjs/common";

describe("AnalyteUnitsService", () => {
  let service: AnalyteUnitsService;
  let prismaService: PrismaService;

  const mockAnalyte = {
    id: "analyte123",
    code: "GLU",
    name: "Glucose",
    valueType: AnalyteValueType.NUMERIC,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockAnalyteUnit = {
    id: "unit123",
    analyteId: "analyte123",
    unit: "mg/dL",
    isCanonical: true,
    factorToCanonical: new Decimal("1.0"),
    offset: new Decimal("0"),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyteUnitsService,
        {
          provide: PrismaService,
          useValue: {
            analyte: {
              findUnique: jest.fn(),
            },
            analyteUnit: {
              create: jest.fn(),
              findMany: jest.fn(),
              findFirst: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<AnalyteUnitsService>(AnalyteUnitsService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("create", () => {
    it("should create a unit for NUMERIC analyte", async () => {
      const createDto = {
        unit: "mg/dL",
        factorToCanonical: 1.0,
        offset: 0,
        isCanonical: true,
      };

      jest
        .spyOn(prismaService.analyte, "findUnique")
        .mockResolvedValue(mockAnalyte);
      jest
        .spyOn(prismaService.analyteUnit, "findFirst")
        .mockResolvedValue(null);
      jest
        .spyOn(prismaService.analyteUnit, "create")
        .mockResolvedValue(mockAnalyteUnit);

      const result = await service.create("analyte123", createDto);

      expect(result).toEqual({
        id: "unit123",
        unit: "mg/dL",
        isCanonical: true,
        factorToCanonical: 1,
        offset: 0,
      });
      expect(prismaService.analyteUnit.create).toHaveBeenCalled();
    });

    it("should throw NotFoundException if analyte does not exist", async () => {
      jest.spyOn(prismaService.analyte, "findUnique").mockResolvedValue(null);

      await expect(
        service.create("nonexistent", {
          unit: "mg/dL",
          factorToCanonical: 1.0,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw BadRequestException for TEXT analyte", async () => {
      const textAnalyte = { ...mockAnalyte, valueType: AnalyteValueType.TEXT };
      jest
        .spyOn(prismaService.analyte, "findUnique")
        .mockResolvedValue(textAnalyte);

      await expect(
        service.create("analyte123", {
          unit: "mg/dL",
          factorToCanonical: 1.0,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw ConflictException if unit already exists", async () => {
      const createDto = {
        unit: "mg/dL",
        factorToCanonical: 1.0,
      };

      jest
        .spyOn(prismaService.analyte, "findUnique")
        .mockResolvedValue(mockAnalyte);
      jest
        .spyOn(prismaService.analyteUnit, "findFirst")
        .mockResolvedValue(null);
      jest.spyOn(prismaService.analyteUnit, "create").mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
          code: "P2002",
          clientVersion: "6.0.0",
        }),
      );

      await expect(service.create("analyte123", createDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it("should throw NotFoundException if analyteId is empty", async () => {
      jest.spyOn(prismaService.analyte, "findUnique").mockResolvedValue(null);

      await expect(
        service.create("", {
          unit: "mg/dL",
          factorToCanonical: 1.0,
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("findByAnalyteId", () => {
    it("should return units for an analyte", async () => {
      const units = [mockAnalyteUnit];

      jest
        .spyOn(prismaService.analyte, "findUnique")
        .mockResolvedValue(mockAnalyte);
      jest
        .spyOn(prismaService.analyteUnit, "findMany")
        .mockResolvedValue(units);

      const result = await service.findByAnalyteId("analyte123");

      expect(result).toEqual([
        {
          id: "unit123",
          unit: "mg/dL",
          isCanonical: true,
          factorToCanonical: 1,
          offset: 0,
        },
      ]);
    });

    it("should throw NotFoundException if analyte does not exist", async () => {
      jest.spyOn(prismaService.analyte, "findUnique").mockResolvedValue(null);

      await expect(service.findByAnalyteId("nonexistent")).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should return empty array if no units exist", async () => {
      jest
        .spyOn(prismaService.analyte, "findUnique")
        .mockResolvedValue(mockAnalyte);
      jest.spyOn(prismaService.analyteUnit, "findMany").mockResolvedValue([]);

      const result = await service.findByAnalyteId("analyte123");

      expect(result).toEqual([]);
    });
  });

  describe("update", () => {
    it("should update a unit", async () => {
      const updateDto = {
        factorToCanonical: 2.0,
      };

      const updatedUnit = {
        ...mockAnalyteUnit,
        factorToCanonical: new Decimal("2.0"),
      };

      jest
        .spyOn(prismaService.analyteUnit, "findUnique")
        .mockResolvedValue(mockAnalyteUnit);
      jest
        .spyOn(prismaService.analyteUnit, "update")
        .mockResolvedValue(updatedUnit);

      const result = await service.update("analyte123", "unit123", updateDto);

      expect(result).toEqual({
        id: "unit123",
        unit: "mg/dL",
        isCanonical: true,
        factorToCanonical: 2,
        offset: 0,
      });
    });

    it("should throw NotFoundException if unit does not exist", async () => {
      jest
        .spyOn(prismaService.analyteUnit, "findUnique")
        .mockResolvedValue(null);

      await expect(
        service.update("analyte123", "nonexistent", { unit: "mmol/L" }),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw NotFoundException if unit does not belong to analyte", async () => {
      const wrongUnit = { ...mockAnalyteUnit, analyteId: "other123" };
      jest
        .spyOn(prismaService.analyteUnit, "findUnique")
        .mockResolvedValue(wrongUnit);

      await expect(
        service.update("analyte123", "unit123", { unit: "mmol/L" }),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw ConflictException if unit already exists", async () => {
      jest
        .spyOn(prismaService.analyteUnit, "findUnique")
        .mockResolvedValue(mockAnalyteUnit);
      jest.spyOn(prismaService.analyteUnit, "update").mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
          code: "P2002",
          clientVersion: "6.0.0",
        }),
      );

      await expect(
        service.update("analyte123", "unit123", { unit: "mmol/L" }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe("remove", () => {
    it("should delete a unit", async () => {
      jest
        .spyOn(prismaService.analyteUnit, "findUnique")
        .mockResolvedValue(mockAnalyteUnit);
      jest
        .spyOn(prismaService.analyteUnit, "delete")
        .mockResolvedValue(mockAnalyteUnit);

      await service.remove("analyte123", "unit123");

      expect(prismaService.analyteUnit.delete).toHaveBeenCalledWith({
        where: { id: "unit123" },
      });
    });

    it("should throw NotFoundException if unit does not exist", async () => {
      jest
        .spyOn(prismaService.analyteUnit, "findUnique")
        .mockResolvedValue(null);

      await expect(service.remove("analyte123", "nonexistent")).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should throw NotFoundException if unit does not belong to analyte", async () => {
      const wrongUnit = { ...mockAnalyteUnit, analyteId: "other123" };
      jest
        .spyOn(prismaService.analyteUnit, "findUnique")
        .mockResolvedValue(wrongUnit);

      await expect(service.remove("analyte123", "unit123")).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
