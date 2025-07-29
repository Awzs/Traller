#!/bin/bash

# 本地生产环境测试脚本
# 使用 Docker Compose 测试生产环境构建

set -e

echo "🧪 启动本地生产环境测试..."

# 检查 Docker 和 Docker Compose
if ! command -v docker &> /dev/null; then
    echo "❌ Docker 未安装"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose 未安装"
    exit 1
fi

# 清理之前的容器和镜像
echo "🧹 清理之前的测试环境..."
docker-compose -f docker-compose.prod.yml down --volumes --remove-orphans

# 构建并启动服务
echo "🏗️  构建生产环境镜像..."
docker-compose -f docker-compose.prod.yml build --no-cache

echo "🚀 启动生产环境服务..."
docker-compose -f docker-compose.prod.yml up -d

# 等待服务启动
echo "⏳ 等待服务启动..."
sleep 30

# 健康检查
echo "🏥 执行健康检查..."

# 检查后端健康状态
echo "检查后端服务..."
if curl -f http://localhost:8080/health > /dev/null 2>&1; then
    echo "✅ 后端服务正常"
else
    echo "❌ 后端服务异常"
    docker-compose -f docker-compose.prod.yml logs backend
fi

# 检查前端健康状态
echo "检查前端服务..."
if curl -f http://localhost:3000/health > /dev/null 2>&1; then
    echo "✅ 前端服务正常"
else
    echo "❌ 前端服务异常"
    docker-compose -f docker-compose.prod.yml logs frontend
fi

# 显示服务状态
echo ""
echo "📊 服务状态:"
docker-compose -f docker-compose.prod.yml ps

echo ""
echo "🌐 访问地址:"
echo "   前端: http://localhost:3000"
echo "   后端: http://localhost:8080"
echo "   后端健康检查: http://localhost:8080/health"

echo ""
echo "📋 管理命令:"
echo "   查看日志: docker-compose -f docker-compose.prod.yml logs -f"
echo "   停止服务: docker-compose -f docker-compose.prod.yml down"
echo "   重启服务: docker-compose -f docker-compose.prod.yml restart"

echo ""
echo "✅ 生产环境测试启动完成!"
