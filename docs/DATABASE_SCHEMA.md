# 数据库Schema文档

## 概述

本文档记录了苏州科技馆AI助手评估平台的完整数据库结构，基于Supabase PostgreSQL数据库。

## 完整Schema

```sql
-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

-- 访问日志表
CREATE TABLE public.access_logs (
  id bigint NOT NULL DEFAULT nextval('access_logs_id_seq'::regclass),
  ip_address text NOT NULL,
  user_agent text,
  path text NOT NULL,
  method text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT access_logs_pkey PRIMARY KEY (id)
);

-- 评估结果表
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

-- 评估会话表
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

-- 评估器版本表
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

-- 评估器表
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

## 建议的索引

为了优化查询性能，建议添加以下索引：

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

## 序列

系统使用以下序列生成自增ID：

```sql
-- 评估器ID序列
CREATE SEQUENCE evaluators_id_seq;

-- 评估器版本ID序列  
CREATE SEQUENCE evaluator_versions_id_seq;

-- 访问日志ID序列
CREATE SEQUENCE access_logs_id_seq;
```

## 数据类型说明

### UUID字段
- `assessment_sessions.id`
- `assessment_results.id`

使用PostgreSQL的`gen_random_uuid()`函数自动生成。

### JSONB字段
- `assessment_sessions.config`: 会话配置信息
- `assessment_sessions.evaluation_summary`: 评估结果摘要
- `assessment_results.context`: 对话上下文
- `assessment_results.evaluation_results`: 详细评估结果
- `evaluator_versions.evaluation_criteria`: 评估器配置

### NUMERIC字段
- 所有时长相关字段使用`numeric`类型，支持高精度小数

### 时间字段
- 所有时间字段使用`timestamp with time zone`类型，支持时区

## 约束说明

### 主键约束
- 所有表都有明确的主键约束

### 外键约束
- `assessment_results.session_id` → `assessment_sessions.session_id`
- `assessment_results.evaluator_version_id` → `evaluator_versions.id`
- `evaluator_versions.evaluator_id` → `evaluators.id`

### 唯一约束
- `assessment_sessions.session_id`: 确保会话ID唯一

### 非空约束
- 关键字段如`question_text`、`ai_response`等设置为NOT NULL

## 默认值

### 布尔字段默认值
- `evaluators.is_default`: false
- `evaluators.is_active`: true
- `evaluator_versions.is_latest`: false

### JSONB字段默认值
- `assessment_sessions.config`: '{}'
- `assessment_sessions.evaluation_summary`: '{}'
- `assessment_results.evaluation_results`: '{}'

### 数值字段默认值
- `assessment_sessions.total_questions`: 0
- `assessment_sessions.processed_questions`: 0

### 时间字段默认值
- 所有`created_at`字段: `now()`
- `evaluators.updated_at`: `now()`

## 数据迁移注意事项

1. **UUID生成**: 确保PostgreSQL支持`gen_random_uuid()`函数
2. **序列创建**: 在创建表之前需要先创建相关序列
3. **外键顺序**: 创建表时需要注意外键依赖顺序
4. **索引创建**: 建议在数据导入后创建索引以提高性能

## 存储过程

### get_daily_statistics 函数

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

## 版本历史

- **v1.0**: 初始schema设计
- **v1.1**: 添加评估器管理功能
- **v1.2**: 优化索引和约束
- **v1.3**: 添加存储过程支持

## 备份和恢复

### 备份命令
```bash
pg_dump -h your-host -U your-user -d your-database > backup.sql
```

### 恢复命令
```bash
psql -h your-host -U your-user -d your-database < backup.sql
```

### Supabase备份
- 自动每日备份
- Point-in-Time Recovery支持
- Dashboard手动导出功能