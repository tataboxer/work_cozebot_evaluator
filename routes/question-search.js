const express = require('express');
const supabase = require('../lib/supabase-client');
const router = express.Router();

// 搜索问题明细
router.get('/', async (req, res) => {
  try {
    const { 
      question = '', 
      startDate, 
      endDate, 
      page = 1, 
      limit = 20 
    } = req.query;
    
    let query = supabase
      .from('assessment_results')
      .select(`
        id,
        created_at,
        question_text,
        context,
        ai_response,
        expected_answer,
        evaluation_results,
        chatid,
        question_id,
        question_type,
        block_start,
        block_end,
        assessment_sessions!inner(session_name)
      `)
      .order('created_at', { ascending: false });

    // 问题内容模糊匹配
    if (question.trim()) {
      query = query.ilike('question_text', `%${question.trim()}%`);
    }

    // 日期筛选
    if (startDate) {
      query = query.gte('created_at', startDate);
    }
    if (endDate) {
      query = query.lte('created_at', endDate + 'T23:59:59');
    }

    // 获取总数
    let countQuery = supabase
      .from('assessment_results')
      .select('*', { count: 'exact', head: true });
    
    if (question.trim()) {
      countQuery = countQuery.ilike('question_text', `%${question.trim()}%`);
    }
    if (startDate) {
      countQuery = countQuery.gte('created_at', startDate);
    }
    if (endDate) {
      countQuery = countQuery.lte('created_at', endDate + 'T23:59:59');
    }

    const { count: totalCount } = await countQuery;

    // 分页查询
    const offset = (page - 1) * limit;
    const { data, error } = await query.range(offset, offset + limit - 1);
    
    if (error) throw error;

    res.json({
      results: data,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;