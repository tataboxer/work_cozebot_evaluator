-- 方案2: 如果需要保留现有数据，只添加缺失的method列
ALTER TABLE access_logs ADD COLUMN method TEXT NOT NULL DEFAULT 'GET';

-- 创建method列的索引
CREATE INDEX idx_access_logs_method ON access_logs(method);