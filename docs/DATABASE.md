# 数据库设计文档

## 数据库类型
Supabase (PostgreSQL) - 云端数据库服务

## 表结构设计

### assessment_sessions 表
存储评估会话的基本信息和性能统计

```sql
CREATE TABLE public.assessment_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  session_id character varying NOT NULL UNIQUE,
  session_name character varying,
  created_at timestamp with time zone DEFAULT now(),
  completed_at timestamp with time zone,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  total_questions integer DEFAULT 0,
  processed_questions integer DEFAULT 0,
  evaluation_summary jsonb DEFAULT '{}'::jsonb,
  first_token_avg_duration numeric,
  first_token_min_duration numeric,
  first_token_max_duration numeric,
  avg_block_duration numeric,
  user_ip character varying,
  CONSTRAINT assessment_sessions_pkey PRIMARY KEY (id)
);
```

**字段说明**
- `id`: UUID主键 (自动生成)
- `session_id`: 会话唯一标识符 (格式: session_timestamp, UNIQUE约束)
- `session_name`: 会话显示名称 (通常为null)
- `created_at`: 创建时间 (自动生成)
- `completed_at`: 完成时间 (timestamp with time zone)
- `config`: 配置信息 (JSONB, 非空默认'{}')
  ```json
  {
    "model": "doubao-1-5-pro-32k-250115",
    "ip": "192.168.1.100",
    "fileName": "test_data.xlsx",
    "evaluatorVersion": "v1.0"
  }
  ```
- `total_questions`: 总问题数量 (默认0)
- `processed_questions`: 已处理问题数量 (默认0)
- `evaluation_summary`: 评估结果摘要 (JSONB, 默认'{}')
  ```json
  {
    "avgAccuracy": 85.5,
    "avgProfessionalism": 88.2,
    "avgToneReasonableness": 87.1,
    "totalEvaluated": 150
  }
  ```
- `first_token_avg_duration`: 首Token平均获取时长 (numeric)
- `first_token_min_duration`: 首Token最小获取时长 (numeric)
- `first_token_max_duration`: 首Token最大获取时长 (numeric)
- `avg_block_duration`: 平均块处理时长 (numeric)
- `user_ip`: 用户IP地址

### assessment_results 表
存储详细的评估结果数据

```sql
CREATE TABLE public.assessment_results (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  session_id character varying,
  chatid character varying,
  question_id character varying,
  question_type character varying,
  question_text text NOT NULL,
  context jsonb,
  expected_answer text,
  ai_response text NOT NULL,
  evaluation_results jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  block_start numeric,
  block_end numeric,
  evaluator_version_id bigint,
  CONSTRAINT assessment_results_pkey PRIMARY KEY (id),
  CONSTRAINT fk_session_id FOREIGN KEY (session_id) REFERENCES public.assessment_sessions(session_id),
  CONSTRAINT assessment_results_evaluator_version_id_fkey FOREIGN KEY (evaluator_version_id) REFERENCES public.evaluator_versions(id)
);
```

**字段说明**
- `id`: UUID主键 (自动生成)
- `session_id`: 关联的会话ID (外键引用assessment_sessions.session_id)
- `chatid`: Coze对话ID
- `question_id`: 问题唯一标识
- `question_type`: 问题分类
- `question_text`: 用户问题内容 (非空)
- `context`: 对话上下文 (JSONB数组)
- `expected_answer`: 期望答案/参考答案
- `ai_response`: AI回复内容 (非空)
- `evaluation_results`: 评估结果 (JSONB, 默认'{}')
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
- `created_at`: 创建时间 (自动生成)
- `block_start`: 首Token时间 (numeric)
- `block_end`: 结束时间 (numeric)
- `evaluator_version_id`: 关联的评估器版本ID (外键引用evaluator_versions.id)

### evaluators 表
存储评估器基本信息

```sql
CREATE TABLE public.evaluators (
  id bigint NOT NULL DEFAULT nextval('evaluators_id_seq'::regclass),
  name text NOT NULL,
  description text,
  question_type text,
  is_default boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT evaluators_pkey PRIMARY KEY (id)
);
```

**字段说明**
- `id`: 自增主键 (bigint, 使用序列)
- `name`: 评估器名称 (非空)
- `description`: 评估器描述
- `question_type`: 适用的问题类型 (NULL表示通用评估器)
- `is_default`: 是否为默认评估器 (默认false)
- `is_active`: 是否启用 (默认true)
- `created_at`: 创建时间 (自动生成)
- `updated_at`: 更新时间 (自动生成)

### evaluator_versions 表
存储评估器版本信息和配置

```sql
CREATE TABLE public.evaluator_versions (
  id bigint NOT NULL DEFAULT nextval('evaluator_versions_id_seq'::regclass),
  evaluator_id bigint NOT NULL,
  version text NOT NULL,
  prompt_template text NOT NULL,
  evaluation_criteria jsonb NOT NULL,
  is_latest boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  created_by text,
  change_notes text,
  CONSTRAINT evaluator_versions_pkey PRIMARY KEY (id),
  CONSTRAINT evaluator_versions_evaluator_id_fkey FOREIGN KEY (evaluator_id) REFERENCES public.evaluators(id)
);
```

**字段说明**
- `id`: 自增主键 (bigint, 使用序列)
- `evaluator_id`: 关联的评估器ID (外键引用evaluators.id)
- `version`: 版本号 (如: v1, v2, v3, 非空)
- `prompt_template`: 提示词模板 (非空，预留字段)
- `evaluation_criteria`: 评估标准配置 (JSONB, 非空)
  ```json
  {
    "assistant_name": "苏州科技馆智能助手",
    "assistant_description": "为游客提供科技馆相关信息服务",
    "criteria": [
      {
        "name": "准确率",
        "description": "回答内容的准确性和正确性",
        "weight": 40
      },
      {
        "name": "专业度",
        "description": "回答的专业性和权威性",
        "weight": 30
      },
      {
        "name": "语气合理",
        "description": "回答语气的友好性和合理性",
        "weight": 30
      }
    ]
  }
  ```
- `is_latest`: 是否为最新版本 (默认false)
- `created_at`: 创建时间 (自动生成)
- `created_by`: 创建者
- `change_notes`: 版本变更说明

### access_logs 表
存储用户访问日志信息

```sql
CREATE TABLE public.access_logs (
  id bigint NOT NULL DEFAULT nextval('access_logs_id_seq'::regclass),
  ip_address text NOT NULL,
  user_agent text,
  path text NOT NULL,
  method text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT access_logs_pkey PRIMARY KEY (id)
);
```

**字段说明**
- `id`: 自增主键 (bigint, 使用序列)
- `ip_address`: 访问者IP地址 (非空)
- `user_agent`: 用户代理字符串
- `path`: 访问路径 (非空)
- `method`: HTTP请求方法 (非空, GET/POST/PUT/DELETE等)
- `created_at`: 访问时间 (自动生成)

## 数据关系

```
evaluators (1) ←→ (N) evaluator_versions
assessment_sessions (1) ←→ (N) assessment_results
evaluator_versions (1) ←→ (N) assessment_results
access_logs (独立表，用于访问日志记录)
```

**关系说明**
- 一个评估器可以有多个版本，但只有一个最新版本
- 评估器删除时不会级联删除版本（无ON DELETE CASCADE）
- 一个会话可以包含多个评估结果
- 会话删除时会级联删除相关的评估结果（通过session_id外键）
- 一个评估器版本可以被多个评估结果使用
- assessment_results 表通过 evaluator_version_id 字段关联使用的评估器版本
- access_logs 表独立存储访问日志，不与其他表关联

**外键约束**
- `assessment_results.session_id` → `assessment_sessions.session_id`
- `assessment_results.evaluator_version_id` → `evaluator_versions.id`
- `evaluator_versions.evaluator_id` → `evaluators.id`

## 索引策略

### 主要索引
**注意**: 当前schema中未显示索引定义，建议添加以下索引以优化查询性能：

```sql
-- 会话表索引
CREATE INDEX idx_sessions_created_at ON assessment_sessions(created_at);
CREATE INDEX idx_sessions_session_id ON assessment_sessions(session_id);
CREATE INDEX idx_sessions_user_ip ON assessment_sessions(user_ip);

-- 评估结果表索引
CREATE INDEX idx_results_session_id ON assessment_results(session_id);
CREATE INDEX idx_results_question_type ON assessment_results(question_type);
CREATE INDEX idx_results_created_at ON assessment_results(created_at);
CREATE INDEX idx_results_evaluator_version_id ON assessment_results(evaluator_version_id);
CREATE INDEX idx_results_question_text ON assessment_results USING gin(to_tsvector('english', question_text));

-- 评估器表索引
CREATE INDEX idx_evaluators_question_type ON evaluators(question_type);
CREATE INDEX idx_evaluators_is_default ON evaluators(is_default);
CREATE INDEX idx_evaluators_is_active ON evaluators(is_active);

-- 评估器版本表索引
CREATE INDEX idx_evaluator_versions_evaluator_id ON evaluator_versions(evaluator_id);
CREATE INDEX idx_evaluator_versions_is_latest ON evaluator_versions(is_latest);
CREATE UNIQUE INDEX idx_evaluator_versions_unique_latest ON evaluator_versions(evaluator_id) WHERE is_latest = true;

-- 访问日志表索引
CREATE INDEX idx_access_logs_ip_address ON access_logs(ip_address);
CREATE INDEX idx_access_logs_created_at ON access_logs(created_at);
```

### 查询优化
- 会话列表查询使用时间索引和分页
- 评估结果查询使用session_id索引
- 问题搜索使用ILIKE模糊匹配和时间范围筛选
- 评估器选择使用question_type和is_default索引
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
- CSV导出: 支持前端单个会话导出

### 数据恢复
- Supabase Point-in-Time Recovery
- 从备份文件恢复
- 前端CSV导出功能

## 性能考虑

### 数据量估算
- 单个会话: ~100-1000条评估结果
- 预期支持: 数万个会话，数百万条评估结果
- Supabase自动扩展: 无存储限制

### 数据操作示例

### 创建默认评估器
```javascript
// 创建评估器
const { data: evaluator, error: evaluatorError } = await supabase
  .from('evaluators')
  .insert({
    name: '默认评估器',
    description: '通用评估器，适用于所有问题类型',
    question_type: null,
    is_default: true,
    is_active: true
  })
  .select()
  .single();

// 创建评估器版本
const evaluation_criteria = {
  assistant_name: '苏州科技馆智能助手',
  assistant_description: '为游客提供科技馆相关信息服务',
  criteria: [
    {
      name: '准确率',
      description: '回答内容的准确性和正确性',
      weight: 40
    },
    {
      name: '专业度', 
      description: '回答的专业性和权威性',
      weight: 30
    },
    {
      name: '语气合理',
      description: '回答语气的友好性和合理性',
      weight: 30
    }
  ]
};

const { data: version, error: versionError } = await supabase
  .from('evaluator_versions')
  .insert({
    evaluator_id: evaluator.id,
    version: 'v1',
    evaluation_criteria,
    is_latest: true,
    change_notes: '初始版本',
    created_by: 'system'
  })
  .select()
  .single();
```

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

### 查询活跃评估器
```javascript
// 获取所有活跃的评估器及其最新版本
const { data, error } = await supabase
  .from('evaluators')
  .select(`
    *,
    evaluator_versions!inner(*)
  `)
  .eq('is_active', true)
  .eq('evaluator_versions.is_latest', true);
```

### 问题搜索查询
```javascript
// 搜索包含特定关键词的问题
const { data, error } = await supabase
  .from('assessment_results')
  .select(`
    id,
    created_at,
    question_text,
    context,
    ai_response,
    expected_answer,
    evaluation_results,
    chatid,
    question_id,
    question_type,
    block_start,
    block_end,
    assessment_sessions!inner(session_name)
  `)
  .ilike('question_text', '%门票%')
  .gte('created_at', '2025-01-01')
  .lte('created_at', '2025-01-31T23:59:59')
  .order('created_at', { ascending: false })
  .range(0, 19); // 分页查询
```

### 插入评估结果
```javascript
const results = [
  {
    session_id: 'session_1234567890',
    chatid: 'chat_abc123',
    question_id: 'Q001',
    question_type: 'ticket',
    question_text: '问题内容',
    context: [{ role: 'user', content: '上下文' }],
    expected_answer: '期望答案',
    ai_response: 'AI回复内容',
    evaluation_results: {
      accuracy: { score: 85, reason: '评估理由' },
      professionalism: { score: 90, reason: '评估理由' },
      tone_reasonableness: { score: 88, reason: '评估理由' }
    },
    block_start: 2.5,
    block_end: 15.8,
    evaluator_version_id: 1 // 关联使用的评估器版本
  }
];

const { data, error } = await supabase
  .from('assessment_results')
  .insert(results);
```

## 存储过程

### get_daily_statistics 函数
用于统计分析页面的日度数据聚合查询

```sql
CREATE OR REPLACE FUNCTION get_daily_statistics(start_date DATE, end_date DATE)
RETURNS TABLE (
    date_beijing DATE,
    avg_first_token_duration NUMERIC(10,3),
    avg_accuracy NUMERIC(5,1),
    avg_professionalism NUMERIC(5,1),
    avg_tone_reasonableness NUMERIC(5,1),
    total_records BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        DATE(ar.created_at + INTERVAL '8 hours') as date_beijing,
        ROUND(AVG(ar.block_start::numeric), 3) as avg_first_token_duration,
        ROUND(AVG((ar.evaluation_results::json->'accuracy'->>'score')::numeric), 1) as avg_accuracy,
        ROUND(AVG((ar.evaluation_results::json->'professionalism'->>'score')::numeric), 1) as avg_professionalism,
        ROUND(AVG((ar.evaluation_results::json->'tone_reasonableness'->>'score')::numeric), 1) as avg_tone_reasonableness,
        COUNT(*) as total_records
    FROM assessment_results ar
    WHERE ar.evaluation_results IS NOT NULL 
        AND ar.block_start IS NOT NULL
        AND ar.evaluation_results::json->'accuracy'->>'score' IS NOT NULL
        AND DATE(ar.created_at + INTERVAL '8 hours') BETWEEN start_date AND end_date
    GROUP BY DATE(ar.created_at + INTERVAL '8 hours')
    ORDER BY date_beijing ASC;
END;
$$ LANGUAGE plpgsql;
```

**功能说明**
- 按北京时间自然日分组统计
- 计算平均首Token时长（精度3位小数）
- 计算三个评估维度的平均分数（精度1位小数）
- 返回每日记录总数
- 自动过滤无效数据

**功能说明**
- 使用`INTERVAL '8 hours'`将UTC时间转换为北京时间
- 按北京时间自然日分组统计
- 计算平均首Token时长（精度3位小数）
- 计算三个评估维度的平均分数（精度1位小数）
- 返回每日记录总数
- 自动过滤无效数据

**调用方式**
```javascript
const { data, error } = await supabase.rpc('get_daily_statistics', {
    start_date: '2025-01-01',
    end_date: '2025-01-31'
});
```

## 性能优化
- PostgreSQL索引优化
- JSONB字段高效查询
- 分页查询和实时订阅
- Supabase Edge Functions
- 连接池和查询优化
- 存储过程减少网络传输和内存使用