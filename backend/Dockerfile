# 生产版Dockerfile - 单阶段构建
FROM node:20-alpine

# 安装dumb-init用于信号处理
RUN apk add --no-cache dumb-init

# 设置工作目录
WORKDIR /app

# 复制package文件
COPY backend/package*.json ./
COPY backend/pnpm-lock.yaml ./

# 安装pnpm和依赖
RUN npm install -g pnpm && \
    pnpm install --frozen-lockfile

# 复制源代码
COPY backend/ .

# 构建应用
RUN pnpm run build

# 暴露端口（Cloud Run使用8080）
EXPOSE 8080

# 设置环境变量
ENV NODE_ENV=production
ENV PORT=8080

# 使用dumb-init启动应用
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/src/main.js"]
