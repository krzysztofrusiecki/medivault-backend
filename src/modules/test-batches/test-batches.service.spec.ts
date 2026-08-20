import { Test, TestingModule } from "@nestjs/testing";
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { Role, TestBatchStatus } from "@prisma/client";
import { PrismaService } from "@/infrastructure/prisma";
import { UsersService } from "../users/users.service";
import { TestBatchesService } from "./test-batches.service";

describe("TestBatchesService", () => {
  let service: TestBatchesService;
  let prismaService: PrismaService;
  let usersService: UsersService;

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

  const mockLabAdmin = {
    id: "lab-admin-123",
    email: "lab-admin@example.com",
    firstName: "Lab",
    lastName: "Admin",
    gender: null,
    birthDate: null,
    role: Role.LAB_ADMIN,
    labId: "lab-123",
    createdAt: mockSampleDate,
    updatedAt: mockSampleDate,
  };

  const mockPatient = {
    id: "patient-123",
    email: "patient@example.com",
    passwordHash: "$argon2id$v=19$m=65536,t=3,p=4$test$hash",
    firstName: "Pat",
    lastName: "Ient",
    gender: null,
    birthDate: null,
    role: Role.USER,
    labId: null,
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
        {
          provide: UsersService,
          useValue: {
            findById: jest.fn(),
            findByEmail: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<TestBatchesService>(TestBatchesService);
    prismaService = module.get<PrismaService>(PrismaService);
    usersService = module.get<UsersService>(UsersService);
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

    it("should throw BadRequestException when labLabel is blank", async () => {
      await expect(
        service.createSelfReported(mockUserId, { ...createDto, labLabel: "" }),
      ).rejects.toThrow(BadRequestException);

      expect(prismaService.testBatch.create).not.toHaveBeenCalled();
    });
  });

  describe("findAllForCaller", () => {
    it("should return paginated batches with defaults, scoped to the caller for USER", async () => {
      jest.spyOn(prismaService.testBatch, "count").mockResolvedValue(1);
      jest
        .spyOn(prismaService.testBatch, "findMany")
        .mockResolvedValue([mockBatch]);

      const result = await service.findAllForCaller(mockUserId, Role.USER, {});

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
      expect(usersService.findById).not.toHaveBeenCalled();
    });

    it("should filter by status for a USER caller", async () => {
      jest.spyOn(prismaService.testBatch, "count").mockResolvedValue(0);
      jest.spyOn(prismaService.testBatch, "findMany").mockResolvedValue([]);

      await service.findAllForCaller(mockUserId, Role.USER, {
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

      await service.findAllForCaller("other-user", Role.USER, {});

      expect(prismaService.testBatch.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: "other-user" } }),
      );
    });

    it("should return empty results", async () => {
      jest.spyOn(prismaService.testBatch, "count").mockResolvedValue(0);
      jest.spyOn(prismaService.testBatch, "findMany").mockResolvedValue([]);

      const result = await service.findAllForCaller(mockUserId, Role.USER, {});

      expect(result.items).toEqual([]);
      expect(result.pagination).toEqual({ page: 1, pageSize: 25, total: 0 });
    });

    it("scopes results to the caller's own lab for LAB_ADMIN", async () => {
      jest.spyOn(usersService, "findById").mockResolvedValue(mockLabAdmin);
      jest.spyOn(prismaService.testBatch, "count").mockResolvedValue(1);
      jest
        .spyOn(prismaService.testBatch, "findMany")
        .mockResolvedValue([mockBatch]);

      const result = await service.findAllForCaller(
        mockLabAdmin.id,
        Role.LAB_ADMIN,
        {},
      );

      expect(result.items).toHaveLength(1);
      expect(prismaService.testBatch.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { labId: mockLabAdmin.labId } }),
      );
    });

    it("filters by status for a LAB_ADMIN caller", async () => {
      jest.spyOn(usersService, "findById").mockResolvedValue(mockLabAdmin);
      jest.spyOn(prismaService.testBatch, "count").mockResolvedValue(0);
      jest.spyOn(prismaService.testBatch, "findMany").mockResolvedValue([]);

      await service.findAllForCaller(mockLabAdmin.id, Role.LAB_ADMIN, {
        status: TestBatchStatus.PENDING_ACCEPTANCE,
      });

      expect(prismaService.testBatch.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            labId: mockLabAdmin.labId,
            status: TestBatchStatus.PENDING_ACCEPTANCE,
          },
        }),
      );
    });

    it("throws ForbiddenException when a LAB_ADMIN caller has no attached lab", async () => {
      jest
        .spyOn(usersService, "findById")
        .mockResolvedValue({ ...mockLabAdmin, labId: null });

      await expect(
        service.findAllForCaller(mockLabAdmin.id, Role.LAB_ADMIN, {}),
      ).rejects.toThrow(ForbiddenException);

      expect(prismaService.testBatch.findMany).not.toHaveBeenCalled();
    });
  });

  describe("createLabVerified", () => {
    const createDto = {
      patientEmail: mockPatient.email,
      sampleDate: mockSampleDate,
      notes: "Fasting sample",
    };

    const mockLabVerifiedBatch = {
      ...mockBatch,
      id: "batch-lab-verified",
      userId: mockPatient.id,
      labId: mockLabAdmin.labId,
      labLabel: null,
      notes: "Fasting sample",
      status: TestBatchStatus.PENDING_ACCEPTANCE,
    };

    it("creates a batch for the patient with the LAB_ADMIN's own labId and PENDING_ACCEPTANCE status", async () => {
      jest.spyOn(usersService, "findById").mockResolvedValue(mockLabAdmin);
      jest.spyOn(usersService, "findByEmail").mockResolvedValue(mockPatient);
      jest
        .spyOn(prismaService.testBatch, "create")
        .mockResolvedValue(mockLabVerifiedBatch);

      const result = await service.createLabVerified(
        mockLabAdmin.id,
        createDto,
      );

      expect(usersService.findByEmail).toHaveBeenCalledWith(mockPatient.email);
      expect(prismaService.testBatch.create).toHaveBeenCalledWith({
        data: {
          userId: mockPatient.id,
          labId: mockLabAdmin.labId,
          sampleDate: mockSampleDate,
          notes: "Fasting sample",
          status: TestBatchStatus.PENDING_ACCEPTANCE,
        },
      });
      expect(result).toEqual({
        id: "batch-lab-verified",
        labId: mockLabAdmin.labId,
        labLabel: null,
        sampleDate: "2025-06-15",
        notes: "Fasting sample",
        status: TestBatchStatus.PENDING_ACCEPTANCE,
      });
    });

    it("throws NotFoundException when no user matches the patient email", async () => {
      jest.spyOn(usersService, "findById").mockResolvedValue(mockLabAdmin);
      jest.spyOn(usersService, "findByEmail").mockResolvedValue(null);

      await expect(
        service.createLabVerified(mockLabAdmin.id, createDto),
      ).rejects.toThrow(NotFoundException);

      expect(prismaService.testBatch.create).not.toHaveBeenCalled();
    });

    it("throws NotFoundException when the matched account is not a patient (USER)", async () => {
      jest.spyOn(usersService, "findById").mockResolvedValue(mockLabAdmin);
      jest
        .spyOn(usersService, "findByEmail")
        .mockResolvedValue({ ...mockPatient, role: Role.LAB_ADMIN });

      await expect(
        service.createLabVerified(mockLabAdmin.id, createDto),
      ).rejects.toThrow(NotFoundException);

      expect(prismaService.testBatch.create).not.toHaveBeenCalled();
    });

    it("throws ForbiddenException when the caller has no attached lab", async () => {
      jest
        .spyOn(usersService, "findById")
        .mockResolvedValue({ ...mockLabAdmin, labId: null });

      await expect(
        service.createLabVerified(mockLabAdmin.id, createDto),
      ).rejects.toThrow(ForbiddenException);

      expect(usersService.findByEmail).not.toHaveBeenCalled();
      expect(prismaService.testBatch.create).not.toHaveBeenCalled();
    });
  });
});
