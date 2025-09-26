// 会话详情弹窗功能
let currentSessionId = null;
let currentModalData = null;

// 列顺序映射（与app.js保持一致）
const MODAL_COLUMN_MAPPING = {
    'question_text': '问题内容',
    'context': '上下文',
    'ai_response': '回答内容',
    'block_start': '开始',
    'block_end': '结束',
    'expected_answer': '期望答案',
    '准确率': '准确率',
    '准确率_理由': '准确率理由',
    '专业度': '专业度',
    '专业度_理由': '专业度理由',
    '语气合理': '语气合理',
    '语气合理_理由': '语气合理理由',
    'question_id': '问题ID',
    'question_type': '问题类型',
    'chatid': '对话ID',
    'block_type': '块类型',
    'block_subtype': '块子类型',
    'evaluator_info': '评估器'
};

// 显示会话详情
async function viewSessionDetail(sessionId) {
    try {
        currentSessionId = sessionId;
        
        const accessKey = localStorage.getItem('access_key');
        if (!accessKey) {
            alert('未找到访问密钥');
            return;
        }
        
        const response = await fetch(`/api/sessions/${sessionId}/results`, {
            headers: {
                'x-access-key': accessKey
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            populateModalData(data.session, data.results);
            document.getElementById('sessionDetailModal').style.display = 'flex';
        } else {
            alert('获取会话详情失败: ' + data.message);
        }
        
    } catch (error) {
        console.error('获取会话详情失败:', error);
        alert('获取会话详情失败');
    }
}

// 填充弹窗数据
function populateModalData(session, results) {
    currentModalData = results;
    
    // 填充会话基本信息
    document.getElementById('modalSessionName').textContent = session.session_name || session.session_id;
    
    // 渲染表格
    renderModalTable(results);
    
    // 填充筛选器
    populateModalFilters(results);
}

// 渲染弹窗表格
function renderModalTable(results) {
    if (!results || results.length === 0) {
        document.getElementById('modalTableBody').innerHTML = '<tr><td colspan="100%">暂无数据</td></tr>';
        return;
    }
    
    // 解析evaluation_results获取动态列
    const evaluationColumns = parseEvaluationResults(results[0]?.evaluation_results);
    
    // 构建完整列顺序
    const baseColumns = ['question_text', 'context', 'ai_response', 'block_start', 'block_end', 'expected_answer'];
    const endColumns = ['question_id', 'question_type', 'chatid', 'block_type', 'block_subtype', 'evaluator_info'];
    const fullColumns = [...baseColumns, ...evaluationColumns, ...endColumns];
    
    // 渲染表头
    renderModalTableHeader(fullColumns);
    
    // 渲染表体
    renderModalTableBody(results, fullColumns);
    
    // 更新统计信息
    updateModalStats(results);
}

// 解析evaluation_results获取动态列
function parseEvaluationResults(evaluationResults) {
    const evaluationColumns = [];
    
    if (evaluationResults && typeof evaluationResults === 'object') {
        const knownDimensions = ['accuracy', 'professionalism', 'tone_reasonableness'];
        
        knownDimensions.forEach(dimension => {
            if (evaluationResults[dimension]) {
                const chineseName = getDimensionChineseName(dimension);
                evaluationColumns.push(chineseName);
                evaluationColumns.push(`${chineseName}_理由`);
            }
        });
        
        // 处理未知维度
        Object.keys(evaluationResults).forEach(dimension => {
            if (!knownDimensions.includes(dimension)) {
                const chineseName = getDimensionChineseName(dimension);
                evaluationColumns.push(chineseName);
                evaluationColumns.push(`${chineseName}_理由`);
            }
        });
    }
    
    return evaluationColumns;
}

function getDimensionChineseName(dimension) {
    const mapping = {
        'accuracy': '准确率',
        'professionalism': '专业度',
        'tone_reasonableness': '语气合理'
    };
    return mapping[dimension] || dimension;
}

// 渲染表头
function renderModalTableHeader(columns) {
    const thead = document.getElementById('modalTableHead');
    thead.innerHTML = `
        <tr>
            ${columns.map(col => {
                const displayName = MODAL_COLUMN_MAPPING[col] || col;
                const width = getModalColumnWidth(col);
                return `<th style="width: ${width}px;">${displayName}<div class="resize-handle"></div></th>`;
            }).join('')}
        </tr>
    `;
    
    // 初始化列宽拖拽
    initModalColumnResize();
}

// 渲染表体
function renderModalTableBody(results, columns) {
    const tbody = document.getElementById('modalTableBody');
    
    tbody.innerHTML = results.slice(0, 100).map(row => {
        const cells = columns.map(col => {
            let value = getColumnValue(row, col);
            let cellClass = '';
            
            // 应用分数样式
            if (col.includes('准确率') || col.includes('专业度') || col.includes('语气合理')) {
                if (!col.includes('理由') && value) {
                    const score = parseFloat(value);
                    if (!isNaN(score)) {
                        cellClass = getScoreClass(score);
                        cellClass += ' score-cell';
                    }
                }
            }
            
            // 应用时间样式
            if ((col === 'block_start' || col === 'block_end') && value) {
                const numValue = parseFloat(value);
                if (!isNaN(numValue)) {
                    cellClass = 'score-cell';
                    if (col === 'block_start' && numValue >= 8) {
                        cellClass += ' score-1';
                    }
                    value = numValue.toFixed(1) + 's';
                }
            }
            
            // 处理长文本
            if (col === 'ai_response' || col.includes('理由') || col === 'expected_answer') {
                const rendered = window.simpleListRenderer ? 
                    window.simpleListRenderer.render(value) : 
                    String(value).replace(/\\n/g, '<br>');
                return `<td class="${cellClass}" title="${String(value).replace(/"/g, '&quot;')}"><div class="text-adaptive">${rendered}</div></td>`;
            } else {
                const displayText = String(value).length > 50 ? String(value).substring(0, 50) + '...' : String(value);
                return `<td class="${cellClass} long-text-cell" title="${String(value).replace(/"/g, '&quot;')}">${displayText}</td>`;
            }
        }).join('');
        
        return `<tr>${cells}</tr>`;
    }).join('');
}

// 获取列值
function getColumnValue(row, column) {
    if (column === 'ai_response') return row.ai_response || '';
    if (column === 'question_text') return row.question_text || '';
    if (column === 'context') return row.context ? JSON.stringify(row.context) : '';
    if (column === 'expected_answer') return row.expected_answer || '';
    if (column === 'block_start') return row.block_start || '';
    if (column === 'block_end') return row.block_end || '';
    if (column === 'question_id') return row.question_id || '';
    if (column === 'question_type') return row.question_type || '';
    if (column === 'chatid') return row.chatid || '';
    if (column === 'block_type') return row.block_type || '';
    if (column === 'block_subtype') return row.block_subtype || '';
    if (column === 'evaluator_info') return row.evaluator_info || '默认评估器';
    
    // 处理evaluation_results中的字段
    const evaluation = row.evaluation_results || {};
    if (column === '准确率') return evaluation.accuracy?.score || '';
    if (column === '准确率_理由') return evaluation.accuracy?.reason || '';
    if (column === '专业度') return evaluation.professionalism?.score || '';
    if (column === '专业度_理由') return evaluation.professionalism?.reason || '';
    if (column === '语气合理') return evaluation.tone_reasonableness?.score || '';
    if (column === '语气合理_理由') return evaluation.tone_reasonableness?.reason || '';
    
    return '';
}

// 获取分数样式类
function getScoreClass(score) {
    if (score >= 1 && score <= 20) return 'score-1';
    if (score >= 21 && score <= 40) return 'score-2';
    if (score >= 41 && score <= 60) return 'score-3';
    if (score >= 61 && score <= 80) return 'score-4';
    if (score >= 81 && score <= 100) return 'score-5';
    return '';
}

// 获取列宽
function getModalColumnWidth(columnName) {
    const widthMap = {
        'question_text': 220,
        'context': 150,
        'ai_response': 500,
        'block_start': 70,
        'block_end': 70,
        'expected_answer': 300,
        '准确率': 80,
        '准确率_理由': 150,
        '专业度': 80,
        '专业度_理由': 150,
        '语气合理': 80,
        '语气合理_理由': 150,
        'question_id': 40,
        'question_type': 60,
        'chatid': 50,
        'block_type': 50,
        'block_subtype': 80,
        'evaluator_info': 120
    };
    return widthMap[columnName] || 150;
}

// 填充筛选器
function populateModalFilters(results) {
    const questionTypes = [...new Set(results.map(row => row.question_type).filter(type => type))];
    
    const questionTypeFilter = document.getElementById('modalQuestionTypeFilter');
    questionTypeFilter.innerHTML = '<option value="all">显示全部</option>';
    questionTypes.forEach(type => {
        const option = document.createElement('option');
        option.value = type;
        option.textContent = type;
        questionTypeFilter.appendChild(option);
    });
    
    // 添加筛选事件
    questionTypeFilter.addEventListener('change', filterModalData);
    document.getElementById('modalSubtypeFilter').addEventListener('change', filterModalData);
}

// 筛选数据
function filterModalData() {
    const questionTypeFilter = document.getElementById('modalQuestionTypeFilter').value;
    const subtypeFilter = document.getElementById('modalSubtypeFilter').value;
    
    let filteredResults = [...currentModalData];
    
    if (questionTypeFilter !== 'all') {
        filteredResults = filteredResults.filter(row => row.question_type === questionTypeFilter);
    }
    
    if (subtypeFilter !== 'all') {
        filteredResults = filteredResults.filter(row => row.block_subtype === subtypeFilter);
    }
    
    renderModalTable(filteredResults);
}

// 更新统计信息
function updateModalStats(results) {
    // 使用统一的统计计算模块
    const stats = window.StatisticsUtils.calculateStatistics(results);
    document.getElementById('modalStats').innerHTML = window.StatisticsUtils.generateStatsHTML(stats);
}

// 导出会话数据
async function exportSessionData() {
    try {
        if (!currentSessionId) {
            alert('未选择会话');
            return;
        }
        
        const accessKey = localStorage.getItem('access_key');
        const response = await fetch(`/api/sessions/${currentSessionId}/export`, {
            headers: {
                'x-access-key': accessKey
            }
        });
        
        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `session_${currentSessionId}_results.csv`;
            a.click();
            window.URL.revokeObjectURL(url);
        } else {
            alert('导出失败');
        }
    } catch (error) {
        console.error('导出失败:', error);
        alert('导出失败');
    }
}

// 从弹窗删除会话
async function deleteSessionFromModal() {
    if (!currentSessionId) return;
    
    if (!confirm('确定要删除这个会话吗？删除后将关闭弹窗并刷新列表。')) return;
    
    try {
        const accessKey = localStorage.getItem('access_key');
        const response = await fetch(`/api/sessions/${currentSessionId}`, {
            method: 'DELETE',
            headers: {
                'x-access-key': accessKey
            }
        });
        
        if (response.ok) {
            closeSessionDetail();
            loadSessions(); // 刷新会话列表
        } else {
            alert('删除失败');
        }
    } catch (error) {
        console.error('删除会话失败:', error);
        alert('删除失败');
    }
}

// 初始化modal列宽拖拽
function initModalColumnResize() {
    let isResizing = false;
    let currentColumn = null;
    let startX = 0;
    let startWidth = 0;
    
    const modalTable = document.getElementById('modalTable');
    if (!modalTable) return;
    
    modalTable.addEventListener('mousedown', (e) => {
        if (e.target.classList.contains('resize-handle')) {
            isResizing = true;
            currentColumn = e.target.parentElement;
            startX = e.pageX;
            startWidth = currentColumn.offsetWidth;
            document.body.classList.add('resizing');
            e.preventDefault();
        }
    });
    
    document.addEventListener('mousemove', (e) => {
        if (!isResizing) return;
        
        const width = startWidth + (e.pageX - startX);
        if (width > 50) {
            currentColumn.style.width = width + 'px';
        }
    });
    
    document.addEventListener('mouseup', () => {
        if (isResizing) {
            isResizing = false;
            currentColumn = null;
            document.body.classList.remove('resizing');
        }
    });
}

// 关闭弹窗
function closeSessionDetail() {
    document.getElementById('sessionDetailModal').style.display = 'none';
    currentSessionId = null;
    currentModalData = null;
}