import { z } from "zod";

export const createUserDtoSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  gender: z.enum(["MALE", "FEMALE"]).optional(),
  birthDate: z.iso.datetime().optional(),
});

export type CreateUserDto = z.infer<typeof createUserDtoSchema>;
