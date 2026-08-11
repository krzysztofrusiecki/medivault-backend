import { Test, TestingModule } from "@nestjs/testing";
import { UsersService } from "./users.service";
import { PrismaService } from "../../infrastructure/prisma/prisma.service";
import { LabsService } from "../labs/labs.service";
import { Gender, Role } from "@prisma/client";
import { ConflictException, NotFoundException } from "@nestjs/common";

describe("UsersService", () => {
  let service: UsersService;
  let prisma: PrismaService;
  let labsService: LabsService;

  const mockUser = {
    id: "test-id-1",
    email: "test@example.com",
    passwordHash: "hashed-password",
    firstName: "Test",
    lastName: "User",
    gender: Gender.MALE,
    birthDate: new Date("1990-01-01"),
    role: Role.USER,
    labId: null,
    createdAt: new Date("1990-01-01"),
    updatedAt: new Date("1990-01-01"),
  };

  const mockLab = {
    id: "lab-id-1",
    name: "Acme Diagnostics",
    createdAt: new Date("1990-01-01"),
    updatedAt: new Date("1990-01-01"),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              create: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
            },
          },
        },
        {
          provide: LabsService,
          useValue: {
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    prisma = module.get<PrismaService>(PrismaService);
    labsService = module.get<LabsService>(LabsService);
  });

  describe("create", () => {
    it("should create a new user", async () => {
      const createUserDto: {
        email: string;
        password: string;
        firstName: string;
        lastName: string;
        gender: Gender;
        birthDate: Date;
      } = {
        email: "test@example.com",
        password: "password",
        firstName: "Test",
        lastName: "User",
        gender: "MALE",
        birthDate: new Date("1990-01-01"),
      };

      jest.spyOn(prisma.user, "create").mockResolvedValue(mockUser);

      const result = await service.create(createUserDto);

      expect(result).toEqual({
        id: "test-id-1",
        email: "test@example.com",
        firstName: "Test",
        lastName: "User",
        gender: "MALE",
        birthDate: new Date("1990-01-01"),
        role: "USER",
        labId: null,
        createdAt: new Date("1990-01-01"),
        updatedAt: new Date("1990-01-01"),
      });
    });
  });

  describe("attachToLab", () => {
    it("should attach a user to a lab as LAB_ADMIN", async () => {
      const attachedUser = {
        ...mockUser,
        role: Role.LAB_ADMIN,
        labId: mockLab.id,
      };

      jest.spyOn(prisma.user, "findUnique").mockResolvedValue(mockUser);
      jest.spyOn(labsService, "findOne").mockResolvedValue(mockLab);
      jest.spyOn(prisma.user, "update").mockResolvedValue(attachedUser);

      const result = await service.attachToLab(mockUser.id, mockLab.id);

      expect(labsService.findOne).toHaveBeenCalledWith(mockLab.id);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: { role: Role.LAB_ADMIN, labId: mockLab.id },
      });
      expect(result).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        firstName: mockUser.firstName,
        lastName: mockUser.lastName,
        gender: mockUser.gender,
        birthDate: mockUser.birthDate,
        role: Role.LAB_ADMIN,
        labId: mockLab.id,
        createdAt: mockUser.createdAt,
        updatedAt: mockUser.updatedAt,
      });
    });

    it("should throw NotFoundException if user does not exist", async () => {
      jest.spyOn(prisma.user, "findUnique").mockResolvedValue(null);

      await expect(
        service.attachToLab("nonexistent", mockLab.id),
      ).rejects.toThrow(NotFoundException);
      expect(labsService.findOne).not.toHaveBeenCalled();
    });

    it("should throw ConflictException if user is a SUPER_ADMIN", async () => {
      const superAdminUser = { ...mockUser, role: Role.SUPER_ADMIN };

      jest.spyOn(prisma.user, "findUnique").mockResolvedValue(superAdminUser);

      await expect(
        service.attachToLab(superAdminUser.id, mockLab.id),
      ).rejects.toThrow(ConflictException);
      expect(labsService.findOne).not.toHaveBeenCalled();
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it("should throw NotFoundException if lab does not exist", async () => {
      jest.spyOn(prisma.user, "findUnique").mockResolvedValue(mockUser);
      jest
        .spyOn(labsService, "findOne")
        .mockRejectedValue(new NotFoundException());

      await expect(
        service.attachToLab(mockUser.id, "nonexistent"),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.user.update).not.toHaveBeenCalled();
    });
  });
});
