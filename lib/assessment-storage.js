const supabase = require('./supabase-client');

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
    evaluation_version: 'v1.0'
  }));

  // 计算Token时长统计
  const blockDurations = resultsToSave
    .filter(row => row.block_start && row.block_end)
    .map(row => row.block_end - row.block_start);
  
  const firstTokenDurations = resultsToSave
    .filter(row => row.block_start)
    .map(row => row.block_start);

  // 计算评估摘要
  const evaluationSummary = {
    avgAccuracy: calculateAverage(resultsToSave, 'accuracy'),
    avgProfessionalism: calculateAverage(resultsToSave, 'professionalism'),
    avgToneReasonableness: calculateAverage(resultsToSave, 'tone_reasonableness'),
    totalEvaluated: resultsToSave.length
  };

  // 创建会话记录
  const sessionData = {
    session_id: sessionId,
    session_name: metadata.fileName || null,
    config: {
      model: metadata.model || 'doubao-1-5-pro-32k-250115',
      ip: metadata.ip,
      fileName: metadata.fileName,
      evaluatorVersion: 'v1.0'
    },
    total_questions: resultsToSave.length,
    processed_questions: resultsToSave.length,
    evaluation_summary: evaluationSummary,
    first_token_avg_duration: firstTokenDurations.length > 0 ? 
      firstTokenDurations.reduce((a, b) => a + b, 0) / firstTokenDurations.length : null,
    first_token_min_duration: firstTokenDurations.length > 0 ? Math.min(...firstTokenDurations) : null,
    first_token_max_duration: firstTokenDurations.length > 0 ? Math.max(...firstTokenDurations) : null,
    avg_block_duration: blockDurations.length > 0 ? 
      blockDurations.reduce((a, b) => a + b, 0) / blockDurations.length : null,
    user_ip: metadata.ip,
    evaluator_name: 'Default Evaluator',
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

function calculateAverage(results, dimension) {
  const scores = results
    .map(r => r.evaluation_results[dimension]?.score)
    .filter(score => score && !isNaN(score))
    .map(score => parseFloat(score));
  
  return scores.length > 0 ? 
    Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10 : 0;
}

module.exports = { saveAssessmentResults };