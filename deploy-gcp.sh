#!/bin/bash

# Traller Google Cloud Platform 部署脚本
# 用于部署到 Google Cloud Run

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 配置变量
PROJECT_ID=${GCP_PROJECT_ID:-""}
REGION=${GCP_REGION:-"asia-east1"}
BACKEND_SERVICE_NAME="traller-backend"
FRONTEND_SERVICE_NAME="traller-frontend"
BACKEND_IMAGE_NAME="gcr.io/${PROJECT_ID}/${BACKEND_SERVICE_NAME}"
FRONTEND_IMAGE_NAME="gcr.io/${PROJECT_ID}/${FRONTEND_SERVICE_NAME}"

echo -e "${BLUE}🚀 Traller Google Cloud Platform 部署脚本${NC}"
echo "================================"

# 检查必要工具
check_tool() {
    if ! command -v $1 &> /dev/null; then
        echo -e "${RED}❌ $1 未安装，请先安装${NC}"
        exit 1
    fi
}

echo -e "${YELLOW}🔍 检查必要工具...${NC}"
check_tool "gcloud"
check_tool "docker"

# 检查项目ID
if [ -z "$PROJECT_ID" ]; then
    echo -e "${YELLOW}📝 请输入 Google Cloud 项目ID:${NC}"
    read -p "Project ID: " PROJECT_ID
    
    if [ -z "$PROJECT_ID" ]; then
        echo -e "${RED}❌ 项目ID不能为空${NC}"
        exit 1
    fi
fi

echo -e "${GREEN}📋 部署配置:${NC}"
echo "   - 项目ID: $PROJECT_ID"
echo "   - 区域: $REGION"
echo "   - 后端服务: $BACKEND_SERVICE_NAME"
echo "   - 前端服务: $FRONTEND_SERVICE_NAME"

# 确认部署
echo -e "${YELLOW}⚠️  确认要部署到 Google Cloud 吗? (y/N)${NC}"
read -p "继续部署? " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}🛑 部署已取消${NC}"
    exit 0
fi

# 设置项目
echo -e "${BLUE}🔧 配置 Google Cloud 项目...${NC}"
gcloud config set project $PROJECT_ID

# 启用必要的API
echo -e "${BLUE}🔌 启用必要的 Google Cloud APIs...${NC}"
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com

# 配置Docker认证
echo -e "${BLUE}🔐 配置 Docker 认证...${NC}"
gcloud auth configure-docker

# 构建后端镜像
echo -e "${BLUE}🏗️  构建后端镜像...${NC}"
cd backend
docker build -t $BACKEND_IMAGE_NAME .
cd ..

# 构建前端镜像
echo -e "${BLUE}🏗️  构建前端镜像...${NC}"
cd frontend
docker build -t $FRONTEND_IMAGE_NAME .
cd ..

# 推送镜像
echo -e "${BLUE}📤 推送镜像到 Google Container Registry...${NC}"
docker push $BACKEND_IMAGE_NAME
docker push $FRONTEND_IMAGE_NAME

# 部署后端服务
echo -e "${BLUE}🚀 部署后端服务到 Cloud Run...${NC}"
gcloud run deploy $BACKEND_SERVICE_NAME \
    --image $BACKEND_IMAGE_NAME \
    --platform managed \
    --region $REGION \
    --allow-unauthenticated \
    --memory 1Gi \
    --cpu 1 \
    --timeout 300 \
    --concurrency 100 \
    --max-instances 10 \
    --set-env-vars NODE_ENV=production

# 获取后端服务URL
BACKEND_URL=$(gcloud run services describe $BACKEND_SERVICE_NAME --platform managed --region $REGION --format 'value(status.url)')

echo -e "${GREEN}✅ 后端服务部署成功!${NC}"
echo "   URL: $BACKEND_URL"

# 部署前端服务
echo -e "${BLUE}🚀 部署前端服务到 Cloud Run...${NC}"
gcloud run deploy $FRONTEND_SERVICE_NAME \
    --image $FRONTEND_IMAGE_NAME \
    --platform managed \
    --region $REGION \
    --allow-unauthenticated \
    --memory 512Mi \
    --cpu 1 \
    --timeout 60 \
    --concurrency 100 \
    --max-instances 5 \
    --set-env-vars BACKEND_URL=$BACKEND_URL

# 获取前端服务URL
FRONTEND_URL=$(gcloud run services describe $FRONTEND_SERVICE_NAME --platform managed --region $REGION --format 'value(status.url)')

echo -e "${GREEN}✅ 前端服务部署成功!${NC}"
echo "   URL: $FRONTEND_URL"

echo ""
echo "================================"
echo -e "${GREEN}🎉 部署完成!${NC}"
echo ""
echo -e "${BLUE}📱 应用访问地址:${NC}"
echo "   前端: $FRONTEND_URL"
echo "   后端: $BACKEND_URL"
echo ""
echo -e "${YELLOW}⚠️  重要提醒:${NC}"
echo "1. 请在 Cloud Run 控制台配置环境变量:"
echo "   - MONGODB_URI: MongoDB 连接字符串"
echo "   - PERPLEXITY_API_KEY: Perplexity API 密钥"
echo "   - TAVILY_API_KEY: Tavily API 密钥"
echo "   - OPENROUTER_API_KEY: OpenRouter API 密钥"
echo ""
echo "2. 配置自定义域名 (可选):"
echo "   gcloud run domain-mappings create --service=$FRONTEND_SERVICE_NAME --domain=your-domain.com"
echo ""
echo -e "${BLUE}🔗 管理链接:${NC}"
echo "   Cloud Run 控制台: https://console.cloud.google.com/run?project=$PROJECT_ID"
echo "   Container Registry: https://console.cloud.google.com/gcr?project=$PROJECT_ID"
