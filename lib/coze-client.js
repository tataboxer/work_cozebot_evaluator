// Coze API 客户端封装
// 基于现有的 coze-bot-core.js 进行封装，完全按照 data_processor.py 的逻辑实现

/**
 * 调用 Coze API 处理问题
 * @param {string} content - 问题内容
 * @param {Array} context - 上下文数组 (可选)
 * @returns {Promise<Object>} 处理结果
 */
async function callCozeAPI(content, context = null) {
  console.log(`🤖 调用Coze API: ${content.substring(0, 50)}...`);
  
  try {
    // 直接调用模块化的 callCozeBot 函数
    const { callCozeBot } = require('../coze-bot-core');
    const result = await callCozeBot(content, context);
    
    console.log(`✅ Coze API调用成功`);
    return {
      success: true,
      result: result
    };
  } catch (error) {
    console.error(`❌ Coze API调用失败:`, error.message);
    throw error;
  }
}

// 不再需要解析输出，直接使用模块返回的结果

/**
 * 处理单个问题 - 按照Python的process_single_row逻辑
 * @param {Object} question - 问题对象
 * @param {number} index - 索引
 * @returns {Promise<Array>} 处理结果记录数组
 */
async function processSingleQuestion(question, index) {
  const questionId = String(question.question_id);
  const questionType = String(question.question_type || '');
  const questionText = String(question.question_text);
  const expectedAnswer = String(question.expected_answer || '');
  
  // 检查是否有context
  let contextData = null;
  let contextStr = '';
  if (question.context) {
    const rawContext = String(question.context);
    if (rawContext && rawContext !== 'nan') {
      contextData = parseContextData(rawContext);
      if (contextData) {
        contextStr = JSON.stringify(contextData, false);
      }
    }
  }
  
  console.log(`📝 处理第 ${index + 1} 行: ${questionId}`);
  console.log(`   问题类型: ${questionType}`);
  console.log(`   问题内容: ${questionText.substring(0, 100)}${questionText.length > 100 ? '...' : ''}`);
  if (contextData) {
    console.log(`   📚 上下文: ${contextData.length} 条历史消息`);
  }
  
  try {
    // 调用Coze API
    const result = await callCozeAPI(questionText, contextData);
    
    if (result.success && result.result) {
      const { segments, chatId } = result.result;
      
      console.log(`   ✅ 成功解析出 ${segments.length} 个分段`);
      if (chatId) {
        console.log(`   🆔 Chat ID: ${chatId}`);
      } else {
        console.log(`   ⚠️ 未找到Chat ID`);
      }
      
      // 为每个分段创建记录
      const records = [];
      for (const segment of segments) {
        if (segment.block_type && segment.block_type !== 'unknown') {
          records.push({
            question_id: questionId,
            question_type: questionType,
            question_text: questionText,
            context: contextStr,
            chatid: chatId || '',
            block_type: segment.block_type,
            block_subtype: segment.block_subtype || '',
            block_result: segment.block_result,
            block_start: segment.block_start,
            block_end: segment.block_end || segment.block_start,
            expected_answer: expectedAnswer
          });
        }
      }
      
      return records;
    } else {
      console.log(`   ❌ 跳过失败的行: ${questionId} - API调用失败`);
      return [];
    }
  } catch (error) {
    console.error(`❌ 处理问题失败: ${questionId}`, error.message);
    return [];
  }
}

/**
 * 解析上下文数据 - 按照Python的parse_context_data逻辑
 * @param {string} contextStr - 上下文字符串
 * @returns {Array|null} 解析后的上下文数组
 */
function parseContextData(contextStr) {
  if (!contextStr || contextStr.trim() === '') {
    return null;
  }
  
  contextStr = contextStr.trim();
  
  try {
    // 尝试1: 解析为JSON数组
    const contextMessages = JSON.parse(contextStr);
    if (Array.isArray(contextMessages)) {
      console.log(`✅ 成功解析JSON数组格式: ${contextMessages.length} 条消息`);
      return contextMessages;
    }
  } catch (error) {
    // 继续尝试其他格式
  }
  
  try {
    // 尝试2: 解析逗号分隔的JSON对象
    if (!contextStr.startsWith('[') && contextStr.includes('},{')) {
      const fixedContext = '[' + contextStr + ']';
      const contextMessages = JSON.parse(fixedContext);
      console.log(`✅ 成功解析逗号分隔JSON格式: ${contextMessages.length} 条消息`);
      return contextMessages;
    }
  } catch (error) {
    // 继续尝试其他格式
  }
  
  try {
    // 尝试3: 按行解析JSONL格式
    const lines = contextStr.trim().split('\n');
    const contextMessages = [];
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine) {
        contextMessages.push(JSON.parse(trimmedLine));
      }
    }
    if (contextMessages.length > 0) {
      console.log(`✅ 成功解析JSONL格式: ${contextMessages.length} 条消息`);
      return contextMessages;
    }
  } catch (error) {
    // 解析失败
  }
  
  console.log(`❌ 上下文解析失败，无法识别格式: ${contextStr.substring(0, 100)}...`);
  return null;
}

/**
 * 批量处理问题列表 - 按照Python的ThreadPoolExecutor逻辑
 * @param {Array} questions - 问题列表
 * @param {Function} progressCallback - 进度回调函数
 * @returns {Promise<Array>} 处理结果数组
 */
async function batchProcessQuestions(questions, progressCallback = null) {
  console.log(`开始并发处理数据...`);
  
  // 在处理Excel前动态获取Token
  try {
    const tokenManager = require('./token-manager');
    const token = await tokenManager.getToken();
    
    // 更新环境变量
    process.env.ACCESS_TOKEN = token;
    console.log('🔑 Token动态获取成功');
    
    // 广播Token获取成功消息
    if (global.broadcastLog) {
      global.broadcastLog('success', 'Token动态获取成功，开始处理Excel');
    }
  } catch (error) {
    console.error('❌ Token获取失败:', error.message);
    if (global.broadcastLog) {
      global.broadcastLog('error', `Token获取失败: ${error.message}`);
    }
    throw error;
  }
  
  const results = [];
  let totalProcessed = 0;
  
  // 使用Promise.all并发处理
  const allPromises = questions.map(async (question, index) => {
    try {
      const records = await processSingleQuestion(question, index);
      
      totalProcessed++;
      results.push(...records);
      
      // 调用进度回调
      if (progressCallback) {
        progressCallback(totalProcessed, questions.length, records.length);
      }
      
      // 广播Excel处理进度
      const progressPercent = ((totalProcessed / questions.length) * 100).toFixed(1);
      if (global.broadcastLog) {
        global.broadcastLog('excel-progress', JSON.stringify({
          current: totalProcessed,
          total: questions.length,
          percent: progressPercent
        }));
      }
      
      return records;
    } catch (error) {
      console.error(`处理问题 ${index + 1} 失败:`, error);
      totalProcessed++;
      return [];
    }
  });
  
  // 等待所有任务完成
  await Promise.all(allPromises);
  
  console.log(`总共处理了 ${questions.length} 行数据，生成了 ${results.length} 条记录`);
  
  return results;
}

module.exports = {
  callCozeAPI,
  batchProcessQuestions,
  parseContextData
};