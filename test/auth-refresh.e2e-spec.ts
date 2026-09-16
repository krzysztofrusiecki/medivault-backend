import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import request from "supertest";
import cookieParser from "cookie-parser";
import * as argon2 from "argon2";
import { createHash } from "crypto";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/infrastructure/prisma/prisma.service";
import { Role } from "@prisma/client";

function extractCookieValue(
  setCookieHeader: string[] | undefined,
  name: string,
): string | undefined {
  const cookie = setCookieHeader?.find((entry) => entry.startsWith(`${name}=`));
  return cookie?.split(";")[0].split("=")[1];
}

describe("Auth refresh tokens (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let userId: string;
  const suffix = Date.now();
  const email = `auth-refresh-user-${suffix}@example.com`;
  const password = "Password123!";

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix("api");
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();

    prisma = moduleFixture.get(PrismaService);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: await argon2.hash(password),
        firstName: "Refresh",
        lastName: "User",
        role: Role.USER,
      },
    });
    userId = user.id;
  });

  afterAll(async () => {
    await prisma.refreshToken.deleteMany({ where: { userId } });
    await prisma.user.deleteMany({ where: { id: userId } });
    await app.close();
  });

  it("sets a valid refresh_token cookie on sign-in and returns a working access token", async () => {
    const response = await request(app.getHttpServer())
      .post("/api/auth/sign-in")
      .send({ email, password })
      .expect(200);

    const setCookie = response.headers["set-cookie"] as unknown as string[];
    const refreshCookie = setCookie.find((entry) =>
      entry.startsWith("refresh_token="),
    );
    expect(refreshCookie).toBeDefined();
    expect(refreshCookie).toMatch(/HttpOnly/i);
    expect(refreshCookie).toMatch(/Path=\/api\/auth/i);
    expect(refreshCookie).toMatch(/SameSite=Lax/i);

    const accessToken = (response.body as { accessToken: string }).accessToken;
    expect(accessToken).toEqual(expect.any(String));

    await request(app.getHttpServer())
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(200);
  });

  it("rotates the refresh cookie and issues a new access token on /auth/refresh", async () => {
    const agent = request.agent(app.getHttpServer());

    const signInResponse = await agent
      .post("/api/auth/sign-in")
      .send({ email, password })
      .expect(200);
    const originalRefreshToken = extractCookieValue(
      signInResponse.headers["set-cookie"] as unknown as string[],
      "refresh_token",
    );

    const refreshResponse = await agent
      .post("/api/auth/refresh")
      .send()
      .expect(200);

    const newAccessToken = (refreshResponse.body as { accessToken: string })
      .accessToken;
    expect(newAccessToken).toEqual(expect.any(String));

    const newRefreshToken = extractCookieValue(
      refreshResponse.headers["set-cookie"] as unknown as string[],
      "refresh_token",
    );
    expect(newRefreshToken).toBeDefined();
    expect(newRefreshToken).not.toBe(originalRefreshToken);

    await agent
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${newAccessToken}`)
      .expect(200);
  });

  it("revokes the whole session family on reuse of a rotated-away token, leaving other sessions unaffected", async () => {
    const signInA = await request(app.getHttpServer())
      .post("/api/auth/sign-in")
      .send({ email, password })
      .expect(200);
    const staleRefreshToken = extractCookieValue(
      signInA.headers["set-cookie"] as unknown as string[],
      "refresh_token",
    );
    expect(staleRefreshToken).toBeDefined();

    // Rotate once, legitimately, so `staleRefreshToken` is now revoked.
    const rotateResponse = await request(app.getHttpServer())
      .post("/api/auth/refresh")
      .set("Cookie", `refresh_token=${staleRefreshToken}`)
      .expect(200);
    const rotatedRefreshToken = extractCookieValue(
      rotateResponse.headers["set-cookie"] as unknown as string[],
      "refresh_token",
    );
    expect(rotatedRefreshToken).toBeDefined();
    expect(rotatedRefreshToken).not.toBe(staleRefreshToken);

    // An independent second session for the same user.
    const signInB = await request(app.getHttpServer())
      .post("/api/auth/sign-in")
      .send({ email, password })
      .expect(200);
    const otherSessionRefreshToken = extractCookieValue(
      signInB.headers["set-cookie"] as unknown as string[],
      "refresh_token",
    );

    // Replaying the stale (already-rotated-away) token is theft-signal reuse.
    await request(app.getHttpServer())
      .post("/api/auth/refresh")
      .set("Cookie", `refresh_token=${staleRefreshToken}`)
      .expect(401);

    // The whole family — including the token from the legitimate rotation
    // above — must now be revoked too.
    await request(app.getHttpServer())
      .post("/api/auth/refresh")
      .set("Cookie", `refresh_token=${rotatedRefreshToken}`)
      .expect(401);

    // The other, independent session is untouched (different family).
    await request(app.getHttpServer())
      .post("/api/auth/refresh")
      .set("Cookie", `refresh_token=${otherSessionRefreshToken}`)
      .expect(200);
  });

  it("does not revoke the family for a merely expired token", async () => {
    const signIn = await request(app.getHttpServer())
      .post("/api/auth/sign-in")
      .send({ email, password })
      .expect(200);
    const refreshToken = extractCookieValue(
      signIn.headers["set-cookie"] as unknown as string[],
      "refresh_token",
    );
    expect(refreshToken).toBeDefined();

    const tokenHash = createHash("sha256")
      .update(refreshToken as string)
      .digest("hex");

    await prisma.refreshToken.update({
      where: { tokenHash },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    await request(app.getHttpServer())
      .post("/api/auth/refresh")
      .set("Cookie", `refresh_token=${refreshToken}`)
      .expect(401);

    const row = await prisma.refreshToken.findUnique({ where: { tokenHash } });
    expect(row?.revokedAt).toBeNull();
  });

  it("clears the cookie and revokes only the calling session's family on /auth/logout", async () => {
    const agentA = request.agent(app.getHttpServer());
    const agentB = request.agent(app.getHttpServer());

    const signInA = await agentA
      .post("/api/auth/sign-in")
      .send({ email, password })
      .expect(200);
    const accessTokenA = (signInA.body as { accessToken: string }).accessToken;

    const signInB = await agentB
      .post("/api/auth/sign-in")
      .send({ email, password })
      .expect(200);
    const refreshTokenB = extractCookieValue(
      signInB.headers["set-cookie"] as unknown as string[],
      "refresh_token",
    );

    const logoutResponse = await agentA
      .post("/api/auth/logout")
      .set("Authorization", `Bearer ${accessTokenA}`)
      .send()
      .expect(204);

    const clearedCookie = (
      logoutResponse.headers["set-cookie"] as unknown as string[]
    )?.find((entry) => entry.startsWith("refresh_token="));
    expect(clearedCookie).toBeDefined();
    expect(clearedCookie).toMatch(/refresh_token=;/);

    await agentA.post("/api/auth/refresh").send().expect(401);

    // The other session, started independently, is untouched.
    await request(app.getHttpServer())
      .post("/api/auth/refresh")
      .set("Cookie", `refresh_token=${refreshTokenB}`)
      .expect(200);
  });

  it("fails cleanly when /auth/refresh is called with no cookie", async () => {
    await request(app.getHttpServer())
      .post("/api/auth/refresh")
      .send()
      .expect(401);
  });

  it("treats /auth/logout with no cookie as an idempotent success", async () => {
    const signIn = await request(app.getHttpServer())
      .post("/api/auth/sign-in")
      .send({ email, password })
      .expect(200);
    const accessToken = (signIn.body as { accessToken: string }).accessToken;

    await request(app.getHttpServer())
      .post("/api/auth/logout")
      .set("Authorization", `Bearer ${accessToken}`)
      .send()
      .expect(204);
  });

  it("rejects /auth/logout with no access token", async () => {
    await request(app.getHttpServer())
      .post("/api/auth/logout")
      .send()
      .expect(401);
  });
});
