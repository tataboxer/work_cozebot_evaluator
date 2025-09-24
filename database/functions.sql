-- 创建日期统计函数
CREATE OR REPLACE FUNCTION get_daily_statistics(start_date DATE, end_date DATE)
RETURNS TABLE (
    日期 DATE,
    首TOKEN时长 NUMERIC,
    准确率 NUMERIC,
    专业度 NUMERIC,
    语气合理 NUMERIC,
    total_records BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        DATE(created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Shanghai') as 日期,
        AVG(block_start) as 首TOKEN时长,
        AVG(((evaluation_results->'accuracy'->>'score')::numeric)) as 准确率,
        AVG(((evaluation_results->'professionalism'->>'score')::numeric)) as 专业度,
        AVG(((evaluation_results->'tone_reasonableness'->>'score')::numeric)) as 语气合理,
        COUNT(*) as total_records
    FROM assessment_results 
    WHERE evaluation_results IS NOT NULL 
        AND block_start IS NOT NULL
        AND evaluation_results->'accuracy'->>'score' IS NOT NULL
        AND DATE(created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Shanghai') BETWEEN start_date AND end_date
    GROUP BY DATE(created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Shanghai')
    ORDER BY 日期 ASC;
END;
$$ LANGUAGE plpgsql;