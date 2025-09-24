const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const router = express.Router();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

// 获取日期范围内的统计数据
router.get('/daily-stats', async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        
        if (!startDate || !endDate) {
            return res.status(400).json({ error: '缺少日期参数' });
        }

        const { data, error } = await supabase.rpc('get_daily_statistics', {
            start_date: startDate,
            end_date: endDate
        });

        if (error) {
            console.error('调用存储过程失败:', error);
            return res.status(500).json({ error: '查询统计数据失败' });
        }

        // 转换字段名为中文（保持前端兼容）
        const result = data.map(row => ({
            日期: row.date_beijing,
            首TOKEN时长: row.avg_first_token_duration,
            准确率: row.avg_accuracy,
            专业度: row.avg_professionalism,
            语气合理: row.avg_tone_reasonableness,
            total_records: row.total_records
        }));

        res.json({ data: result });
    } catch (error) {
        console.error('获取统计数据错误:', error);
        res.status(500).json({ error: '服务器内部错误' });
    }
});

module.exports = router;