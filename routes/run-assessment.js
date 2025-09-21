// 评估路由 - 基于assess.py完整重构
const express = require('express');
const router = express.Router();
const memoryStore = require('../lib/memory-store');
const { evaluateWithLLM } = require('../lib/llm-client');

/**
 * 处理单行数据的函数 - 对应assess.py的process_single_row
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

  // 调用LLM评估
  const evaluation = await evaluateWithLLM(question, answer, context);

  if (evaluation) {
    try {
      console.log(`✓ 评估成功 - 准确率:${evaluation['准确率']['分数']} 专业度:${evaluation['专业度']['分数']} 语气:${evaluation['语气合理']['分数']}`);
      
      // 广播成功结果
      if (global.broadcastLog) {
        global.broadcastLog('success', `[${index + 1}] 评估成功 - 准确率:${evaluation['准确率']['分数']} 专业度:${evaluation['专业度']['分数']} 语气:${evaluation['语气合理']['分数']}`);
      }
      return { index, success: true, evaluation };
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
 * 执行质量评估 - 对应assess.py的process_csv_evaluation
 */
router.post('/run-assessment', async (req, res) => {
  try {
    const { csvFile, data: frontendData } = req.body;
    
    if (!csvFile && !frontendData) {
      return res.status(400).json({
        success: false,
        message: '缺少评估数据源'
      });
    }
    
    // 处理前端传递的数据
    if (csvFile === 'frontend-data' && frontendData) {
      console.log(`📊 开始执行前端数据评估: ${frontendData.length} 条记录`);
      
      const data = [...frontendData]; // 复制数据
      
      // 初始化新列
      data.forEach(row => {
        if (!('准确率' in row)) row['准确率'] = null;
        if (!('准确率_理由' in row)) row['准确率_理由'] = null;
        if (!('专业度_分数' in row)) row['专业度_分数'] = null;
        if (!('专业度_理由' in row)) row['专业度_理由'] = null;
        if (!('语气合理_分数' in row)) row['语气合理_分数'] = null;
        if (!('语气合理_理由' in row)) row['语气合理_理由'] = null;
      });
      
      // 筛选需要评估的行
      const evaluationRows = data.filter((row, index) => {
        return row.block_type === 'answer' && 
               row.block_subtype === '文本回复' && 
               (!row['准确率'] || !row['准确率_理由'] ||
                !row['专业度_分数'] || !row['专业度_理由'] ||
                !row['语气合理_分数'] || !row['语气合理_理由']);
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
            dataRow['专业度_分数'] = result.evaluation['专业度']['分数'];
            dataRow['专业度_理由'] = result.evaluation['专业度']['理由'];
            dataRow['语气合理_分数'] = result.evaluation['语气合理']['分数'];
            dataRow['语气合理_理由'] = result.evaluation['语气合理']['理由'];
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
      
      return res.json({
        success: true,
        message: '评估完成',
        data: data
      });
    }
    
    console.log(`📊 开始执行评估: ${csvFile}`);
    
    // 检查是否是会话数据
    if (csvFile.startsWith('session:')) {
      const sessionId = csvFile.replace('session:', '');
      const session = memoryStore.getSession(sessionId);
      
      if (!session || !session.processedData) {
        return res.status(404).json({
          success: false,
          message: '会话数据不存在或已过期'
        });
      }
      
      const data = [...session.processedData]; // 复制数据避免直接修改
      console.log(`原始数据行数: ${data.length}`);
      
      // 初始化新列（仅当列不存在时）
      data.forEach(row => {
        if (!('准确率' in row)) row['准确率'] = null;
        if (!('准确率_理由' in row)) row['准确率_理由'] = null;
        if (!('专业度_分数' in row)) row['专业度_分数'] = null;
        if (!('专业度_理由' in row)) row['专业度_理由'] = null;
        if (!('语气合理_分数' in row)) row['语气合理_分数'] = null;
        if (!('语气合理_理由' in row)) row['语气合理_理由'] = null;
      });
      
      // 筛选需要评估的行：block_type=answer 且 block_subtype为文本回复 且 没有评估数据
      const evaluationRows = data.filter((row, index) => {
        return row.block_type === 'answer' && 
               row.block_subtype === '文本回复' && 
               (!row['准确率'] || !row['准确率_理由'] ||
                !row['专业度_分数'] || !row['专业度_理由'] ||
                !row['语气合理_分数'] || !row['语气合理_理由']);
      });
      
      console.log(`需要评估的行数: ${evaluationRows.length}`);
      console.log(`已有评估数据的行数: ${data.length - evaluationRows.length}`);
      
      // 广播评估统计信息
      if (global.broadcastLog) {
        global.broadcastLog('info', `📊 评估统计: 需要评估 ${evaluationRows.length} 行，已有评估数据 ${data.length - evaluationRows.length} 行`);
      }
      
      if (evaluationRows.length === 0) {
        console.log("✅ 所有符合条件的行都已有评估数据，跳过评估");
        return res.json({
          success: true,
          message: '所有数据已评估完成',
          data: {
            totalRecords: data.length,
            evaluatedRecords: 0,
            alreadyEvaluated: true
          }
        });
      }
      
      // 从环境变量读取线程数配置，默认为3（比Python版本保守一些）
      const maxWorkers = parseInt(process.env.ASSESS_THREADS) || 3;
      console.log(`开始使用${maxWorkers}个并发处理 ${evaluationRows.length} 行数据...`);
      console.log(`📊 配置信息: 最大评估线程数 = ${maxWorkers}`);
      
      // 广播开始评估信息
      if (global.broadcastLog) {
        global.broadcastLog('info', `🚀 开始并发评估: ${evaluationRows.length} 行数据，${maxWorkers} 个线程`);
      }
      
      // 并发处理评估
      let evaluatedCount = 0;
      let successCount = 0;
      
      // 使用Promise.all并发处理，参考coze-client.js的做法
      const allPromises = evaluationRows.map(async (row, index) => {
        const originalIndex = data.findIndex(dataRow => dataRow === row);
        
        try {
          const result = await processSingleRow({ index: originalIndex, row }, sessionId);
          
          evaluatedCount++;
          
          if (result.success && result.evaluation) {
            successCount++;
            
            // 更新数据
            const dataRow = data[result.index];
            dataRow['准确率'] = result.evaluation['准确率']['分数'];
            dataRow['准确率_理由'] = result.evaluation['准确率']['理由'];
            dataRow['专业度_分数'] = result.evaluation['专业度']['分数'];
            dataRow['专业度_理由'] = result.evaluation['专业度']['理由'];
            dataRow['语气合理_分数'] = result.evaluation['语气合理']['分数'];
            dataRow['语气合理_理由'] = result.evaluation['语气合理']['理由'];
          } else {
            console.log(`任务 ${result.index + 1} 失败: ${result.error || '未知错误'}`);
            
            if (global.broadcastLog) {
              global.broadcastLog('error', `[${result.index + 1}] 评估失败: ${result.error || '未知错误'}`);
            }
          }
          
          // 直接更新进度，参考coze-client.js
          const progressPercent = ((evaluatedCount / evaluationRows.length) * 100).toFixed(1);
          if (global.broadcastLog) {
            global.broadcastLog('progress', JSON.stringify({
              current: evaluatedCount,
              total: evaluationRows.length,
              percent: progressPercent
            }));
          }
          
          console.log(`进度: ${evaluatedCount}/${evaluationRows.length} 已完成`);
          
          return result;
        } catch (error) {
          evaluatedCount++;
          console.error(`处理评估 ${index + 1} 失败:`, error);
          return { index: originalIndex, success: false, error: error.message };
        }
      });
      
      // 等待所有任务完成
      await Promise.all(allPromises);
      
      // 已在上面使用Promise.all处理
      
      // 更新会话数据
      memoryStore.updateSession(sessionId, {
        assessmentData: data,
        status: 'assessment_completed',
        assessmentCompletedAt: new Date().toISOString()
      });
      
      console.log("\n" + "=".repeat(60));
      console.log("🎉 并发评估完成！");
      console.log("=".repeat(60));
      console.log(`会话ID: ${sessionId}`);
      console.log(`总行数: ${data.length}`);
      console.log(`评估行数: ${evaluatedCount}`);
      console.log(`成功评估: ${successCount}`);
      console.log(`成功率: ${evaluatedCount > 0 ? (successCount/evaluatedCount*100).toFixed(1) : 0}%`);
      console.log(`并发线程数: ${maxWorkers}`);
      
      res.json({
        success: true,
        message: '评估完成',
        data: {
          totalRecords: data.length,
          evaluatedRecords: evaluatedCount,
          successRecords: successCount,
          successRate: evaluatedCount > 0 ? (successCount/evaluatedCount*100).toFixed(1) : 0
        }
      });
      
    } else {
      // 处理文件路径方式（暂不支持）
      return res.status(400).json({
        success: false,
        message: '当前只支持Excel处理结果评估'
      });
    }
    
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