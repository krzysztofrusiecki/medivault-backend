import { Test, TestingModule } from "@nestjs/testing";
import { UsersService } from "./users.service";
import { PrismaService } from "../../infrastructure/prisma/prisma.service";
import { Gender, Role } from "@prisma/client";

describe("UsersService", () => {
  let service: UsersService;
  let prisma: PrismaService;

  const mockUser = {
    id: "test-id-1",
    email: "test@example.com",
    passwordHash: "hashed-password",
    firstName: "Test",
    lastName: "User",
    gender: Gender.MALE,
    birthDate: new Date("1990-01-01"),
    role: Role.USER,
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
            },
          },
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    prisma = module.get<PrismaService>(PrismaService);
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
        createdAt: new Date("1990-01-01"),
        updatedAt: new Date("1990-01-01"),
      });
    });
  });
});
