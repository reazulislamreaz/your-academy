import { requestIdMiddleware } from './common/request-id';
import { validationExceptionFactory } from './common/validation-exception';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { getWebOrigins, validateEnv } from './config/env';

async function bootstrap() {
  validateEnv();

  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.enableShutdownHooks();
  // Behind nginx (private Docker network) req.ip must come from X-Forwarded-For, or every
  // client shares one rate-limit bucket. Override with TRUST_PROXY (Express syntax).
  app.set('trust proxy', process.env.TRUST_PROXY ?? 'loopback, linklocal, uniquelocal');
  // Homepage CMS drafts (tiles + logo metadata) can exceed Express's default ~100kb.
  app.useBodyParser('json', { limit: '2mb' });
  app.useBodyParser('urlencoded', { limit: '2mb', extended: true });
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(cookieParser());
  app.use(requestIdMiddleware);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: validationExceptionFactory,
    }),
  );

  const origins = getWebOrigins();
  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      // Non-browser clients (curl, server-to-server) may omit Origin.
      // Deny with callback(null, false) — never throw (throw becomes HTTP 500).
      if (!origin || origins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(null, false);
    },
    credentials: true,
  });

  const port = Number(process.env.API_PORT ?? 5000);
  await app.listen(port);
  console.log(`Your Academy API listening on port ${port}`);
}

void bootstrap();
