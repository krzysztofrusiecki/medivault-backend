import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import request from "supertest";
import * as argon2 from "argon2";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/infrastructure/prisma/prisma.service";
import { AnalyteValueType, Role, TestBatchStatus } from "@prisma/client";

describe("Test Results (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let userToken: string;
  let userId: string;
  let otherUserToken: string;
  let otherUserId: string;

  let numericAnalyteId: string;
  let numericUnitId: string;
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

    const user = await prisma.user.create({
      data: {
        email: `test-results-user-${suffix}@example.com`,
        passwordHash,
        firstName: "Result",
        lastName: "Owner",
        role: Role.USER,
      },
    });
    userId = user.id;

    const otherUser = await prisma.user.create({
      data: {
        email: `test-results-other-${suffix}@example.com`,
        passwordHash,
        firstName: "Other",
        lastName: "User",
        role: Role.USER,
      },
    });
    otherUserId = otherUser.id;

    const numericAnalyte = await prisma.analyte.create({
      data: {
        slug: `RESULT_NUM_${suffix}`,
        name: `Result Numeric ${suffix}`,
        valueType: AnalyteValueType.NUMERIC,
      },
    });
    numericAnalyteId = numericAnalyte.id;

    const numericUnit = await prisma.analyteUnit.create({
      data: {
        analyteId: numericAnalyteId,
        unit: "unit",
        isCanonical: true,
        factorToCanonical: 1,
        offset: 0,
      },
    });
    numericUnitId = numericUnit.id;

    const textAnalyte = await prisma.analyte.create({
      data: {
        slug: `RESULT_TXT_${suffix}`,
        name: `Result Text ${suffix}`,
        valueType: AnalyteValueType.TEXT,
      },
    });
    textAnalyteId = textAnalyte.id;

    const userSignIn = await request(app.getHttpServer())
      .post("/api/auth/sign-in")
      .send({ email: user.email, password });
    userToken = (userSignIn.body as { accessToken: string }).accessToken;

    const otherUserSignIn = await request(app.getHttpServer())
      .post("/api/auth/sign-in")
      .send({ email: otherUser.email, password });
    otherUserToken = (otherUserSignIn.body as { accessToken: string })
      .accessToken;
  });

  afterAll(async () => {
    await prisma.testResult.deleteMany({
      where: { batch: { userId: { in: [userId, otherUserId] } } },
    });
    await prisma.testBatch.deleteMany({
      where: { userId: { in: [userId, otherUserId] } },
    });
    await prisma.analyteUnit.deleteMany({
      where: { analyteId: numericAnalyteId },
    });
    await prisma.analyte.deleteMany({
      where: { id: { in: [numericAnalyteId, textAnalyteId] } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [userId, otherUserId] } },
    });
    await app.close();
  });

  describe("POST /test-results/numeric", () => {
    it("auto-creates a one-off self-reported batch when no batchId is given", async () => {
      const response = await request(app.getHttpServer())
        .post("/api/test-results/numeric")
        .set("Authorization", `Bearer ${userToken}`)
        .send({
          analyteId: numericAnalyteId,
          analyteUnitId: numericUnitId,
          sampleDate: "2025-03-10",
          value: 42,
        })
        .expect(201);

      const body = response.body as {
        batchId: string;
        valueNumeric: number;
        sampleDate: string;
      };
      expect(body.valueNumeric).toBe(42);
      expect(body.sampleDate).toBe("2025-03-10");
      expect(body.batchId).toBeDefined();

      const batch = await prisma.testBatch.findUnique({
        where: { id: body.batchId },
      });
      expect(batch).toMatchObject({
        userId,
        labLabel: "Quick entry",
        status: TestBatchStatus.ACCEPTED,
      });
    });

    it("attaches to an existing batch and ignores the request's sampleDate", async () => {
      const batch = await prisma.testBatch.create({
        data: {
          userId,
          labLabel: `Existing Batch ${suffix}`,
          sampleDate: new Date("2024-01-01"),
          status: TestBatchStatus.ACCEPTED,
        },
      });

      const response = await request(app.getHttpServer())
        .post("/api/test-results/numeric")
        .set("Authorization", `Bearer ${userToken}`)
        .send({
          analyteId: numericAnalyteId,
          analyteUnitId: numericUnitId,
          batchId: batch.id,
          sampleDate: "2099-01-01",
          value: 7,
        })
        .expect(201);

      const body = response.body as { batchId: string; sampleDate: string };
      expect(body.batchId).toBe(batch.id);
      expect(body.sampleDate).toBe("2024-01-01");
    });

    it("returns 404 when batchId belongs to another user", async () => {
      const otherBatch = await prisma.testBatch.create({
        data: {
          userId: otherUserId,
          labLabel: `Other User Batch ${suffix}`,
          sampleDate: new Date("2024-02-01"),
          status: TestBatchStatus.ACCEPTED,
        },
      });

      await request(app.getHttpServer())
        .post("/api/test-results/numeric")
        .set("Authorization", `Bearer ${userToken}`)
        .send({
          analyteId: numericAnalyteId,
          analyteUnitId: numericUnitId,
          batchId: otherBatch.id,
          value: 7,
        })
        .expect(404);
    });

    it("returns 400 when neither batchId nor sampleDate is given", async () => {
      await request(app.getHttpServer())
        .post("/api/test-results/numeric")
        .set("Authorization", `Bearer ${userToken}`)
        .send({
          analyteId: numericAnalyteId,
          analyteUnitId: numericUnitId,
          value: 7,
        })
        .expect(400);
    });

    it("rejects unauthenticated requests", async () => {
      await request(app.getHttpServer())
        .post("/api/test-results/numeric")
        .send({
          analyteId: numericAnalyteId,
          analyteUnitId: numericUnitId,
          sampleDate: "2025-03-10",
          value: 42,
        })
        .expect(401);
    });
  });

  describe("POST /test-results/text", () => {
    it("auto-creates a one-off self-reported batch when no batchId is given", async () => {
      const response = await request(app.getHttpServer())
        .post("/api/test-results/text")
        .set("Authorization", `Bearer ${userToken}`)
        .send({
          analyteId: textAnalyteId,
          sampleDate: "2025-04-01",
          value: "Positive",
        })
        .expect(201);

      const body = response.body as { batchId: string; valueText: string };
      expect(body.valueText).toBe("Positive");
      expect(body.batchId).toBeDefined();
    });
  });

  describe("GET /test-results and DELETE /test-results/:id", () => {
    let ownResultId: string;

    beforeAll(async () => {
      const created = await request(app.getHttpServer())
        .post("/api/test-results/text")
        .set("Authorization", `Bearer ${userToken}`)
        .send({
          analyteId: textAnalyteId,
          sampleDate: "2025-05-01",
          value: "For listing",
        });
      ownResultId = (created.body as { id: string }).id;

      await request(app.getHttpServer())
        .post("/api/test-results/text")
        .set("Authorization", `Bearer ${otherUserToken}`)
        .send({
          analyteId: textAnalyteId,
          sampleDate: "2025-05-01",
          value: "Other user's result",
        });
    });

    it("only lists the caller's own results", async () => {
      const response = await request(app.getHttpServer())
        .get("/api/test-results")
        .query({ pageSize: 100 })
        .set("Authorization", `Bearer ${userToken}`)
        .expect(200);

      const body = response.body as { items: { id: string }[] };
      const ids = body.items.map((item) => item.id);
      expect(ids).toContain(ownResultId);
    });

    it("returns 404 deleting another user's result", async () => {
      await request(app.getHttpServer())
        .delete(`/api/test-results/${ownResultId}`)
        .set("Authorization", `Bearer ${otherUserToken}`)
        .expect(404);
    });

    it("deletes a result owned by the caller", async () => {
      await request(app.getHttpServer())
        .delete(`/api/test-results/${ownResultId}`)
        .set("Authorization", `Bearer ${userToken}`)
        .expect(204);

      const remaining = await prisma.testResult.findUnique({
        where: { id: ownResultId },
      });
      expect(remaining).toBeNull();
    });
  });
});
