import { ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ThrottlerException, ThrottlerStorageService } from "@nestjs/throttler";
import { EmailThrottlerGuard } from "./email-throttler.guard";

function createContext(
  ip: string,
  email: string | undefined,
): ExecutionContext {
  const request = { ip, body: email === undefined ? {} : { email } };
  const response = { header: jest.fn() };
  return {
    getHandler: () => function handler() {},
    getClass: () => class Controller {},
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => response,
    }),
  } as unknown as ExecutionContext;
}

const storages: ThrottlerStorageService[] = [];

function createGuard(limit: number) {
  const storage = new ThrottlerStorageService();
  storages.push(storage);
  return new EmailThrottlerGuard(
    [{ name: "default", ttl: 60_000, limit }],
    storage,
    new Reflector(),
  );
}

describe("EmailThrottlerGuard", () => {
  afterEach(() => {
    storages.splice(0).forEach((storage) => storage.onApplicationShutdown());
  });

  it("blocks further attempts once the limit for one IP+email pair is hit", async () => {
    const guard = createGuard(2);
    await (
      guard as unknown as { onModuleInit(): Promise<void> }
    ).onModuleInit();
    const context = createContext("1.2.3.4", "victim@example.com");

    await expect(guard.canActivate(context)).resolves.toBe(true);
    await expect(guard.canActivate(context)).resolves.toBe(true);
    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      ThrottlerException,
    );
  });

  it("tracks a different email from the same IP under an independent counter", async () => {
    const guard = createGuard(1);
    await (
      guard as unknown as { onModuleInit(): Promise<void> }
    ).onModuleInit();

    await expect(
      guard.canActivate(createContext("1.2.3.4", "victim@example.com")),
    ).resolves.toBe(true);

    // Same IP, different email: must not be blocked by the first account's usage.
    await expect(
      guard.canActivate(createContext("1.2.3.4", "other@example.com")),
    ).resolves.toBe(true);
  });

  it("tracks the same email from a different IP under an independent counter", async () => {
    const guard = createGuard(1);
    await (
      guard as unknown as { onModuleInit(): Promise<void> }
    ).onModuleInit();

    await expect(
      guard.canActivate(createContext("1.2.3.4", "victim@example.com")),
    ).resolves.toBe(true);

    // Same email, different (attacker) IP: independently rate-limited.
    await expect(
      guard.canActivate(createContext("5.6.7.8", "victim@example.com")),
    ).resolves.toBe(true);
  });
});
