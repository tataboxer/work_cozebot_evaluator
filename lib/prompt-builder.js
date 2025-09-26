/**
 * 提示词构建器
 * 根据评估器配置动态生成评估提示词
 */
class PromptBuilder {
  /**
   * 构建评估提示词
   * @param {Object} evaluatorVersion - 评估器版本信息
   * @param {string} question - 用户问题
   * @param {string} answer - AI回复
   * @param {string|Array} context - 对话上下文
   * @param {string} expectedAnswer - 参考答案
   * @returns {string} 构建好的提示词
   */
  static buildPrompt(evaluatorVersion, question, answer, context = null, expectedAnswer = null) {
    const { evaluation_criteria } = evaluatorVersion;
    
    // 处理JSON字符串或对象
    let criteriaData;
    if (typeof evaluation_criteria === 'string') {
      criteriaData = JSON.parse(evaluation_criteria);
    } else {
      criteriaData = evaluation_criteria;
    }
    
    const { assistant_name, assistant_description, criteria } = criteriaData;
    
    // 构建上下文信息
    let contextText = "";
    if (context) {
      let contextData = null;
      if (typeof context === 'string') {
        try {
          contextData = JSON.parse(context);
        } catch (e) {
          // 如果解析失败，忽略上下文
          contextData = null;
        }
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

    // 构建评估维度说明
    const dimensionsText = criteria.map((dim, index) => {
      const hasReference = expectedAnswer && expectedAnswer.trim();
      const hasContext = contextText.trim();
      
      let dimensionPrompt = `${index + 1}. ${dim.name}：${dim.description}`;
      
      // 添加参考答案相关的提示
      if (hasReference) {
        dimensionPrompt += `如有参考答案，请以参考答案为准评估${dim.name.toLowerCase()}。`;
      }
      
      // 添加上下文相关的提示（仅对准确率维度）
      if (hasContext && dim.name === '准确率') {
        dimensionPrompt += `考虑上下文连贯性，但不需要评判对话历史用assistant的回复`;
      }
      
      dimensionPrompt += ` 评分1-100分，最低分1分。`;
      
      return dimensionPrompt;
    }).join('\n\n');

    // 构建JSON输出格式
    const outputFormat = criteria.reduce((format, dim) => {
      format[dim.name] = {"分数": "数字", "理由": "简要说明"};
      return format;
    }, {});

    // 构建完整提示词
    const prompt = `你是一个专业的AI评估专家，现在需要评估${assistant_name}的回复质量。

背景：${assistant_description}

当前时间: ${currentTime}
对话历史: ${contextText}
用户问题: ${question}
助手回复: ${answer}
参考标准答案：${referenceText}

请从以下角度评估回复质量：

${dimensionsText}

请以JSON格式输出评估结果：
${JSON.stringify(outputFormat, null, 2)}`;

    return prompt;
  }

  /**
   * 验证评估器版本配置
   * @param {Object} evaluatorVersion - 评估器版本信息
   * @returns {boolean} 是否有效
   */
  static validateEvaluatorVersion(evaluatorVersion) {
    if (!evaluatorVersion) return false;
    if (!evaluatorVersion.evaluation_criteria) return false;
    
    // 处理JSON字符串或对象
    let criteriaData;
    try {
      if (typeof evaluatorVersion.evaluation_criteria === 'string') {
        criteriaData = JSON.parse(evaluatorVersion.evaluation_criteria);
      } else {
        criteriaData = evaluatorVersion.evaluation_criteria;
      }
    } catch (e) {
      return false;
    }
    
    const { assistant_name, assistant_description, criteria } = criteriaData;
    
    if (!assistant_name || !assistant_description) return false;
    if (!Array.isArray(criteria) || criteria.length === 0) return false;
    
    // 验证每个评估维度
    for (const dim of criteria) {
      if (!dim.name || !dim.description) return false;
    }
    
    return true;
  }

  /**
   * 解析评估结果
   * @param {string} result - LLM返回的原始结果
   * @param {Array} expectedDimensions - 期望的评估维度
   * @returns {Object} 标准化的评估结果
   */
  static parseEvaluationResult(result, expectedDimensions) {
    let jsonResult;
    
    // 处理markdown格式
    if (result.includes('```json')) {
      const jsonMatch = result.split('```json')[1].split('```')[0].trim();
      jsonResult = JSON.parse(jsonMatch);
    } else {
      jsonResult = JSON.parse(result);
    }
    
    // 标准化结果格式
    const normalizedResult = {};
    for (const dim of expectedDimensions) {
      if (jsonResult[dim.name]) {
        normalizedResult[dim.name] = {
          '分数': jsonResult[dim.name]['分数'],
          '理由': jsonResult[dim.name]['理由']
        };
      }
    }
    
    return normalizedResult;
  }
}

module.exports = PromptBuilder;