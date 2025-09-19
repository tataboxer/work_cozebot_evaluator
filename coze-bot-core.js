const https = require('https');
require('dotenv').config();



// 从.env文件读取配置，如果没有则使用默认值
const DEFAULT_COZE_API_TOKEN = process.env.COZE_API_TOKEN ;
const DEFAULT_BOT_ID = process.env.COZE_BOT_ID ;
const DEFAULT_CONTENT = process.env.DEFAULT_CONTENT ;
// 从.env文件读取token，如果没有则使用默认值
const DEFAULT_ACCESS_TOKEN = process.env.ACCESS_TOKEN ;

/**
 * 测试流式响应
 * @param {string} content - 用户输入内容（可选）
 * @param {string} accessToken - 访问令牌（可选）
 * @param {string} apiToken - API令牌（可选）
 * @param {string} botId - Bot ID（可选）
 * @param {function} callback - 回调函数（可选，用于获取结果）
 */
function testStreamingResponse(content = DEFAULT_CONTENT, accessToken = DEFAULT_ACCESS_TOKEN, apiToken = DEFAULT_COZE_API_TOKEN, botId = DEFAULT_BOT_ID, callback = null) {
  console.log('\n\n='.repeat(60));

  // 从命令行参数获取参数
  if (process.argv.length > 2) {
    content = process.argv[2];
  }
  if (process.argv.length > 3) {
    accessToken = process.argv[3];
  }
  if (process.argv.length > 4) {
    apiToken = process.argv[4];
  }
  if (process.argv.length > 5) {
    botId = process.argv[5];
  }

  // 记录请求开始时间
  const startTime = Date.now();
  console.log(`开始测试流式响应... (${((Date.now() - startTime) / 1000.0).toFixed(3)}s)`);
  
  // 准备请求数据 - 使用流式响应
  const requestData = {
    "bot_id": botId,
    "user_id": "Leo",
    "stream": true, // 使用流式响应
    "auto_save_history": true,
    "additional_messages": [
      {
        "role": "user",
        "content": content,
        "content_type": "text"
      }
    ],
    "chat_id": null,
    "conversation_id": null,
    "workflow_id": null,
    "parameters": {
      "client_type": "TS",
      "access_token": accessToken,
      "project_id": "fdb3e9f7-099b-3962-8ce5-0f67cd490d9f",
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

  console.log('发送流式请求数据:', JSON.stringify(requestData, null, 2));

  console.log(`请求开始时间: ${(Date.now() - startTime) / 1000.0}s`);

  // 创建HTTPS请求
  const req = https.request(options, (res) => {
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
            const eventData = JSON.parse(dataContent);
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
                      messageSubTypes.set(eventData.id, '文本回复');
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
      console.log(`\n✅ 流式响应测试完成！ (${((Date.now() - startTime) / 1000.0).toFixed(3)}s)`);

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

      // 返回结果（用于外部调用）
      if (callback) {
        callback(results);
      }
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
  testStreamingResponse,
  DEFAULT_CONTENT,
  DEFAULT_ACCESS_TOKEN,
  DEFAULT_COZE_API_TOKEN,
  DEFAULT_BOT_ID
};

// 如果直接运行此文件，则执行默认测试
if (require.main === module) {
  console.log('='.repeat(60));
  console.log('🤖 Coze API Bot 测试');
  console.log('='.repeat(60));

  // 直接调用流式响应函数
  testStreamingResponse();
}