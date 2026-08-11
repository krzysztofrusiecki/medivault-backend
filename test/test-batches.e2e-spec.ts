import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import request from "supertest";
import * as argon2 from "argon2";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/infrastructure/prisma/prisma.service";
import { Role, TestBatchStatus } from "@prisma/client";

describe("Test Batches (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let userToken: string;
  let otherUserToken: string;
  let userId: string;
  let otherUserId: string;

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
        email: `test-batches-user-${suffix}@example.com`,
        passwordHash,
        firstName: "Batch",
        lastName: "Owner",
        role: Role.USER,
      },
    });
    userId = user.id;

    const otherUser = await prisma.user.create({
      data: {
        email: `test-batches-other-${suffix}@example.com`,
        passwordHash,
        firstName: "Other",
        lastName: "User",
        role: Role.USER,
      },
    });
    otherUserId = otherUser.id;

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
    await prisma.testBatch.deleteMany({
      where: { userId: { in: [userId, otherUserId] } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [userId, otherUserId] } },
    });
    await app.close();
  });

  describe("POST /test-batches", () => {
    it("creates a self-reported batch, immediately ACCEPTED", async () => {
      const response = await request(app.getHttpServer())
        .post("/api/test-batches")
        .set("Authorization", `Bearer ${userToken}`)
        .send({
          labLabel: `City Diagnostics ${suffix}`,
          sampleDate: "2025-06-15",
          notes: "Poor sleep, high stress",
        })
        .expect(201);

      expect(response.body).toMatchObject({
        labId: null,
        labLabel: `City Diagnostics ${suffix}`,
        sampleDate: "2025-06-15",
        notes: "Poor sleep, high stress",
        status: TestBatchStatus.ACCEPTED,
      });
      expect((response.body as { id: string }).id).toBeDefined();
    });

    it("creates a batch without optional notes", async () => {
      const response = await request(app.getHttpServer())
        .post("/api/test-batches")
        .set("Authorization", `Bearer ${userToken}`)
        .send({
          labLabel: `No Notes Lab ${suffix}`,
          sampleDate: "2025-06-16",
        })
        .expect(201);

      expect((response.body as { notes: string | null }).notes).toBeNull();
    });

    it("rejects a blank labLabel", async () => {
      await request(app.getHttpServer())
        .post("/api/test-batches")
        .set("Authorization", `Bearer ${userToken}`)
        .send({ labLabel: "   ", sampleDate: "2025-06-15" })
        .expect(400);
    });

    it("rejects a missing labLabel", async () => {
      await request(app.getHttpServer())
        .post("/api/test-batches")
        .set("Authorization", `Bearer ${userToken}`)
        .send({ sampleDate: "2025-06-15" })
        .expect(400);
    });

    it("rejects unauthenticated requests", async () => {
      await request(app.getHttpServer())
        .post("/api/test-batches")
        .send({ labLabel: `Unauth Lab ${suffix}`, sampleDate: "2025-06-15" })
        .expect(401);
    });
  });

  describe("GET /test-batches", () => {
    beforeAll(async () => {
      await prisma.testBatch.createMany({
        data: [
          {
            userId,
            labLabel: `List Lab A ${suffix}`,
            sampleDate: new Date("2025-01-01"),
            status: TestBatchStatus.ACCEPTED,
          },
          {
            userId,
            labLabel: `List Lab B ${suffix}`,
            sampleDate: new Date("2025-02-01"),
            status: TestBatchStatus.DECLINED,
          },
          {
            userId: otherUserId,
            labLabel: `Other User Lab ${suffix}`,
            sampleDate: new Date("2025-03-01"),
            status: TestBatchStatus.ACCEPTED,
          },
        ],
      });
    });

    it("lists only the current user's batches", async () => {
      const response = await request(app.getHttpServer())
        .get("/api/test-batches")
        .query({ pageSize: 100 })
        .set("Authorization", `Bearer ${userToken}`)
        .expect(200);

      const body = response.body as {
        items: { labLabel: string }[];
        pagination: { total: number };
      };
      const labels = body.items.map((item) => item.labLabel);
      expect(labels).toContain(`List Lab A ${suffix}`);
      expect(labels).toContain(`List Lab B ${suffix}`);
      expect(labels).not.toContain(`Other User Lab ${suffix}`);
    });

    it("does not leak another user's batches into their own list", async () => {
      const response = await request(app.getHttpServer())
        .get("/api/test-batches")
        .query({ pageSize: 100 })
        .set("Authorization", `Bearer ${otherUserToken}`)
        .expect(200);

      const body = response.body as { items: { labLabel: string }[] };
      const labels = body.items.map((item) => item.labLabel);
      expect(labels).toContain(`Other User Lab ${suffix}`);
      expect(labels).not.toContain(`List Lab A ${suffix}`);
    });

    it("filters by status", async () => {
      const response = await request(app.getHttpServer())
        .get("/api/test-batches")
        .query({ status: TestBatchStatus.DECLINED, pageSize: 100 })
        .set("Authorization", `Bearer ${userToken}`)
        .expect(200);

      const body = response.body as { items: { labLabel: string }[] };
      const labels = body.items.map((item) => item.labLabel);
      expect(labels).toContain(`List Lab B ${suffix}`);
      expect(labels).not.toContain(`List Lab A ${suffix}`);
    });

    it("rejects unauthenticated requests", async () => {
      await request(app.getHttpServer()).get("/api/test-batches").expect(401);
    });
  });
});
