import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import request from "supertest";
import * as argon2 from "argon2";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/infrastructure/prisma/prisma.service";
import { AnalyteValueType, Role } from "@prisma/client";

describe("Reference Ranges (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let superAdminToken: string;
  let userToken: string;
  let labAdminToken: string;

  let superAdminId: string;
  let userId: string;
  let labAdminId: string;
  let labId: string;

  let numericAnalyteId: string;
  let textAnalyteId: string;

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
        email: `ref-ranges-super-admin-${suffix}@example.com`,
        passwordHash,
        firstName: "Super",
        lastName: "Admin",
        role: Role.SUPER_ADMIN,
      },
    });
    superAdminId = superAdmin.id;

    const user = await prisma.user.create({
      data: {
        email: `ref-ranges-user-${suffix}@example.com`,
        passwordHash,
        firstName: "Regular",
        lastName: "User",
        role: Role.USER,
      },
    });
    userId = user.id;

    const lab = await prisma.lab.create({
      data: { name: `Reference Ranges Lab ${suffix}` },
    });
    labId = lab.id;

    const labAdmin = await prisma.user.create({
      data: {
        email: `ref-ranges-lab-admin-${suffix}@example.com`,
        passwordHash,
        firstName: "Lab",
        lastName: "Admin",
        role: Role.LAB_ADMIN,
        labId: lab.id,
      },
    });
    labAdminId = labAdmin.id;

    const numericAnalyte = await prisma.analyte.create({
      data: {
        slug: `ref-ranges-numeric-${suffix}`,
        name: `Reference Ranges Numeric ${suffix}`,
        valueType: AnalyteValueType.NUMERIC,
      },
    });
    numericAnalyteId = numericAnalyte.id;

    const textAnalyte = await prisma.analyte.create({
      data: {
        slug: `ref-ranges-text-${suffix}`,
        name: `Reference Ranges Text ${suffix}`,
        valueType: AnalyteValueType.TEXT,
      },
    });
    textAnalyteId = textAnalyte.id;

    const superAdminSignIn = await request(app.getHttpServer())
      .post("/api/auth/sign-in")
      .send({ email: superAdmin.email, password });
    superAdminToken = (superAdminSignIn.body as { accessToken: string })
      .accessToken;

    const userSignIn = await request(app.getHttpServer())
      .post("/api/auth/sign-in")
      .send({ email: user.email, password });
    userToken = (userSignIn.body as { accessToken: string }).accessToken;

    const labAdminSignIn = await request(app.getHttpServer())
      .post("/api/auth/sign-in")
      .send({ email: labAdmin.email, password });
    labAdminToken = (labAdminSignIn.body as { accessToken: string })
      .accessToken;
  });

  afterAll(async () => {
    await prisma.referenceRange.deleteMany({
      where: { analyteId: { in: [numericAnalyteId, textAnalyteId] } },
    });
    await prisma.analyte.deleteMany({
      where: { id: { in: [numericAnalyteId, textAnalyteId] } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [superAdminId, userId, labAdminId] } },
    });
    await prisma.lab.deleteMany({ where: { id: labId } });
    await app.close();
  });

  describe("POST /analytes/:analyteId/reference-ranges", () => {
    it("allows SUPER_ADMIN to create a band", async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/analytes/${numericAnalyteId}/reference-ranges`)
        .set("Authorization", `Bearer ${superAdminToken}`)
        .send({ label: "Sufficient", minValue: 30, maxValue: 100 })
        .expect(201);

      expect(response.body).toMatchObject({
        label: "Sufficient",
        minValue: 30,
        maxValue: 100,
      });
      expect((response.body as { id: string }).id).toBeDefined();
    });

    it("rejects USER", async () => {
      await request(app.getHttpServer())
        .post(`/api/analytes/${numericAnalyteId}/reference-ranges`)
        .set("Authorization", `Bearer ${userToken}`)
        .send({ label: "Sufficient", minValue: 30 })
        .expect(403);
    });

    it("rejects LAB_ADMIN", async () => {
      await request(app.getHttpServer())
        .post(`/api/analytes/${numericAnalyteId}/reference-ranges`)
        .set("Authorization", `Bearer ${labAdminToken}`)
        .send({ label: "Sufficient", minValue: 30 })
        .expect(403);
    });

    it("rejects unauthenticated requests", async () => {
      await request(app.getHttpServer())
        .post(`/api/analytes/${numericAnalyteId}/reference-ranges`)
        .send({ label: "Sufficient", minValue: 30 })
        .expect(401);
    });

    it("returns 404 for a non-existent analyte", async () => {
      await request(app.getHttpServer())
        .post("/api/analytes/nonexistent-id/reference-ranges")
        .set("Authorization", `Bearer ${superAdminToken}`)
        .send({ label: "Sufficient", minValue: 30 })
        .expect(404);
    });

    it("returns 400 for a TEXT analyte", async () => {
      await request(app.getHttpServer())
        .post(`/api/analytes/${textAnalyteId}/reference-ranges`)
        .set("Authorization", `Bearer ${superAdminToken}`)
        .send({ label: "Sufficient", minValue: 30 })
        .expect(400);
    });

    it("returns 400 when neither minValue nor maxValue is provided", async () => {
      await request(app.getHttpServer())
        .post(`/api/analytes/${numericAnalyteId}/reference-ranges`)
        .set("Authorization", `Bearer ${superAdminToken}`)
        .send({ label: "Sufficient" })
        .expect(400);
    });
  });

  describe("GET /analytes/:analyteId/reference-ranges", () => {
    let rangeId: string;

    beforeAll(async () => {
      const range = await prisma.referenceRange.create({
        data: {
          analyteId: numericAnalyteId,
          label: "Deficient",
          maxValue: 20,
        },
      });
      rangeId = range.id;
    });

    it("lists bands for SUPER_ADMIN", async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/analytes/${numericAnalyteId}/reference-ranges`)
        .set("Authorization", `Bearer ${superAdminToken}`)
        .expect(200);

      const ranges = response.body as { id: string }[];
      expect(Array.isArray(ranges)).toBe(true);
      expect(ranges.some((range) => range.id === rangeId)).toBe(true);
    });

    it("lists bands for USER", async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/analytes/${numericAnalyteId}/reference-ranges`)
        .set("Authorization", `Bearer ${userToken}`)
        .expect(200);

      const ranges = response.body as { id: string }[];
      expect(ranges.some((range) => range.id === rangeId)).toBe(true);
    });

    it("rejects LAB_ADMIN", async () => {
      await request(app.getHttpServer())
        .get(`/api/analytes/${numericAnalyteId}/reference-ranges`)
        .set("Authorization", `Bearer ${labAdminToken}`)
        .expect(403);
    });

    it("rejects unauthenticated requests", async () => {
      await request(app.getHttpServer())
        .get(`/api/analytes/${numericAnalyteId}/reference-ranges`)
        .expect(401);
    });

    it("returns 404 for a non-existent analyte", async () => {
      await request(app.getHttpServer())
        .get("/api/analytes/nonexistent-id/reference-ranges")
        .set("Authorization", `Bearer ${superAdminToken}`)
        .expect(404);
    });
  });

  describe("PATCH /analytes/:analyteId/reference-ranges/:rangeId", () => {
    let rangeId: string;

    beforeAll(async () => {
      const range = await prisma.referenceRange.create({
        data: {
          analyteId: numericAnalyteId,
          label: "Insufficient",
          minValue: 20,
          maxValue: 30,
        },
      });
      rangeId = range.id;
    });

    it("allows SUPER_ADMIN to update a band", async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/analytes/${numericAnalyteId}/reference-ranges/${rangeId}`)
        .set("Authorization", `Bearer ${superAdminToken}`)
        .send({ label: "Borderline" })
        .expect(200);

      expect(response.body).toMatchObject({ id: rangeId, label: "Borderline" });
    });

    it("rejects USER", async () => {
      await request(app.getHttpServer())
        .patch(`/api/analytes/${numericAnalyteId}/reference-ranges/${rangeId}`)
        .set("Authorization", `Bearer ${userToken}`)
        .send({ label: "Nope" })
        .expect(403);
    });

    it("returns 404 for a non-existent range", async () => {
      await request(app.getHttpServer())
        .patch(
          `/api/analytes/${numericAnalyteId}/reference-ranges/nonexistent-id`,
        )
        .set("Authorization", `Bearer ${superAdminToken}`)
        .send({ label: "Nope" })
        .expect(404);
    });

    it("returns 404 when the range belongs to a different analyte", async () => {
      await request(app.getHttpServer())
        .patch(`/api/analytes/${textAnalyteId}/reference-ranges/${rangeId}`)
        .set("Authorization", `Bearer ${superAdminToken}`)
        .send({ label: "Nope" })
        .expect(404);
    });
  });

  describe("DELETE /analytes/:analyteId/reference-ranges/:rangeId", () => {
    let rangeId: string;

    beforeEach(async () => {
      const range = await prisma.referenceRange.create({
        data: {
          analyteId: numericAnalyteId,
          label: "Toxic",
          minValue: 150,
        },
      });
      rangeId = range.id;
    });

    it("allows SUPER_ADMIN to delete a band", async () => {
      await request(app.getHttpServer())
        .delete(`/api/analytes/${numericAnalyteId}/reference-ranges/${rangeId}`)
        .set("Authorization", `Bearer ${superAdminToken}`)
        .expect(204);

      const deleted = await prisma.referenceRange.findUnique({
        where: { id: rangeId },
      });
      expect(deleted).toBeNull();
    });

    it("rejects USER", async () => {
      await request(app.getHttpServer())
        .delete(`/api/analytes/${numericAnalyteId}/reference-ranges/${rangeId}`)
        .set("Authorization", `Bearer ${userToken}`)
        .expect(403);
    });

    it("returns 404 for a non-existent range", async () => {
      await request(app.getHttpServer())
        .delete(
          `/api/analytes/${numericAnalyteId}/reference-ranges/nonexistent-id`,
        )
        .set("Authorization", `Bearer ${superAdminToken}`)
        .expect(404);
    });

    it("returns 404 when the range belongs to a different analyte", async () => {
      await request(app.getHttpServer())
        .delete(`/api/analytes/${textAnalyteId}/reference-ranges/${rangeId}`)
        .set("Authorization", `Bearer ${superAdminToken}`)
        .expect(404);
    });
  });
});
