import { CookieOptions } from "express";
import { ConfigService } from "@nestjs/config";
import { Environment } from "src/config/schema";

// Shared across sign-in, refresh, and logout so the three call sites can't
// drift out of sync with each other.
export const REFRESH_TOKEN_COOKIE_NAME = "refresh_token";

export function getRefreshTokenCookieOptions(
  configService: ConfigService<Environment>,
): CookieOptions {
  return {
    httpOnly: true,
    secure: configService.get("NODE_ENV") === "production",
    sameSite: "lax",
    path: "/api/auth",
  };
}
