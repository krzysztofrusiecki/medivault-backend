import { Test, TestingModule } from "@nestjs/testing";
import { AnalytesService } from "./analytes.service";
import { PrismaService } from "@/infrastructure/prisma";
import { AnalyteUnit, AnalyteValueType, Prisma } from "@prisma/client";
import { ConflictException, NotFoundException } from "@nestjs/common";
import { AnalyteUnitsService } from "../analyte-units";

describe("AnalytesService", () => {
  let service: AnalytesService;
  let prismaService: PrismaService;

  const mockAnalyte = {
    id: "cuid123456",
    code: "GLU",
    name: "Glucose",
    valueType: AnalyteValueType.NUMERIC,
    createdAt: new Date(),
    updatedAt: new Date(),
    units: [],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalytesService,
        {
          provide: PrismaService,
          useValue: {
            analyte: {
              create: jest.fn(),
              findMany: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
          },
        },
        {
          provide: AnalyteUnitsService,
          useValue: {
            mapToResponseDto: jest.fn((unit: AnalyteUnit) => ({
              id: unit.id,
              unit: unit.unit,
              isCanonical: unit.isCanonical,
              factorToCanonical: Number(unit.factorToCanonical),
              offset: Number(unit.offset),
            })),
          },
        },
      ],
    }).compile();

    service = module.get<AnalytesService>(AnalytesService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("create", () => {
    it("should create an analyte successfully", async () => {
      const createAnalyteDto = {
        code: "GLU",
        name: "Glucose",
        valueType: AnalyteValueType.NUMERIC,
      };

      jest
        .spyOn(prismaService.analyte, "create")
        .mockResolvedValue(mockAnalyte);

      const result = await service.create(createAnalyteDto);

      expect(result).toMatchObject({
        id: mockAnalyte.id,
        code: mockAnalyte.code,
        name: mockAnalyte.name,
        valueType: mockAnalyte.valueType,
      });
      expect(prismaService.analyte.create).toHaveBeenCalledWith({
        data: createAnalyteDto,
        include: { units: true },
      });
    });

    it("should throw ConflictException if code already exists", async () => {
      const createAnalyteDto = {
        code: "GLU",
        name: "Glucose",
        valueType: AnalyteValueType.NUMERIC,
      };

      jest.spyOn(prismaService.analyte, "create").mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError(
          'Analyte with code "GLU" already exists',
          {
            code: "P2002",
            clientVersion: "6.0.0",
          },
        ),
      );

      await expect(service.create(createAnalyteDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe("findAll", () => {
    it("should return all analytes", async () => {
      const mockAnalytes = [mockAnalyte];

      jest
        .spyOn(prismaService.analyte, "findMany")
        .mockResolvedValue(mockAnalytes);

      const result = await service.findAll();

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: mockAnalyte.id,
        code: mockAnalyte.code,
        name: mockAnalyte.name,
        valueType: mockAnalyte.valueType,
      });
      expect(prismaService.analyte.findMany).toHaveBeenCalledWith({
        include: { units: true },
      });
    });

    it("should return empty array if no analytes exist", async () => {
      jest.spyOn(prismaService.analyte, "findMany").mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });
  });

  describe("findOne", () => {
    it("should return an analyte by ID", async () => {
      const id = "cuid123456";

      jest
        .spyOn(prismaService.analyte, "findUnique")
        .mockResolvedValue(mockAnalyte);

      const result = await service.findOne(id);

      expect(result).toMatchObject({
        id: mockAnalyte.id,
        code: mockAnalyte.code,
        name: mockAnalyte.name,
        valueType: mockAnalyte.valueType,
      });
      expect(prismaService.analyte.findUnique).toHaveBeenCalledWith({
        where: { id },
        include: { units: true },
      });
    });

    it("should throw NotFoundException if analyte does not exist", async () => {
      const id = "nonexistent";

      jest.spyOn(prismaService.analyte, "findUnique").mockResolvedValue(null);

      await expect(service.findOne(id)).rejects.toThrow(NotFoundException);
    });
  });

  describe("update", () => {
    it("should update an analyte successfully", async () => {
      const id = "cuid123456";
      const updateAnalyteDto = {
        name: "Updated Glucose",
      };

      jest
        .spyOn(prismaService.analyte, "findUnique")
        .mockResolvedValue(mockAnalyte);
      jest
        .spyOn(prismaService.analyte, "update")
        .mockResolvedValue({ ...mockAnalyte, ...updateAnalyteDto });

      const result = await service.update(id, updateAnalyteDto);

      expect(result).toMatchObject({
        id: mockAnalyte.id,
        code: mockAnalyte.code,
        name: "Updated Glucose",
        valueType: mockAnalyte.valueType,
      });
      expect(prismaService.analyte.update).toHaveBeenCalledWith({
        where: { id },
        data: updateAnalyteDto,
        include: { units: true },
      });
    });

    it("should throw NotFoundException if analyte does not exist", async () => {
      const id = "nonexistent";

      jest.spyOn(prismaService.analyte, "findUnique").mockResolvedValue(null);

      await expect(service.update(id, { name: "Updated" })).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should throw ConflictException if code already exists", async () => {
      const id = "cuid123456";
      const updateAnalyteDto = {
        code: "EXISTING_CODE",
      };

      jest
        .spyOn(prismaService.analyte, "findUnique")
        .mockResolvedValue(mockAnalyte);
      jest.spyOn(prismaService.analyte, "update").mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError(
          'Analyte with code "EXISTING_CODE" already exists',
          {
            code: "P2002",
            clientVersion: "6.0.0",
          },
        ),
      );

      await expect(service.update(id, updateAnalyteDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe("remove", () => {
    it("should delete an analyte successfully", async () => {
      const id = "cuid123456";

      jest
        .spyOn(prismaService.analyte, "findUnique")
        .mockResolvedValue(mockAnalyte);
      jest
        .spyOn(prismaService.analyte, "delete")
        .mockResolvedValue(mockAnalyte);

      await service.remove(id);

      expect(prismaService.analyte.delete).toHaveBeenCalledWith({
        where: { id },
      });
    });

    it("should throw NotFoundException if analyte does not exist", async () => {
      const id = "nonexistent";

      jest.spyOn(prismaService.analyte, "findUnique").mockResolvedValue(null);

      await expect(service.remove(id)).rejects.toThrow(NotFoundException);
    });
  });
});
