import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { Server } from 'http';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  try {
    logger.log('🚀 Starting Traller Backend Application...');
    logger.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.log(`🔌 Port: ${process.env.PORT || 8080}`);

    const app = await NestFactory.create(AppModule, {
      // 生产环境日志配置
      logger: process.env.NODE_ENV === 'production'
        ? ['error', 'warn', 'log']
        : ['error', 'warn', 'log', 'debug', 'verbose'],
      bodyParser: true,
    });

    logger.log('✅ NestJS application created successfully');

  // 启用CORS - 生产环境优化
  app.enableCors({
    origin: process.env.NODE_ENV === 'production'
      ? [process.env.FRONTEND_URL, process.env.ALLOWED_ORIGINS].filter(Boolean)
      : true,
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

  // 动态端口配置 - Cloud Run使用8080
  const port = process.env.PORT || 8080;
  const host = process.env.NODE_ENV === 'production' ? '0.0.0.0' : 'localhost';

  // 设置服务器超时时间
  const server = (await app.listen(port, host)) as Server;
  server.setTimeout(300000); // 5分钟超时

    // 优化日志输出
    logger.log(`🚀 Application is running on: http://${host}:${port}`);
    logger.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.log(`⏱️  Server timeout set to 5 minutes for long-running API calls`);
    logger.log('🏥 Health check endpoint available at /health');
    logger.log('✅ Application bootstrap completed successfully');

  } catch (error) {
    logger.error('❌ Failed to bootstrap the application', error);
    throw error;
  }
}

bootstrap().catch((err) => {
  const logger = new Logger('Bootstrap');
  logger.error('❌ Failed to bootstrap the application', err);
  process.exit(1);
});

// 优雅关闭处理
process.on('SIGTERM', () => {
  const logger = new Logger('Shutdown');
  logger.log('🛑 SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  const logger = new Logger('Shutdown');
  logger.log('🛑 SIGINT received, shutting down gracefully');
  process.exit(0);
});
