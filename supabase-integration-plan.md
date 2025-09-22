# 🗄️ Supabase 数据库集成方案

## 📋 方案概述

将现有纯前端评估平台集成 Supabase PostgreSQL，实现评估结果持久化存储，保持现有 Railway 部署架构不变。

## 🎯 设计目标

- **最小侵入**: 不影响现有评估流程
- **数据完整**: 记录完整评估过程和结果
- **查询友好**: 支持统计分析和历史查询
- **部署兼容**: 完全兼容 Railway 部署

## 🔍 关键发现

通过分析现有项目代码，发现：

1. **无会话ID概念**: 现有项目是纯前端数据流，没有会话ID管理
2. **评估完成后存储**: 评估在 `run-assessment` 路由中完成，适合批量存储
3. **数据结构**: 使用中文字段名（`准确率`、`专业度`、`语气合理`）
4. **前端数据管理**: 数据在前端管理，后端不保存状态

## 🏗️ 数据库设计

### 表结构设计

#### 评估结果表 (assessment_results)

| 字段名 | 数据类型 | 约束 | 默认值 | 说明 |
|--------|----------|------|--------|------|
| id | UUID | PRIMARY KEY | gen_random_uuid() | 主键ID |
| batch_id | VARCHAR(50) | - | - | 批次ID(同次评估标识) |
| metadata | JSONB | - | '{}' | 元数据(模型/IP/时间等) |
| chatid | VARCHAR(100) | - | - | 对话ID |
| question_id | VARCHAR(100) | - | - | 问题ID |
| question_type | VARCHAR(50) | - | - | 问题类型 |
| question_text | TEXT | NOT NULL | - | 问题内容 |
| context | JSONB | - | - | 对话上下文 |
| expected_answer | TEXT | - | - | 期望答案 |
| ai_response | TEXT | NOT NULL | - | AI回复内容 |
| block_start | DECIMAL(10,3) | - | - | 首token时间(秒) |
| block_end | DECIMAL(10,3) | - | - | 结束时间(秒) |
| evaluation_results | JSONB | - | '{}' | 评估结果(灵活结构) |
| evaluation_version | VARCHAR(20) | - | 'v1.0' | 评估器版本 |
| created_at | TIMESTAMP WITH TIME ZONE | - | NOW() | 创建时间 |

**索引:**
- `idx_batch_results` (batch_id)
- `idx_evaluation_version` (evaluation_version)
- `idx_evaluation_results` USING GIN (evaluation_results)
- `idx_block_timing` (block_start, block_end)

### 📊 数据结构说明

#### evaluation_results 字段结构

**当前版本 (v1.0):**
```json
{
  "accuracy": {
    "score": 85,
    "reason": "回答准确，覆盖了关键信息点"
  },
  "professionalism": {
    "score": 90,
    "reason": "用词专业，表达规范"
  },
  "tone_reasonableness": {
    "score": 88,
    "reason": "语气友好，符合科技馆服务标准"
  }
}
```

**未来扩展 (v2.0+):**
```json
{
  "accuracy": { "score": 85, "reason": "..." },
  "professionalism": { "score": 90, "reason": "..." },
  "tone_reasonableness": { "score": 88, "reason": "..." },
  "creativity": { "score": 75, "reason": "回答有创新性" },
  "safety": { "score": 95, "reason": "内容安全无风险" }
}
```

#### metadata 字段结构
```json
{
  "model": "doubao-1-5-pro-32k-250115",
  "ip": "192.168.1.100",
  "timestamp": "2025-01-19T10:30:00Z"
}
```

## 🔧 技术实现

### 依赖添加
```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.39.0"
  }
}
```

### 环境变量
```env
# Supabase 配置
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key
```

### 核心模块结构
```
lib/
├── supabase-client.js     # Supabase 客户端
└── assessment-storage.js  # 评估数据存储逻辑
```

## 📊 数据流设计

### 1. 评估完成后直接存储
```javascript
// 在 run-assessment.js 中，评估完成后直接存储
const batchId = `batch_${Date.now()}`;
const metadata = {
  model: process.env.llm_model_name,
  ip: req.ip,
  userAgent: req.get('User-Agent'),
  timestamp: new Date().toISOString()
};
```

### 2. 批量存储评估结果
```javascript
// 批量插入所有评估结果
const resultsToSave = evaluatedData.map(row => ({
  batch_id: batchId,
  chatid: row.chatid,
  question_id: row.question_id,
  question_type: row.question_type,
  question_text: row.question_text,
  context: row.context ? JSON.parse(row.context) : null,
  expected_answer: row.expected_answer,
  ai_response: row.block_result,
  evaluation_results: {
    accuracy: { score: row['准确率'], reason: row['准确率_理由'] },
    professionalism: { score: row['专业度'], reason: row['专业度_理由'] },
    tone_reasonableness: { score: row['语气合理'], reason: row['语气合理_理由'] }
  },
  evaluation_version: 'v1.0',
  metadata: metadata
}));

await supabase.from('assessment_results').insert(resultsToSave);
```



## 🔌 集成点设计

### 现有代码集成点

#### 1. 评估完成后直接存储 (`routes/run-assessment.js`)
```javascript
// 评估完成后，直接批量存储
const { data: frontendData } = req.body;
const batchId = `batch_${Date.now()}`;
const metadata = {
  model: process.env.llm_model_name,
  ip: req.ip,
  timestamp: new Date().toISOString()
};

const resultsToSave = frontendData.filter(row => 
  row.block_type === 'answer' && 
  row.block_subtype === '文本回复' &&
  row['准确率'] && row['专业度'] && row['语气合理']
).map(row => ({
  batch_id: batchId,
  chatid: row.chatid,
  question_id: row.question_id,
  question_type: row.question_type,
  question_text: row.question_text,
  context: row.context ? JSON.parse(row.context) : null,
  expected_answer: row.expected_answer,
  ai_response: row.block_result,
  evaluation_results: {
    accuracy: { score: row['准确率'], reason: row['准确率_理由'] },
    professionalism: { score: row['专业度'], reason: row['专业度_理由'] },
    tone_reasonableness: { score: row['语气合理'], reason: row['语气合理_理由'] }
  },
  evaluation_version: 'v1.0',
  metadata: metadata
}));

// 一次性批量插入所有结果
await supabase.from('assessment_results').insert(resultsToSave);
```



## 🚀 部署策略

### Railway 环境变量配置
```bash
# 在 Railway 项目设置中添加
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJxxx...
SUPABASE_SERVICE_KEY=eyJxxx...
```

### 数据库初始化
1. 在 Supabase 控制台执行 SQL 创建表
2. 配置 Row Level Security (RLS) 策略
3. 设置 API 访问权限

## 📈 性能考虑

### 批量写入优化
```javascript
// 批量插入评估结果，减少数据库连接
await supabase
  .from('assessment_results')
  .insert(batchResults); // 一次插入多条
```


## 🔒 安全策略

### RLS 策略
```sql
-- 只允许服务端 API 访问
CREATE POLICY "Service access only" ON assessment_sessions
  FOR ALL USING (auth.role() = 'service_role');
```

### API 密钥管理
- 使用 `service_key` 进行服务端操作
- 无需前端访问，不使用 `anon_key`

## 📋 实施计划

### 阶段 1: 数据库准备 (30分钟)
1. 创建 Supabase 项目
2. 执行建表 SQL
3. 配置 RLS 策略
4. 获取 API 密钥

### 阶段 2: 代码集成 (1小时)
1. 安装 `@supabase/supabase-js` 依赖
2. 创建 `lib/supabase-client.js` 模块
3. 在 `routes/run-assessment.js` 中添加存储逻辑
4. 配置 Railway 环境变量

### 阶段 3: 测试验证 (30分钟)
1. 本地测试数据存储
2. Railway 部署测试
3. 验证数据库记录

## 🎯 预期收益

- **数据持久化**: 评估结果永久保存
- **零停机**: 不影响现有功能使用
- **成本控制**: 免费额度足够使用
- **数据完整**: 为后续分析工具提供完整数据源

## 🛠️ 具体实施步骤

### 1. 创建 Supabase 客户端
```javascript
// lib/supabase-client.js
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

module.exports = supabase;
```

### 2. 修改评估路由
```javascript
// 在 routes/run-assessment.js 的评估完成后添加
const supabase = require('../lib/supabase-client');

// 评估完成后存储数据
if (result.success && result.data) {
  const batchId = `batch_${Date.now()}`;
  const resultsToSave = result.data.filter(/* 过滤条件 */).map(/* 数据映射 */);
  
  try {
    await supabase.from('assessment_results').insert(resultsToSave);
    console.log(`✅ 已存储 ${resultsToSave.length} 条评估结果`);
  } catch (error) {
    console.error('❌ 数据存储失败:', error);
  }
}
```

---

**总结**: 这是一个最小化的纯存储方案，总实施时间约2小时，不影响现有功能。