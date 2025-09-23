# 数据库设计文档

## 数据库类型
Supabase (PostgreSQL) - 云端数据库服务

## 表结构设计

### assessment_sessions 表
存储评估会话的基本信息和性能统计

```sql
CREATE TABLE assessment_sessions (
    session_id TEXT PRIMARY KEY,
    session_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    total_questions INTEGER,
    processed_questions INTEGER,
    evaluation_summary JSONB,
    first_token_avg_duration REAL,
    first_token_min_duration REAL,
    first_token_max_duration REAL,
    avg_block_duration REAL,
    user_ip TEXT,
    evaluator_name TEXT DEFAULT 'Default Evaluator',
    config JSONB
);

CREATE INDEX idx_sessions_created_at ON assessment_sessions(created_at);
CREATE INDEX idx_sessions_name ON assessment_sessions(session_name);
CREATE INDEX idx_sessions_user_ip ON assessment_sessions(user_ip);
```

**字段说明**
- `session_id`: 会话唯一标识符 (格式: session_timestamp)
- `session_name`: 会话显示名称 (通常为null)
- `created_at`: 创建时间 (自动生成)
- `completed_at`: 完成时间 (ISO字符串)
- `total_questions`: 总问题数量
- `processed_questions`: 已处理问题数量
- `evaluation_summary`: 评估结果摘要 (JSONB)
  ```json
  {
    "avgAccuracy": 85.5,
    "avgProfessionalism": 88.2,
    "avgToneReasonableness": 87.1,
    "totalEvaluated": 150
  }
  ```
- `first_token_avg_duration`: 首Token平均获取时长 (秒)
- `first_token_min_duration`: 首Token最小获取时长 (秒)
- `first_token_max_duration`: 首Token最大获取时长 (秒)
- `avg_block_duration`: 平均块处理时长 (秒)
- `user_ip`: 用户IP地址
- `evaluator_name`: 评估器名称 (默认: 'Default Evaluator')
- `config`: 配置信息 (JSONB)
  ```json
  {
    "model": "doubao-1-5-pro-32k-250115",
    "ip": "192.168.1.100",
    "fileName": "test_data.xlsx",
    "evaluatorVersion": "v1.0"
  }
  ```

### assessment_results 表
存储详细的评估结果数据

```sql
CREATE TABLE assessment_results (
    id BIGSERIAL PRIMARY KEY,
    session_id TEXT NOT NULL,
    chatid TEXT,
    question_id TEXT,
    question_type TEXT,
    question_text TEXT,
    context JSONB,
    expected_answer TEXT,
    ai_response TEXT,
    block_start REAL,
    block_end REAL,
    evaluation_results JSONB,
    evaluation_version TEXT DEFAULT 'v1.0',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    FOREIGN KEY (session_id) REFERENCES assessment_sessions(session_id) ON DELETE CASCADE
);

CREATE INDEX idx_results_session_id ON assessment_results(session_id);
CREATE INDEX idx_results_question_type ON assessment_results(question_type);
CREATE INDEX idx_results_created_at ON assessment_results(created_at);
CREATE INDEX idx_results_chatid ON assessment_results(chatid);
```

**字段说明**
- `id`: 自增主键 (BIGSERIAL)
- `session_id`: 关联的会话ID
- `chatid`: Coze对话ID
- `question_id`: 问题唯一标识
- `question_type`: 问题分类
- `question_text`: 用户问题内容
- `context`: 对话上下文 (JSONB数组)
- `expected_answer`: 期望答案/参考答案
- `ai_response`: AI回复内容
- `block_start`: 首Token时间 (秒)
- `block_end`: 结束时间 (秒)
- `evaluation_results`: 评估结果 (JSONB)
  ```json
  {
    "accuracy": {
      "score": 85,
      "reason": "回答基本准确，但缺少部分细节"
    },
    "professionalism": {
      "score": 90,
      "reason": "使用了专业术语，表达规范"
    },
    "tone_reasonableness": {
      "score": 88,
      "reason": "语气友好，符合服务场景"
    }
  }
  ```
- `evaluation_version`: 评估版本 (默认: 'v1.0')
- `created_at`: 创建时间 (自动生成)

## 数据关系

```
assessment_sessions (1) ←→ (N) assessment_results
```

- 一个会话可以包含多个评估结果
- 删除会话时级联删除相关的评估结果

## 索引策略

### 主要索引
- `assessment_sessions.created_at`: 支持按时间范围查询
- `assessment_sessions.session_name`: 支持按名称搜索
- `assessment_results.session_id`: 支持快速关联查询
- `assessment_results.question_type`: 支持按问题类型筛选

### 查询优化
- 会话列表查询使用时间索引和分页
- 评估结果查询使用session_id索引
- 支持复合查询条件的高效执行

## 数据迁移

### 历史数据兼容
系统支持从旧版本的batch_id字段迁移到新的session_id字段：

```sql
-- 数据迁移示例
UPDATE assessment_results 
SET session_id = batch_id 
WHERE session_id IS NULL AND batch_id IS NOT NULL;
```

## 备份策略

### 数据备份
- Supabase自动备份: 每日自动备份
- 手动备份: 通过Supabase Dashboard导出
- CSV导出: 支持单个会话和批量导出

### 数据恢复
- Supabase Point-in-Time Recovery
- 从备份文件恢复
- CSV批量导入功能

## 性能考虑

### 数据量估算
- 单个会话: ~100-1000条评估结果
- 预期支持: 数万个会话，数百万条评估结果
- Supabase自动扩展: 无存储限制

### 数据操作示例

### 插入会话数据
```javascript
const sessionData = {
  session_id: `session_${Date.now()}`,
  session_name: null,
  config: {
    model: 'doubao-1-5-pro-32k-250115',
    ip: '192.168.1.100',
    fileName: 'test.xlsx',
    evaluatorVersion: 'v1.0'
  },
  total_questions: 100,
  processed_questions: 100,
  evaluation_summary: {
    avgAccuracy: 85.5,
    avgProfessionalism: 88.2,
    avgToneReasonableness: 87.1,
    totalEvaluated: 100
  },
  user_ip: '192.168.1.100',
  evaluator_name: 'Default Evaluator',
  completed_at: new Date().toISOString()
};

const { error } = await supabase
  .from('assessment_sessions')
  .insert(sessionData);
```

### 查询会话列表
```javascript
const { data, error } = await supabase
  .from('assessment_sessions')
  .select('*')
  .order('created_at', { ascending: false })
  .range(0, 9); // 分页查询
```

### 插入评估结果
```javascript
const results = [
  {
    session_id: 'session_1234567890',
    chatid: 'chat_abc123',
    question_text: '问题内容',
    context: [{ role: 'user', content: '上下文' }],
    ai_response: 'AI回复内容',
    evaluation_results: {
      accuracy: { score: 85, reason: '评估理由' },
      professionalism: { score: 90, reason: '评估理由' },
      tone_reasonableness: { score: 88, reason: '评估理由' }
    }
  }
];

const { data, error } = await supabase
  .from('assessment_results')
  .insert(results);
```

## 性能优化
- PostgreSQL索引优化
- JSONB字段高效查询
- 分页查询和实时订阅
- Supabase Edge Functions
- 连接池和查询优化