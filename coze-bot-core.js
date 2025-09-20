const https = require('https');
require('dotenv').config();

// 环境变量验证
function validateEnvironment() {
  const required = ['COZE_API_TOKEN', 'COZE_BOT_ID'];
  const missing = required.filter(key => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

// 安全的JSON解析
function safeJsonParse(jsonString, fallback = null) {
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    console.warn(`JSON解析失败: ${error.message}`);
    return fallback;
  }
}

// 从.env文件读取配置，如果没有则使用默认值
const DEFAULT_COZE_API_TOKEN = process.env.COZE_API_TOKEN;
const DEFAULT_BOT_ID = process.env.COZE_BOT_ID;
const DEFAULT_CONTENT = process.env.DEFAULT_CONTENT || '今天星期几';
const DEFAULT_ACCESS_TOKEN = process.env.ACCESS_TOKEN;
const PROJECT_ID = process.env.COZE_PROJECT_ID || 'fdb3e9f7-099b-3962-8ce5-0f67cd490d9f';

/**
 * 调用Coze Bot并返回流式响应结果
 * @param {string} content - 用户输入内容（从命令行参数覆盖）
 * @param {Array} contextJson - 对话上下文JSON数组（从命令行参数覆盖）
 */
function callCozeBot(content = DEFAULT_CONTENT, contextJson = null) {
  // 从命令行参数获取参数
  if (process.argv.length > 2) {
    content = process.argv[2];
  }
  
  // 从命令行参数获取上下文JSON（第3个参数）
  if (process.argv.length > 3 && process.argv[3] && process.argv[3] !== '') {
    let jsonString = process.argv[3];
    console.log(`🔍 尝试解析JSON字符串长度: ${jsonString.length}`);
    console.log(`🔍 原始JSON字符串: ${jsonString}`);
    
    // 尝试修复PowerShell导致的JSON格式问题
    if (jsonString.includes('{') && !jsonString.includes('"role"')) {
      console.log('🔧 检测到PowerShell格式问题，尝试修复...');
      // 修复缺失的引号
      jsonString = jsonString
        .replace(/([{,])\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":')
        .replace(/:([^,}\]]+)([,}\]])/g, ':"$1"$2')
        .replace(/:""/g, ':""')
        .replace(/:"{/g, ':{')
        .replace(/}"([,\]])/g, '}$1');
      console.log(`🔧 修复后的JSON: ${jsonString}`);
    }
    
    contextJson = safeJsonParse(jsonString);
    if (contextJson) {
      console.log(`📋 从命令行参数获取上下文: ${contextJson.length} 条消息`);
    }
  }
  
  // 使用环境变量中的配置
  const accessToken = DEFAULT_ACCESS_TOKEN;
  const apiToken = DEFAULT_COZE_API_TOKEN;
  const botId = DEFAULT_BOT_ID;

  // 记录请求开始时间
  const startTime = Date.now();
  console.log(`开始调用Coze Bot... (${((Date.now() - startTime) / 1000.0).toFixed(3)}s)`);
  
  // 准备对话消息 - 优先使用命令行参数，然后是COZE_CONTEXT，最后是简单模式
  let additionalMessages = [];
  let contextMessages = null;
  
  // 1. 优先使用解析的上下文参数
  if (contextJson && contextJson.length > 0) {
    contextMessages = contextJson;
    console.log(`📋 使用命令行上下文: ${contextMessages.length} 条历史消息`);
  }
  // 2. 其次使用环境变量的上下文
  else {
    try {
      const contextConfig = process.env.COZE_CONTEXT;
      if (contextConfig && contextConfig.trim() && contextConfig !== '[]') {
        contextMessages = safeJsonParse(contextConfig);
        console.log(`📋 使用环境变量上下文: ${contextMessages.length} 条历史消息`);
      }
    } catch (error) {
      console.log(`⚠️ 环境变量上下文解析失败: ${error.message}`);
    }
  }
  
  // 构建最终的消息数组
  if (contextMessages && contextMessages.length > 0) {
    // 上下文模式 - 历史消息 + 当前问题
    additionalMessages = [
      ...contextMessages,  // 历史上下文
      {
        "role": "user",
        "content": content,
        "content_type": "text"
      }
    ];
    console.log(`🎯 当前问题: ${content}`);
    
    // 打印上下文内容用于验证
    console.log(`🔍 上下文内容:`);
    contextMessages.forEach((msg, index) => {
      console.log(`  ${index + 1}. [${msg.role}] ${msg.content || msg.content_type || 'No content'}`);
    });
  } else {
    // 简单模式 - 只传当前问题
    additionalMessages = [
      {
        "role": "user",
        "content": content,
        "content_type": "text"
      }
    ];
    console.log(`💬 使用简单模式: 单独问答`);
  }

  // 准备请求数据 - 使用流式响应
  const requestData = {
    "bot_id": botId,
    "user_id": "Leo",
    "stream": true, // 使用流式响应
    "auto_save_history": true,
    "additional_messages": additionalMessages,
    "chat_id": null,
    "conversation_id": null,
    "workflow_id": null,
    "parameters": {
      "client_type": "TS",
      "access_token": accessToken,
      "project_id": PROJECT_ID,
      "conversation_id": "",
      "user_name": "Leo"
    }
  };

  // 准备HTTPS请求选项
  const options = {
    hostname: 'api.coze.cn',
    port: 443,
    path: '/v3/chat',
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiToken}`,
      'Content-Type': 'application/json'
    }
  };

  // 验证环境变量
  validateEnvironment();
  
  console.log('发送流式请求数据:', JSON.stringify(requestData, null, 2));

  console.log(`请求开始时间: ${(Date.now() - startTime) / 1000.0}s`);

  // 创建HTTPS请求
  const req = https.request(options, (res) => {
    // 检查HTTP状态码
    if (res.statusCode < 200 || res.statusCode >= 300) {
      console.error(`HTTP错误: ${res.statusCode}`);
      console.error(`请求失败，状态码: ${res.statusCode}`);
      return;
    }
    console.log(`流式响应状态码: ${res.statusCode} (${((Date.now() - startTime) / 1000.0).toFixed(3)}s)`);
    console.log(`流式响应头: ${JSON.stringify(res.headers)} (${((Date.now() - startTime) / 1000.0).toFixed(3)}s)`);

    let eventCount = 0;
    let chatId = null; // 用于存储chat_id
    // 存储每个消息ID的首token时间
    const firstTokenTimes = new Map();
    // 存储每个消息ID的完整内容
    const messageContents = new Map();
    // 存储每个消息ID的类型
    const messageTypes = new Map();
    // 存储每个消息ID的子类型
    const messageSubTypes = new Map();
    // 存储每个消息ID的结束时间
    const messageEndTimes = new Map();

    res.on('data', (chunk) => {
      const data = chunk.toString();
      console.log(`\n--- 流式数据块 ${++eventCount} (${((Date.now() - startTime) / 1000.0).toFixed(3)}s) ---`);
      
      // 解析Server-Sent Events格式
      const lines = data.split('\n');
      let currentEvent = '';
      
      lines.forEach(line => {
        if (line.startsWith('event:')) {
          currentEvent = line.substring(6).trim();
          console.log(`📡 事件类型: ${currentEvent} (${((Date.now() - startTime) / 1000.0).toFixed(3)}s)`);
        } else if (line.startsWith('data:')) {
          const dataContent = line.substring(5).trim();
          
          if (dataContent === '[DONE]') {
            console.log(`🏁 流式响应结束 (${((Date.now() - startTime) / 1000.0).toFixed(3)}s)`);
            return;
          }
          
          try {
            const eventData = safeJsonParse(dataContent);
            if (!eventData) return;
            console.log(`📦 事件数据: ${JSON.stringify(eventData, null, 2)} (${((Date.now() - startTime) / 1000.0).toFixed(3)}s)`);
            
            // 获取chat_id（通常在第一个事件数据中）
            if (eventData.id && !chatId) {
              chatId = eventData.id;
              console.log(`🆔 获取到Chat ID: ${chatId} (${((Date.now() - startTime) / 1000.0).toFixed(3)}s)`);
            }
            
            // 记录每个消息ID的首token时间
            if (eventData.id && !firstTokenTimes.has(eventData.id)) {
              const elapsed = (Date.now() - startTime) / 1000;
              firstTokenTimes.set(eventData.id, elapsed.toFixed(2));
            }
            
            // 如果是 message.delta 事件，累积回答内容
            if (currentEvent === 'conversation.message.delta' && eventData.content) {
              if (!messageContents.has(eventData.id)) {
                messageContents.set(eventData.id, '');
              }
              messageContents.set(eventData.id, messageContents.get(eventData.id) + eventData.content);
            }
            
            // 如果是 message.completed 事件，存储完整回答和类型
            if (currentEvent === 'conversation.message.completed') {
              // 记录消息完成的时间作为block_end（无论是否有content）
              const completeTime = ((Date.now() - startTime) / 1000.0).toFixed(2);
              if (!messageEndTimes.has(eventData.id)) {
                messageEndTimes.set(eventData.id, completeTime);
              }

              if (eventData.content) {
                messageContents.set(eventData.id, eventData.content);
                console.log(`💬 完整回答: ${eventData.content} (${((Date.now() - startTime) / 1000.0).toFixed(3)}s)`);
              }

              if (eventData.type) {
                messageTypes.set(eventData.id, eventData.type);

                // 如果类型是answer，检测并存储子类型
                if (eventData.type === 'answer' && eventData.content) {
                  try {
                    const contentObj = JSON.parse(eventData.content);
                    if (contentObj.display_type) {
                      messageSubTypes.set(eventData.id, contentObj.display_type);
                    } else {
                      // 没有display_type时，设为"文本回复"
                      messageSubTypes.set(eventData.id, '其他');
                    }
                  } catch (e) {
                    // 如果不是JSON格式，说明是纯文本回复
                    messageSubTypes.set(eventData.id, '文本回复');
                  }
                }
              }
            }
            
          } catch (e) {
            console.log(`📄 事件数据(原始): ${dataContent} (${((Date.now() - startTime) / 1000.0).toFixed(3)}s)`);
          }
        }
      });
    });

    res.on('end', () => {
      console.log(`\n✅ Coze Bot调用完成！ (${((Date.now() - startTime) / 1000.0).toFixed(3)}s)`);

      // 验证additional_messages的内容
      console.log('\n🔍 验证additional_messages内容:');
      requestData.additional_messages.forEach((msg, index) => {
        console.log(`  消息 ${index + 1}: [${msg.role}] ${msg.content || msg.content_type || 'No content'}`);
      });

      // 收集和输出分析结果
      const results = [];
      let segmentCount = 0;

      console.log(`\n=== 回答分段分析 (${((Date.now() - startTime) / 1000.0).toFixed(3)}s) ===`);
      console.log(`🆔 Chat ID: ${chatId || '未获取到'}`);

      // 按照消息ID的顺序输出结果
      const orderedIds = Array.from(firstTokenTimes.keys());
      orderedIds.forEach((id, index) => {
        // 只输出非verbose类型的消息
        const type = messageTypes.get(id) || 'unknown';
        if (type !== 'verbose') {
          segmentCount++;
          const blockEndTime = messageEndTimes.get(id) || firstTokenTimes.get(id);
          console.log(`\n--- 分段 ${segmentCount} ---`);
          console.log(`首token时间: ${firstTokenTimes.get(id)}秒`);
          console.log(`结束时间: ${blockEndTime}秒`);
          console.log(`消息类型: ${type}`);

          // 显示子类型（如果存在）
          const subType = messageSubTypes.get(id);
          if (subType) {
            console.log(`消息子类型: ${subType}`);
          } else if (type === 'answer') {
            // 如果是answer类型但没有子类型，默认显示文本回复
            console.log(`消息子类型: 文本回复`);
          }

          console.log(`内容长度: ${(messageContents.get(id) || '').length}字符`);
          console.log(`内容: ${messageContents.get(id) || '无内容'}`);

          // 收集结果用于返回
          results.push({
            block_id: segmentCount,
            block_type: type,
            block_subtype: subType || '',
            block_result: messageContents.get(id) || '无内容',
            block_start: parseFloat(firstTokenTimes.get(id)),
            block_end: parseFloat(messageEndTimes.get(id) || firstTokenTimes.get(id))
          });
        }
      });

      console.log(`\n总计分段数: ${segmentCount} (${((Date.now() - startTime) / 1000.0).toFixed(3)}s)`);

      // 返回结果
      return results;
    });
  });

  // 处理请求错误
  req.on('error', (error) => {
    console.error(`❌ 流式请求失败: ${error.message} (${((Date.now() - startTime) / 1000.0).toFixed(3)}s)`);
  });

  // 发送请求数据
  req.write(JSON.stringify(requestData));
  req.end();
}

// 导出函数供外部调用
module.exports = {
  callCozeBot
};

// 如果直接运行此文件，则执行默认测试
if (require.main === module) {
  console.log('='.repeat(60));
  console.log('🤖 Coze API Bot 测试');
  console.log('='.repeat(60));

  // 直接调用Coze Bot
  callCozeBot();
}