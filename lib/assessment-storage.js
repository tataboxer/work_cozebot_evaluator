const supabase = require('./supabase-client');
const { calculateStatistics, formatForDatabase } = require('./universal-statistics');

async function saveAssessmentResults(frontendData, metadata) {
  const sessionId = `session_${Date.now()}`;
  
  const resultsToSave = frontendData.filter(row => 
    row.block_type === 'answer' && 
    row.block_subtype === '文本回复' &&
    row['准确率'] && row['专业度'] && row['语气合理']
  ).map(row => ({
    session_id: sessionId,
    chatid: row.chatid,
    question_id: row.question_id,
    question_type: row.question_type,
    question_text: row.question_text,
    context: row.context ? JSON.parse(row.context) : null,
    expected_answer: row.expected_answer,
    ai_response: row.block_result,
    block_start: row.block_start ? parseFloat(row.block_start) : null,
    block_end: row.block_end ? parseFloat(row.block_end) : null,
    evaluation_results: {
      accuracy: { score: row['准确率'], reason: row['准确率_理由'] },
      professionalism: { score: row['专业度'], reason: row['专业度_理由'] },
      tone_reasonableness: { score: row['语气合理'], reason: row['语气合理_理由'] }
    },
    evaluator_version_id: row.evaluator_version_id || null
  }));

  // 使用统一的统计计算模块
  const stats = calculateStatistics(resultsToSave, { filterAnswerOnly: false });
  const evaluationSummary = formatForDatabase(stats);

  // 创建会话记录
  const sessionData = {
    session_id: sessionId,
    session_name: metadata.fileName || null,
    config: {
      ip: metadata.ip,
      fileName: metadata.fileName
    },
    total_questions: resultsToSave.length,
    processed_questions: resultsToSave.length,
    evaluation_summary: evaluationSummary,
    first_token_avg_duration: stats.avgFirstTokenNum || null,
    first_token_min_duration: stats.minFirstTokenNum || null,
    first_token_max_duration: stats.maxFirstTokenNum || null,
    avg_block_duration: stats.avgDurationNum || null,
    user_ip: metadata.ip,
    coze_bot_id: process.env.COZE_BOT_ID || '7550204987524169763',
    completed_at: new Date().toISOString()
  };

  // 插入会话记录
  const { error: sessionError } = await supabase
    .from('assessment_sessions')
    .insert(sessionData);

  if (sessionError) throw sessionError;

  // 插入评估结果
  const { data, error } = await supabase
    .from('assessment_results')
    .insert(resultsToSave);

  if (error) throw error;
  return { sessionId, count: resultsToSave.length };
}

// calculateAverage 函数已移至统一的统计模块中

module.exports = { saveAssessmentResults };