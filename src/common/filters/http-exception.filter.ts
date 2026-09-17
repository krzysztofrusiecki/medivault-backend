import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Request, Response } from "express";
import { Environment } from "@/config/schema";

interface ErrorResponseBody {
  statusCode: number;
  message: string | string[];
  stack?: string;
}

function extractHttpExceptionMessage(
  exception: HttpException,
): string | string[] {
  const response = exception.getResponse();
  if (typeof response === "string") {
    return response;
  }
  if (
    typeof response === "object" &&
    response !== null &&
    "message" in response
  ) {
    return (response as { message: string | string[] }).message;
  }
  return exception.message;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  constructor(private readonly configService: ConfigService<Environment>) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    const isHttpException = exception instanceof HttpException;
    const status = isHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;
    const error = exception instanceof Error ? exception : undefined;

    this.logger.error(
      `${request.method} ${request.url} -> ${status}`,
      error?.stack,
    );

    const isProduction = this.configService.get("NODE_ENV") === "production";

    if (isProduction && !isHttpException) {
      response
        .status(status)
        .json({ statusCode: status, message: "Internal server error" });
      return;
    }

    const body: ErrorResponseBody = {
      statusCode: status,
      message: isHttpException
        ? extractHttpExceptionMessage(exception)
        : (error?.message ?? "Internal server error"),
    };

    if (!isProduction && error?.stack) {
      body.stack = error.stack;
    }

    response.status(status).json(body);
  }
}
