# 开发指南

## 开发环境搭建

### 1. 环境要求
- Node.js >= 18.0.0
- npm >= 8.0.0
- Git
- VS Code (推荐)

### 2. 项目初始化
```bash
git clone <repository-url>
cd agent-assessment
npm install
```

### 3. 开发环境配置
创建 `.env` 文件：
```env
# 登录服务配置
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

# 访问控制
ACCESS_KEY=your_access_key

# 并发配置
DATA_PROCESSOR_THREADS=15
ASSESS_THREADS=15

# 服务器配置
PORT=3001
NODE_ENV=development
```

### 4. 启动开发服务器
```bash
npm run dev
```

## 项目架构

### 目录结构
```
agent-assessment/
├── server.js              # Express服务器入口
├── lib/                   # 核心业务逻辑
│   ├── token-manager.js   # Token管理
│   ├── coze-client.js     # Coze API客户端
│   ├── llm-client.js      # LLM API客户端
│   └── assessment-storage.js # 数据库操作
├── routes/               # API路由
│   ├── process-excel.js   # Excel处理
│   ├── run-assessment.js  # 评估执行
│   ├── sessions.js        # 会话管理
│   └── session-details.js # 会话详情
└── public/               # 前端资源
    ├── js/               # JavaScript模块
    ├── css/              # 样式文件
    └── templates/        # 模板文件
```

### 模块设计

#### 后端模块

**lib/token-manager.js**
- Token获取和管理
- 支持动态刷新
- 错误处理和重试

**lib/coze-client.js**
- Coze API封装
- 并发请求管理
- 响应数据处理

**lib/llm-client.js**
- LLM评估API封装
- 评估结果解析
- 错误处理

**lib/assessment-storage.js**
- Supabase数据库操作封装
- 会话和结果管理
- 评估结果存储和统计

**lib/supabase-client.js**
- Supabase客户端初始化
- 数据库连接管理

#### 前端模块

**js/app.js**
- 主应用逻辑
- 文件上传处理
- 进度显示

**js/data-manager.js**
- 数据处理逻辑
- API调用封装
- 状态管理

**js/navigation.js**
- 页面导航
- 会话列表管理
- 搜索和分页

**js/session-modal.js**
- 会话详情弹窗
- 数据表格渲染
- 导出功能

## 开发规范

### 代码风格

#### JavaScript
```javascript
// 使用 const/let，避免 var
const apiUrl = '/api/sessions';
let currentPage = 1;

// 函数命名使用驼峰式
function loadSessionData() {
  // 实现
}

// 异步函数使用 async/await
async function fetchData() {
  try {
    const response = await fetch(apiUrl);
    return await response.json();
  } catch (error) {
    console.error('Error:', error);
  }
}
```

#### CSS
```css
/* 使用 BEM 命名规范 */
.session-modal {}
.session-modal__header {}
.session-modal__content {}
.session-modal--active {}

/* 使用 CSS 变量 */
:root {
  --primary-color: #007bff;
  --border-radius: 4px;
}
```

### API 设计规范

#### 请求格式
```javascript
// 统一的请求头
const headers = {
  'Content-Type': 'application/json',
  'x-access-key': accessKey
};

// 统一的错误处理
if (!response.ok) {
  throw new Error(`HTTP ${response.status}`);
}
```

#### 响应格式
```javascript
// 成功响应
{
  "success": true,
  "data": {},
  "message": "操作成功"
}

// 错误响应
{
  "success": false,
  "error": "错误信息",
  "code": "ERROR_CODE"
}
```

### Supabase操作规范

#### 查询优化
```javascript
// 使用Supabase客户端查询
const { data, error } = await supabase
  .from('assessment_sessions')
  .select('*')
  .gte('created_at', startDate)
  .lte('created_at', endDate)
  .order('created_at', { ascending: false })
  .range(offset, offset + limit - 1);

// 批量插入操作
const { data, error } = await supabase
  .from('assessment_results')
  .insert(results);
```

#### 错误处理
```javascript
try {
  const { data, error } = await supabase
    .from('assessment_sessions')
    .select('*');
    
  if (error) throw error;
  return data;
} catch (error) {
  console.error('Supabase error:', error);
  throw new Error('数据库操作失败');
}
```

## 测试

### 单元测试
使用 Jest 进行单元测试：

```javascript
// tests/token-manager.test.js
const TokenManager = require('../lib/token-manager');

describe('TokenManager', () => {
  test('should get valid token', async () => {
    const token = await TokenManager.getToken();
    expect(token).toBeDefined();
    expect(typeof token).toBe('string');
  });
});
```

### API 测试
```javascript
// tests/api.test.js
const request = require('supertest');
const app = require('../server');

describe('API Tests', () => {
  test('GET /api/sessions', async () => {
    const response = await request(app)
      .get('/api/sessions')
      .set('x-access-key', 'test-key');
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });
});
```

### 运行测试
```bash
# 运行所有测试
npm test

# 运行特定测试
npm test -- token-manager

# 生成覆盖率报告
npm run test:coverage
```

## 调试

### 后端调试
```javascript
// 使用 debug 模块
const debug = require('debug')('app:server');

debug('Server starting on port %d', port);

// 环境变量控制调试输出
// DEBUG=app:* npm start
```

### 前端调试
```javascript
// 开发环境下的调试信息
if (process.env.NODE_ENV === 'development') {
  console.log('Debug info:', data);
}

// 使用浏览器开发者工具
debugger; // 设置断点
```

### 日志记录
```javascript
// 使用 winston 进行日志记录
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'app.log' })
  ]
});
```

## 性能优化

### 前端优化
```javascript
// 防抖处理搜索
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// 虚拟滚动处理大量数据
function renderVisibleRows(startIndex, endIndex) {
  // 只渲染可见行
}
```

### 后端优化
```javascript
// 使用连接池
const pool = new Pool({
  connectionLimit: 10,
  acquireTimeout: 60000,
  timeout: 60000
});

// 缓存频繁查询的数据
const cache = new Map();
function getCachedData(key) {
  if (cache.has(key)) {
    return cache.get(key);
  }
  const data = fetchFromDatabase(key);
  cache.set(key, data);
  return data;
}
```

## 部署准备

### 构建脚本
```json
{
  "scripts": {
    "build": "npm run build:css && npm run build:js",
    "build:css": "postcss src/css/main.css -o public/css/styles.css",
    "build:js": "webpack --mode production",
    "start": "node server.js",
    "dev": "nodemon server.js"
  }
}
```

### 环境检查
```javascript
// 检查必需的环境变量
const requiredEnvVars = [
  'LOGIN_HOST',
  'COZE_API_TOKEN',
  'llm_api_key',
  'ACCESS_KEY'
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`Missing required environment variable: ${envVar}`);
    process.exit(1);
  }
}
```

## 贡献指南

### 提交规范
```bash
# 提交信息格式
git commit -m "feat: 添加会话详情导出功能"
git commit -m "fix: 修复Token获取超时问题"
git commit -m "docs: 更新API文档"

# 类型说明
# feat: 新功能
# fix: 修复bug
# docs: 文档更新
# style: 代码格式调整
# refactor: 代码重构
# test: 测试相关
# chore: 构建过程或辅助工具的变动
```

### Pull Request
1. Fork 项目
2. 创建功能分支: `git checkout -b feature/new-feature`
3. 提交更改: `git commit -m 'feat: add new feature'`
4. 推送分支: `git push origin feature/new-feature`
5. 创建 Pull Request

### 代码审查
- 确保代码符合项目规范
- 添加必要的测试用例
- 更新相关文档
- 通过所有自动化测试