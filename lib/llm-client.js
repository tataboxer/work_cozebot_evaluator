// LLM客户端 - 基于assess.py的evaluate_with_llm函数
const axios = require('axios');
const evaluatorManager = require('./evaluator-manager');
const PromptBuilder = require('./prompt-builder');

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
 * 调用LLM API进行评估 - 支持动态评估器选择和重试机制
 */
async function evaluateWithLLM(question, answer, context = null, expectedAnswer = null, questionType = null) {
  const maxRetries = 2;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // 选择合适的评估器
      const testQuestion = { question_type: questionType, question_text: question };
      const selectionResult = await evaluatorManager.selectEvaluators([testQuestion]);
      
      const questionTypeKey = questionType || 'general';
      let selection = selectionResult.selection[questionTypeKey];
      
      if (!selection) {
        // 回退到默认评估器
        const defaultEvaluator = await evaluatorManager.getDefaultEvaluator();
        selection = {
          evaluator: defaultEvaluator.evaluator,
          version: defaultEvaluator.version
        };
      }
      
      // 使用动态评估器生成提示词
      const prompt = PromptBuilder.buildPrompt(
        selection.version,
        question,
        answer,
        context,
        expectedAnswer
      );
      
      // 调用LLM API
      const evaluation = await callLLMAPI(prompt);
      
      if (evaluation) {
        // 构建评估器信息显示
        const evaluatorInfo = `${selection.evaluator.name} ${selection.version.version}`;
        
        return {
          evaluation,
          evaluatorVersionId: selection.version.id,
          evaluatorInfo: evaluatorInfo
        };
      }
      
      // 如果评估失败但没有抛出异常，继续重试
      if (attempt < maxRetries - 1) {
        console.log(`动态评估器返回空结果，第${attempt + 1}次重试...`);
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
        continue;
      }
      
      return null;
      
    } catch (error) {
      const isLastAttempt = attempt === maxRetries - 1;
      
      console.error(`动态评估器调用失败（第${attempt + 1}次）:`, error.message);
      
      // 如果是网络错误且不是最后一次尝试，等待后重试
      if (!isLastAttempt && (error.message.includes('fetch failed') || error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED')) {
        const waitTime = 2000 * (attempt + 1);
        console.log(`网络错误，${waitTime/1000}秒后重试...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }
      
      // 最后一次尝试失败，进行诊断并回退
      if (isLastAttempt) {
        if (error.message.includes('fetch failed') || error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
          console.log('🔍 检测到网络问题，正在诊断...');
          try {
            const diagnostics = await NetworkDiagnostics.checkConnectivity();
            console.log('📊 网络诊断结果:', diagnostics);
          } catch (diagError) {
            console.log('诊断失败:', diagError.message);
          }
        }
        
        console.log('回退到原始评估逻辑...');
        return await evaluateWithLLMOriginal(question, answer, context, expectedAnswer);
      }
    }
  }
  
  return null;
}

/**
 * 原始评估逻辑（保持向下兼容）
 */
async function evaluateWithLLMOriginal(question, answer, context = null, expectedAnswer = null) {
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

  // 构建参考答案部分
  let referenceText = "";
  if (expectedAnswer && expectedAnswer.trim()) {
    referenceText = `\n参考答案: ${expectedAnswer}\n`;
  }

  // 获取当前北京时间
  const currentTime = new Date().toLocaleString('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });

  // 构建prompt - 完全对应assess.py的prompt
  const prompt = `你是一个专业的AI评估专家，现在需要评估苏州科技馆数字人助手趣波（QuBoo）的回复质量。

背景：趣波是苏州科技馆的AI智能助手，专门为游客提供科技馆参观、票务、展厅、活动等相关信息和服务，帮助游客获得优质的科技体验。

当前时间: ${currentTime}
对话历史: ${contextText}
用户问题: ${question}
助手回复: ${answer}
参考标准答案：${referenceText}

请从以下三个角度评估回复质量：

1. 准确率：回复内容是否准确回答了用户问题，是否解决了用户的查询需求，是否与科技馆业务目标高度贴合。${expectedAnswer ? "如有参考答案，请以参考答案为准评估准确性。" : ""}${contextText ? "考虑上下文连贯性，但不需要评判对话历史用assistant的回复" : ""} 评分1-100分，最低分1分。

2. 专业度：用词是否精准、术语是否正确、业务上下文是否符合科技馆场景的专业水准。${expectedAnswer ? "参考标准答案的专业表达方式。" : ""} 评分1-100分，最低分1分。

3. 语气合理：语气是否礼貌友好、风格是否匹配科技馆数字助手场景（亲切、引导性、专业但不生硬）。${expectedAnswer ? "参考标准答案的语气风格。" : ""} 评分1-100分，最低分1分。

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
        
        // 统一字段名称格式，确保分数是数字
        const normalizedResult = {
          '准确率': {
            '分数': parseFloat(jsonResult['准确率']['分数']) || 0,
            '理由': jsonResult['准确率']['理由']
          },
          '专业度': {
            '分数': parseFloat(jsonResult['专业度']['分数']) || 0, 
            '理由': jsonResult['专业度']['理由']
          },
          '语气合理': {
            '分数': parseFloat(jsonResult['语气合理']['分数']) || 0,
            '理由': jsonResult['语气合理']['理由']
          }
        };
        
        return normalizedResult;
      }
    } catch (error) {
      const isLastAttempt = attempt === maxRetries - 1;
      const waitTime = Math.pow(2, attempt);
      
      if (error.response?.status === 429) {
        if (!isLastAttempt) {
          console.log(`API限流，第${attempt + 1}次重试，等待${waitTime}秒...`);
          await new Promise(resolve => setTimeout(resolve, waitTime * 1000));
          continue;
        }
      } else if (!isLastAttempt) {
        console.log(`网络请求异常，第${attempt + 1}次重试，等待${waitTime}秒: ${error.message}`);
        await new Promise(resolve => setTimeout(resolve, waitTime * 1000));
        continue;
      }
      
      console.log(`评估失败: ${error.message}`);
      
      // 网络错误时提供更详细的诊断信息
      if (error.message.includes('fetch failed') || error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        console.log('🔍 网络连接问题，请检查:');
        console.log('1. 网络连接是否正常');
        console.log('2. LLM API地址是否正确:', process.env.llm_url);
        console.log('3. API密钥是否有效');
        console.log('4. 防火墙是否阻止了连接');
      }
      
      return null;
    }
  }

  return null;
}

/**
 * 调用LLM API的核心逻辑
 */
async function callLLMAPI(prompt) {
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
      const response = await axios.post(apiUrl, data, { headers, timeout: 60000 });
      if (response.status === 200) {
        const result = response.data.choices[0].message.content;
        let jsonResult;
        if (result.includes('```json')) {
          const jsonMatch = result.split('```json')[1].split('```')[0].trim();
          jsonResult = JSON.parse(jsonMatch);
        } else {
          jsonResult = JSON.parse(result);
        }
        return {
          '准确率': { '分数': parseFloat(jsonResult['准确率']['分数']) || 0, '理由': jsonResult['准确率']['理由'] },
          '专业度': { '分数': parseFloat(jsonResult['专业度']['分数']) || 0, '理由': jsonResult['专业度']['理由'] },
          '语气合理': { '分数': parseFloat(jsonResult['语气合理']['分数']) || 0, '理由': jsonResult['语气合理']['理由'] }
        };
      }
    } catch (error) {
      const isLastAttempt = attempt === maxRetries - 1;
      const waitTime = Math.pow(2, attempt);
      if (error.response?.status === 429 && !isLastAttempt) {
        console.log(`API限流，第${attempt + 1}次重试，等待${waitTime}秒...`);
        await new Promise(resolve => setTimeout(resolve, waitTime * 1000));
        continue;
      } else if (!isLastAttempt) {
        console.log(`网络请求异常，第${attempt + 1}次重试，等待${waitTime}秒: ${error.message}`);
        await new Promise(resolve => setTimeout(resolve, waitTime * 1000));
        continue;
      }
      console.log(`评估失败: ${error.message}`);
      
      // 网络错误时提供更详细的诊断信息
      if (error.message.includes('fetch failed') || error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        console.log('🔍 网络连接问题，请检查:');
        console.log('1. 网络连接是否正常');
        console.log('2. LLM API地址是否正确:', process.env.llm_url);
        console.log('3. API密钥是否有效');
        console.log('4. 防火墙是否阻止了连接');
      }
      
      return null;
    }
  }
  return null;
}

module.exports = {
  evaluateWithLLM,
  parseContextSimple
};