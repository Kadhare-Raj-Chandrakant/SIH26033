import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import express from 'express';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module.js';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter.js';
import { TransformInterceptor } from './common/interceptors/transform.interceptor.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Security: HTTP headers
  app.use(
    helmet({
      contentSecurityPolicy: false, // Swagger UI compatibility
      crossOriginEmbedderPolicy: false,
    }),
  );

  // Security: Request body size limits (prevent memory exhaustion attacks)
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // Global API prefix
  app.setGlobalPrefix('api/v1');

  // Enable CORS for frontend (supports single origin or comma-separated list)
  const rawCors = process.env.CORS_ORIGIN ?? 'http://localhost:3000';
  const corsOrigins = rawCors.includes(',')
    ? rawCors.split(',').map((o) => o.trim()).filter(Boolean)
    : rawCors;
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });

  // Global Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strip unknown properties
      transform: true, // Automatically transform payloads to DTO instances
      forbidNonWhitelisted: true, // Throw errors if unknown properties are present
    }),
  );

  // Global Interceptors & Filters
  app.useGlobalInterceptors(new TransformInterceptor());
  app.useGlobalFilters(new AllExceptionsFilter());

  // Swagger API Documentation
  const config = new DocumentBuilder()
    .setTitle('SIH26033 API')
    .setDescription('The core backend API for the SIH26033 platform')
    .setVersion('1.0')
    .addBearerAuth() // Prepare for JWT
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // Enable graceful shutdown hooks for SIGTERM / SIGINT (critical for Render deployments)
  app.enableShutdownHooks();

  const port = process.env.PORT ?? process.env.API_PORT ?? 4000;
  await app.listen(port);
  console.log(`🚀 API running on http://localhost:${port}/api/v1`);
  console.log(`📚 API Docs running on http://localhost:${port}/api/docs`);
}
await bootstrap();

