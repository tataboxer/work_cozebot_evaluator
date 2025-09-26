// 评估器编辑弹窗逻辑
class EvaluatorModal {
  constructor() {
    this.currentEvaluator = null;
    this.isEditing = false;
    this.createModal();
  }

  // 创建弹窗HTML
  createModal() {
    const modalHTML = `
      <div class="evaluator-modal" id="evaluatorModal" style="display: none;">
        <div class="evaluator-modal-content">
          <div class="modal-header">
            <h3 id="modalTitle">✏️ 新建评估器</h3>
            <button class="close-modal" onclick="evaluatorModal.close()">&times;</button>
          </div>
          
          <div class="modal-body">
            <!-- 基本信息 -->
            <div class="form-section">
              <h4>📝 基本信息</h4>
              <div class="form-group">
                <label>评估器名称:</label>
                <input type="text" id="evaluatorName" placeholder="请输入评估器名称">
              </div>
              <div class="form-group">
                <label>描述说明:</label>
                <textarea id="evaluatorDescription" placeholder="请输入评估器描述"></textarea>
              </div>
              <div class="form-group">
                <label>适用类型:</label>
                <input type="text" id="questionType" placeholder="如：票务、展厅、活动等（默认评估器请留空）">
                <small>注：默认评估器的适用类型为空且不可编辑</small>
              </div>

            </div>

            <!-- 助手配置 -->
            <div class="form-section">
              <h4>🎯 助手配置</h4>
              <div class="form-group">
                <label>助手名称:</label>
                <input type="text" id="assistantName" value="趣波（QuBoo）">
              </div>
              <div class="form-group">
                <label>助手描述:</label>
                <textarea id="assistantDescription">苏州科技馆的AI智能助手，专门为游客提供科技馆参观、票务、展厅、活动等相关信息和服务，帮助游客获得优质的科技体验。仅回答科技馆相关问题。</textarea>
              </div>
            </div>

            <!-- 评估维度 -->
            <div class="form-section">
              <h4>📊 评估维度</h4>
              <div id="criteriaContainer">
                <!-- 动态生成 -->
              </div>
              <div class="weight-summary">
                <div class="weight-info">
                  <span class="weight-label">权重合计:</span>
                  <span id="totalWeight" class="weight-value">0</span>%
                </div>
                <span id="weightStatus" class="weight-status"></span>
              </div>
            </div>

            <!-- 输入/输出格式 -->
            <div class="form-section">
              <h4>📋 输入/输出格式 (只读)</h4>
              <div class="readonly-info">
                <p><strong>输入参数:</strong> question, answer, context, expectedAnswer</p>
                <p><strong>输出格式:</strong> {"准确率": {"分数": 数字, "理由": "简要说明"}, "专业度": {"分数": 数字, "理由": "简要说明"}, "语气合理": {"分数": 数字, "理由": "简要说明"}}</p>
              </div>
            </div>

            <!-- 版本说明 -->
            <div class="form-section">
              <h4>📝 版本说明 (可选)</h4>
              <div class="form-group">
                <textarea id="changeNotes" placeholder="请描述本次修改的内容..."></textarea>
              </div>
            </div>
          </div>

          <div class="modal-actions">
            <button class="btn-secondary" onclick="evaluatorModal.close()">取消</button>
            <button class="btn" id="saveBtn" onclick="evaluatorModal.save()">保存</button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    this.initEventListeners();
  }

  // 初始化事件监听
  initEventListeners() {
    // 编辑模式下的适用类型控制
    this.setupQuestionTypeControl();
  }
  
  // 设置适用类型控制
  setupQuestionTypeControl() {
    // 在open方法中调用
  }

  // 打开弹窗
  open(evaluator = null) {
    this.currentEvaluator = evaluator;
    this.isEditing = !!evaluator;
    
    const modal = document.getElementById('evaluatorModal');
    const title = document.getElementById('modalTitle');
    const questionTypeInput = document.getElementById('questionType');
    
    if (this.isEditing) {
      title.textContent = `✏️ 编辑评估器 - ${evaluator.name}`;
      this.loadEvaluatorData(evaluator);
      // 默认评估器的适用类型不可编辑
      if (evaluator.is_default) {
        questionTypeInput.disabled = true;
        questionTypeInput.style.backgroundColor = '#f8f9fa';
        questionTypeInput.style.color = '#6c757d';
        questionTypeInput.placeholder = '默认评估器适用类型为空';
      } else {
        questionTypeInput.disabled = false;
        questionTypeInput.style.backgroundColor = '';
        questionTypeInput.style.color = '';
        questionTypeInput.placeholder = '如：票务、展厅、活动等';
      }
    } else {
      title.textContent = '✏️ 新建评估器';
      this.resetForm();
      // 新建时适用类型必填
      questionTypeInput.disabled = false;
      questionTypeInput.placeholder = '必填：如票务、展厅、活动等';
      questionTypeInput.required = true;
    }
    
    modal.style.display = 'flex';
  }

  // 关闭弹窗
  close() {
    document.getElementById('evaluatorModal').style.display = 'none';
    this.resetForm();
  }

  // 加载评估器数据
  async loadEvaluatorData(evaluator) {
    try {
      // 获取最新版本的详细信息
      const accessKey = localStorage.getItem('access_key');
      const response = await fetch(`/api/evaluators/${evaluator.id}/versions`, {
        headers: {
          'X-Access-Key': accessKey
        }
      });
      const data = await response.json();
      
      if (response.ok && data.versions && data.versions.length > 0) {
        const latestVersion = data.versions.find(v => v.is_latest) || data.versions[0];
        const criteria = latestVersion.evaluation_criteria;
        
        // 填充基本信息
        document.getElementById('evaluatorName').value = evaluator.name || '';
        document.getElementById('evaluatorDescription').value = evaluator.description || '';
        document.getElementById('questionType').value = evaluator.question_type || '';
        
        // 填充助手配置
        document.getElementById('assistantName').value = criteria.assistant_name || '趣波（QuBoo）';
        document.getElementById('assistantDescription').value = criteria.assistant_description || '';
        
        // 填充评估维度
        this.renderCriteria(criteria.criteria || []);
      }
    } catch (error) {
      console.error('加载评估器详情失败:', error);
      // 使用基本信息填充
      this.loadBasicData(evaluator);
    }
  }

  // 加载基本数据（fallback）
  loadBasicData(evaluator) {
    document.getElementById('evaluatorName').value = evaluator.name || '';
    document.getElementById('evaluatorDescription').value = evaluator.description || '';
    document.getElementById('questionType').value = evaluator.question_type || '';
    
    // 使用默认评估维度
    this.renderCriteria([
      { name: '准确率', key: 'accuracy', description: '回复内容是否准确回答了用户问题，是否解决了用户的查询需求。', weight: 40 },
      { name: '专业度', key: 'professionalism', description: '用词是否精准、术语是否正确、业务上下文是否符合专业水准。', weight: 30 },
      { name: '语气合理', key: 'tone_reasonableness', description: '语气是否礼貌友好、风格是否匹配助手场景。', weight: 30 }
    ]);
  }

  // 渲染评估维度
  renderCriteria(criteria) {
    const container = document.getElementById('criteriaContainer');
    
    container.innerHTML = criteria.map((criterion, index) => `
      <div class="criterion-item" data-index="${index}">
        <div class="criterion-header">
          <div class="criterion-title">
            <strong>${index + 1}. ${criterion.name}</strong>
            <small class="criterion-key">(${criterion.key})</small>
          </div>
          <div class="criterion-controls">
            <div class="weight-input">
              权重: <input type="number" class="weight-input-field" value="${criterion.weight}" min="1" max="100" onchange="evaluatorModal.updateWeights()" oninput="evaluatorModal.updateWeights()"> %
            </div>
          </div>
        </div>
        <div class="criterion-description">
          <textarea placeholder="请输入评估标准描述..." maxlength="300">${criterion.description || ''}</textarea>
          <div class="char-count"><span class="current">${(criterion.description || '').length}</span>/300</div>
        </div>
      </div>
    `).join('');
    
    // 添加字符计数监听
    container.querySelectorAll('textarea').forEach(textarea => {
      textarea.addEventListener('input', this.updateCharCount.bind(this));
    });
    
    this.updateWeights();
  }

  // 更新权重计算
  updateWeights() {
    const weightInputs = document.querySelectorAll('.weight-input-field');
    let total = 0;
    
    weightInputs.forEach(input => {
      const value = parseInt(input.value) || 0;
      total += value;
      
      // 实时验证单个权重
      if (value < 1 || value > 100) {
        input.style.borderColor = '#dc3545';
      } else {
        input.style.borderColor = '';
      }
    });
    
    const totalElement = document.getElementById('totalWeight');
    const statusElement = document.getElementById('weightStatus');
    
    totalElement.textContent = total;
    
    if (total === 100) {
      statusElement.textContent = '✓ 权重分配正确';
      statusElement.className = 'weight-status valid';
    } else if (total < 100) {
      statusElement.textContent = `✗ 还需分配 ${100 - total}%`;
      statusElement.className = 'weight-status invalid';
    } else {
      statusElement.textContent = `✗ 超出 ${total - 100}%`;
      statusElement.className = 'weight-status invalid';
    }
  }
  
  // 更新字符计数
  updateCharCount(event) {
    const textarea = event.target;
    const charCount = textarea.parentElement.querySelector('.char-count .current');
    if (charCount) {
      charCount.textContent = textarea.value.length;
      
      // 字符数接近限制时变色提醒
      const parent = textarea.parentElement.querySelector('.char-count');
      if (textarea.value.length > 250) {
        parent.style.color = '#dc3545';
      } else if (textarea.value.length > 200) {
        parent.style.color = '#ffc107';
      } else {
        parent.style.color = '';
      }
    }
  }
  
  // 删除评估维度
  removeCriterion(index) {
    const criterionItems = document.querySelectorAll('.criterion-item');
    if (criterionItems.length <= 1) {
      alert('至少需要保留一个评估维度');
      return;
    }
    
    if (confirm('确定要删除这个评估维度吗？')) {
      criterionItems[index].remove();
      this.reindexCriteria();
      this.updateWeights();
    }
  }
  
  // 重新索引评估维度
  reindexCriteria() {
    const criterionItems = document.querySelectorAll('.criterion-item');
    criterionItems.forEach((item, index) => {
      item.dataset.index = index;
      const title = item.querySelector('.criterion-title strong');
      const currentText = title.textContent;
      title.textContent = currentText.replace(/^\d+\./, `${index + 1}.`);
      
      // 更新删除按钮
      const removeBtn = item.querySelector('.btn-remove-criterion');
      if (removeBtn) {
        removeBtn.onclick = () => this.removeCriterion(index);
        removeBtn.style.display = criterionItems.length > 1 ? 'inline-block' : 'none';
      }
    });
  }
  
  // 添加评估维度
  addCriterion() {
    const container = document.getElementById('criteriaContainer');
    const currentCount = container.querySelectorAll('.criterion-item').length;
    
    if (currentCount >= 5) {
      alert('最多只能添加5个评估维度');
      return;
    }
    
    const newIndex = currentCount;
    const newCriterion = {
      name: `维度${newIndex + 1}`,
      key: `criterion_${newIndex + 1}`,
      description: '',
      weight: Math.floor((100 - this.getCurrentTotalWeight()) / (6 - currentCount)) || 10
    };
    
    const criterionHTML = `
      <div class="criterion-item" data-index="${newIndex}">
        <div class="criterion-header">
          <div class="criterion-title">
            <input type="text" class="criterion-name-input" value="${newCriterion.name}" placeholder="维度名称" maxlength="20">
            <small class="criterion-key">(${newCriterion.key})</small>
          </div>
          <div class="criterion-controls">
            <div class="weight-input">
              权重: <input type="number" class="weight-input-field" value="${newCriterion.weight}" min="1" max="100" onchange="evaluatorModal.updateWeights()" oninput="evaluatorModal.updateWeights()"> %
            </div>
            <button type="button" class="btn-remove-criterion" onclick="evaluatorModal.removeCriterion(${newIndex})" title="删除此维度">×</button>
          </div>
        </div>
        <div class="criterion-description">
          <textarea placeholder="请输入评估标准描述..." maxlength="300">${newCriterion.description}</textarea>
          <div class="char-count"><span class="current">0</span>/300</div>
        </div>
      </div>
    `;
    
    container.insertAdjacentHTML('beforeend', criterionHTML);
    
    // 添加事件监听
    const newItem = container.lastElementChild;
    const textarea = newItem.querySelector('textarea');
    textarea.addEventListener('input', this.updateCharCount.bind(this));
    
    // 重新索引并更新权重
    this.reindexCriteria();
    this.updateWeights();
  }
  
  // 获取当前权重总和
  getCurrentTotalWeight() {
    const weightInputs = document.querySelectorAll('.weight-input-field');
    let total = 0;
    weightInputs.forEach(input => {
      total += parseInt(input.value) || 0;
    });
    return total;
  }

  // 重置表单
  resetForm() {
    document.getElementById('evaluatorName').value = '';
    document.getElementById('evaluatorDescription').value = '';
    document.getElementById('questionType').value = '';
    document.getElementById('assistantName').value = '趣波（QuBoo）';
    document.getElementById('assistantDescription').value = '苏州科技馆的AI智能助手，专门为游客提供科技馆参观、票务、展厅、活动等相关信息和服务，帮助游客获得优质的科技体验。仅回答科技馆相关问题。';
    document.getElementById('changeNotes').value = '';
    
    // 隐藏错误信息
    const errorElement = document.getElementById('modalError');
    if (errorElement) {
      errorElement.style.display = 'none';
    }
    
    // 默认评估维度
    this.renderCriteria([
      { name: '准确率', key: 'accuracy', description: '回复内容是否准确回答了用户问题，是否解决了用户的查询需求，是否与科技馆业务目标高度贴合。', weight: 40 },
      { name: '专业度', key: 'professionalism', description: '用词是否精准、术语是否正确、业务上下文是否符合科技馆场景的专业水准。', weight: 30 },
      { name: '语气合理', key: 'tone_reasonableness', description: '语气是否礼貌友好、风格是否匹配科技馆数字助手场景（亲切、引导性、专业但不生硬）。', weight: 30 }
    ]);
  }

  // 保存评估器
  async save() {
    try {
      // 验证表单
      const validation = this.validateForm();
      if (!validation.valid) {
        this.showError(validation.message);
        return;
      }
      
      const saveBtn = document.getElementById('saveBtn');
      const originalText = saveBtn.textContent;
      saveBtn.disabled = true;
      saveBtn.textContent = '保存中...';
      
      const formData = this.getFormData();
      
      let response;
      if (this.isEditing) {
        // 更新评估器（先更新基本信息，再创建新版本）
        const accessKey = localStorage.getItem('access_key');
        
        // 1. 更新评估器基本信息
        const basicInfoResponse = await fetch(`/api/evaluators/${this.currentEvaluator.id}`, {
          method: 'PUT',
          headers: { 
            'Content-Type': 'application/json',
            'X-Access-Key': accessKey
          },
          body: JSON.stringify({
            name: formData.name,
            description: formData.description,
            question_type: formData.question_type
          })
        });
        
        if (!basicInfoResponse.ok) {
          const basicError = await basicInfoResponse.json();
          throw new Error(basicError.error || '更新基本信息失败');
        }
        
        // 2. 创建新版本
        response = await fetch(`/api/evaluators/${this.currentEvaluator.id}/versions`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'X-Access-Key': accessKey
          },
          body: JSON.stringify({
            assistant_name: formData.assistant_name,
            assistant_description: formData.assistant_description,
            criteria: formData.criteria,
            change_notes: formData.change_notes
          })
        });
      } else {
        // 创建新评估器
        const accessKey = localStorage.getItem('access_key');
        response = await fetch('/api/evaluators', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'X-Access-Key': accessKey
          },
          body: JSON.stringify(formData)
        });
      }
      
      const data = await response.json();
      
      if (response.ok) {
        this.close();
        if (typeof evaluatorManager !== 'undefined' && evaluatorManager) {
          await evaluatorManager.loadEvaluators();
          const message = this.isEditing ? 
            `✅ 评估器"${formData.name}"已更新为${data.version?.version}` :
            `✅ 评估器"${formData.name}"创建成功`;
          evaluatorManager.updateStatus(message);
        }
      } else {
        throw new Error(data.error || '保存失败');
      }
    } catch (error) {
      console.error('保存评估器失败:', error);
      this.showError(`保存失败: ${error.message}`);
    } finally {
      const saveBtn = document.getElementById('saveBtn');
      saveBtn.disabled = false;
      saveBtn.textContent = '保存';
    }
  }
  
  // 显示错误信息
  showError(message) {
    // 创建或更新错误显示元素
    let errorElement = document.getElementById('modalError');
    if (!errorElement) {
      errorElement = document.createElement('div');
      errorElement.id = 'modalError';
      errorElement.className = 'modal-error';
      document.querySelector('.modal-actions').insertAdjacentElement('beforebegin', errorElement);
    }
    
    errorElement.textContent = message;
    errorElement.style.display = 'block';
    
    // 5秒后自动隐藏
    setTimeout(() => {
      errorElement.style.display = 'none';
    }, 5000);
  }

  // 验证表单
  validateForm() {
    const name = document.getElementById('evaluatorName').value.trim();
    const assistantName = document.getElementById('assistantName').value.trim();
    const assistantDescription = document.getElementById('assistantDescription').value.trim();
    const questionType = document.getElementById('questionType').value.trim();
    
    if (!name) {
      return { valid: false, message: '请输入评估器名称' };
    }
    
    if (name.length > 50) {
      return { valid: false, message: '评估器名称不能超过50个字符' };
    }
    
    if (!assistantName) {
      return { valid: false, message: '请输入助手名称' };
    }
    
    if (!assistantDescription) {
      return { valid: false, message: '请输入助手描述' };
    }
    
    if (assistantDescription.length > 500) {
      return { valid: false, message: '助手描述不能超过500个字符' };
    }
    
    // 验证适用类型（新建时必填）
    if (!this.isEditing && !questionType) {
      return { valid: false, message: '新建评估器必须指定适用类型' };
    }
    
    // 编辑默认评估器时，不允许修改适用类型
    if (this.isEditing && this.currentEvaluator && this.currentEvaluator.is_default && questionType) {
      return { valid: false, message: '默认评估器的适用类型不可修改' };
    }
    
    // 验证权重
    const totalWeight = parseInt(document.getElementById('totalWeight').textContent);
    if (totalWeight !== 100) {
      return { valid: false, message: '权重总和必须为100%' };
    }
    
    // 验证评估维度
    const criterionItems = document.querySelectorAll('.criterion-item');
    if (criterionItems.length === 0) {
      return { valid: false, message: '至少需要一个评估维度' };
    }
    
    for (let i = 0; i < criterionItems.length; i++) {
      const item = criterionItems[i];
      
      // 验证维度名称
      const nameInput = item.querySelector('.criterion-name-input');
      const nameElement = item.querySelector('.criterion-title strong');
      let name = '';
      
      if (nameInput) {
        name = nameInput.value.trim();
        if (!name) {
          return { valid: false, message: `请输入第${i + 1}个评估维度的名称` };
        }
        if (name.length > 20) {
          return { valid: false, message: `第${i + 1}个评估维度名称不能超过20个字符` };
        }
      } else if (nameElement) {
        name = nameElement.textContent.replace(/^\d+\.\s*/, '');
      }
      
      // 验证维度描述
      const description = item.querySelector('textarea').value.trim();
      if (!description) {
        return { valid: false, message: `请输入第${i + 1}个评估维度的描述` };
      }
      if (description.length > 300) {
        return { valid: false, message: `第${i + 1}个评估维度描述不能超过300个字符` };
      }
      
      // 验证权重
      const weight = parseInt(item.querySelector('.weight-input-field').value) || 0;
      if (weight < 1 || weight > 100) {
        return { valid: false, message: `第${i + 1}个评估维度的权重必须在1-100之间` };
      }
    }
    
    // 检查维度名称是否重复
    const names = [];
    for (let i = 0; i < criterionItems.length; i++) {
      const item = criterionItems[i];
      const nameInput = item.querySelector('.criterion-name-input');
      const nameElement = item.querySelector('.criterion-title strong');
      const name = nameInput ? nameInput.value.trim() : nameElement.textContent.replace(/^\d+\.\s*/, '');
      
      if (names.includes(name)) {
        return { valid: false, message: `评估维度名称不能重复："${name}"` };
      }
      names.push(name);
    }
    
    return { valid: true };
  }

  // 获取表单数据
  getFormData() {
    const criteria = [];
    const criterionItems = document.querySelectorAll('.criterion-item');
    
    criterionItems.forEach((item, index) => {
      // 检查是否有名称输入框（新添加的维度）
      const nameInput = item.querySelector('.criterion-name-input');
      const nameElement = item.querySelector('.criterion-title strong');
      
      let name;
      if (nameInput) {
        name = nameInput.value.trim();
      } else if (nameElement) {
        name = nameElement.textContent.replace(/^\d+\.\s*/, '');
      } else {
        name = `维度${index + 1}`;
      }
      
      const weight = parseInt(item.querySelector('.weight-input-field').value) || 0;
      const description = item.querySelector('textarea').value.trim();
      
      // 生成key
      let key;
      if (name === '准确率') {
        key = 'accuracy';
      } else if (name === '专业度') {
        key = 'professionalism';
      } else if (name === '语气合理') {
        key = 'tone_reasonableness';
      } else {
        // 自定义维度，生成key
        key = name.toLowerCase().replace(/[^a-z0-9一-龥]/g, '_').replace(/_{2,}/g, '_').replace(/^_|_$/g, '') || `criterion_${index + 1}`;
      }
      
      criteria.push({
        name,
        key,
        description,
        weight
      });
    });
    
    return {
      name: document.getElementById('evaluatorName').value.trim(),
      description: document.getElementById('evaluatorDescription').value.trim(),
      question_type: document.getElementById('questionType').value.trim() || null,
      is_default: false,
      is_active: true,
      assistant_name: document.getElementById('assistantName').value.trim(),
      assistant_description: document.getElementById('assistantDescription').value.trim(),
      criteria,
      change_notes: document.getElementById('changeNotes').value.trim()
    };
  }
}

// 全局实例
let evaluatorModal;

// 等待DOM加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
  evaluatorModal = new EvaluatorModal();
  window.evaluatorModal = evaluatorModal; // 也设置为window属性以兼容
});