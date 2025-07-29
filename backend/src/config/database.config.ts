import { ConfigService } from '@nestjs/config';
import { MongooseModuleOptions } from '@nestjs/mongoose';

export const getDatabaseConfig = (
  configService: ConfigService,
): MongooseModuleOptions => {
  const mongoUri =
    configService.get<string>('MONGODB_URI') ||
    'mongodb://localhost:27017/traller';

  return {
    uri: mongoUri,
    // 添加连接选项以提高稳定性
    connectTimeoutMS: 10000,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    // 在生产环境中，如果连接失败，不要阻止应用启动
    bufferCommands: false,
    bufferMaxEntries: 0,
  };
};
