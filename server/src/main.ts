import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { AppModule } from './app.module';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { ExpressAdapter } from '@nestjs/platform-express';
import * as express from 'express';

const envPath = path.resolve(__dirname, '../.env');
dotenv.config({ path: envPath });

async function bootstrap() {
  const server = express();
  
  const jsonParser = express.json({ limit: '10mb' });
  const urlencodedParser = express.urlencoded({ limit: '10mb', extended: true });
  
  server.use((req, res, next) => {
    const contentType = req.headers['content-type'] || '';
    if (contentType.includes('multipart/form-data')) {
      return next();
    }
    jsonParser(req, res, next);
  });
  
  server.use((req, res, next) => {
    const contentType = req.headers['content-type'] || '';
    if (contentType.includes('multipart/form-data')) {
      return next();
    }
    urlencodedParser(req, res, next);
  });

  const app = await NestFactory.create(AppModule, new ExpressAdapter(server));
  app.useWebSocketAdapter(new IoAdapter(app));

  app.enableCors({
    origin: [
      'https://web.telegram.org',
      'https://webk.telegram.org',
      'https://webz.telegram.org',
      'https://app.222prod.cc',
    ],
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = process.env.PORT || 4000;
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
}

bootstrap();

