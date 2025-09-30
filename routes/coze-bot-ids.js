const express = require('express');
const supabase = require('../lib/supabase-client');
const router = express.Router();

// 获取所有可用的扣子ID
router.get('/', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('assessment_sessions')
            .select('coze_bot_id')
            .not('coze_bot_id', 'is', null)
            .order('coze_bot_id');

        if (error) {
            console.error('获取扣子ID列表失败:', error);
            return res.status(500).json({ error: '获取扣子ID列表失败' });
        }

        // 去重并排序
        const uniqueBotIds = [...new Set(data.map(item => item.coze_bot_id))].sort();

        res.json({ data: uniqueBotIds });
    } catch (error) {
        console.error('获取扣子ID列表错误:', error);
        res.status(500).json({ error: '服务器内部错误' });
    }
});

module.exports = router;