import {
  ArgumentsHost,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { HttpExceptionFilter } from "./http-exception.filter";

function createHost(request: Record<string, unknown> = {}) {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const response = { status };
  const host = {
    switchToHttp: () => ({
      getRequest: () => ({ method: "GET", url: "/api/whatever", ...request }),
      getResponse: () => response,
    }),
  } as unknown as ArgumentsHost;
  return { host, status, json };
}

function makeFilter(nodeEnv: string) {
  const configService = {
    get: jest.fn().mockReturnValue(nodeEnv),
  } as unknown as ConfigService;
  return new HttpExceptionFilter(configService);
}

describe("HttpExceptionFilter", () => {
  it("returns the exception's status and message for a known HttpException", () => {
    const filter = makeFilter("production");
    const { host, status, json } = createHost();

    filter.catch(new NotFoundException("Analyte not found"), host);

    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith({
      statusCode: 404,
      message: "Analyte not found",
    });
  });

  it("surfaces the full array of validation messages, not the exception's own generic message", () => {
    const filter = makeFilter("production");
    const { host, status, json } = createHost();

    filter.catch(
      new BadRequestException([
        "email must be an email",
        "password is too short",
      ]),
      host,
    );

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({
      statusCode: 400,
      message: ["email must be an email", "password is too short"],
    });
  });

  it("hides an unknown exception's detail and omits the stack in production", () => {
    const filter = makeFilter("production");
    const { host, status, json } = createHost();

    filter.catch(
      new Error("Unique constraint failed on the fields: (`email`)"),
      host,
    );

    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({
      statusCode: 500,
      message: "Internal server error",
    });
  });

  it.each(["development", "test"])(
    "stays verbose about an unknown exception in %s",
    (nodeEnv) => {
      const filter = makeFilter(nodeEnv);
      const { host, status, json } = createHost();
      const error = new Error(
        "Unique constraint failed on the fields: (`email`)",
      );

      filter.catch(error, host);

      expect(status).toHaveBeenCalledWith(500);
      expect(json).toHaveBeenCalledWith({
        statusCode: 500,
        message: error.message,
        stack: error.stack,
      });
    },
  );

  it("still returns an HttpException's message verbosely outside production", () => {
    const filter = makeFilter("development");
    const { host, status, json } = createHost();

    filter.catch(new NotFoundException("Analyte not found"), host);

    expect(status).toHaveBeenCalledWith(404);
    const [payload] = json.mock.calls[0] as [
      { statusCode: number; message: string; stack?: string },
    ];
    expect(payload.statusCode).toBe(404);
    expect(payload.message).toBe("Analyte not found");
    expect(payload.stack).toEqual(expect.any(String));
  });

  it("treats a non-Error, non-HttpException throw as an opaque internal error", () => {
    const filter = makeFilter("production");
    const { host, status, json } = createHost();

    filter.catch("boom", host);

    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({
      statusCode: 500,
      message: "Internal server error",
    });
  });
});
