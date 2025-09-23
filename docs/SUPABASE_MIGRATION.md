# Supabase 迁移指南

## 迁移概述

项目已从 SQLite 本地数据库迁移到 Supabase 云端 PostgreSQL 数据库，实现了更强大的数据管理和实时功能。

## 主要变化

### 1. 数据库架构变化

#### 从 SQLite 到 PostgreSQL
```sql
-- 旧版本 (SQLite)
CREATE TABLE assessment_sessions (
    session_id TEXT PRIMARY KEY,
    evaluation_summary TEXT  -- JSON字符串
);

-- 新版本 (PostgreSQL + Supabase)
CREATE TABLE assessment_sessions (
    session_id TEXT PRIMARY KEY,
    evaluation_summary JSONB,  -- 原生JSONB支持
    user_ip TEXT,
    evaluator_name TEXT DEFAULT 'Default Evaluator',
    completed_at TIMESTAMPTZ
);
```

#### JSONB 字段优势
- 高效的 JSON 查询和索引
- 原生 JSON 操作符支持
- 更好的数据验证和约束

### 2. 客户端集成

#### Supabase 客户端初始化
```javascript
// lib/supabase-client.js
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

module.exports = supabase;
```

#### 数据操作示例
```javascript
// 查询会话列表
const { data, error } = await supabase
  .from('assessment_sessions')
  .select('*')
  .order('created_at', { ascending: false })
  .range(offset, offset + limit - 1);

// 插入评估结果
const { data, error } = await supabase
  .from('assessment_results')
  .insert(results);
```

### 3. 环境配置更新

#### 新增环境变量
```env
# Supabase 配置
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_service_key_here
```

#### 移除的配置
- 不再需要 SQLite 数据库文件路径
- 移除本地数据库初始化脚本

## 功能增强

### 1. 实时数据同步
- 支持 Supabase 实时订阅
- 自动数据更新通知
- 多用户协作支持

### 2. 自动备份和恢复
- Supabase 自动每日备份
- Point-in-Time Recovery
- 数据迁移工具支持

### 3. 高级查询功能
```javascript
// JSONB 字段查询
const { data } = await supabase
  .from('assessment_results')
  .select('*')
  .gt('evaluation_results->accuracy->score', 80)
  .order('created_at', { ascending: false });

// 复杂聚合查询
const { data } = await supabase
  .rpc('get_session_statistics', { session_id: 'session_123' });
```

### 4. 行级安全 (RLS)
```sql
-- 启用 RLS
ALTER TABLE assessment_sessions ENABLE ROW LEVEL SECURITY;

-- 创建安全策略
CREATE POLICY "Users can view their own sessions" ON assessment_sessions
  FOR SELECT USING (user_ip = current_setting('request.headers')::json->>'x-forwarded-for');
```

## 迁移步骤

### 1. 环境准备
1. 创建 Supabase 项目
2. 获取项目 URL 和 Service Key
3. 更新环境变量配置

### 2. 数据库结构创建
```sql
-- 在 Supabase SQL Editor 中执行
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

-- 创建索引
CREATE INDEX idx_sessions_created_at ON assessment_sessions(created_at);
CREATE INDEX idx_sessions_user_ip ON assessment_sessions(user_ip);
CREATE INDEX idx_results_session_id ON assessment_results(session_id);
CREATE INDEX idx_results_question_type ON assessment_results(question_type);
```

### 3. 代码更新
1. 安装 Supabase 客户端: `npm install @supabase/supabase-js`
2. 更新数据访问层代码
3. 修改 API 路由以使用 Supabase 客户端
4. 更新前端数据处理逻辑

### 4. 数据迁移 (如需要)
```javascript
// 从 SQLite 导出数据
const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('assessment.db');

// 迁移到 Supabase
const sessions = await new Promise((resolve, reject) => {
  db.all("SELECT * FROM assessment_sessions", (err, rows) => {
    if (err) reject(err);
    else resolve(rows);
  });
});

// 批量插入到 Supabase
const { error } = await supabase
  .from('assessment_sessions')
  .insert(sessions.map(session => ({
    ...session,
    evaluation_summary: JSON.parse(session.evaluation_summary),
    config: JSON.parse(session.config || '{}')
  })));
```

## 性能优化

### 1. 查询优化
- 使用 JSONB 索引加速 JSON 查询
- 实现分页查询减少数据传输
- 利用 Supabase 查询缓存

### 2. 连接管理
- 使用连接池管理数据库连接
- 实现查询超时和重试机制
- 监控连接使用情况

### 3. 实时功能
```javascript
// 实时订阅会话更新
const subscription = supabase
  .channel('assessment_sessions')
  .on('postgres_changes', 
    { event: 'INSERT', schema: 'public', table: 'assessment_sessions' },
    (payload) => {
      console.log('New session created:', payload.new);
    }
  )
  .subscribe();
```

## 监控和维护

### 1. 性能监控
- Supabase Dashboard 性能指标
- 查询执行时间监控
- 数据库连接数监控

### 2. 错误处理
```javascript
try {
  const { data, error } = await supabase
    .from('assessment_sessions')
    .select('*');
    
  if (error) throw error;
  return data;
} catch (error) {
  console.error('Supabase error:', error);
  // 实现降级策略或重试逻辑
}
```

### 3. 备份策略
- 启用 Supabase 自动备份
- 定期导出重要数据
- 测试数据恢复流程

## 故障排除

### 常见问题

1. **连接超时**
   - 检查网络连接
   - 验证 Supabase URL 和密钥
   - 调整超时设置

2. **权限错误**
   - 确认 Service Key 权限
   - 检查 RLS 策略配置
   - 验证 API 密钥有效性

3. **JSONB 查询错误**
   - 验证 JSON 数据格式
   - 使用正确的 JSONB 操作符
   - 检查字段路径是否正确

### 调试工具
- Supabase Dashboard SQL Editor
- 查询执行计划分析
- 实时日志监控

## 未来扩展

### 1. 高级功能
- 实现数据分析仪表板
- 添加用户权限管理
- 集成第三方分析工具

### 2. 性能优化
- 实现查询结果缓存
- 添加数据预加载
- 优化大数据集处理

### 3. 安全增强
- 实现细粒度权限控制
- 添加数据加密
- 审计日志记录