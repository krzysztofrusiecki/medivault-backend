import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import request from "supertest";
import * as argon2 from "argon2";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/infrastructure/prisma/prisma.service";
import { Role } from "@prisma/client";

describe("Labs & Lab-Admin attachment (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let superAdminToken: string;
  let userToken: string;
  let superAdminId: string;
  let regularUserId: string;
  let targetUserId: string;

  const suffix = Date.now();
  const password = "Password123!";

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix("api");
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();

    prisma = moduleFixture.get(PrismaService);

    const passwordHash = await argon2.hash(password);

    const superAdmin = await prisma.user.create({
      data: {
        email: `super-admin-${suffix}@example.com`,
        passwordHash,
        firstName: "Super",
        lastName: "Admin",
        role: Role.SUPER_ADMIN,
      },
    });
    superAdminId = superAdmin.id;

    const regularUser = await prisma.user.create({
      data: {
        email: `user-${suffix}@example.com`,
        passwordHash,
        firstName: "Regular",
        lastName: "User",
        role: Role.USER,
      },
    });
    regularUserId = regularUser.id;

    const targetUser = await prisma.user.create({
      data: {
        email: `target-${suffix}@example.com`,
        passwordHash,
        firstName: "Target",
        lastName: "User",
        role: Role.USER,
      },
    });
    targetUserId = targetUser.id;

    const superAdminSignIn = await request(app.getHttpServer())
      .post("/api/auth/sign-in")
      .send({ email: superAdmin.email, password });
    superAdminToken = (superAdminSignIn.body as { accessToken: string })
      .accessToken;

    const userSignIn = await request(app.getHttpServer())
      .post("/api/auth/sign-in")
      .send({ email: regularUser.email, password });
    userToken = (userSignIn.body as { accessToken: string }).accessToken;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: { id: { in: [superAdminId, regularUserId, targetUserId] } },
    });
    await prisma.lab.deleteMany({
      where: { name: { contains: `${suffix}` } },
    });
    await app.close();
  });

  describe("POST /labs", () => {
    it("allows SUPER_ADMIN to create a lab", async () => {
      const response = await request(app.getHttpServer())
        .post("/api/labs")
        .set("Authorization", `Bearer ${superAdminToken}`)
        .send({ name: `E2E Test Lab ${suffix}` })
        .expect(201);

      expect(response.body).toMatchObject({
        name: `E2E Test Lab ${suffix}`,
      });
      expect((response.body as { id: string }).id).toBeDefined();
    });

    it("rejects non-SUPER_ADMIN users", async () => {
      await request(app.getHttpServer())
        .post("/api/labs")
        .set("Authorization", `Bearer ${userToken}`)
        .send({ name: `E2E Test Lab Rejected ${suffix}` })
        .expect(403);
    });

    it("rejects unauthenticated requests", async () => {
      await request(app.getHttpServer())
        .post("/api/labs")
        .send({ name: `E2E Test Lab Unauth ${suffix}` })
        .expect(401);
    });
  });

  describe("GET /labs and GET /labs/:id", () => {
    let labId: string;

    beforeAll(async () => {
      const lab = await prisma.lab.create({
        data: { name: `E2E Test Lab List ${suffix}` },
      });
      labId = lab.id;
    });

    it("lists labs for SUPER_ADMIN", async () => {
      const response = await request(app.getHttpServer())
        .get("/api/labs")
        .set("Authorization", `Bearer ${superAdminToken}`)
        .expect(200);

      const labs = response.body as { id: string }[];
      expect(Array.isArray(labs)).toBe(true);
      expect(labs.some((lab) => lab.id === labId)).toBe(true);
    });

    it("fetches a lab by id for SUPER_ADMIN", async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/labs/${labId}`)
        .set("Authorization", `Bearer ${superAdminToken}`)
        .expect(200);

      expect((response.body as { id: string }).id).toBe(labId);
    });

    it("returns 404 for a non-existent lab", async () => {
      await request(app.getHttpServer())
        .get("/api/labs/nonexistent-id")
        .set("Authorization", `Bearer ${superAdminToken}`)
        .expect(404);
    });

    it("rejects non-SUPER_ADMIN users listing labs", async () => {
      await request(app.getHttpServer())
        .get("/api/labs")
        .set("Authorization", `Bearer ${userToken}`)
        .expect(403);
    });
  });

  describe("POST /users/:id/actions/assign-lab", () => {
    let labId: string;

    beforeAll(async () => {
      const lab = await prisma.lab.create({
        data: { name: `E2E Test Lab Attach ${suffix}` },
      });
      labId = lab.id;
    });

    it("allows SUPER_ADMIN to attach a user to a lab as LAB_ADMIN", async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/users/${targetUserId}/actions/assign-lab`)
        .set("Authorization", `Bearer ${superAdminToken}`)
        .send({ labId })
        .expect(200);

      expect(response.body).toMatchObject({
        id: targetUserId,
        role: "LAB_ADMIN",
        labId,
      });
      expect(
        (response.body as { passwordHash?: string }).passwordHash,
      ).toBeUndefined();

      const updatedUser = await prisma.user.findUnique({
        where: { id: targetUserId },
      });
      expect(updatedUser?.role).toBe("LAB_ADMIN");
      expect(updatedUser?.labId).toBe(labId);
    });

    it("rejects non-SUPER_ADMIN users", async () => {
      await request(app.getHttpServer())
        .post(`/api/users/${regularUserId}/actions/assign-lab`)
        .set("Authorization", `Bearer ${userToken}`)
        .send({ labId })
        .expect(403);
    });

    it("rejects unauthenticated requests", async () => {
      await request(app.getHttpServer())
        .post(`/api/users/${regularUserId}/actions/assign-lab`)
        .send({ labId })
        .expect(401);
    });

    it("returns 404 when the user does not exist", async () => {
      await request(app.getHttpServer())
        .post("/api/users/nonexistent-id/actions/assign-lab")
        .set("Authorization", `Bearer ${superAdminToken}`)
        .send({ labId })
        .expect(404);
    });

    it("returns 404 when the lab does not exist", async () => {
      await request(app.getHttpServer())
        .post(`/api/users/${regularUserId}/actions/assign-lab`)
        .set("Authorization", `Bearer ${superAdminToken}`)
        .send({ labId: "nonexistent-lab-id" })
        .expect(404);
    });

    it("returns 409 when attaching an existing SUPER_ADMIN", async () => {
      await request(app.getHttpServer())
        .post(`/api/users/${superAdminId}/actions/assign-lab`)
        .set("Authorization", `Bearer ${superAdminToken}`)
        .send({ labId })
        .expect(409);
    });
  });
});
