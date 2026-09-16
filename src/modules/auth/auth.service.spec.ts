import { Test, TestingModule } from "@nestjs/testing";
import { AuthService } from "./auth.service";
import { UsersService } from "../users/users.service";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "@/infrastructure/prisma";
import {
  ConflictException,
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { Role } from "@prisma/client";
import { createHash } from "crypto";

describe("AuthService", () => {
  let service: AuthService;
  let usersService: UsersService;
  let jwtService: JwtService;
  let prisma: {
    refreshToken: {
      findUnique: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
      create: jest.Mock;
    };
  };

  const mockUserWithPasswordHash = {
    id: "user-123",
    email: "test@example.com",
    firstName: "Test",
    lastName: "User",
    passwordHash: "$argon2id$v=19$m=65536,t=3,p=4$test$hash",
    role: Role.USER,
    gender: null,
    birthDate: null,
    labId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const configValues: Record<string, string> = {
    ACCESS_TOKEN_SECRET: "access-token-secret-min-32-characters-long",
    ACCESS_TOKEN_EXPIRATION: "15m",
    REFRESH_TOKEN_EXPIRATION: "30d",
  };

  beforeEach(async () => {
    prisma = {
      refreshToken: {
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        create: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: {
            create: jest.fn(),
            findByEmail: jest.fn(),
            findById: jest.fn(),
            verifyPassword: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => configValues[key]),
          },
        },
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get<UsersService>(UsersService);
    jwtService = module.get<JwtService>(JwtService);
  });

  describe("signUp", () => {
    it("should create a new user", async () => {
      const signUpDto = {
        email: "newuser@example.com",
        password: "Password123",
        confirmPassword: "Password123",
        firstName: "New",
        lastName: "User",
        gender: undefined,
        birthDate: new Date("1990-01-01"),
      };

      jest.spyOn(usersService, "findByEmail").mockResolvedValue(null);
      jest.spyOn(usersService, "create").mockResolvedValue({
        id: "new-user-id",
        email: signUpDto.email,
        firstName: signUpDto.firstName,
        lastName: signUpDto.lastName,
        role: Role.USER,
        gender: null,
        birthDate: null,
        labId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await service.signUp(signUpDto);

      expect(usersService.findByEmail).toHaveBeenCalledWith(signUpDto.email);
      expect(usersService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: signUpDto.email,
          password: signUpDto.password,
          firstName: signUpDto.firstName,
          lastName: signUpDto.lastName,
        }),
      );
    });

    it("should throw ConflictException if email already exists", async () => {
      const signUpDto = {
        email: "existing@example.com",
        password: "Password123",
        confirmPassword: "Password123",
        firstName: "Test",
        lastName: "User",
        birthDate: new Date("1990-01-01"),
      };

      jest
        .spyOn(usersService, "findByEmail")
        .mockResolvedValue(mockUserWithPasswordHash);

      await expect(service.signUp(signUpDto)).rejects.toThrow(
        ConflictException,
      );
      expect(usersService.create).not.toHaveBeenCalled();
    });

    it("should throw BadRequestException if passwords don't match", async () => {
      const signUpDto = {
        email: "test@example.com",
        password: "Password123",
        confirmPassword: "Password456",
        firstName: "Test",
        lastName: "User",
        birthDate: new Date("1990-01-01"),
      };

      jest.spyOn(usersService, "findByEmail").mockResolvedValue(null);

      await expect(service.signUp(signUpDto)).rejects.toThrow(
        BadRequestException,
      );
      expect(usersService.create).not.toHaveBeenCalled();
    });
  });

  describe("signIn", () => {
    it("authenticates the user and issues a token pair backed by a new refresh token row", async () => {
      const signInDto = {
        email: mockUserWithPasswordHash.email,
        password: "password123",
      };

      jest
        .spyOn(usersService, "findByEmail")
        .mockResolvedValue(mockUserWithPasswordHash);
      jest.spyOn(usersService, "verifyPassword").mockResolvedValue(true);
      jest.spyOn(jwtService, "sign").mockReturnValue("mock-access-token");
      prisma.refreshToken.create.mockResolvedValue({});

      const result = await service.signIn(signInDto);

      expect(result.accessToken).toBe("mock-access-token");
      expect(typeof result.refreshToken).toBe("string");
      expect(result.refreshToken.length).toBeGreaterThan(0);
      expect(result.refreshTokenExpiresInMs).toBeGreaterThan(0);

      expect(prisma.refreshToken.create).toHaveBeenCalledTimes(1);
      const createArgs = prisma.refreshToken.create.mock.calls[0][0];
      expect(createArgs.data.userId).toBe(mockUserWithPasswordHash.id);
      expect(createArgs.data.tokenHash).toBe(
        createHash("sha256").update(result.refreshToken).digest("hex"),
      );
      expect(typeof createArgs.data.familyId).toBe("string");
    });

    it("throws BadRequestException for invalid credentials", async () => {
      const signInDto = {
        email: "nonexistent@example.com",
        password: "wrongpassword",
      };

      jest.spyOn(usersService, "findByEmail").mockResolvedValue(null);

      await expect(service.signIn(signInDto)).rejects.toThrow(
        BadRequestException,
      );
      expect(prisma.refreshToken.create).not.toHaveBeenCalled();
    });
  });

  describe("refresh", () => {
    it("throws UnauthorizedException when the token is not found", async () => {
      prisma.refreshToken.findUnique.mockResolvedValue(null);

      await expect(service.refresh("unknown-token")).rejects.toThrow(
        UnauthorizedException,
      );
      expect(prisma.refreshToken.updateMany).not.toHaveBeenCalled();
    });

    it("revokes the whole family and throws when a rotated-away token is reused", async () => {
      prisma.refreshToken.findUnique.mockResolvedValue({
        id: "row-1",
        familyId: "family-1",
        userId: mockUserWithPasswordHash.id,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60),
        revokedAt: new Date(),
      });

      await expect(service.refresh("reused-token")).rejects.toThrow(
        UnauthorizedException,
      );

      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ familyId: "family-1" }),
          data: expect.objectContaining({ revokedAt: expect.any(Date) }),
        }),
      );
      expect(usersService.findById).not.toHaveBeenCalled();
    });

    it("throws without revoking the family when the token is merely expired", async () => {
      prisma.refreshToken.findUnique.mockResolvedValue({
        id: "row-1",
        familyId: "family-1",
        userId: mockUserWithPasswordHash.id,
        expiresAt: new Date(Date.now() - 1000),
        revokedAt: null,
      });

      await expect(service.refresh("expired-token")).rejects.toThrow(
        UnauthorizedException,
      );

      expect(prisma.refreshToken.updateMany).not.toHaveBeenCalled();
      expect(prisma.refreshToken.update).not.toHaveBeenCalled();
    });

    it("rotates a valid token, keeping the same familyId", async () => {
      prisma.refreshToken.findUnique.mockResolvedValue({
        id: "row-1",
        familyId: "family-1",
        userId: mockUserWithPasswordHash.id,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60),
        revokedAt: null,
      });
      jest
        .spyOn(usersService, "findById")
        .mockResolvedValue(mockUserWithPasswordHash);
      jest.spyOn(jwtService, "sign").mockReturnValue("new-access-token");
      prisma.refreshToken.create.mockResolvedValue({});

      const result = await service.refresh("valid-token");

      expect(prisma.refreshToken.update).toHaveBeenCalledWith({
        where: { id: "row-1" },
        data: { revokedAt: expect.any(Date) },
      });
      expect(prisma.refreshToken.create).toHaveBeenCalledTimes(1);
      const createArgs = prisma.refreshToken.create.mock.calls[0][0];
      expect(createArgs.data.familyId).toBe("family-1");
      expect(result.accessToken).toBe("new-access-token");
    });
  });

  describe("logout", () => {
    it("is a no-op when no refresh token is presented", async () => {
      await service.logout(undefined, mockUserWithPasswordHash.id);

      expect(prisma.refreshToken.findUnique).not.toHaveBeenCalled();
      expect(prisma.refreshToken.updateMany).not.toHaveBeenCalled();
    });

    it("is a no-op when the token is not found", async () => {
      prisma.refreshToken.findUnique.mockResolvedValue(null);

      await service.logout("unknown-token", mockUserWithPasswordHash.id);

      expect(prisma.refreshToken.updateMany).not.toHaveBeenCalled();
    });

    it("is a no-op when the token belongs to a different user", async () => {
      prisma.refreshToken.findUnique.mockResolvedValue({
        id: "row-1",
        familyId: "family-1",
        userId: "someone-else",
      });

      await service.logout("some-token", mockUserWithPasswordHash.id);

      expect(prisma.refreshToken.updateMany).not.toHaveBeenCalled();
    });

    it("revokes the whole family for the calling user's token", async () => {
      prisma.refreshToken.findUnique.mockResolvedValue({
        id: "row-1",
        familyId: "family-1",
        userId: mockUserWithPasswordHash.id,
      });

      await service.logout("some-token", mockUserWithPasswordHash.id);

      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ familyId: "family-1" }),
          data: expect.objectContaining({ revokedAt: expect.any(Date) }),
        }),
      );
    });
  });

  describe("validateUser", () => {
    it("should return user data for valid credentials", async () => {
      const email = mockUserWithPasswordHash.email;
      const password = "password123";

      jest
        .spyOn(usersService, "findByEmail")
        .mockResolvedValue(mockUserWithPasswordHash);
      jest.spyOn(usersService, "verifyPassword").mockResolvedValue(true);

      const result = await service.validateUser(email, password);

      expect(result).toEqual({
        id: mockUserWithPasswordHash.id,
        email: mockUserWithPasswordHash.email,
        role: mockUserWithPasswordHash.role,
      });
      expect(usersService.findByEmail).toHaveBeenCalledWith(email);
      expect(usersService.verifyPassword).toHaveBeenCalledWith(
        password,
        mockUserWithPasswordHash.passwordHash,
      );
    });

    it("should return null for non-existent user", async () => {
      const email = "nonexistent@example.com";
      const password = "password123";

      jest.spyOn(usersService, "findByEmail").mockResolvedValue(null);

      const result = await service.validateUser(email, password);

      expect(result).toBeNull();
      expect(usersService.verifyPassword).not.toHaveBeenCalled();
    });

    it("should return null for invalid password", async () => {
      const email = mockUserWithPasswordHash.email;
      const password = "wrongpassword";

      jest
        .spyOn(usersService, "findByEmail")
        .mockResolvedValue(mockUserWithPasswordHash);
      jest.spyOn(usersService, "verifyPassword").mockResolvedValue(false);

      const result = await service.validateUser(email, password);

      expect(result).toBeNull();
      expect(usersService.verifyPassword).toHaveBeenCalledWith(
        password,
        mockUserWithPasswordHash.passwordHash,
      );
    });
  });

  describe("getUserDetails", () => {
    it("should return user details by id", async () => {
      const userId = mockUserWithPasswordHash.id;

      jest
        .spyOn(usersService, "findById")
        .mockResolvedValue(mockUserWithPasswordHash);

      const result = await service.getUserDetails(userId);

      expect(result).toEqual(mockUserWithPasswordHash);
      expect(usersService.findById).toHaveBeenCalledWith(userId);
    });

    it("should throw NotFoundException if user not found", async () => {
      const userId = "nonexistent-id";

      jest.spyOn(usersService, "findById").mockResolvedValue(null);

      await expect(service.getUserDetails(userId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
