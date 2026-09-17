import { Injectable } from "@nestjs/common";
import { ThrottlerGuard } from "@nestjs/throttler";

/**
 * Rate-limits by IP+email instead of the default IP-only tracking, so one
 * attacker can't exhaust a victim's login attempts by rotating IPs, and one
 * IP (e.g. a shared office network) doesn't get blocked for every account.
 */
@Injectable()
export class EmailThrottlerGuard extends ThrottlerGuard {
  protected getTracker(req: Record<string, unknown>): Promise<string> {
    const body = req.body as Record<string, unknown> | undefined;
    const email =
      typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    return Promise.resolve(`${req.ip as string}:${email}`);
  }
}
