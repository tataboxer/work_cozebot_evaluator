const express = require('express');
const router = express.Router();
const evaluatorManager = require('../lib/evaluator-manager');
const PromptBuilder = require('../lib/prompt-builder');

/**
 * 测试评估器选择逻辑
 */
router.get('/test-selection', async (req, res) => {
  try {
    console.log('🧪 开始测试评估器选择逻辑...');
    
    // 先检查数据库中是否有评估器数据
    const { data: evaluators, error: checkError } = await require('../lib/supabase-client')
      .from('evaluators')
      .select('id, name, is_default')
      .eq('is_active', true);
    
    if (checkError) throw checkError;
    
    if (!evaluators || evaluators.length === 0) {
      return res.json({
        success: false,
        message: '数据库中没有评估器数据，请先执行初始化脚本',
        hint: '运行 database/init_default_evaluator.sql'
      });
    }
    
    console.log('📊 找到评估器:', evaluators.length, '个');
    
    // 模拟测试数据
    const testQuestions = [
      { question_type: 'ticket', question_text: '门票多少钱？' },
      { question_type: 'exhibition', question_text: '有什么展览？' },
      { question_type: 'general', question_text: '你好' },
      { question_type: null, question_text: '谢谢' },
      { question_type: 'ticket', question_text: '学生票有优惠吗？' }
    ];
    
    // 测试评估器选择
    const selectionResult = await evaluatorManager.selectEvaluators(testQuestions);
    
    console.log('📊 问题类型统计:', selectionResult.stats);
    console.log('🎯 评估器选择结果:');
    
    const selectionSummary = {};
    for (const [questionType, selection] of Object.entries(selectionResult.selection)) {
      console.log(`  ${questionType}: ${selection.evaluator.name} v${selection.version.version} (${selection.questionCount}个问题)`);
      
      selectionSummary[questionType] = {
        evaluatorName: selection.evaluator.name,
        evaluatorId: selection.evaluator.id,
        version: selection.version.version,
        versionId: selection.version.id,
        questionCount: selection.questionCount,
        isDefault: selection.evaluator.is_default
      };
    }

    res.json({
      success: true,
      message: '评估器选择测试完成',
      data: {
        questionStats: selectionResult.stats,
        totalQuestions: selectionResult.totalQuestions,
        selection: selectionSummary
      }
    });

  } catch (error) {
    console.error('❌ 评估器选择测试失败:', error);
    res.status(500).json({
      success: false,
      message: '评估器选择测试失败',
      error: error.message
    });
  }
});

/**
 * 测试提示词生成
 */
router.post('/test-prompt', async (req, res) => {
  try {
    const { 
      evaluatorVersionId, 
      question = '门票多少钱？', 
      answer = '成人票价格是30元，学生票20元。',
      context = null,
      expectedAnswer = null
    } = req.body;

    if (!evaluatorVersionId) {
      return res.status(400).json({
        success: false,
        message: '请提供评估器版本ID'
      });
    }

    console.log('🧪 开始测试提示词生成...');
    
    // 获取评估器版本信息
    const evaluatorVersion = await evaluatorManager.getEvaluatorByVersionId(evaluatorVersionId);
    
    if (!evaluatorVersion) {
      return res.status(404).json({
        success: false,
        message: '未找到指定的评估器版本'
      });
    }

    // 验证评估器版本配置
    if (!PromptBuilder.validateEvaluatorVersion(evaluatorVersion)) {
      return res.status(400).json({
        success: false,
        message: '评估器版本配置无效'
      });
    }

    // 生成提示词
    const prompt = PromptBuilder.buildPrompt(
      evaluatorVersion, 
      question, 
      answer, 
      context, 
      expectedAnswer
    );

    console.log('✅ 提示词生成成功');
    console.log('📝 提示词长度:', prompt.length);

    res.json({
      success: true,
      message: '提示词生成测试完成',
      data: {
        evaluator: {
          name: evaluatorVersion.evaluators.name,
          version: evaluatorVersion.version,
          assistantName: evaluatorVersion.assistant_name
        },
        prompt: prompt,
        promptLength: prompt.length,
        dimensions: evaluatorVersion.evaluation_criteria.criteria.map(d => d.name)
      }
    });

  } catch (error) {
    console.error('❌ 提示词生成测试失败:', error);
    res.status(500).json({
      success: false,
      message: '提示词生成测试失败',
      error: error.message
    });
  }
});

/**
 * 测试完整评估流程（不调用真实LLM）
 */
router.post('/test-evaluation', async (req, res) => {
  try {
    const testData = [
      {
        question_type: 'ticket',
        question_text: '门票多少钱？',
        block_result: '成人票价格是30元，学生票20元。',
        context: null,
        expected_answer: '成人票30元，学生票20元'
      },
      {
        question_type: 'exhibition', 
        question_text: '有什么展览？',
        block_result: '目前有科技创新展和太空探索展。',
        context: null,
        expected_answer: null
      }
    ];

    console.log('🧪 开始测试完整评估流程...');
    
    // 1. 选择评估器
    const selectionResult = await evaluatorManager.selectEvaluators(testData);
    console.log('✅ 评估器选择完成');

    // 2. 为每个问题生成提示词
    const evaluationTasks = [];
    
    for (const item of testData) {
      const questionType = item.question_type || 'general';
      const selection = selectionResult.selection[questionType];
      
      if (selection) {
        const prompt = PromptBuilder.buildPrompt(
          selection.version,
          item.question_text,
          item.block_result,
          item.context,
          item.expected_answer
        );
        
        evaluationTasks.push({
          question: item.question_text,
          questionType: questionType,
          evaluator: selection.evaluator.name,
          version: selection.version.version,
          versionId: selection.version.id,
          prompt: prompt,
          promptLength: prompt.length,
          dimensions: selection.version.evaluation_criteria.criteria.map(d => d.name)
        });
      }
    }

    console.log('✅ 提示词生成完成');
    console.log(`📊 生成了 ${evaluationTasks.length} 个评估任务`);

    res.json({
      success: true,
      message: '完整评估流程测试完成',
      data: {
        selectionStats: selectionResult.stats,
        evaluationTasks: evaluationTasks,
        summary: {
          totalQuestions: testData.length,
          totalTasks: evaluationTasks.length,
          evaluatorsUsed: [...new Set(evaluationTasks.map(t => t.evaluator))].length
        }
      }
    });

  } catch (error) {
    console.error('❌ 完整评估流程测试失败:', error);
    res.status(500).json({
      success: false,
      message: '完整评估流程测试失败',
      error: error.message
    });
  }
});

module.exports = router;