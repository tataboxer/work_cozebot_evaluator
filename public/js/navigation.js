// 页面切换功能
function showPage(pageId) {
    // 页面ID映射
    const pageMapping = {
        'data-processing': 'dataProcessingPage',
        'records': 'recordsPage',
        'statistics': 'statisticsPage',
        'evaluators': 'evaluatorsPage'
    };
    
    // 隐藏所有页面
    document.querySelectorAll('.page-content').forEach(page => {
        page.style.display = 'none';
    });
    
    // 显示指定页面
    const targetPageId = pageMapping[pageId];
    const targetPage = document.getElementById(targetPageId);
    if (targetPage) {
        targetPage.style.display = 'block';
    }
    
    // 更新导航按钮状态
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // 加载记录页面数据
    if (pageId === 'records') {
        loadSessions();
    }
}

// 加载会话列表
async function loadSessions() {
    try {
        const accessKey = localStorage.getItem('access_key');
        
        if (!accessKey) {
            alert('未找到访问密钥，请刷新页面重新验证');
            return;
        }
        
        const response = await fetch('/api/sessions', {
            headers: {
                'x-access-key': accessKey
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        
        const tbody = document.getElementById('sessionsTableBody');
        tbody.innerHTML = '';
        
        if (!data.sessions || data.sessions.length === 0) {
            tbody.innerHTML = '<tr><td colspan="12" style="text-align: center; color: #666;">暂无数据</td></tr>';
            return;
        }
        
        data.sessions.forEach(session => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${session.session_name || session.session_id}</td>
                <td>${new Date(session.created_at).toLocaleString()}</td>
                <td>${session.total_questions}</td>
                <td>${session.evaluation_summary?.avgAccuracy || '-'}</td>
                <td>${session.evaluation_summary?.avgProfessionalism || '-'}</td>
                <td>${session.evaluation_summary?.avgToneReasonableness || '-'}</td>
                <td>${session.first_token_avg_duration ? session.first_token_avg_duration.toFixed(1) + 's' : '-'}</td>
                <td>${session.first_token_min_duration ? session.first_token_min_duration.toFixed(1) + 's' : '-'}</td>
                <td>${session.first_token_max_duration ? session.first_token_max_duration.toFixed(1) + 's' : '-'}</td>
                <td>${session.avg_block_duration ? session.avg_block_duration.toFixed(1) + 's' : '-'}</td>
                <td>${session.config?.ip || '-'} / ${session.config?.model || '-'}</td>
                <td>
                    <button class="btn-small" onclick="viewSessionDetail('${session.session_id}')">查看</button>
                    <button class="btn-small" onclick="deleteSession('${session.session_id}')" style="background: #dc3545; margin-left: 5px;">删除</button>
                </td>
            `;
            tbody.appendChild(row);
        });
        
        // 更新分页信息
        document.getElementById('pageInfo').textContent = 
            `第 ${data.pagination.page} 页，共 ${data.pagination.totalPages} 页`;
            
    } catch (error) {
        console.error('加载会话列表失败:', error);
    }
}

// 查看会话详情 - 在session-modal.js中实现

// 删除会话
async function deleteSession(sessionId) {
    if (!confirm('确定要删除这个会话吗？')) return;
    
    try {
        const accessKey = localStorage.getItem('access_key');
        const response = await fetch(`/api/sessions/${sessionId}`, {
            method: 'DELETE',
            headers: {
                'x-access-key': accessKey
            }
        });
        
        if (response.ok) {
            loadSessions(); // 重新加载列表
        } else {
            alert('删除失败');
        }
    } catch (error) {
        console.error('删除会话失败:', error);
        alert('删除失败');
    }
}

// 搜索会话
function searchSessions() {
    // TODO: 实现搜索功能
    loadSessions();
}

// 分页功能
function prevPage() {
    // TODO: 实现上一页
}

function nextPage() {
    // TODO: 实现下一页
}