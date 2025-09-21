// LLM客户端 - 基于assess.py的evaluate_with_llm函数
const axios = require('axios');

/**
 * 简单解析context字符串为对象 - 对应assess.py的parse_context_simple
 */
function parseContextSimple(contextStr) {
  if (!contextStr || contextStr.trim() === '') {
    return null;
  }
  
  try {
    // 直接解析JSON数组（现在数据生成时已经是标准格式）
    const contextData = JSON.parse(contextStr);
    return Array.isArray(contextData) ? contextData : null;
  } catch (error) {
    console.log(`⚠️ Context解析失败: ${error.message}`);
    return null;
  }
}

/**
 * 调用LLM API进行评估 - 完全对应assess.py的evaluate_with_llm函数
 */
async function evaluateWithLLM(question, answer, context = null) {
  // 构建上下文信息
  let contextText = "";
  if (context) {
    let contextData = null;
    if (typeof context === 'string') {
      contextData = parseContextSimple(context);
    } else if (Array.isArray(context)) {
      contextData = context;
    }
    
    if (contextData && contextData.length > 0) {
      contextText = "\n对话历史:\n";
      for (let i = 0; i < contextData.length; i++) {
        const msg = contextData[i];
        const role = msg.role === 'user' ? '用户' : '助手';
        const content = msg.content || '';
        contextText += `${i + 1}. ${role}: ${content}\n`;
      }
      contextText += "\n";
    }
  }

  // 构建prompt - 完全对应assess.py的prompt
  const prompt = `你是一个专业的AI评估专家，现在需要评估苏州科技馆数字人助手趣波（QuBoo）的回复质量。

背景：趣波是苏州科技馆的AI智能助手，专门为游客提供科技馆参观、票务、展厅、活动等相关信息和服务，帮助游客获得优质的科技体验。

对话历史: ${contextText}
用户问题: ${question}
助手回复: ${answer}

请从以下三个角度评估回复质量：

1. 准确率：回复内容是否准确回答了用户问题，是否解决了用户的查询需求，是否与科技馆业务目标高度贴合。${contextText ? "考虑上下文连贯性，但不需要评判对话历史用assistant的回复" : ""} 评分1-100分。

2. 专业度：用词是否精准、术语是否正确、业务上下文是否符合科技馆场景的专业水准。评分1-100分。

3. 语气合理：语气是否礼貌友好、风格是否匹配科技馆数字助手场景（亲切、引导性、专业但不生硬）。评分1-100分。

请以JSON格式输出评估结果：
{
  "准确率": {"分数": 数字, "理由": "简要说明"},
  "专业度": {"分数": 数字, "理由": "简要说明"},
  "语气合理": {"分数": 数字, "理由": "简要说明"}
}`;

  // 从环境变量读取配置
  const llmUrl = process.env.llm_url;
  const llmApiKey = process.env.llm_api_key;
  const llmModelName = process.env.llm_model_name;

  if (!llmUrl || !llmApiKey || !llmModelName) {
    throw new Error("环境变量配置不完整，请检查 .env 文件");
  }

  const apiUrl = `${llmUrl}chat/completions`;

  const headers = {
    'Authorization': `Bearer ${llmApiKey}`,
    'Content-Type': 'application/json'
  };

  const data = {
    model: llmModelName,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.1
  };

  const maxRetries = 3;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      console.log(`正在评估问题: ${question.substring(0, 30)}${question.length > 30 ? '...' : ''}`);
      
      const response = await axios.post(apiUrl, data, { 
        headers, 
        timeout: 60000 
      });

      if (response.status === 200) {
        const result = response.data.choices[0].message.content;

        // 处理markdown格式
        let jsonResult;
        if (result.includes('```json')) {
          const jsonMatch = result.split('```json')[1].split('```')[0].trim();
          jsonResult = JSON.parse(jsonMatch);
        } else {
          jsonResult = JSON.parse(result);
        }
        
        return jsonResult;
      }
    } catch (error) {
      if (error.response && error.response.status === 429) {
        // API限流，等待后重试
        const waitTime = Math.pow(2, attempt); // 指数退避
        console.log(`API限流，第${attempt + 1}次重试，等待${waitTime}秒...`);
        await new Promise(resolve => setTimeout(resolve, waitTime * 1000));
        continue;
      } else if (attempt < maxRetries - 1) {
        const waitTime = Math.pow(2, attempt);
        console.log(`网络请求异常，第${attempt + 1}次重试，等待${waitTime}秒: ${error.message}`);
        await new Promise(resolve => setTimeout(resolve, waitTime * 1000));
        continue;
      } else {
        console.log(`网络请求异常，已重试${maxRetries}次: ${error.message}`);
        return null;
      }
    }
  }

  // 如果所有重试都失败，返回null
  console.log(`评估失败，已达到最大重试次数`);
  return null;
}

module.exports = {
  evaluateWithLLM,
  parseContextSimple
};