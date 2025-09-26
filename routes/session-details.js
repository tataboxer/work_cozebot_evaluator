const express = require('express');
const router = express.Router();
const supabase = require('../lib/supabase-client');

// 获取会话详情和结果
router.get('/:sessionId/results', async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    // 获取会话信息
    const { data: session, error: sessionError } = await supabase
      .from('assessment_sessions')
      .select('*')
      .eq('session_id', sessionId)
      .single();
    
    if (sessionError) throw sessionError;
    
    // 获取评估结果（包含评估器信息）
    const { data: results, error: resultsError } = await supabase
      .from('assessment_results')
      .select(`
        *,
        evaluator_versions(
          id, version,
          evaluators(name)
        )
      `)
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });
    
    if (resultsError) throw resultsError;
    
    // 转换数据格式
    const formattedResults = results.map(row => {
      let evaluatorInfo = '默认评估器';
      if (row.evaluator_versions) {
        if (row.evaluator_versions.evaluators) {
          evaluatorInfo = `${row.evaluator_versions.evaluators.name} ${row.evaluator_versions.version}`;
        } else {
          // 如果没有评估器信息，可能是数据关联问题
          evaluatorInfo = `未知评估器 ${row.evaluator_versions.version}`;
        }
      } else if (row.evaluator_version_id) {
        // 如果有 evaluator_version_id 但没有关联数据，显示 ID
        evaluatorInfo = `评估器 ID: ${row.evaluator_version_id}`;
      }
      
      return {
        question_text: row.question_text,
        context: row.context,
        ai_response: row.ai_response,
        block_start: row.block_start,
        block_end: row.block_end,
        expected_answer: row.expected_answer,
        evaluation_results: row.evaluation_results,
        question_id: row.question_id,
        question_type: row.question_type,
        chatid: row.chatid,
        block_type: 'answer',
        block_subtype: '文本回复',
        evaluator_info: evaluatorInfo
      };
    });
    
    res.json({
      success: true,
      session,
      results: formattedResults
    });
    
  } catch (error) {
    console.error('获取会话详情失败:', error);
    res.status(500).json({
      success: false,
      message: '获取会话详情失败',
      error: error.message
    });
  }
});

// 导出会话数据为CSV
router.get('/:sessionId/export', async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    // 获取评估结果
    const { data: results, error } = await supabase
      .from('assessment_results')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });
    
    if (error) throw error;
    
    if (results.length === 0) {
      return res.status(404).json({ success: false, message: '未找到数据' });
    }
    
    // 转换为CSV格式
    const csvData = convertToCSV(results);
    
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="session_${sessionId}_results.csv"`);
    res.send('\uFEFF' + csvData); // 添加BOM以支持中文
    
  } catch (error) {
    console.error('导出会话数据失败:', error);
    res.status(500).json({
      success: false,
      message: '导出失败',
      error: error.message
    });
  }
});

function convertToCSV(results) {
  if (results.length === 0) return '';
  
  // 构建CSV头部
  const headers = [
    'question_text', 'context', 'ai_response', 'block_start', 'block_end', 'expected_answer',
    '准确率', '准确率_理由', '专业度', '专业度_理由', '语气合理', '语气合理_理由',
    'question_id', 'question_type', 'chatid'
  ];
  
  // 转换数据行
  const rows = results.map(row => {
    const evaluation = row.evaluation_results || {};
    
    return [
      escapeCSV(row.question_text),
      escapeCSV(JSON.stringify(row.context)),
      escapeCSV(row.ai_response),
      row.block_start || '',
      row.block_end || '',
      escapeCSV(row.expected_answer),
      evaluation.accuracy?.score || '',
      escapeCSV(evaluation.accuracy?.reason),
      evaluation.professionalism?.score || '',
      escapeCSV(evaluation.professionalism?.reason),
      evaluation.tone_reasonableness?.score || '',
      escapeCSV(evaluation.tone_reasonableness?.reason),
      row.question_id || '',
      row.question_type || '',
      row.chatid || ''
    ].join(',');
  });
  
  return [headers.join(','), ...rows].join('\n');
}

function escapeCSV(value) {
  if (!value) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

module.exports = router;