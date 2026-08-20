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

  let labAdminToken: string;
  let labAdminId: string;
  let labId: string;
  let otherLabAdminToken: string;
  let otherLabAdminId: string;
  let otherLabId: string;

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

    const lab = await prisma.lab.create({
      data: { name: `Test Batches Lab ${suffix}` },
    });
    labId = lab.id;

    const labAdmin = await prisma.user.create({
      data: {
        email: `test-batches-lab-admin-${suffix}@example.com`,
        passwordHash,
        firstName: "Lab",
        lastName: "Admin",
        role: Role.LAB_ADMIN,
        labId: lab.id,
      },
    });
    labAdminId = labAdmin.id;

    const otherLab = await prisma.lab.create({
      data: { name: `Test Batches Other Lab ${suffix}` },
    });
    otherLabId = otherLab.id;

    const otherLabAdmin = await prisma.user.create({
      data: {
        email: `test-batches-other-lab-admin-${suffix}@example.com`,
        passwordHash,
        firstName: "Other",
        lastName: "LabAdmin",
        role: Role.LAB_ADMIN,
        labId: otherLab.id,
      },
    });
    otherLabAdminId = otherLabAdmin.id;

    const userSignIn = await request(app.getHttpServer())
      .post("/api/auth/sign-in")
      .send({ email: user.email, password });
    userToken = (userSignIn.body as { accessToken: string }).accessToken;

    const otherUserSignIn = await request(app.getHttpServer())
      .post("/api/auth/sign-in")
      .send({ email: otherUser.email, password });
    otherUserToken = (otherUserSignIn.body as { accessToken: string })
      .accessToken;

    const labAdminSignIn = await request(app.getHttpServer())
      .post("/api/auth/sign-in")
      .send({ email: labAdmin.email, password });
    labAdminToken = (labAdminSignIn.body as { accessToken: string })
      .accessToken;

    const otherLabAdminSignIn = await request(app.getHttpServer())
      .post("/api/auth/sign-in")
      .send({ email: otherLabAdmin.email, password });
    otherLabAdminToken = (otherLabAdminSignIn.body as { accessToken: string })
      .accessToken;
  });

  afterAll(async () => {
    await prisma.testBatch.deleteMany({
      where: {
        userId: { in: [userId, otherUserId] },
      },
    });
    await prisma.testBatch.deleteMany({
      where: { labId: { in: [labId, otherLabId] } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [userId, otherUserId, labAdminId, otherLabAdminId] } },
    });
    await prisma.lab.deleteMany({
      where: { id: { in: [labId, otherLabId] } },
    });
    await app.close();
  });

  describe("POST /test-batches/self-reported", () => {
    it("creates a self-reported batch, immediately ACCEPTED", async () => {
      const response = await request(app.getHttpServer())
        .post("/api/test-batches/self-reported")
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
        .post("/api/test-batches/self-reported")
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
        .post("/api/test-batches/self-reported")
        .set("Authorization", `Bearer ${userToken}`)
        .send({ labLabel: "   ", sampleDate: "2025-06-15" })
        .expect(400);
    });

    it("rejects a missing labLabel", async () => {
      await request(app.getHttpServer())
        .post("/api/test-batches/self-reported")
        .set("Authorization", `Bearer ${userToken}`)
        .send({ sampleDate: "2025-06-15" })
        .expect(400);
    });

    it("rejects unauthenticated requests", async () => {
      await request(app.getHttpServer())
        .post("/api/test-batches/self-reported")
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
          {
            userId,
            labId,
            sampleDate: new Date("2025-04-01"),
            status: TestBatchStatus.PENDING_ACCEPTANCE,
          },
          {
            userId,
            labId,
            sampleDate: new Date("2025-05-01"),
            status: TestBatchStatus.ACCEPTED,
          },
          {
            userId: otherUserId,
            labId: otherLabId,
            sampleDate: new Date("2025-05-15"),
            status: TestBatchStatus.PENDING_ACCEPTANCE,
          },
        ],
      });
    });

    it("rejects unauthenticated requests", async () => {
      await request(app.getHttpServer()).get("/api/test-batches").expect(401);
    });

    describe("as USER", () => {
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
    });

    describe("as LAB_ADMIN", () => {
      it("lists only batches created for the caller's own lab", async () => {
        const response = await request(app.getHttpServer())
          .get("/api/test-batches")
          .query({ pageSize: 100 })
          .set("Authorization", `Bearer ${labAdminToken}`)
          .expect(200);

        const body = response.body as {
          items: { id: string; labId: string | null; sampleDate: string }[];
        };
        const dates = body.items.map((item) => item.sampleDate);
        expect(dates).toContain("2025-04-01");
        expect(dates).toContain("2025-05-01");
        expect(body.items.every((item) => item.labId === labId)).toBe(true);
      });

      it("does not leak another lab's batches", async () => {
        const response = await request(app.getHttpServer())
          .get("/api/test-batches")
          .query({ pageSize: 100 })
          .set("Authorization", `Bearer ${otherLabAdminToken}`)
          .expect(200);

        const body = response.body as {
          items: { labId: string | null; sampleDate: string }[];
        };
        const dates = body.items.map((item) => item.sampleDate);
        expect(dates).toContain("2025-05-15");
        expect(dates).not.toContain("2025-04-01");
      });

      it("filters by status", async () => {
        const response = await request(app.getHttpServer())
          .get("/api/test-batches")
          .query({ status: TestBatchStatus.PENDING_ACCEPTANCE, pageSize: 100 })
          .set("Authorization", `Bearer ${labAdminToken}`)
          .expect(200);

        const body = response.body as { items: { sampleDate: string }[] };
        const dates = body.items.map((item) => item.sampleDate);
        expect(dates).toContain("2025-04-01");
        expect(dates).not.toContain("2025-05-01");
      });
    });
  });

  describe("POST /test-batches/lab-verified", () => {
    it("allows LAB_ADMIN to create a batch for an existing patient, PENDING_ACCEPTANCE", async () => {
      const response = await request(app.getHttpServer())
        .post("/api/test-batches/lab-verified")
        .set("Authorization", `Bearer ${labAdminToken}`)
        .send({
          patientEmail: `test-batches-user-${suffix}@example.com`,
          sampleDate: "2025-07-01",
          notes: "Fasting sample",
        })
        .expect(201);

      expect(response.body).toMatchObject({
        labId,
        labLabel: null,
        sampleDate: "2025-07-01",
        notes: "Fasting sample",
        status: TestBatchStatus.PENDING_ACCEPTANCE,
      });

      const created = await prisma.testBatch.findUnique({
        where: { id: (response.body as { id: string }).id },
      });
      expect(created?.userId).toBe(userId);
      expect(created?.labId).toBe(labId);
    });

    it("returns 404 when the patient email doesn't match an existing account", async () => {
      await request(app.getHttpServer())
        .post("/api/test-batches/lab-verified")
        .set("Authorization", `Bearer ${labAdminToken}`)
        .send({
          patientEmail: `no-such-user-${suffix}@example.com`,
          sampleDate: "2025-07-01",
        })
        .expect(404);
    });

    it("returns 404 when the email matches a non-patient account", async () => {
      await request(app.getHttpServer())
        .post("/api/test-batches/lab-verified")
        .set("Authorization", `Bearer ${labAdminToken}`)
        .send({
          patientEmail: `test-batches-other-lab-admin-${suffix}@example.com`,
          sampleDate: "2025-07-01",
        })
        .expect(404);
    });

    it("rejects non-LAB_ADMIN users", async () => {
      await request(app.getHttpServer())
        .post("/api/test-batches/lab-verified")
        .set("Authorization", `Bearer ${userToken}`)
        .send({
          patientEmail: `test-batches-user-${suffix}@example.com`,
          sampleDate: "2025-07-01",
        })
        .expect(403);
    });

    it("rejects unauthenticated requests", async () => {
      await request(app.getHttpServer())
        .post("/api/test-batches/lab-verified")
        .send({
          patientEmail: `test-batches-user-${suffix}@example.com`,
          sampleDate: "2025-07-01",
        })
        .expect(401);
    });
  });
});
