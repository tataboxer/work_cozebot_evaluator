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

        const { data, error } = await supabase
            .from('assessment_results')
            .select(`
                created_at,
                block_start,
                evaluation_results
            `)
            .not('evaluation_results', 'is', null)
            .not('block_start', 'is', null)
            .gte('created_at', startDate + 'T00:00:00Z')
            .lte('created_at', endDate + 'T23:59:59Z');

        if (error) {
            console.error('查询原始数据失败:', error);
            return res.status(500).json({ error: '查询数据失败' });
        }

        // 在后端处理数据聚合
        const dailyStats = {};
        
        data.forEach(record => {
            // 转换为北京时间并获取日期
            const beijingDate = new Date(record.created_at).toLocaleDateString('zh-CN', {
                timeZone: 'Asia/Shanghai',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
            }).replace(/\//g, '-');
            
            if (!dailyStats[beijingDate]) {
                dailyStats[beijingDate] = {
                    日期: beijingDate,
                    tokenDurations: [],
                    accuracyScores: [],
                    professionalismScores: [],
                    toneScores: [],
                    count: 0
                };
            }
            
            const stats = dailyStats[beijingDate];
            stats.count++;
            
            if (record.block_start) {
                stats.tokenDurations.push(parseFloat(record.block_start));
            }
            
            if (record.evaluation_results) {
                const results = record.evaluation_results;
                if (results.accuracy && results.accuracy.score) {
                    stats.accuracyScores.push(parseFloat(results.accuracy.score));
                }
                if (results.professionalism && results.professionalism.score) {
                    stats.professionalismScores.push(parseFloat(results.professionalism.score));
                }
                if (results.tone_reasonableness && results.tone_reasonableness.score) {
                    stats.toneScores.push(parseFloat(results.tone_reasonableness.score));
                }
            }
        });
        
        // 计算平均值
        const result = Object.values(dailyStats).map(stats => ({
            日期: stats.日期,
            首TOKEN时长: stats.tokenDurations.length > 0 ? 
                (stats.tokenDurations.reduce((a, b) => a + b, 0) / stats.tokenDurations.length).toFixed(3) : 0,
            准确率: stats.accuracyScores.length > 0 ? 
                (stats.accuracyScores.reduce((a, b) => a + b, 0) / stats.accuracyScores.length).toFixed(1) : 0,
            专业度: stats.professionalismScores.length > 0 ? 
                (stats.professionalismScores.reduce((a, b) => a + b, 0) / stats.professionalismScores.length).toFixed(1) : 0,
            语气合理: stats.toneScores.length > 0 ? 
                (stats.toneScores.reduce((a, b) => a + b, 0) / stats.toneScores.length).toFixed(1) : 0,
            total_records: stats.count
        })).sort((a, b) => new Date(a.日期) - new Date(b.日期));

        res.json({ data: result });
    } catch (error) {
        console.error('获取统计数据错误:', error);
        res.status(500).json({ error: '服务器内部错误' });
    }
});

module.exports = router;