// 评估器管理主页面逻辑
class EvaluatorManager {
  constructor() {
    this.evaluators = [];
    this.currentEvaluator = null;
  }

  // 初始化
  async init() {
    await this.loadEvaluators();
  }

  // 加载评估器列表
  async loadEvaluators() {
    try {
      const accessKey = localStorage.getItem('access_key');
      const response = await fetch('/api/evaluators', {
        headers: {
          'X-Access-Key': accessKey
        }
      });
      const data = await response.json();
      
      if (response.ok) {
        this.evaluators = data.evaluators || [];
        this.renderEvaluatorsList();
        this.updateStatus('✅ 评估器列表加载成功');
      } else {
        throw new Error(data.error || '加载失败');
      }
    } catch (error) {
      console.error('加载评估器失败:', error);
      this.updateStatus(`❌ 加载失败: ${error.message}`, 'error');
    }
  }

  // 渲染评估器列表
  renderEvaluatorsList() {
    const tbody = document.getElementById('evaluatorsTableBody');
    if (!tbody) return;

    if (this.evaluators.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: #666; padding: 40px;">暂无评估器<br><small>点击上方"新建评估器"按钮创建第一个评估器</small></td></tr>';
      return;
    }

    tbody.innerHTML = this.evaluators.map(evaluator => {
      const version = evaluator.evaluator_versions[0];
      const questionType = evaluator.question_type || '<span style="color: #999; font-style: italic;">(空-默认)</span>';
      const activeBadge = this.getActiveBadge(evaluator);
      const defaultBadge = this.getDefaultBadge(evaluator);
      const createdAt = new Date(evaluator.created_at).toLocaleString('zh-CN');

      return `
        <tr data-evaluator-id="${evaluator.id}">
          <td>
            <div class="evaluator-name">
              <strong>${evaluator.name}</strong>
              ${evaluator.description ? `<br><small style="color: #666; line-height: 1.4;">${evaluator.description}</small>` : ''}
            </div>
          </td>
          <td><span class="version-badge">${version.version}</span></td>
          <td>${questionType}</td>
          <td>${activeBadge}</td>
          <td>${defaultBadge}</td>
          <td><small>${createdAt}</small></td>
          <td>
            <div class="action-buttons">
              <a href="javascript:void(0)" onclick="evaluatorManager.editEvaluator(${evaluator.id})" style="color: #007bff; text-decoration: none; margin-right: 15px;">
                <i class="fas fa-edit"></i> 编辑
              </a>
              ${evaluator.is_default ? 
                '<span style="color: #999; cursor: not-allowed;"><i class="fas fa-ban"></i> 禁用</span>' :
                `<a href="javascript:void(0)" onclick="evaluatorManager.toggleEvaluator(${evaluator.id}, ${!evaluator.is_active})" 
                   style="color: ${evaluator.is_active ? '#dc3545' : '#28a745'}; text-decoration: none;">
                  <i class="fas ${evaluator.is_active ? 'fa-times-circle' : 'fa-check-circle'}"></i> ${evaluator.is_active ? '禁用' : '启用'}
                </a>`
              }
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  // 获取启用状态徽章
  getActiveBadge(evaluator) {
    if (evaluator.is_active) {
      return '<span class="badge badge-success"><i class="fas fa-check-circle"></i> 启用</span>';
    } else {
      return '<span class="badge badge-secondary"><i class="fas fa-times-circle"></i> 禁用</span>';
    }
  }

  // 获取默认评估器徽章
  getDefaultBadge(evaluator) {
    if (evaluator.is_default) {
      return '<span class="badge badge-primary default-evaluator"><i class="fas fa-crown"></i> 是</span>';
    } else {
      return '<span class="badge badge-light"><i class="fas fa-minus"></i> 否</span>';
    }
  }

  // 切换评估器状态
  async toggleEvaluator(id, isActive) {
    const evaluator = this.evaluators.find(e => e.id === id);
    
    // 默认评估器不能禁用
    if (evaluator?.is_default && !isActive) {
      this.updateStatus('⚠️ 默认评估器不能禁用', 'error');
      return;
    }
    
    const actionText = isActive ? '启用' : '禁用';
    
    const confirmed = await window.confirmAction('确认操作', `确定要${actionText}评估器"${evaluator?.name}"吗？`);
    if (!confirmed) {
      return;
    }
    
    try {
      this.updateStatus(`🔄 正在${actionText}评估器...`, 'info');
      
      const accessKey = localStorage.getItem('access_key');
      const response = await fetch(`/api/evaluators/${id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'X-Access-Key': accessKey
        },
        body: JSON.stringify({ is_active: isActive })
      });

      const data = await response.json();
      
      if (response.ok) {
        await this.loadEvaluators();
        this.updateStatus(`✅ 评估器已${actionText}`);
      } else {
        throw new Error(data.error || '更新失败');
      }
    } catch (error) {
      console.error('更新评估器状态失败:', error);
      this.updateStatus(`❌ ${actionText}失败: ${error.message}`, 'error');
    }
  }

  // 编辑评估器
  editEvaluator(id) {
    const evaluator = this.evaluators.find(e => e.id === id);
    if (evaluator && typeof evaluatorModal !== 'undefined' && evaluatorModal) {
      this.updateStatus(`📝 正在加载评估器"${evaluator.name}"的配置...`, 'info');
      evaluatorModal.open(evaluator);
    } else {
      this.updateStatus('❌ 未找到指定的评估器或编辑模块未加载', 'error');
    }
  }
  
  // 删除评估器
  async deleteEvaluator(id) {
    const evaluator = this.evaluators.find(e => e.id === id);
    if (!evaluator) return;
    
    if (evaluator.is_default) {
      alert('默认评估器不能删除');
      return;
    }
    
    if (!confirm(`确定要删除评估器"${evaluator.name}"吗？\n\n⚠️ 此操作不可恢复，将删除所有版本历史！`)) {
      return;
    }
    
    try {
      this.updateStatus('🗑️ 正在删除评估器...', 'info');
      
      const accessKey = localStorage.getItem('access_key');
      const response = await fetch(`/api/evaluators/${id}`, {
        method: 'DELETE',
        headers: {
          'X-Access-Key': accessKey
        }
      });
      
      if (response.ok) {
        await this.loadEvaluators();
        this.updateStatus('✅ 评估器已删除');
      } else {
        const data = await response.json();
        throw new Error(data.error || '删除失败');
      }
    } catch (error) {
      console.error('删除评估器失败:', error);
      this.updateStatus(`❌ 删除失败: ${error.message}`, 'error');
    }
  }

  // 更新状态显示
  updateStatus(message, type = 'info') {
    const statusElement = document.getElementById('evaluatorsStatus');
    if (statusElement) {
      statusElement.textContent = message;
      statusElement.className = `status ${type}`;
      
      // 3秒后清除状态
      setTimeout(() => {
        statusElement.textContent = '';
        statusElement.className = 'status';
      }, 3000);
    }
  }
}

// 全局实例
const evaluatorManager = new EvaluatorManager();

// 全局函数
function createEvaluator() {
  if (typeof evaluatorModal !== 'undefined' && evaluatorModal) {
    evaluatorManager.updateStatus('➕ 正在创建新评估器...', 'info');
    evaluatorModal.open();
  } else {
    console.error('评估器编辑模块未加载');
    evaluatorManager.updateStatus('❌ 评估器编辑模块未加载', 'error');
  }
}

// 页面显示时初始化
document.addEventListener('DOMContentLoaded', () => {
  // 监听页面切换事件
  const originalShowPage = window.showPage;
  window.showPage = function(pageId) {
    originalShowPage(pageId);
    
    if (pageId === 'evaluators') {
      evaluatorManager.init();
    }
  };
});