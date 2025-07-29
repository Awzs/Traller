# 🚀 Traller 部署指南

## 📋 前置要求

### 1. MongoDB Atlas 设置
1. 访问 [MongoDB Atlas](https://www.mongodb.com/atlas/database)
2. 创建免费集群（M0 Sandbox）
3. 创建数据库用户
4. 配置网络访问（允许所有IP：`0.0.0.0/0`）
5. 获取连接字符串，格式如：
   ```
   mongodb+srv://username:password@cluster.mongodb.net/traller?retryWrites=true&w=majority
   ```

### 2. Google Cloud 设置
1. 确保已启用以下API：
   - Cloud Run API
   - Cloud Build API
   - Artifact Registry API

2. 创建Artifact Registry仓库：
   ```bash
   gcloud artifacts repositories create traller-backend \
     --repository-format=docker \
     --location=europe-west1 \
     --description="Traller backend Docker repository"
   ```

## 🔧 GitHub Actions 自动部署

### 1. 设置GitHub Secrets
在GitHub仓库中设置以下Secrets：

#### GCP_CREDENTIALS
```bash
# 创建服务账号
gcloud iam service-accounts create github-actions \
    --description="Service account for GitHub Actions" \
    --display-name="GitHub Actions"

# 授予权限
gcloud projects add-iam-policy-binding n8n-x-462812 \
    --member="serviceAccount:github-actions@n8n-x-462812.iam.gserviceaccount.com" \
    --role="roles/run.admin"

gcloud projects add-iam-policy-binding n8n-x-462812 \
    --member="serviceAccount:github-actions@n8n-x-462812.iam.gserviceaccount.com" \
    --role="roles/storage.admin"

gcloud projects add-iam-policy-binding n8n-x-462812 \
    --member="serviceAccount:github-actions@n8n-x-462812.iam.gserviceaccount.com" \
    --role="roles/artifactregistry.admin"

# 创建密钥
gcloud iam service-accounts keys create key.json \
    --iam-account=github-actions@n8n-x-462812.iam.gserviceaccount.com
```

将 `key.json` 的内容复制到GitHub Secret `GCP_CREDENTIALS`

#### MONGODB_URI
将MongoDB Atlas连接字符串设置为GitHub Secret `MONGODB_URI`

### 2. 触发部署
推送到 `main` 分支即可自动部署！

## 🛠️ 手动部署

### 1. 本地构建
```bash
# 配置认证
gcloud auth login
gcloud config set project n8n-x-462812
gcloud auth configure-docker europe-west1-docker.pkg.dev

# 构建并推送
docker build -f backend/Dockerfile -t europe-west1-docker.pkg.dev/n8n-x-462812/traller-backend/traller:latest .
docker push europe-west1-docker.pkg.dev/n8n-x-462812/traller-backend/traller:latest
```

### 2. 部署到Cloud Run
```bash
gcloud run deploy traller \
  --image europe-west1-docker.pkg.dev/n8n-x-462812/traller-backend/traller:latest \
  --region europe-west1 \
  --platform managed \
  --allow-unauthenticated \
  --port 8080 \
  --memory 1Gi \
  --cpu 1 \
  --timeout 300 \
  --max-instances 10 \
  --set-env-vars NODE_ENV=production,PORT=8080,MONGODB_URI="your-mongodb-connection-string"
```

## 🔍 故障排除

### 常见问题
1. **COPY failed: no source files** - 确保Build Context设置为 `/`
2. **MongoDB连接失败** - 检查MONGODB_URI环境变量
3. **权限错误** - 确保服务账号有足够权限

### 查看日志
```bash
gcloud logs read --service=traller --region=europe-west1
```

## 📊 监控
- Cloud Run控制台：监控请求、延迟、错误
- Cloud Logging：查看应用日志
- MongoDB Atlas：监控数据库性能

## 🎯 下一步
1. 设置自定义域名
2. 配置SSL证书
3. 设置监控告警
4. 优化性能配置
