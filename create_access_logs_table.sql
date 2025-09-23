-- 创建 access_logs 表
-- 用于记录用户访问日志，包括IP地址、用户代理、访问路径和HTTP方法

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

-- 添加注释
COMMENT ON TABLE access_logs IS '用户访问日志表';
COMMENT ON COLUMN access_logs.id IS '自增主键';
COMMENT ON COLUMN access_logs.ip_address IS '访问者IP地址';
COMMENT ON COLUMN access_logs.user_agent IS '用户代理字符串';
COMMENT ON COLUMN access_logs.path IS '访问路径';
COMMENT ON COLUMN access_logs.method IS 'HTTP请求方法';
COMMENT ON COLUMN access_logs.created_at IS '访问时间';