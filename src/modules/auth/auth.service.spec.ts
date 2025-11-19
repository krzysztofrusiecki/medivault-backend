import { Test, TestingModule } from "@nestjs/testing";
import { AuthService } from "./auth.service";
import { UsersService } from "../users/users.service";
import { JwtService } from "@nestjs/jwt";
import {
  ConflictException,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { Role } from "@prisma/client";

describe("AuthService", () => {
  let service: AuthService;
  let usersService: UsersService;
  let jwtService: JwtService;

  const mockUserWithPasswordHash = {
    id: "user-123",
    email: "test@example.com",
    firstName: "Test",
    lastName: "User",
    passwordHash: "$argon2id$v=19$m=65536,t=3,p=4$test$hash",
    role: Role.USER,
    gender: null,
    birthDate: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
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

      // User not found
      jest.spyOn(usersService, "findByEmail").mockResolvedValue(null);
      // User created
      jest.spyOn(usersService, "create").mockResolvedValue({
        id: "new-user-id",
        email: signUpDto.email,
        firstName: signUpDto.firstName,
        lastName: signUpDto.lastName,
        role: Role.USER,
        gender: null,
        birthDate: null,
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
    it("should authenticate user and return auth response", async () => {
      const signInDto = {
        email: mockUserWithPasswordHash.email,
        password: "password123",
      };

      jest
        .spyOn(usersService, "findByEmail")
        .mockResolvedValue(mockUserWithPasswordHash);
      jest.spyOn(usersService, "verifyPassword").mockResolvedValue(true);
      jest.spyOn(jwtService, "sign").mockReturnValue("mock-token");

      const result = await service.signIn(signInDto);

      expect(result).toEqual({
        accessToken: "mock-token",
      });
      expect(usersService.findByEmail).toHaveBeenCalledWith(signInDto.email);
      expect(usersService.verifyPassword).toHaveBeenCalledWith(
        signInDto.password,
        mockUserWithPasswordHash.passwordHash,
      );
      expect(jwtService.sign).toHaveBeenCalled();
    });

    it("should throw BadRequestException for invalid credentials", async () => {
      const signInDto = {
        email: "nonexistent@example.com",
        password: "wrongpassword",
      };

      jest.spyOn(usersService, "findByEmail").mockResolvedValue(null);

      await expect(service.signIn(signInDto)).rejects.toThrow(
        BadRequestException,
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

      const result = await (
        service as unknown as {
          getUserDetails: (
            id: string,
          ) => Promise<typeof mockUserWithPasswordHash>;
        }
      ).getUserDetails(userId);

      expect(result).toEqual(mockUserWithPasswordHash);
      expect(usersService.findById).toHaveBeenCalledWith(userId);
    });

    it("should throw NotFoundException if user not found", async () => {
      const userId = "nonexistent-id";

      jest.spyOn(usersService, "findById").mockResolvedValue(null);

      await expect(
        (
          service as unknown as {
            getUserDetails: (
              id: string,
            ) => Promise<typeof mockUserWithPasswordHash>;
          }
        ).getUserDetails(userId),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
