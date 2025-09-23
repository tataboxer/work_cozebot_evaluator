# 部署指南

## 环境要求

### 系统要求
- **操作系统**: Windows/Linux/macOS
- **Node.js**: >= 18.0.0
- **npm**: >= 8.0.0
- **内存**: >= 2GB RAM
- **存储**: >= 1GB 可用空间
- **网络**: 稳定的互联网连接

### 依赖服务
- **Coze API**: 用于AI对话生成
- **火山引擎豆包**: 用于质量评估
- **登录服务**: 用于Token获取
- **Supabase**: 云端数据库服务

## 本地部署

### 1. 克隆项目
```bash
git clone <repository-url>
cd agent-assessment
```

### 2. 安装依赖
```bash
npm install
```

### 3. 环境配置
创建 `.env` 文件：

```env
# 登录服务器配置
LOGIN_HOST=your_login_host
LOGIN_PATH=your_login_path
LOGIN_DEVICE=UNITY
LOGIN_USERNAME=your_encrypted_username
LOGIN_PASSWORD=your_encrypted_password

# Coze API配置
COZE_API_TOKEN=your_coze_api_token
COZE_BOT_ID=your_bot_id

# LLM评估配置
llm_url=https://ark.cn-beijing.volces.com/api/v3/
llm_api_key=your_volcano_api_key
llm_model_name=doubao-1-5-pro-32k-250115

# Supabase配置
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_service_key

# 访问控制配置
ACCESS_KEY=your_access_key

# 并发配置
DATA_PROCESSOR_THREADS=15
ASSESS_THREADS=15

# 服务器端口
PORT=3001
```

### 4. 启动服务
```bash
# 开发模式
npm run dev

# 生产模式
npm start
```

### 5. 访问应用
- 本地访问: http://localhost:3001
- 局域网访问: http://your_ip:3001

## Railway 部署

### 1. 准备工作
- 注册 Railway 账号
- 连接 GitHub 仓库

### 2. 环境变量配置
在 Railway 项目的 Variables 页面设置：

```bash
LOGIN_HOST=your_login_host
LOGIN_PATH=your_login_path
LOGIN_DEVICE=UNITY
LOGIN_USERNAME=your_encrypted_username
LOGIN_PASSWORD=your_encrypted_password
COZE_API_TOKEN=your_coze_token
COZE_BOT_ID=your_bot_id
llm_url=https://ark.cn-beijing.volces.com/api/v3/
llm_api_key=your_llm_key
llm_model_name=doubao-1-5-pro-32k-250115
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_service_key
ACCESS_KEY=your_access_key
DATA_PROCESSOR_THREADS=5
ASSESS_THREADS=5
PORT=3001
```

### 3. 部署配置
确保项目根目录包含：

**package.json**
```json
{
  "scripts": {
    "start": "node server.js"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

### 4. 部署注意事项
- Railway 环境下建议降低并发线程数 (5)
- 确保所有环境变量正确设置
- 部署后检查日志确认 Token 获取正常
- 数据库文件会自动创建

## Vercel 部署

### 1. 项目配置
创建 `vercel.json`：

```json
{
  "version": 2,
  "builds": [
    {
      "src": "server.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/server.js"
    }
  ],
  "env": {
    "NODE_ENV": "production"
  }
}
```

### 2. 环境变量
在 Vercel 项目设置中配置所有必需的环境变量

### 3. 部署限制
- Vercel 有执行时间限制 (10秒)
- 建议降低并发数和批处理大小
- 考虑使用 Vercel Pro 获得更长执行时间

## Docker 部署

### 1. Dockerfile
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3001

CMD ["npm", "start"]
```

### 2. docker-compose.yml
```yaml
version: '3.8'
services:
  agent-assessment:
    build: .
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
    env_file:
      - .env
    volumes:
      - ./data:/app/data
    restart: unless-stopped
```

### 3. 构建和运行
```bash
# 构建镜像
docker build -t agent-assessment .

# 运行容器
docker run -d -p 3001:3001 --env-file .env agent-assessment

# 使用 docker-compose
docker-compose up -d
```

## 生产环境优化

### 1. 性能优化
```bash
# 设置 Node.js 生产环境
export NODE_ENV=production

# 优化内存使用
export NODE_OPTIONS="--max-old-space-size=2048"
```

### 2. 进程管理
使用 PM2 管理 Node.js 进程：

```bash
# 安装 PM2
npm install -g pm2

# 启动应用
pm2 start server.js --name "agent-assessment"

# 设置开机自启
pm2 startup
pm2 save
```

**ecosystem.config.js**
```javascript
module.exports = {
  apps: [{
    name: 'agent-assessment',
    script: 'server.js',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log'
  }]
}
```

### 3. 反向代理
使用 Nginx 作为反向代理：

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 监控和日志

### 1. 应用监控
- 使用 PM2 监控进程状态
- 设置内存和CPU使用率告警
- 监控API响应时间

### 2. 日志管理
```javascript
// 生产环境日志配置
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});
```

## 故障排除

### 常见问题

1. **Token 获取失败**
   - 检查登录服务器配置
   - 验证用户名密码加密
   - 确认网络连接

2. **Supabase连接错误**
   - 检查SUPABASE_URL和SUPABASE_SERVICE_KEY
   - 验证网络连接
   - 检查Supabase项目状态

3. **内存不足**
   - 降低并发线程数
   - 增加系统内存
   - 优化数据处理批次大小

4. **API超时**
   - 检查网络连接稳定性
   - 调整超时时间设置
   - 验证第三方服务状态

### 日志分析
```bash
# 查看应用日志
pm2 logs agent-assessment

# 查看错误日志
tail -f logs/err.log

# 查看系统资源使用
pm2 monit
```