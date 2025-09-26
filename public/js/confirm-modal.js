// 确认弹窗组件
class ConfirmModal {
  constructor() {
    this.createModal();
  }

  createModal() {
    const modalHTML = `
      <div class="confirm-modal" id="confirmModal" style="display: none;">
        <div class="confirm-modal-content">
          <div class="confirm-header">
            <h3 id="confirmTitle">确认操作</h3>
          </div>
          <div class="confirm-body">
            <p id="confirmMessage">确定要执行此操作吗？</p>
          </div>
          <div class="confirm-actions">
            <button id="confirmCancel">取消</button>
            <button id="confirmOk">确定</button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    this.initEvents();
  }

  initEvents() {
    const cancelBtn = document.getElementById('confirmCancel');
    const okBtn = document.getElementById('confirmOk');
    
    // 设置按钮样式
    const buttonStyle = {
      width: '100px',
      height: '40px',
      padding: '10px 20px',
      boxSizing: 'border-box',
      border: 'none',
      borderRadius: '8px',
      fontSize: '0.95rem',
      cursor: 'pointer',
      transition: 'all 0.3s ease'
    };
    
    Object.assign(cancelBtn.style, buttonStyle, {
      background: '#6c757d',
      color: 'white'
    });
    
    Object.assign(okBtn.style, buttonStyle, {
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white'
    });
    
    cancelBtn.addEventListener('click', () => this.close(false));
    okBtn.addEventListener('click', () => this.close(true));
    
    // 点击背景关闭
    document.getElementById('confirmModal').addEventListener('click', (e) => {
      if (e.target.id === 'confirmModal') {
        this.close(false);
      }
    });
  }

  show(title, message) {
    return new Promise((resolve) => {
      this.resolve = resolve;
      document.getElementById('confirmTitle').textContent = title;
      document.getElementById('confirmMessage').textContent = message;
      document.getElementById('confirmModal').style.display = 'flex';
    });
  }

  close(result) {
    document.getElementById('confirmModal').style.display = 'none';
    if (this.resolve) {
      this.resolve(result);
      this.resolve = null;
    }
  }
}

// 全局实例
const confirmModal = new ConfirmModal();

// 全局确认函数
window.confirmAction = (title, message) => confirmModal.show(title, message);