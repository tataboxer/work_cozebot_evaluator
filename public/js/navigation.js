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
    
    // 初始化统计分析页面
    if (pageId === 'statistics' && typeof initStatistics === 'function') {
        setTimeout(initStatistics, 100);
    }
}

// 分页状态
let currentPage = 1;
let totalPages = 1;
let pageSize = 20;
let selectedSessions = new Set();

// 加载会话列表
async function loadSessions(page = 1) {
    try {
        const accessKey = localStorage.getItem('access_key');
        
        if (!accessKey) {
            alert('未找到访问密钥，请刷新页面重新验证');
            return;
        }
        
        // 构建查询参数
        const params = new URLSearchParams({
            page: page,
            limit: pageSize
        });
        
        // 添加筛选条件
        const startDate = document.getElementById('startDate')?.value;
        const endDate = document.getElementById('endDate')?.value;
        const sessionName = document.getElementById('sessionNameFilter')?.value;
        
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
        if (sessionName) params.append('sessionName', sessionName);
        
        const response = await fetch(`/api/sessions?${params}`, {
            headers: {
                'x-access-key': accessKey
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        
        // 更新分页状态
        currentPage = data.pagination.page;
        totalPages = data.pagination.totalPages;
        
        const tbody = document.getElementById('sessionsTableBody');
        tbody.innerHTML = '';
        
        if (!data.sessions || data.sessions.length === 0) {
            tbody.innerHTML = '<tr><td colspan="13" style="text-align: center; color: #666;">暂无数据</td></tr>';
            totalPages = 0;
            currentPage = 0;
            updatePaginationUI();
            return;
        }
        
        data.sessions.forEach(session => {
            const row = document.createElement('tr');
            const isSelected = selectedSessions.has(session.session_id);
            row.innerHTML = `
                <td><input type="checkbox" ${isSelected ? 'checked' : ''} onchange="toggleSessionSelection('${session.session_id}', this.checked)"></td>
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
        
        updatePaginationUI();
        updateBatchDeleteButton();
            
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
    if (currentPage > 1) {
        loadSessions(currentPage - 1);
    }
}

function nextPage() {
    if (currentPage < totalPages) {
        loadSessions(currentPage + 1);
    }
}

function updatePaginationUI() {
    const pageInfo = document.getElementById('pageInfo');
    if (totalPages === 0) {
        pageInfo.textContent = '暂无数据';
    } else {
        pageInfo.textContent = `第 ${currentPage} 页，共 ${totalPages} 页`;
    }
}

// 多选功能
function toggleSelectAll(checked) {
    const checkboxes = document.querySelectorAll('#sessionsTableBody input[type="checkbox"]');
    checkboxes.forEach(cb => {
        cb.checked = checked;
        const sessionId = cb.onchange.toString().match(/'([^']+)'/)[1];
        if (checked) {
            selectedSessions.add(sessionId);
        } else {
            selectedSessions.delete(sessionId);
        }
    });
    updateBatchDeleteButton();
}

function toggleSessionSelection(sessionId, checked) {
    if (checked) {
        selectedSessions.add(sessionId);
    } else {
        selectedSessions.delete(sessionId);
    }
    updateBatchDeleteButton();
    
    const allCheckboxes = document.querySelectorAll('#sessionsTableBody input[type="checkbox"]');
    const checkedCount = document.querySelectorAll('#sessionsTableBody input[type="checkbox"]:checked').length;
    const selectAllCheckbox = document.getElementById('selectAll');
    
    if (checkedCount === 0) {
        selectAllCheckbox.indeterminate = false;
        selectAllCheckbox.checked = false;
    } else if (checkedCount === allCheckboxes.length) {
        selectAllCheckbox.indeterminate = false;
        selectAllCheckbox.checked = true;
    } else {
        selectAllCheckbox.indeterminate = true;
    }
}

function updateBatchDeleteButton() {
    const batchDeleteBtn = document.getElementById('batchDeleteBtn');
    if (selectedSessions.size > 0) {
        batchDeleteBtn.style.display = 'inline-block';
        batchDeleteBtn.textContent = `🗑️ 批量删除 (${selectedSessions.size})`;
    } else {
        batchDeleteBtn.style.display = 'none';
    }
}

// 批量删除功能
async function batchDeleteSessions() {
    if (selectedSessions.size === 0) return;
    
    if (!confirm(`确定要删除这 ${selectedSessions.size} 个会话吗？`)) return;
    
    const accessKey = localStorage.getItem('access_key');
    const sessionIds = Array.from(selectedSessions);
    
    try {
        const deletePromises = sessionIds.map(sessionId => 
            fetch(`/api/sessions/${sessionId}`, {
                method: 'DELETE',
                headers: { 'x-access-key': accessKey }
            })
        );
        
        await Promise.all(deletePromises);
        selectedSessions.clear();
        loadSessions(currentPage);
        alert('批量删除成功');
    } catch (error) {
        console.error('批量删除失败:', error);
        alert('批量删除失败');
    }
}