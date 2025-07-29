#!/bin/bash

# Traller 快速部署脚本 (Google Cloud)
# 适用于已配置好的环境

set -e

PROJECT_ID=${GCP_PROJECT_ID:-$(gcloud config get-value project)}
REGION=${GCP_REGION:-"asia-east1"}

if [ -z "$PROJECT_ID" ]; then
    echo "❌ 请设置 GCP_PROJECT_ID 环境变量或配置 gcloud 项目"
    exit 1
fi

echo "🚀 快速部署到 Google Cloud..."
echo "项目: $PROJECT_ID"
echo "区域: $REGION"

# 构建并部署后端
echo "📦 构建后端..."
cd backend
gcloud builds submit --tag gcr.io/$PROJECT_ID/traller-backend
cd ..

# 构建并部署前端
echo "📦 构建前端..."
cd frontend
gcloud builds submit --tag gcr.io/$PROJECT_ID/traller-frontend
cd ..

# 部署服务
echo "🚀 部署服务..."
gcloud run deploy traller-backend \
    --image gcr.io/$PROJECT_ID/traller-backend \
    --platform managed \
    --region $REGION \
    --allow-unauthenticated \
    --memory 1Gi \
    --timeout 300

gcloud run deploy traller-frontend \
    --image gcr.io/$PROJECT_ID/traller-frontend \
    --platform managed \
    --region $REGION \
    --allow-unauthenticated \
    --memory 512Mi

echo "✅ 部署完成!"
echo "前端: $(gcloud run services describe traller-frontend --platform managed --region $REGION --format 'value(status.url)')"
echo "后端: $(gcloud run services describe traller-backend --platform managed --region $REGION --format 'value(status.url)')"
