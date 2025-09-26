const supabase = require('./supabase-client');

/**
 * 评估器管理模块
 * 负责评估器的缓存、选择和版本管理
 */
class EvaluatorManager {
  constructor() {
    this.cache = new Map();
    this.cacheExpiry = 5 * 60 * 1000; // 5分钟缓存
  }

  /**
   * 获取所有活跃的评估器（带缓存）
   */
  async getActiveEvaluators() {
    const cacheKey = 'active_evaluators';
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return cached.data;
    }

    const { data, error } = await supabase
      .from('evaluators')
      .select(`
        *,
        evaluator_versions!inner(*)
      `)
      .eq('is_active', true)
      .eq('evaluator_versions.is_latest', true);

    if (error) throw error;

    // 缓存结果
    this.cache.set(cacheKey, {
      data: data || [],
      timestamp: Date.now()
    });

    return data || [];
  }

  /**
   * 根据问题类型选择合适的评估器
   * @param {Array} questions - 问题数组，每个问题包含 question_type 字段
   * @returns {Object} 评估器选择结果
   */
  async selectEvaluators(questions) {
    const evaluators = await this.getActiveEvaluators();
    
    // 统计问题类型分布
    const questionTypeStats = {};
    questions.forEach(q => {
      const type = q.question_type || 'general';
      questionTypeStats[type] = (questionTypeStats[type] || 0) + 1;
    });

    // 选择策略：
    // 1. 优先使用专门的评估器（question_type匹配）
    // 2. 如果没有专门的评估器，使用通用评估器（question_type为null或'general'）
    // 3. 如果都没有，使用默认评估器
    
    const selection = {};
    const defaultEvaluator = evaluators.find(e => e.is_default && e.is_active);
    
    console.log('📊 评估器选择:');
    console.log('- 总评估器数量:', evaluators.length);
    console.log('- 默认评估器:', defaultEvaluator ? `${defaultEvaluator.name} (ID: ${defaultEvaluator.id})` : '未找到');
    console.log('- 问题类型统计:', questionTypeStats);
    
    for (const [questionType, count] of Object.entries(questionTypeStats)) {
      // 查找精确匹配的评估器（生效 且 最新 且 问题类型匹配）
      let selectedEvaluator = evaluators.find(e => 
        e.question_type === questionType && e.is_active && !e.is_default
      );
      
      // 如果没有匹配的，使用默认评估器
      if (!selectedEvaluator) {
        selectedEvaluator = defaultEvaluator;
      }
      
      console.log(`🔍 问题类型 "${questionType}" 选择结果:`, selectedEvaluator ? `${selectedEvaluator.name} (ID: ${selectedEvaluator.id})` : '未找到');
      
      // 确保找到了评估器
      if (!selectedEvaluator) {
        console.error(`❌ 未找到适合的评估器，问题类型: ${questionType}`);
        continue;
      }
      
      selection[questionType] = {
        evaluator: selectedEvaluator,
        version: selectedEvaluator.evaluator_versions[0], // 取最新版本
        questionCount: count
      };
    }

    return {
      selection,
      stats: questionTypeStats,
      totalQuestions: questions.length
    };
  }

  /**
   * 根据评估器版本ID获取评估器信息
   */
  async getEvaluatorByVersionId(versionId) {
    const cacheKey = `evaluator_version_${versionId}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return cached.data;
    }

    const { data, error } = await supabase
      .from('evaluator_versions')
      .select(`
        *,
        evaluators!inner(*)
      `)
      .eq('id', versionId)
      .single();

    if (error) throw error;

    // 缓存结果
    this.cache.set(cacheKey, {
      data,
      timestamp: Date.now()
    });

    return data;
  }

  /**
   * 清除缓存
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * 获取默认评估器
   */
  async getDefaultEvaluator() {
    const evaluators = await this.getActiveEvaluators();
    const defaultEvaluator = evaluators.find(e => e.is_default);
    
    if (!defaultEvaluator) {
      throw new Error('未找到默认评估器');
    }
    
    return {
      evaluator: defaultEvaluator,
      version: defaultEvaluator.evaluator_versions[0]
    };
  }
}

// 单例模式
const evaluatorManager = new EvaluatorManager();

module.exports = evaluatorManager;