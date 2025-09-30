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
        const { startDate, endDate, cozeBotId } = req.query;
        
        if (!startDate || !endDate) {
            return res.status(400).json({ error: '缺少日期参数' });
        }

        let data;
        
        if (cozeBotId) {
            // 如果有扣子ID筛选，使用JOIN查询
            const { data: rawData, error } = await supabase
                .from('assessment_results')
                .select(`
                    created_at,
                    block_start,
                    evaluation_results,
                    assessment_sessions!inner(
                        coze_bot_id
                    )
                `)
                .gte('created_at', startDate)
                .lte('created_at', endDate + 'T23:59:59')
                .eq('assessment_sessions.coze_bot_id', cozeBotId)
                .not('evaluation_results', 'is', null)
                .not('block_start', 'is', null)
                .not('evaluation_results->accuracy->score', 'is', null);
            
            if (error) {
                console.error('查询统计数据失败:', error);
                return res.status(500).json({ error: '查询统计数据失败' });
            }
            
            // 手动聚合数据按日期
            const dailyStats = {};
            rawData.forEach(row => {
                // 转换为北京时间的日期
                const beijingDate = new Date(new Date(row.created_at).getTime() + 8 * 60 * 60 * 1000);
                const dateStr = beijingDate.toISOString().split('T')[0];
                
                if (!dailyStats[dateStr]) {
                    dailyStats[dateStr] = {
                        tokenDurations: [],
                        accuracyScores: [],
                        professionalismScores: [],
                        toneScores: []
                    };
                }
                
                if (row.block_start) {
                    dailyStats[dateStr].tokenDurations.push(parseFloat(row.block_start));
                }
                
                if (row.evaluation_results) {
                    const evalResults = row.evaluation_results;
                    if (evalResults.accuracy?.score) {
                        dailyStats[dateStr].accuracyScores.push(parseFloat(evalResults.accuracy.score));
                    }
                    if (evalResults.professionalism?.score) {
                        dailyStats[dateStr].professionalismScores.push(parseFloat(evalResults.professionalism.score));
                    }
                    if (evalResults.tone_reasonableness?.score) {
                        dailyStats[dateStr].toneScores.push(parseFloat(evalResults.tone_reasonableness.score));
                    }
                }
            });
            
            // 计算每日平均值
            data = Object.keys(dailyStats)
                .sort()
                .map(dateStr => {
                    const stats = dailyStats[dateStr];
                    const avgToken = stats.tokenDurations.length > 0 ? 
                        (stats.tokenDurations.reduce((a, b) => a + b, 0) / stats.tokenDurations.length) : null;
                    const avgAccuracy = stats.accuracyScores.length > 0 ? 
                        (stats.accuracyScores.reduce((a, b) => a + b, 0) / stats.accuracyScores.length) : null;
                    const avgProfessionalism = stats.professionalismScores.length > 0 ? 
                        (stats.professionalismScores.reduce((a, b) => a + b, 0) / stats.professionalismScores.length) : null;
                    const avgTone = stats.toneScores.length > 0 ? 
                        (stats.toneScores.reduce((a, b) => a + b, 0) / stats.toneScores.length) : null;
                    
                    return {
                        date_beijing: dateStr,
                        avg_first_token_duration: avgToken,
                        avg_accuracy: avgAccuracy,
                        avg_professionalism: avgProfessionalism,
                        avg_tone_reasonableness: avgTone,
                        total_records: stats.tokenDurations.length
                    };
                });
            
        } else {
            // 没有扣子ID筛选，使用存储过程
            const { data: spData, error } = await supabase.rpc('get_daily_statistics', {
                start_date: startDate,
                end_date: endDate
            });
            
            if (error) {
                console.error('调用存储过程失败:', error);
                return res.status(500).json({ error: '查询统计数据失败' });
            }
            
            data = spData;
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