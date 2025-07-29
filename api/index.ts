import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ExpressAdapter } from '@nestjs/platform-express';
import { AppModule } from '../backend/src/app.module';
import express, { Request, Response } from 'express';

// 创建 Express 实例
const server = express();

// 全局应用实例缓存
let cachedApp: any = null;

async function createApp() {
  if (cachedApp) {
    return cachedApp;
  }

  const app = await NestFactory.create(
    AppModule,
    new ExpressAdapter(server),
    {
      logger: ['error', 'warn', 'log'],
    }
  );

  // 启用CORS
  app.enableCors({
    origin: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // 全局验证管道
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  await app.init();
  cachedApp = app;
  return app;
}

export default async (req: Request, res: Response) => {
  await createApp();
  return server(req, res);
};
