-- 方案1: 删除现有表并重新创建（推荐，如果不需要保留现有数据）
DROP TABLE IF EXISTS access_logs;

CREATE TABLE access_logs (
    id BIGSERIAL PRIMARY KEY,
    ip_address TEXT NOT NULL,
    user_agent TEXT,
    path TEXT NOT NULL,
    method TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_access_logs_ip_address ON access_logs(ip_address);
CREATE INDEX idx_access_logs_path ON access_logs(path);
CREATE INDEX idx_access_logs_method ON access_logs(method);
CREATE INDEX idx_access_logs_created_at ON access_logs(created_at);