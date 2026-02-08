import { NestFactory } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import { ValidationPipe } from "@nestjs/common";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix("api");

  const configService = app.get(ConfigService);
  const port = configService.get<number>("PORT");
  const corsOrigin = configService.get<string>("CORS_ORIGIN");

  app.enableCors({ origin: corsOrigin });

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
