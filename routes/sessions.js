const express = require('express');
const supabase = require('../lib/supabase-client');
const router = express.Router();

// 获取会话列表
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, startDate, endDate, sessionName } = req.query;
    
    let query = supabase
      .from('assessment_sessions')
      .select('*')
      .order('created_at', { ascending: false });

    // 日期筛选
    if (startDate) {
      query = query.gte('created_at', startDate);
    }
    if (endDate) {
      query = query.lte('created_at', endDate + 'T23:59:59');
    }
    
    // 会话名称筛选
    if (sessionName) {
      query = query.ilike('session_name', `%${sessionName}%`);
    }

    // 分页
    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;
    
    if (error) throw error;

    res.json({
      sessions: data,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        totalPages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 获取单个会话详情
router.get('/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const { data: session, error: sessionError } = await supabase
      .from('assessment_sessions')
      .select('*')
      .eq('session_id', sessionId)
      .single();

    if (sessionError) throw sessionError;

    const { data: results, error: resultsError } = await supabase
      .from('assessment_results')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    if (resultsError) throw resultsError;

    res.json({ session, results });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 删除会话
router.delete('/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    // 删除评估结果
    await supabase
      .from('assessment_results')
      .delete()
      .eq('session_id', sessionId);

    // 删除会话
    const { error } = await supabase
      .from('assessment_sessions')
      .delete()
      .eq('session_id', sessionId);

    if (error) throw error;

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;