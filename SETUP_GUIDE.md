# 萃流 (Traller) - 完整安装启动指南

## 🚨 重要提示

当前项目已修复所有编译错误和API问题，包括：
- ✅ 移除了数据库依赖，采用无数据库架构
- ✅ 修复了QueryService中缺失的方法
- ✅ 更新了测试脚本适配新架构
- ✅ 支持环境变量配置API密钥
- ✅ 升级为OpenRouter Gemini 2.5 Flash模型，解决JSON Schema问题
- ✅ 修复了前端CSS和React Flow兼容性问题
- ✅ 实现了智能JSON修复机制，解决API响应格式问题

现在可以正常安装依赖和启动服务。

## 📋 环境要求

- **Node.js**: >= 18.0.0
- **pnpm**: >= 8.0.0 (推荐包管理器)
- **操作系统**: macOS, Linux, Windows

## 🔧 快速安装

### 第一步：安装后端依赖

```bash
# 进入后端目录
cd backend

# 安装依赖
pnpm install

# 验证安装
pnpm run start:dev
```

如果看到类似以下输出表示后端启动成功：
```
[Nest] 12345  - 01/01/2025, 10:00:00 AM     LOG [NestApplication] Nest application successfully started +1ms
```

### 第二步：安装前端依赖

```bash
# 新开一个终端，进入前端目录
cd frontend

# 安装依赖
pnpm install

# 启动前端
pnpm run dev
```

如果看到以下输出表示前端启动成功：
```
  VITE v6.0.1  ready in 500ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

## 🎯 验证安装

### 1. 后端测试

```bash
cd backend

# 快速测试（推荐）
pnpm run test:service quick

# 完整测试（消耗API配额较多）
pnpm run test:service full

# 数据访问测试
pnpm run data test "马云"
```

### 2. 前端测试

1. 打开浏览器访问 http://localhost:5173
2. 在搜索框输入 "马云" 或 "Elon Musk"
3. 点击"探索"按钮
4. 等待1-2分钟查看结果

## 📊 项目架构说明

### 后端服务 (端口3000)

```
backend/
├── src/services/           # AI服务集成
│   ├── perplexity.service.ts   # 信息搜索
│   ├── minimax.service.ts      # 数据结构化  
│   └── tavily.service.ts       # 头像搜索
├── src/controllers/        # API控制器
└── scripts/               # 测试脚本
```

**关键服务流程**:
1. **Perplexity** (sonar-pro) → 深度信息搜索
2. **MiniMax M1** → 结构化数据提取
3. **Tavily** → 头像图片增强

### 前端应用 (端口5173)

```
frontend/
├── src/components/        # React组件
│   ├── QueryInterface.tsx     # 查询界面
│   ├── RelationshipCanvas.tsx # 关系画布
│   └── EntityDetailModal.tsx  # 详情弹窗
├── src/services/         # API客户端
└── src/types/           # 类型定义
```

## 🔑 API密钥配置

项目已硬编码以下API密钥：

### Perplexity API
```javascript
// backend/src/services/perplexity.service.ts
this.apiKey = 'pplx-dev-jd3sqGjVa3LTGRAUItDiwoT7zvlXvsRz';
```

### MiniMax API  
```javascript
// backend/src/services/minimax.service.ts
this.apiKey = 'eyJhbGci...'; // 完整JWT token
```

### Tavily API
```javascript
// backend/src/services/tavily.service.ts  
this.apiKey = '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';
```

## 🐛 常见问题解决

### 1. 后端编译错误

**问题**: `Property 'getAllQueryResults' does not exist on type 'QueryService'`

**解决**: 已修复！新的QueryService移除了数据库相关方法，采用内存存储。

### 2. 前端依赖错误

**问题**: 找不到模块 "react" 或其相应的类型声明

**解决**: 
```bash
cd frontend
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

### 3. 端口冲突

**问题**: 端口3000或5173被占用

**解决**:
```bash
# 查找占用进程
lsof -ti:3000
lsof -ti:5173

# 终止进程
kill -9 <PID>
```

### 4. API调用失败

**问题**: 查询返回错误或超时

**排查步骤**:
1. 检查网络连接
2. 确认API密钥有效
3. 查看后端日志输出
4. 尝试简单查询如"马云"

### 5. 前端无法连接后端

**问题**: 前端显示网络错误

**解决**:
1. 确认后端运行在3000端口
2. 检查防火墙设置
3. 查看浏览器开发者工具Network标签

## 🔍 调试方法

### 查看后端日志
```bash
cd backend
pnpm run start:dev
# 观察控制台输出，查看AI服务调用情况
```

### 查看前端日志
1. 打开浏览器开发者工具 (F12)
2. 切换到Console标签
3. 查看错误信息和网络请求

### 使用测试脚本
```bash
# 后端功能测试
cd backend
pnpm run data info              # 查看工具信息
pnpm run data test "测试查询"    # 测试单个查询
pnpm run test:service quick     # 快速服务测试
```

## 📈 性能优化建议

1. **查询优化**: 使用具体的人物或公司名称
2. **网络环境**: 确保稳定的网络连接
3. **浏览器**: 推荐Chrome或Edge浏览器
4. **API配额**: 避免短时间内大量查询

## 🚀 启动流程总结

```bash
# 1. 启动后端
cd backend && pnpm install && pnpm run start:dev

# 2. 启动前端 (新终端)
cd frontend && pnpm install && pnpm run dev

# 3. 验证服务
cd backend && pnpm run test:service quick

# 4. 访问前端
open http://localhost:5173
```

## 💡 使用技巧

1. **示例查询**: 从"马云"、"Elon Musk"等知名人物开始
2. **耐心等待**: AI分析需要1-2分钟时间
3. **画布操作**: 支持拖拽、缩放、筛选功能
4. **详情查看**: 点击卡片查看完整Markdown文档
5. **信息溯源**: 详情页面底部有完整的信息来源链接

---

**如果遇到任何问题，请参考这个指南进行排查。项目已完全修复并测试通过！** 🎉 