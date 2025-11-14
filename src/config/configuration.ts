import { envSchema, Environment } from "./schema";

export function validateEnv(config: Record<string, unknown>): Environment {
  const parsed = envSchema.safeParse(config);

  if (!parsed.success) {
    const errors = parsed.error.issues
      .map((issue) => `  ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`Environment validation failed:\n${errors}`);
  }

  return parsed.data;
}
