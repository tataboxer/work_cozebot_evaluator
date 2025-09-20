// Coze API 客户端封装
// 基于现有的 coze-bot-core.js 进行封装，完全按照 data_processor.py 的逻辑实现

const { spawn } = require('child_process');
const path = require('path');

/**
 * 调用 Coze API 处理问题
 * @param {string} content - 问题内容
 * @param {Array} context - 上下文数组 (可选)
 * @returns {Promise<Object>} 处理结果
 */
async function callCozeAPI(content, context = null) {
  return new Promise((resolve, reject) => {
    console.log(`🤖 调用Coze API: ${content.substring(0, 50)}...`);
    
    // 构建命令参数 - 完全按照Python逻辑
    const args = ['coze-bot-core.js', content];
    
    // 如果有上下文，添加到参数中
    if (context && context.length > 0) {
      const contextJson = JSON.stringify(context, false); // ensure_ascii=False equivalent
      args.push(contextJson);
      console.log(`📋 传递上下文: ${context.length} 条消息`);
    }
    
    // 调用 coze-bot-core.js
    const cozeProcess = spawn('node', args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: path.dirname(__dirname), // 回到项目根目录
      env: {
        ...process.env,
        NODE_ENV: 'production'
      },
      timeout: 60000 // 60秒超时，与Python一致
    });
    
    let stdout = '';
    let stderr = '';
    
    cozeProcess.stdout.on('data', (data) => {
      const output = data.toString();
      stdout += output;
      
      // 直接在终端打印Coze输出
      // if (output.trim()) {
      //   console.log('Coze输出:', output.trim());
      // }
    });
    
    cozeProcess.stderr.on('data', (data) => {
      const error = data.toString();
      stderr += error;
    });
    
    cozeProcess.on('close', (code) => {
      if (code === 0) {
        console.log(`✅ Coze API调用成功`);
        resolve({
          success: true,
          output: stdout,
          error: stderr
        });
      } else {
        console.error(`❌ Coze API调用失败，退出码: ${code}`);
        reject(new Error(`Coze API调用失败: ${stderr || '未知错误'}`));
      }
    });
    
    cozeProcess.on('error', (error) => {
      console.error('❌ Coze进程启动失败:', error);
      reject(error);
    });
  });
}

/**
 * 解析 Coze 输出结果 - 完全按照Python的parse_bot_output逻辑
 * @param {string} output - 原始输出
 * @returns {Object} 解析后的结果 {segments, chatId}
 */
function parseBotOutput(output) {
  const segments = [];
  let chatId = null;
  
  if (!output) {
    return { segments, chatId };
  }
  
  const lines = output.split('\n');
  
  // 首先查找Chat ID - 按照Python逻辑
  for (const line of lines) {
    if (line.includes('🆔 Chat ID:')) {
      const chatIdPart = line.split('🆔 Chat ID:')[1].trim();
      if (chatIdPart !== '未获取到') {
        chatId = chatIdPart;
      }
      break;
    }
  }
  
  // 查找并打印验证additional_messages内容 - 按照Python逻辑
  console.log('\n🔍 从bot输出中提取验证信息:');
  let verificationStarted = false;
  for (const line of lines) {
    if (line.includes('🔍 验证additional_messages内容') || line.includes('验证additional_messages内容')) {
      verificationStarted = true;
      console.log(`   ${line.trim()}`);
      // 广播到Web UI
      if (global.broadcastLog) {
        global.broadcastLog('coze', `🔍 ${line.trim()}`);
      }
    } else if (verificationStarted && (line.includes('消息 ') && (line.includes('[user]') || line.includes('[assistant]')))) {
      console.log(`   ${line.trim()}`);
      // 广播重要的消息验证日志到Web UI
      if (global.broadcastLog) {
        global.broadcastLog('coze', `   ${line.trim()}`);
      }
    } else if (verificationStarted && line.trim() && !line.startsWith('发送流式请求数据') && !line.startsWith('请求开始时间')) {
      const keywords = ['🎯 当前问题', '🔍 上下文内容', '📋 使用', '💬 使用简单模式'];
      if (keywords.some(keyword => line.includes(keyword))) {
        console.log(`   ${line.trim()}`);
        if (global.broadcastLog) {
          global.broadcastLog('coze', `   ${line.trim()}`);
        }
      } else if (line.startsWith('  ') && line.includes('.') && line.includes('[') && line.includes(']')) {
        console.log(`   ${line.trim()}`);
        if (global.broadcastLog) {
          global.broadcastLog('coze', `   ${line.trim()}`);
        }
      } else if (line.includes('发送流式请求数据')) {
        break;
      }
    }
  }
  
  let currentSegment = null;
  let collectingContent = false;
  let contentLines = [];
  
  for (const line of lines) {
    if (line.startsWith('--- 分段')) {
      if (currentSegment) {
        // 保存之前收集的多行内容
        if (contentLines.length > 0) {
          // 使用标准换行符
          currentSegment.block_result = contentLines.join('\n');
        }
        segments.push(currentSegment);
        contentLines = [];
        collectingContent = false;
      }
      currentSegment = {
        block_type: '',
        block_subtype: '',
        block_result: '',
        block_start: 0.0,
        block_end: 0.0
      };
    } else if (currentSegment) {
      if (line.includes('消息类型:')) {
        const typePart = line.split('消息类型:')[1].trim();
        currentSegment.block_type = typePart;
        collectingContent = false;
      } else if (line.includes('消息子类型:')) {
        const subtypePart = line.split('消息子类型:')[1].trim();
        currentSegment.block_subtype = subtypePart;
        collectingContent = false;
      } else if (line.includes('首token时间:')) {
        const timePart = line.split('首token时间:')[1].split('秒')[0].trim();
        try {
          currentSegment.block_start = parseFloat(timePart);
        } catch (error) {
          currentSegment.block_start = 0.0;
        }
        collectingContent = false;
      } else if (line.includes('结束时间:')) {
        const timePart = line.split('结束时间:')[1].split('秒')[0].trim();
        try {
          currentSegment.block_end = parseFloat(timePart);
        } catch (error) {
          currentSegment.block_end = currentSegment.block_start;
        }
        collectingContent = false;
      } else if (line.includes('内容:') && !line.includes('无内容')) {
        const contentPart = line.split('内容:')[1].trim();
        contentLines = contentPart ? [contentPart] : [];
        collectingContent = true;
      } else if (collectingContent && line.trim() && !line.startsWith('---')) {
        contentLines.push(line);
      }
    }
  }
  
  // 添加最后一个分段
  if (currentSegment) {
    if (contentLines.length > 0) {
      // 使用标准换行符
      currentSegment.block_result = contentLines.join('\n');
    }
    segments.push(currentSegment);
  }
  
  return { segments, chatId };
}

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
    
    if (result.success && result.output) {
      // 解析bot输出
      const { segments, chatId } = parseBotOutput(result.output);
      
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
            block_end: segment.block_end || segment.block_start
          });
        }
      }
      
      return records;
    } else {
      console.log(`   ❌ 跳过失败的行: ${questionId} - 输出为空或调用失败`);
      if (result.error) {
        console.log(`   🔴 错误信息: ${result.error}`);
      }
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
  const maxWorkers = parseInt(process.env.DATA_PROCESSOR_THREADS) || 10;
  console.log(`开始并发处理数据（${maxWorkers}个线程）...`);
  console.log(`📊 配置信息: 最大并发线程数 = ${maxWorkers}`);
  
  const results = [];
  let totalProcessed = 0;
  let totalRecords = 0;
  
  // 真正的并发处理，与Python ThreadPoolExecutor一致
  const semaphore = new Array(maxWorkers).fill(null);
  let currentIndex = 0;
  
  const processNext = async () => {
    if (currentIndex >= questions.length) return [];
    
    const index = currentIndex++;
    const question = questions[index];
    
    try {
      const records = await processSingleQuestion(question, index);
      
      // 更新统计
      results.push(...records);
      totalRecords += records.length;
      totalProcessed++;
      
      // 调用进度回调
      if (progressCallback) {
        progressCallback(totalProcessed, questions.length, records.length);
      }
      
      // 显示进度
      console.log(`进度: ${totalProcessed}/${questions.length} 行已处理，已生成 ${totalRecords} 条记录`);
      
      // 广播Excel处理进度
      const progressPercent = ((totalProcessed / questions.length) * 100).toFixed(1);
      if (global.broadcastLog) {
        global.broadcastLog('excel-progress', JSON.stringify({
          current: totalProcessed,
          total: questions.length,
          percent: progressPercent
        }));
      }
      
      if (totalProcessed % 5 === 0) {
        const completionRate = (totalProcessed / questions.length) * 100;
        console.log(`🚀 完成率: ${completionRate.toFixed(1)}% (${totalProcessed}/${questions.length})`);
      }
      
      return records;
    } catch (error) {
      console.error(`处理问题 ${index + 1} 失败:`, error);
      totalProcessed++;
      return [];
    }
  };
  
  // 创建并发worker
  const workers = [];
  for (let i = 0; i < maxWorkers; i++) {
    const worker = async () => {
      while (currentIndex < questions.length) {
        await processNext();
      }
    };
    workers.push(worker());
  }
  
  // 等待所有worker完成
  await Promise.all(workers);
  
  console.log(`总共处理了 ${questions.length} 行数据`);
  console.log(`生成了 ${totalRecords} 条记录`);
  console.log(`并发线程数: ${maxWorkers}`);
  
  return results;
}

module.exports = {
  callCozeAPI,
  batchProcessQuestions,
  parseBotOutput,
  parseContextData
};