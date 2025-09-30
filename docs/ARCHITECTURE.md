# 系统架构文档

## 整体架构

### 架构概览
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   前端 (SPA)    │    │   后端 (API)    │    │   外部服务      │
│                 │    │                 │    │                 │
│ ┌─────────────┐ │    │ ┌─────────────┐ │    │ ┌─────────────┐ │
│ │ 数据处理页  │ │    │ │ Express     │ │    │ │ Coze API    │ │
│ └─────────────┘ │    │ │ 服务器      │ │    │ └─────────────┘ │
│ ┌─────────────┐ │    │ └─────────────┘ │    │ ┌─────────────┐ │
│ │ 记录查询页  │ │◄──►│ ┌─────────────┐ │◄──►│ │ 火山引擎    │ │
│ └─────────────┘ │    │ │ 业务逻辑层  │ │    │ │ 豆包 LLM    │ │
│ ┌─────────────┐ │    │ └─────────────┘ │    │ └─────────────┘ │
│ │ 统计分析页  │ │    │ ┌─────────────┐ │    │ ┌─────────────┐ │
│ └─────────────┘ │    │ │ Supabase    │ │    │ │ 登录服务    │ │
│ ┌─────────────┐ │    │ │ 数据库      │ │    │ │ (Token)     │ │
│ │ 评估器管理  │ │    │ └─────────────┘ │    │ └─────────────┘ │
│ └─────────────┘ │    │                 │    │                 │
│ ┌─────────────┐ │    │                 │    │                 │
│ │ 问题搜索页  │ │    │                 │    │                 │
│ └─────────────┘ │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### 技术栈选择

#### 前端技术栈
- **原生 JavaScript (ES6+)**: 轻量级，无框架依赖
- **模块化设计**: 5个独立模块，职责分离
- **CSS3 + Flexbox**: 响应式布局
- **File API**: 文件上传和处理

#### 后端技术栈
- **Node.js**: 高性能JavaScript运行时
- **Express.js**: 轻量级Web框架
- **Supabase**: 云端PostgreSQL数据库服务
- **Multer**: 文件上传中间件（内存模式）
- **@supabase/supabase-js**: Supabase JavaScript客户端

#### 数据处理
- **xlsx**: Excel文件解析
- **axios**: HTTP客户端
- **Promise.all**: 并发处理

## 系统分层

### 1. 表现层 (Presentation Layer)
```
public/
├── index.html          # 主页面
├── css/styles.css      # 样式文件
└── js/
    ├── universal-statistics.js # 前端统计工具
    ├── app.js          # 主应用逻辑
    ├── navigation.js   # 导航管理
    ├── data-manager.js # 数据管理
    ├── session-modal.js # 会话详情
    └── simple-list-renderer.js # 列表渲染
```

**职责**:
- 用户界面展示
- 用户交互处理
- 数据可视化
- 统一统计计算（前端）
- 状态管理

### 2. 应用层 (Application Layer)
```
routes/
├── coze-bot-id.js      # 扣子ID管理路由
├── process-excel.js    # Excel处理路由
├── run-assessment.js   # 评估执行路由
├── sessions.js         # 会话管理路由
└── session-details.js  # 会话详情路由
```

**职责**:
- HTTP请求路由
- 请求参数验证
- 响应格式化
- 错误处理

### 3. 业务逻辑层 (Business Logic Layer)
```
lib/
├── universal-statistics.js # 通用统计计算模块
├── token-manager.js    # Token管理
├── coze-client.js      # Coze API客户端
├── llm-client.js       # LLM API客户端
├── evaluator-manager.js # 评估器管理模块
├── prompt-builder.js   # 提示词构建器
└── assessment-storage.js # 数据存储逻辑
```

**职责**:
- 核心业务逻辑
- 统一统计计算（支持Node.js和浏览器环境）
- 外部API集成
- 评估器动态选择和管理
- 提示词动态生成
- 数据处理算法
- 业务规则实现

### 4. 数据访问层 (Data Access Layer)
```
Supabase (PostgreSQL)   # 云端数据库
├── assessment_sessions # 会话表 (JSONB字段)
├── assessment_results  # 结果表 (JSONB字段)
├── evaluators         # 评估器表
├── evaluator_versions # 评估器版本表 (JSONB配置)
└── access_logs        # 访问日志表
```

**职责**:
- 云端数据持久化和实时同步
- PostgreSQL JSONB高效查询
- 评估器配置和版本管理
- 自动备份、扩展和恢复
- 行级安全策略 (RLS)
- 内置API生成和实时订阅

## 核心模块设计

### 前端模块架构

#### app.js - 主应用模块
```javascript
// 核心功能
- 文件上传处理
- Excel数据处理
- 评估流程控制
- 进度显示管理
- 错误处理

// 依赖关系
app.js → data-manager.js → simple-list-renderer.js
```

#### navigation.js - 导航模块
```javascript
// 核心功能
- 页面切换管理
- 会话列表加载
- 搜索和筛选
- 分页处理

// 依赖关系
navigation.js → session-modal.js
```

#### evaluator-manager.js - 评估器管理模块
```javascript
// 核心功能
- 评估器列表管理
- 评估器创建和编辑
- 版本历史管理
- 状态切换控制

// 依赖关系
evaluator-manager.js → evaluator-modal.js
```

#### question-search.js - 问题搜索模块
```javascript
// 核心功能
- 问题内容全文搜索
- 时间范围筛选
- 分页浏览
- 动态表格渲染

// 依赖关系
question-search.js → simple-list-renderer.js
```

#### data-manager.js - 数据管理模块
```javascript
// 核心功能
- API调用封装
- 数据状态管理
- 缓存机制
- 错误重试

// 接口设计
class DataManager {
  async processExcel(file)
  async runAssessment(data)
  async loadSessions(params)
  async deleteSession(id)
}
```

### 后端模块架构

#### evaluator-manager.js - 评估器管理
```javascript
// 设计模式: 单例模式 + 缓存策略
class EvaluatorManager {
  constructor() {
    this.cache = new Map();
    this.cacheExpiry = 5 * 60 * 1000; // 5分钟缓存
  }
  
  async getActiveEvaluators() {
    // 获取活跃评估器（带缓存）
  }
  
  async selectEvaluators(questions) {
    // 根据问题类型动态选择评估器
    // 1. 优先使用专门的评估器（question_type匹配）
    // 2. 如果没有专门的评估器，使用通用评估器
    // 3. 如果都没有，使用默认评估器
  }
  
  async getEvaluatorByVersionId(versionId) {
    // 根据版本ID获取评估器信息（带缓存）
  }
}
```

#### prompt-builder.js - 提示词构建器
```javascript
// 设计模式: 静态工厂模式
class PromptBuilder {
  static buildPrompt(evaluatorVersion, question, answer, context, expectedAnswer) {
    // 根据评估器配置动态生成提示词
    // 处理上下文信息
    // 构建评估维度说明
    // 生成JSON输出格式
  }
  
  static validateEvaluatorVersion(evaluatorVersion) {
    // 验证评估器版本配置有效性
  }
  
  static parseEvaluationResult(result, expectedDimensions) {
    // 解析LLM返回的评估结果
  }
}
```

#### coze-client.js - Coze API客户端
```javascript
// 设计模式: 工厂模式
class CozeClient {
  constructor(config) {
    this.apiToken = config.apiToken;
    this.botId = config.botId;
    this.concurrency = config.concurrency;
  }
  
  async processQuestions(questions) {
    // 并发处理
    // 错误重试
    // 进度回调
  }
}
```

#### assessment-storage.js - 数据存储
```javascript
// 设计模式: 仓储模式
const supabase = require('./supabase-client');

// 保存评估结果到Supabase
async function saveAssessmentResults(frontendData, metadata) {
  const sessionId = `session_${Date.now()}`;
  
  // 筛选有效的评估结果
  const resultsToSave = frontendData.filter(row => 
    row.block_type === 'answer' && 
    row.block_subtype === '文本回复' &&
    row['准确率'] && row['专业度'] && row['语气合理']
  ).map(row => ({
    session_id: sessionId,
    chatid: row.chatid,
    question_text: row.question_text,
    context: row.context ? JSON.parse(row.context) : null,
    ai_response: row.block_result,
    evaluation_results: {
      accuracy: { score: row['准确率'], reason: row['准确率_理由'] },
      professionalism: { score: row['专业度'], reason: row['专业度_理由'] },
      tone_reasonableness: { score: row['语气合理'], reason: row['语气合理_理由'] }
    }
  }));

  // 创建会话记录
  const { error: sessionError } = await supabase
    .from('assessment_sessions')
    .insert(sessionData);

  // 插入评估结果
  const { data, error } = await supabase
    .from('assessment_results')
    .insert(resultsToSave);

  return { sessionId, count: resultsToSave.length };
}
```

## 数据流设计

### 1. Excel处理流程
```
用户上传Excel → 文件验证 → 解析数据 → 获取Token → 
调用Coze API → 并发处理 → 收集结果 → 返回前端
```

**详细流程**:
```javascript
// 1. 文件上传
POST /api/process-excel
├── multer中间件处理文件
├── 文件格式验证
└── 解析Excel数据

// 2. 数据处理
TokenManager.getToken()
├── 检查缓存Token
├── 如需要则重新获取
└── 返回有效Token

// 3. API调用
CozeClient.processQuestions()
├── 并发控制 (15线程)
├── 错误重试机制
├── 进度回调
└── 结果收集

// 4. 响应返回
{
  success: true,
  data: processedData,
  stats: performanceStats
}
```

### 2. 评估执行流程
```
接收处理结果 → 分析问题类型 → 选择评估器 → 生成提示词 → 
调用LLM API → 并发评估 → 保存结果 → 生成统计 → 返回结果
```

**详细流程**:
```javascript
// 1. 评估器选择
EvaluatorManager.selectEvaluators(questions)
├── 统计问题类型分布
├── 匹配专用评估器
├── 回退到默认评估器
└── 返回选择结果

// 2. 提示词生成
PromptBuilder.buildPrompt()
├── 解析评估器配置
├── 构建上下文信息
├── 生成评估维度说明
└── 格式化输出模板

// 3. LLM评估
LLMClient.assessQuestions()
├── 并发控制 (15线程)
├── 评估结果解析
├── 错误处理
└── 进度更新

// 4. 数据存储
AssessmentStorage.saveResults()
├── 批量插入结果
├── 关联评估器版本
├── 更新会话统计
└── 事务处理

// 5. 统计计算
calculateEvaluationSummary()
├── 平均分计算
├── 性能统计
└── 结果摘要
```

### 3. 会话查询流程
```
查询请求 → 参数验证 → 数据库查询 → 
结果分页 → 数据格式化 → 返回响应
```

### 4. 问题搜索流程
```
搜索请求 → 构建查询条件 → 全文搜索 → 
时间筛选 → 分页处理 → 返回结果
```

**详细流程**:
```javascript
// 1. 查询构建
supabase.from('assessment_results')
├── 问题内容模糊匹配 (ILIKE)
├── 时间范围筛选 (GTE/LTE)
├── 关联会话信息 (JOIN)
└── 排序和分页

// 2. 结果处理
QuestionSearch.renderTable()
├── 动态解析评估维度
├── 构建表头结构
├── 渲染表格内容
└── 应用样式和格式化
```

### 5. 评估器管理流程
```
管理请求 → 权限验证 → 业务逻辑处理 → 
数据库操作 → 缓存更新 → 返回结果
```

**详细流程**:
```javascript
// 1. 评估器创建
EvaluatorRouter.createEvaluator()
├── 验证必填字段
├── 检查权重总和
├── 处理默认评估器逻辑
├── 创建评估器和版本
└── 清除缓存

// 2. 版本管理
EvaluatorRouter.createVersion()
├── 生成新版本号
├── 标记旧版本为非最新
├── 插入新版本记录
└── 更新缓存
```

## 并发处理设计

### 1. 前端并发控制
```javascript
// 使用Promise.all控制并发
async function processBatch(items, batchSize = 15) {
  const results = [];
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(item => processItem(item))
    );
    results.push(...batchResults);
  }
  
  return results;
}
```

### 2. 后端并发管理
```javascript
// 使用p-limit控制并发数
const pLimit = require('p-limit');
const limit = pLimit(15);

async function processQuestions(questions) {
  const promises = questions.map(question => 
    limit(() => processQuestion(question))
  );
  
  return Promise.all(promises);
}
```

## 错误处理架构

### 1. 分层错误处理
```javascript
// 应用层错误处理
app.use((error, req, res, next) => {
  console.error('Application Error:', error);
  
  if (error.type === 'validation') {
    return res.status(400).json({
      success: false,
      error: error.message
    });
  }
  
  res.status(500).json({
    success: false,
    error: '服务器内部错误'
  });
});
```

### 2. 业务逻辑错误处理
```javascript
// 重试机制
async function withRetry(fn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await delay(1000 * Math.pow(2, i)); // 指数退避
    }
  }
}
```

## 性能优化策略

### 1. 前端性能优化
- **懒加载**: 按需加载模块和数据
- **虚拟滚动**: 处理大量数据展示
- **防抖节流**: 优化搜索和滚动事件
- **缓存策略**: 缓存API响应数据

### 2. 后端性能优化
- **连接池**: 数据库连接复用
- **查询优化**: 使用索引和分页
- **内存管理**: 及时释放大对象
- **并发控制**: 合理设置并发数

### 3. 数据库优化
- **Supabase优化**: 利用PostgreSQL索引和查询优化
- **实时订阅**: 使用Supabase实时功能
- **RLS策略**: 行级安全策略保护数据
- **自动扩展**: 云端自动处理性能扩展

## 安全架构

### 1. 访问控制
```javascript
// 中间件验证
function authenticateRequest(req, res, next) {
  const accessKey = req.headers['x-access-key'];
  
  if (!accessKey || accessKey !== process.env.ACCESS_KEY) {
    return res.status(401).json({
      success: false,
      error: '未授权访问'
    });
  }
  
  next();
}
```

### 2. 数据安全
- **参数验证**: 严格验证输入参数
- **Supabase安全**: 内置SQL注入防护和RLS
- **文件类型检查**: 限制上传文件类型
- **敏感信息保护**: 环境变量存储密钥
- **API密钥管理**: Supabase服务密钥保护

## 扩展性设计

### 1. 水平扩展
- **无状态设计**: 支持多实例部署
- **负载均衡**: 使用Nginx分发请求
- **Supabase扩展**: 云端自动处理数据库扩展
- **边缘计算**: 利用Supabase Edge Functions

### 2. 功能扩展
- **插件架构**: 支持评估器插件
- **配置化**: 通过配置文件扩展功能
- **API版本控制**: 支持多版本API共存

### 3. 监控和运维
- **健康检查**: 提供健康检查端点
- **性能监控**: 集成APM工具
- **日志聚合**: 结构化日志输出