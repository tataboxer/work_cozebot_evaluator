const express = require('express');
const router = express.Router();
const { evaluateWithLLM } = require('../lib/llm-client');
const { saveAssessmentResults } = require('../lib/assessment-storage');

/**
 * 处理单行数据的函数 
 */
async function processSingleRow(rowData, sessionId) {
  const { index, row } = rowData;
  const question = String(row.question_text || '');
  const answer = String(row.block_result || '');
  
  // 获取上下文数据
  let context = null;
  if (row.context && String(row.context).trim()) {
    context = String(row.context);
  }

  // 跳过空内容
  if (!answer || answer.trim() === '') {
    console.log(`跳过第${index + 1}行: 回复内容为空`);
    return { index, success: false, error: '空内容' };
  }

  // 显示context信息
  let contextInfo = " (无上下文)";
  if (context) {
    try {
      const contextData = JSON.parse(context);
      if (Array.isArray(contextData)) {
        contextInfo = ` (含${contextData.length}条上下文)`;
      } else {
        contextInfo = " (上下文格式错误)";
      }
    } catch (e) {
      contextInfo = " (上下文格式错误)";
    }
  }
  
  console.log(`\n[${index + 1}] 正在处理问题: ${question.substring(0, 30)}${question.length > 30 ? '...' : ''}${contextInfo}`);
  
  // 广播到Web UI
  if (global.broadcastLog) {
    global.broadcastLog('info', `[${index + 1}] 正在评估: ${question.substring(0, 30)}${question.length > 30 ? '...' : ''}${contextInfo}`);
  }

  // 添加随机延时避免API限流（1-3秒）
  const delay = 1000 + (index % 3) * 1000;
  await new Promise(resolve => setTimeout(resolve, delay));

  // 获取参考答案
  let expectedAnswer = null;
  if (row.expected_answer && String(row.expected_answer).trim()) {
    expectedAnswer = String(row.expected_answer);
  }

  // 调用LLM评估（传入问题类型）
  const evaluationResult = await evaluateWithLLM(question, answer, context, expectedAnswer, row.question_type);

  if (evaluationResult && evaluationResult.evaluation) {
    const evaluation = evaluationResult.evaluation;
    const evaluatorInfo = evaluationResult.evaluatorInfo || '默认评估器 v1';
    const evaluatorVersionId = evaluationResult.evaluatorVersionId || null;

    try {
      console.log(`✓ 评估成功 - 准确率:${evaluation['准确率']['分数']} 专业度:${evaluation['专业度']['分数']} 语气:${evaluation['语气合理']['分数']}`);
      
      // 广播成功结果
      if (global.broadcastLog) {
        global.broadcastLog('success', `[${index + 1}] 评估成功 - 准确率:${evaluation['准确率']['分数']} 专业度:${evaluation['专业度']['分数']} 语气:${evaluation['语气合理']['分数']}`);
      }
      return { index, success: true, evaluation, evaluatorInfo, evaluatorVersionId };
    } catch (error) {
      console.log(`✗ 评估结果格式错误: ${error.message}`);
      return { index, success: false, error: `格式错误: ${error.message}` };
    }
  } else {
    console.log(`✗ 评估失败`);
    return { index, success: false, error: '评估失败' };
  }
}

/**
 * 执行质量评估 - 仅支持前端数据
 */
router.post('/run-assessment', async (req, res) => {
  try {
    const { data: frontendData, fileName } = req.body;
    
    if (!frontendData) {
      return res.status(400).json({
        success: false,
        message: '缺少评估数据'
      });
    }
    
    console.log(`📊 开始执行前端数据评估: ${frontendData.length} 条记录`);
    
    const data = [...frontendData]; // 复制数据
    
    // 初始化新列
    data.forEach(row => {
      if (!('准确率' in row)) row['准确率'] = null;
      if (!('准确率_理由' in row)) row['准确率_理由'] = null;
      if (!('专业度' in row)) row['专业度'] = null;
      if (!('专业度_理由' in row)) row['专业度_理由'] = null;
      if (!('语气合理' in row)) row['语气合理'] = null;
      if (!('语气合理_理由' in row)) row['语气合理_理由'] = null;
      if (!('evaluator_info' in row)) row['evaluator_info'] = null;
      if (!('evaluator_version_id' in row)) row['evaluator_version_id'] = null;
    });
    
    // 筛选需要评估的行
    const evaluationRows = data.filter((row, index) => {
      return row.block_type === 'answer' && 
             row.block_subtype === '文本回复' && 
             (!row['准确率'] || !row['准确率_理由'] ||
              !row['专业度'] || !row['专业度_理由'] ||
              !row['语气合理'] || !row['语气合理_理由']);
    });
    
    console.log(`需要评估的行数: ${evaluationRows.length}`);
    
    if (evaluationRows.length === 0) {
      return res.json({
        success: true,
        message: '所有数据已评估完成',
        data: data
      });
    }
    
    // 并发评估处理
    const maxWorkers = parseInt(process.env.ASSESS_THREADS) || 3;
    let evaluatedCount = 0;
    let successCount = 0;
    
    const allPromises = evaluationRows.map(async (row, index) => {
      const originalIndex = data.findIndex(dataRow => dataRow === row);
      
      try {
        const result = await processSingleRow({ index: originalIndex, row }, 'frontend');
        
        evaluatedCount++;
        
        if (result.success && result.evaluation) {
          successCount++;
          
          // 更新数据
          const dataRow = data[result.index];
          dataRow['准确率'] = result.evaluation['准确率']['分数'];
          dataRow['准确率_理由'] = result.evaluation['准确率']['理由'];
          dataRow['专业度'] = result.evaluation['专业度']['分数'];
          dataRow['专业度_理由'] = result.evaluation['专业度']['理由'];
          dataRow['语气合理'] = result.evaluation['语气合理']['分数'];
          dataRow['语气合理_理由'] = result.evaluation['语气合理']['理由'];
          dataRow['evaluator_info'] = result.evaluatorInfo || '默认评估器 v1';
          dataRow['evaluator_version_id'] = result.evaluatorVersionId || null;
        }
        
        // 更新进度
        const progressPercent = ((evaluatedCount / evaluationRows.length) * 100).toFixed(1);
        if (global.broadcastLog) {
          global.broadcastLog('progress', JSON.stringify({
            current: evaluatedCount,
            total: evaluationRows.length,
            percent: progressPercent
          }));
        }
        
        return result;
      } catch (error) {
        evaluatedCount++;
        console.error(`处理评估 ${index + 1} 失败:`, error);
        return { index: originalIndex, success: false, error: error.message };
      }
    });
    
    // 等待所有任务完成
    await Promise.all(allPromises);
    
    console.log(`🎉 前端数据评估完成！成功评估: ${successCount}/${evaluatedCount}`);
    
    // 存储评估结果到数据库
    if (successCount > 0) {
      try {
        const metadata = {
          ip: req.ip,
          fileName: fileName || 'frontend_data.json'
        };
        
        const { sessionId, count } = await saveAssessmentResults(data, metadata);
        console.log(`✅ 已存储 ${count} 条评估结果，会话ID: ${sessionId}`);
        
        if (global.broadcastLog) {
          global.broadcastLog('success', `✅ 已存储 ${count} 条评估结果到数据库`);
        }
      } catch (error) {
        console.error('❌ 数据存储失败:', error);
        if (global.broadcastLog) {
          global.broadcastLog('error', `❌ 数据存储失败: ${error.message}`);
        }
      }
    }
    
    return res.json({
      success: true,
      message: '评估完成',
      data: data
    });
    
  } catch (error) {
    console.error('❌ 评估执行失败:', error);
    res.status(500).json({
      success: false,
      message: '评估执行失败',
      error: error.message
    });
  }
});

module.exports = router;