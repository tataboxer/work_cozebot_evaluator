# 修复 access_logs 表缺失问题

## 问题描述
系统尝试向 `access_logs` 表插入访问日志数据，但该表缺少 `method` 列，导致以下错误：
```
Could not find the 'method' column of 'access_logs' in the schema cache
```

## 解决方案

### 方法1: 在 Supabase Dashboard 中执行 SQL

1. 登录 [Supabase Dashboard](https://supabase.com/dashboard)
2. 选择你的项目
3. 点击左侧菜单的 "SQL Editor"
4. 创建新查询，复制粘贴以下 SQL 代码：

```sql
-- 创建 access_logs 表
CREATE TABLE IF NOT EXISTS access_logs (
    id BIGSERIAL PRIMARY KEY,
    ip_address TEXT NOT NULL,
    user_agent TEXT,
    path TEXT NOT NULL,
    method TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_access_logs_ip_address ON access_logs(ip_address);
CREATE INDEX IF NOT EXISTS idx_access_logs_path ON access_logs(path);
CREATE INDEX IF NOT EXISTS idx_access_logs_method ON access_logs(method);
CREATE INDEX IF NOT EXISTS idx_access_logs_created_at ON access_logs(created_at);
```

5. 点击 "Run" 执行 SQL

### 方法2: 如果表已存在但缺少 method 列

如果 `access_logs` 表已经存在但只是缺少 `method` 列，执行：

```sql
-- 添加缺失的 method 列
ALTER TABLE access_logs ADD COLUMN IF NOT EXISTS method TEXT NOT NULL DEFAULT 'GET';

-- 创建 method 列的索引
CREATE INDEX IF NOT EXISTS idx_access_logs_method ON access_logs(method);
```

## 验证修复

执行以下查询验证表结构：

```sql
-- 查看表结构
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'access_logs' 
ORDER BY ordinal_position;
```

预期结果应包含以下列：
- id (bigint)
- ip_address (text)
- user_agent (text)
- path (text)
- method (text)
- created_at (timestamp with time zone)

## 测试访问日志功能

修复后，重启应用服务器，访问任何页面应该不再出现错误，并且可以在 Supabase 中查看访问日志：

```sql
-- 查看最近的访问日志
SELECT * FROM access_logs 
ORDER BY created_at DESC 
LIMIT 10;
```

## 注意事项

- 该表用于记录用户访问日志，包括 IP 地址、用户代理、访问路径和 HTTP 方法
- 静态资源请求（CSS、JS、图片等）会被过滤，不会记录到数据库中
- 访问日志主要用于监控和分析用户行为，不影响核心评估功能