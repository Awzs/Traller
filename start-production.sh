#!/bin/bash

# Traller 生产环境启动脚本
# 用于在服务器上启动生产版本

set -e

echo "🚀 启动 Traller 生产环境..."

# 检查Node.js版本
NODE_VERSION=$(node --version)
echo "📦 Node.js 版本: $NODE_VERSION"

# 检查环境变量
if [ -z "$NODE_ENV" ]; then
    export NODE_ENV=production
fi

echo "🌍 环境: $NODE_ENV"

# 检查必要的环境变量
REQUIRED_VARS=("MONGODB_URI")
for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        echo "❌ 缺少必要的环境变量: $var"
        echo "请设置环境变量或创建 .env 文件"
        exit 1
    fi
done

# 设置默认端口
export PORT=${PORT:-8080}

echo "🔧 配置信息:"
echo "   - 端口: $PORT"
echo "   - MongoDB: ${MONGODB_URI:0:20}..."

# 进入后端目录并启动
cd backend

echo "📦 安装后端依赖..."
pnpm install --frozen-lockfile --prod

echo "🏗️  构建后端..."
pnpm run build

echo "🚀 启动后端服务..."
exec node dist/main.js
