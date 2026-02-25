import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { RedisIoAdapter } from './websocket/redis-io.adapter';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { ThrottleGuard } from './throttle/throttle.guard';
import { TenantContextMiddleware } from './tenancy/middleware/tenant-context.middleware';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable validation globally
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Configure Swagger
  const config = new DocumentBuilder()
    .setTitle('Stellara API')
    .setDescription(
      'API for authentication, monitoring Stellar network events, and delivering webhooks',
    )
    .setVersion('1.0')
    .addTag('Authentication')
    .addTag('Stellar Monitor')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const redisIoAdapter = new RedisIoAdapter(app);
  await redisIoAdapter.connectToRedis();

  app.useWebSocketAdapter(redisIoAdapter);
  app.useGlobalGuards(app.get(ThrottleGuard));

  // Register tenant context middleware
  const tenantContextMiddleware = app.get(TenantContextMiddleware);
  app.use(tenantContextMiddleware.use.bind(tenantContextMiddleware));

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
