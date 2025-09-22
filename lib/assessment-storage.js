const supabase = require('./supabase-client');

async function saveAssessmentResults(frontendData, metadata) {
  const batchId = `batch_${Date.now()}`;
  
  const resultsToSave = frontendData.filter(row => 
    row.block_type === 'answer' && 
    row.block_subtype === '文本回复' &&
    row['准确率'] && row['专业度'] && row['语气合理']
  ).map(row => ({
    batch_id: batchId,
    metadata: metadata,
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

  const { data, error } = await supabase
    .from('assessment_results')
    .insert(resultsToSave);

  if (error) throw error;
  return { batchId, count: resultsToSave.length };
}

module.exports = { saveAssessmentResults };