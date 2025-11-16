import { User } from "@prisma/client";

/**
 * User response DTO - excludes sensitive fields like passwordHash
 * Used for API responses
 */
export type UserResponseDto = Omit<User, "passwordHash">;
