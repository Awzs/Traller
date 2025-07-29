import { ConfigService } from '@nestjs/config';
import { MongooseModuleOptions } from '@nestjs/mongoose';
import { Logger } from '@nestjs/common';

export const getDatabaseConfig = (
  configService: ConfigService,
): MongooseModuleOptions => {
  const logger = new Logger('DatabaseConfig');

  // 支持多种环境变量名称
  const mongoUri =
    configService.get<string>('MONGODB_URI') ||
    configService.get<string>('MONGO_URI') ||
    process.env.MONGODB_URI ||
    process.env.MONGO_URI ||
    'mongodb://localhost:27017/traller';

  logger.log(`🔗 Attempting to connect to MongoDB...`);
  logger.log(`📍 MongoDB URI: ${mongoUri.replace(/\/\/.*@/, '//***:***@')}`); // 隐藏密码

  // 检测是否为云环境
  const isCloudEnvironment = process.env.NODE_ENV === 'production' ||
                             process.env.PORT === '8080' ||
                             mongoUri.includes('mongodb+srv://');

  const baseConfig = {
    uri: mongoUri,
    // 云环境优化的连接选项
    connectTimeoutMS: isCloudEnvironment ? 30000 : 10000,
    serverSelectionTimeoutMS: isCloudEnvironment ? 30000 : 5000,
    socketTimeoutMS: 45000,
    bufferCommands: false,
  };

  // 云环境额外配置
  if (isCloudEnvironment) {
    logger.log(`☁️ Cloud environment detected, applying cloud-optimized settings`);
    return {
      ...baseConfig,
      maxPoolSize: 10,
      minPoolSize: 1,
      retryWrites: true,
      retryReads: true,
    };
  }

  logger.log(`🏠 Local environment detected`);
  return baseConfig;
};
