import { Test, TestingModule } from "@nestjs/testing";
import { LabsService } from "./labs.service";
import { PrismaService } from "@/infrastructure/prisma";
import { Prisma } from "@prisma/client";
import { ConflictException, NotFoundException } from "@nestjs/common";

describe("LabsService", () => {
  let service: LabsService;
  let prismaService: PrismaService;

  const mockLab = {
    id: "cuid123456",
    name: "Acme Diagnostics",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LabsService,
        {
          provide: PrismaService,
          useValue: {
            lab: {
              create: jest.fn(),
              findMany: jest.fn(),
              findUnique: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<LabsService>(LabsService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("create", () => {
    it("should create a lab successfully", async () => {
      const createLabDto = { name: "Acme Diagnostics" };

      jest.spyOn(prismaService.lab, "create").mockResolvedValue(mockLab);

      const result = await service.create(createLabDto);

      expect(result).toEqual(mockLab);
      expect(prismaService.lab.create).toHaveBeenCalledWith({
        data: createLabDto,
      });
    });

    it("should throw ConflictException if name already exists", async () => {
      const createLabDto = { name: "Acme Diagnostics" };

      jest.spyOn(prismaService.lab, "create").mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError(
          'Lab with name "Acme Diagnostics" already exists',
          {
            code: "P2002",
            clientVersion: "6.0.0",
          },
        ),
      );

      await expect(service.create(createLabDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe("findAll", () => {
    it("should return all labs", async () => {
      jest.spyOn(prismaService.lab, "findMany").mockResolvedValue([mockLab]);

      const result = await service.findAll();

      expect(result).toEqual([mockLab]);
    });

    it("should return empty array if no labs exist", async () => {
      jest.spyOn(prismaService.lab, "findMany").mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });
  });

  describe("findOne", () => {
    it("should return a lab by ID", async () => {
      jest.spyOn(prismaService.lab, "findUnique").mockResolvedValue(mockLab);

      const result = await service.findOne(mockLab.id);

      expect(result).toEqual(mockLab);
      expect(prismaService.lab.findUnique).toHaveBeenCalledWith({
        where: { id: mockLab.id },
      });
    });

    it("should throw NotFoundException if lab does not exist", async () => {
      jest.spyOn(prismaService.lab, "findUnique").mockResolvedValue(null);

      await expect(service.findOne("nonexistent")).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
