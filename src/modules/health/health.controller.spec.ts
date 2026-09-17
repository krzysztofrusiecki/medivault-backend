import { Test, TestingModule } from "@nestjs/testing";
import { HealthCheckService, PrismaHealthIndicator } from "@nestjs/terminus";
import { PrismaService } from "@/infrastructure/prisma";
import { HealthController } from "./health.controller";

describe("HealthController", () => {
  let controller: HealthController;
  let healthService: { check: jest.Mock };
  let db: { pingCheck: jest.Mock };

  beforeEach(async () => {
    healthService = { check: jest.fn() };
    db = { pingCheck: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        { provide: HealthCheckService, useValue: healthService },
        { provide: PrismaHealthIndicator, useValue: db },
        { provide: PrismaService, useValue: {} },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  it("runs a Prisma ping check with a 1s timeout and returns the result", async () => {
    const result = {
      status: "ok",
      info: { database: { status: "up" } },
      error: {},
      details: { database: { status: "up" } },
    };
    healthService.check.mockImplementation(
      async (indicators: Array<() => Promise<unknown>>) => {
        for (const indicator of indicators) {
          await indicator();
        }
        return result;
      },
    );
    db.pingCheck.mockResolvedValue({ database: { status: "up" } });

    await expect(controller.check()).resolves.toBe(result);

    expect(db.pingCheck).toHaveBeenCalledWith(
      "database",
      {},
      { timeout: 1000 },
    );
  });

  it("propagates the health service's failure when the database is down", async () => {
    const error = new Error("database check failed");
    healthService.check.mockRejectedValue(error);

    await expect(controller.check()).rejects.toBe(error);
  });
});
