const express = require('express');
const supabase = require('../lib/supabase-client');
const router = express.Router();

// 获取评估器列表
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('evaluators')
      .select(`
        id, name, description, question_type, is_default, is_active, created_at,
        evaluator_versions!inner(id, version, is_latest, created_at)
      `)
      .eq('evaluator_versions.is_latest', true)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ evaluators: data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 创建新评估器
router.post('/', async (req, res) => {
  try {
    const { 
      name, 
      description, 
      question_type, 
      is_default, 
      assistant_name, 
      assistant_description, 
      criteria,
      change_notes 
    } = req.body;

    // 验证必填字段
    if (!name || !assistant_name || !assistant_description || !criteria) {
      return res.status(400).json({ error: '缺少必填字段' });
    }

    // 验证权重总和
    const totalWeight = criteria.reduce((sum, c) => sum + (c.weight || 0), 0);
    if (totalWeight !== 100) {
      return res.status(400).json({ error: '权重总和必须为100%' });
    }

    // 如果设为默认，先取消其他默认评估器
    if (is_default) {
      await supabase
        .from('evaluators')
        .update({ is_default: false })
        .eq('is_default', true);
    }

    // 创建评估器
    const { data: evaluator, error: evaluatorError } = await supabase
      .from('evaluators')
      .insert({
        name,
        description,
        question_type: question_type || null,
        is_default: is_default || false,
        is_active: true
      })
      .select()
      .single();

    if (evaluatorError) throw evaluatorError;

    // 创建v1版本
    const evaluation_criteria = {
      assistant_name,
      assistant_description,
      criteria
    };

    const prompt_template = `你是一个专业的AI评估专家，现在需要评估{{assistant_name}}的回复质量。

背景：{{assistant_description}}

当前时间: {{current_time}}
{{#if context}}对话历史: {{context}}{{/if}}
用户问题: {{question}}
助手回复: {{answer}}
{{#if expected_answer}}参考标准答案：{{expected_answer}}{{/if}}

请从以下角度评估回复质量：
{{#each criteria}}
{{@index}}. {{name}}：{{description}} 评分1-100分，最低分1分。
{{/each}}

请以JSON格式输出评估结果：
{
  "准确率": {"分数": 数字, "理由": "简要说明"},
  "专业度": {"分数": 数字, "理由": "简要说明"},
  "语气合理": {"分数": 数字, "理由": "简要说明"}
}`;

    const { data: version, error: versionError } = await supabase
      .from('evaluator_versions')
      .insert({
        evaluator_id: evaluator.id,
        version: 'v1',
        prompt_template,
        evaluation_criteria,
        is_latest: true,
        change_notes: change_notes || '初始版本',
        created_by: 'user'
      })
      .select()
      .single();

    if (versionError) throw versionError;

    res.json({ evaluator, version });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 更新评估器
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, question_type, is_default, is_active } = req.body;

    // 检查是否为默认评估器
    const { data: currentEvaluator } = await supabase
      .from('evaluators')
      .select('is_default')
      .eq('id', id)
      .single();
    
    // 默认评估器不能被禁用
    if (currentEvaluator?.is_default && is_active === false) {
      return res.status(400).json({ error: '默认评估器不能被禁用' });
    }

    // 如果设为默认，先取消其他默认评估器
    if (is_default) {
      await supabase
        .from('evaluators')
        .update({ is_default: false })
        .eq('is_default', true)
        .neq('id', id);
    }

    const { data, error } = await supabase
      .from('evaluators')
      .update({
        name,
        description,
        question_type: question_type || null,
        is_default: is_default || false,
        is_active: is_active !== undefined ? is_active : true,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({ evaluator: data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 获取版本历史
router.get('/:id/versions', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data, error } = await supabase
      .from('evaluator_versions')
      .select('*')
      .eq('evaluator_id', id)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    res.json({ versions: data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 创建新版本
router.post('/:id/versions', async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      assistant_name, 
      assistant_description, 
      criteria, 
      change_notes 
    } = req.body;

    // 验证权重总和
    const totalWeight = criteria.reduce((sum, c) => sum + (c.weight || 0), 0);
    if (totalWeight !== 100) {
      return res.status(400).json({ error: '权重总和必须为100%' });
    }

    // 获取当前最新版本号
    const { data: latestVersion } = await supabase
      .from('evaluator_versions')
      .select('version')
      .eq('evaluator_id', id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // 生成新版本号
    const currentVersionNum = latestVersion ? parseInt(latestVersion.version.replace('v', '')) : 0;
    const newVersion = `v${currentVersionNum + 1}`;

    // 将旧版本标记为非最新
    await supabase
      .from('evaluator_versions')
      .update({ is_latest: false })
      .eq('evaluator_id', id);

    // 创建新版本
    const evaluation_criteria = {
      assistant_name,
      assistant_description,
      criteria
    };

    const prompt_template = `你是一个专业的AI评估专家，现在需要评估{{assistant_name}}的回复质量。

背景：{{assistant_description}}

当前时间: {{current_time}}
{{#if context}}对话历史: {{context}}{{/if}}
用户问题: {{question}}
助手回复: {{answer}}
{{#if expected_answer}}参考标准答案：{{expected_answer}}{{/if}}

请从以下角度评估回复质量：
{{#each criteria}}
{{@index}}. {{name}}：{{description}} 评分1-100分，最低分1分。
{{/each}}

请以JSON格式输出评估结果：
{
  "准确率": {"分数": 数字, "理由": "简要说明"},
  "专业度": {"分数": 数字, "理由": "简要说明"},
  "语气合理": {"分数": 数字, "理由": "简要说明"}
}`;

    const { data, error } = await supabase
      .from('evaluator_versions')
      .insert({
        evaluator_id: id,
        version: newVersion,
        prompt_template,
        evaluation_criteria,
        is_latest: true,
        change_notes: change_notes || '版本更新',
        created_by: 'user'
      })
      .select()
      .single();

    if (error) throw error;

    res.json({ version: data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 删除评估器
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // 检查是否为默认评估器
    const { data: evaluator } = await supabase
      .from('evaluators')
      .select('is_default, name')
      .eq('id', id)
      .single();
    
    if (evaluator?.is_default) {
      return res.status(400).json({ error: '默认评估器不能删除' });
    }
    
    // 删除评估器（级联删除所有版本）
    const { error } = await supabase
      .from('evaluators')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;