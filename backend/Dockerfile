# 多阶段构建 - 构建阶段
FROM node:20-alpine AS builder

# 设置工作目录
WORKDIR /app

# 复制package文件
COPY backend/package*.json ./
COPY backend/pnpm-lock.yaml ./

# 安装pnpm
RUN npm install -g pnpm

# 安装依赖
RUN pnpm install --frozen-lockfile

# 复制源代码和配置文件
COPY backend/ .

# 调试：显示当前目录内容
RUN echo "=== Current directory contents ===" && ls -la

# 调试：显示工作目录
RUN echo "=== Current working directory ===" && pwd

# 确保TypeScript配置文件存在
RUN ls -la tsconfig.json || echo "tsconfig.json not found!"

# 构建应用
RUN echo "=== Starting build process ===" && \
    pnpm run build && \
    echo "=== Build command completed ==="

# 调试：检查构建结果
RUN echo "=== Build completed, checking dist directory ===" && ls -la dist/ || echo "dist directory not found!"
RUN echo "=== Checking for main.js ===" && ls -la dist/main.js || echo "main.js not found!"
RUN echo "=== Checking all files in dist ===" && find dist -type f || echo "No files in dist!"

# 确保dist目录存在且有正确的权限
RUN mkdir -p dist && chmod 755 dist

# 生产阶段
FROM node:20-alpine AS production

# 安装dumb-init用于信号处理
RUN apk add --no-cache dumb-init

# 创建非root用户
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nestjs -u 1001

# 设置工作目录
WORKDIR /app

# 复制package文件
COPY backend/package*.json ./
COPY backend/pnpm-lock.yaml ./

# 安装pnpm
RUN npm install -g pnpm

# 只安装生产依赖
RUN pnpm install --frozen-lockfile --prod

# 从构建阶段复制构建产物
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist

# 调试：检查生产阶段的文件
RUN echo "=== Production stage file check ===" && ls -la
RUN echo "=== Checking dist directory in production ===" && ls -la dist/ || echo "dist directory not found in production!"
RUN echo "=== Checking for main.js in production ===" && ls -la dist/main.js || echo "main.js not found in production!"

# 切换到非root用户
USER nestjs

# 暴露端口（Cloud Run使用8080）
EXPOSE 8080

# 设置环境变量
ENV NODE_ENV=production
ENV PORT=8080

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/', (res) => process.exit(res.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))" || exit 1

# 使用dumb-init启动应用
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main.js"]
