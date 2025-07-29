#!/bin/bash

# Traller 部署脚本
# 用于部署到 Vercel 平台

echo "🚀 开始部署 Traller 到 Vercel..."

# 检查是否安装了 Vercel CLI
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI 未安装，请先安装："
    echo "npm i -g vercel"
    exit 1
fi

# 检查是否在正确的目录
if [ ! -f "vercel.json" ]; then
    echo "❌ 未找到 vercel.json 文件，请确保在项目根目录运行此脚本"
    exit 1
fi

# 检查环境变量文件
if [ ! -f ".env" ]; then
    echo "⚠️  未找到 .env 文件，请根据 .env.example 创建环境变量文件"
    echo "或者在 Vercel 控制台中配置环境变量"
fi

# 安装依赖
echo "📦 安装依赖..."
pnpm install

# 构建前端
echo "🏗️  构建前端..."
cd frontend
pnpm run build
cd ..

# 部署到 Vercel
echo "🚀 部署到 Vercel..."
vercel --prod

echo "✅ 部署完成！"
echo ""
echo "📝 部署后需要在 Vercel 控制台配置以下环境变量："
echo "- MONGODB_URI: MongoDB 连接字符串"
echo "- PERPLEXITY_API_KEY: Perplexity API 密钥"
echo "- TAVILY_API_KEY: Tavily API 密钥"
echo "- OPENROUTER_API_KEY: OpenRouter API 密钥"
echo ""
echo "🔗 访问你的应用："
echo "https://your-app-name.vercel.app"
