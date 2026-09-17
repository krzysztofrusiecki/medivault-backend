import { NestFactory } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import { ValidationPipe } from "@nestjs/common";
import cookieParser from "cookie-parser";
import helmet from "helmet";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix("api");

  const configService = app.get(ConfigService);
  const port = configService.get<number>("PORT");
  const corsOrigin = configService.get<string>("CORS_ORIGIN");

  app.enableCors({ origin: corsOrigin, credentials: true });

  // Must be mounted before SwaggerModule.setup(): that call registers its
  // routes on the underlying HTTP adapter immediately, so registering
  // helmet afterwards would leave /api/docs without these headers.
  app.use(
    helmet({
      // No real frontend origin exists yet to scope a CSP allowlist
      // against; revisit once one does. Every other helmet default stays on.
      contentSecurityPolicy: false,
    }),
  );
  app.use(cookieParser());

  // Setup Swagger documentation
  const config = new DocumentBuilder()
    .setTitle("MediVault API")
    .setDescription("Laboratory test results management system API")
    .setVersion("1.0.0")
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api/docs", app, document);
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  await app.listen(port as number);
}

void bootstrap();
