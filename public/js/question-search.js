// 问题搜索功能
class QuestionSearch {
    constructor() {
        this.currentPage = 1;
        this.pageSize = 20;
        this.totalPages = 1;
        this.totalCount = 0;
        this.init();
    }

    init() {
        this.bindEvents();
        this.showEmptyState();
    }

    showEmptyState() {
        document.getElementById('questionsTableBody').innerHTML = '<tr><td colspan="19" style="text-align: center; padding: 40px; color: #666;">请输入搜索条件后点击搜索</td></tr>';
        document.getElementById('questionResultsCount').textContent = '请输入搜索条件';
    }

    bindEvents() {
        document.getElementById('questionSearchInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.searchQuestions();
            }
        });

        document.getElementById('questionStartDate').addEventListener('change', () => {
            this.searchQuestions();
        });
        
        document.getElementById('questionEndDate').addEventListener('change', () => {
            this.searchQuestions();
        });
    }

    async loadQuestions() {
        try {
            const question = document.getElementById('questionSearchInput').value.trim();
            const startDate = document.getElementById('questionStartDate').value;
            const endDate = document.getElementById('questionEndDate').value;

            const params = new URLSearchParams({
                page: this.currentPage,
                limit: this.pageSize
            });

            if (question) params.append('question', question);
            if (startDate) params.append('startDate', startDate);
            if (endDate) params.append('endDate', endDate);

            const accessKey = localStorage.getItem('access_key');
            if (!accessKey) {
                throw new Error('未找到访问密钥');
            }

            const response = await fetch(`/api/question-search?${params}`, {
                headers: {
                    'x-access-key': accessKey
                }
            });
            const data = await response.json();

            if (response.ok) {
                this.renderTable(data.results);
                this.updatePagination(data.pagination);
                this.updateResultsCount(data.pagination.total);
            } else {
                throw new Error(data.error || '查询失败');
            }
        } catch (error) {
            console.error('加载问题列表失败:', error);
            this.showError('加载问题列表失败: ' + error.message);
        }
    }

    renderTable(results) {
        if (!results || results.length === 0) {
            document.getElementById('questionsTableBody').innerHTML = '<tr><td colspan="19" style="text-align: center; padding: 40px; color: #666;">暂无数据</td></tr>';
            return;
        }

        // 解析evaluation_results获取动态列
        const evaluationColumns = this.parseEvaluationResults(results[0]?.evaluation_results);
        
        // 构建完整列顺序
        const baseColumns = ['question_text', 'context', 'ai_response', 'block_start', 'block_end', 'expected_answer'];
        const endColumns = ['question_id', 'question_type', 'chatid'];
        const fullColumns = [...baseColumns, ...evaluationColumns, ...endColumns];
        
        // 渲染表头
        this.renderTableHeader(fullColumns);
        
        // 渲染表体
        this.renderTableBody(results, fullColumns);
    }

    parseEvaluationResults(evaluationResults) {
        const evaluationColumns = [];
        
        if (evaluationResults) {
            let evaluation = {};
            try {
                evaluation = typeof evaluationResults === 'string' 
                    ? JSON.parse(evaluationResults) 
                    : evaluationResults;
            } catch (e) {
                console.warn('Failed to parse evaluation_results:', e);
                return evaluationColumns;
            }
            
            const knownDimensions = ['accuracy', 'professionalism', 'tone_reasonableness'];
            
            knownDimensions.forEach(dimension => {
                if (evaluation[dimension]) {
                    const chineseName = this.getDimensionChineseName(dimension);
                    evaluationColumns.push(chineseName);
                    evaluationColumns.push(`${chineseName}_理由`);
                }
            });
        }
        
        return evaluationColumns;
    }

    getDimensionChineseName(dimension) {
        const mapping = {
            'accuracy': '准确率',
            'professionalism': '专业度',
            'tone_reasonableness': '语气合理'
        };
        return mapping[dimension] || dimension;
    }

    renderTableHeader(columns) {
        const thead = document.getElementById('questionsTableHead');
        const columnMapping = {
            'question_text': '问题内容',
            'context': '上下文',
            'ai_response': 'AI回复',
            'block_start': '开始时间',
            'block_end': '结束时间',
            'expected_answer': '期望答案',
            'question_id': '问题ID',
            'question_type': '问题类型',
            'chatid': '对话ID'
        };
        
        thead.innerHTML = `
            <tr>
                <th>序号</th>
                <th>创建时间</th>
                <th>会话名称</th>
                ${columns.map(col => `<th>${columnMapping[col] || col}</th>`).join('')}
            </tr>
        `;
    }

    renderTableBody(results, columns) {
        const tbody = document.getElementById('questionsTableBody');
        
        tbody.innerHTML = results.slice(0, 100).map((row, index) => {
            const rowNumber = (this.currentPage - 1) * this.pageSize + index + 1;
            const cells = columns.map(col => {
                let value = this.getColumnValue(row, col);
                let cellClass = '';
                
                // 应用分数样式
                if (col.includes('准确率') || col.includes('专业度') || col.includes('语气合理')) {
                    if (!col.includes('理由') && value) {
                        const score = parseFloat(value);
                        if (!isNaN(score)) {
                            cellClass = this.getScoreClass(score) + ' score-cell';
                        }
                    }
                }
                
                // 应用时间样式
                if ((col === 'block_start' || col === 'block_end') && value) {
                    const numValue = parseFloat(value);
                    if (!isNaN(numValue)) {
                        cellClass = 'score-cell';
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
            
            return `<tr><td>${rowNumber}</td><td>${this.formatDateTime(row.created_at)}</td><td title="${row.assessment_sessions?.session_name || '未知会话'}">${(row.assessment_sessions?.session_name || '未知会话').substring(0, 20)}</td>${cells}</tr>`;
        }).join('');
    }

    getColumnValue(row, column) {
        if (column === 'ai_response') return row.ai_response || '';
        if (column === 'question_text') return row.question_text || '';
        if (column === 'context') return row.context ? JSON.stringify(row.context) : '';
        if (column === 'expected_answer') return row.expected_answer || '';
        if (column === 'block_start') return row.block_start || '';
        if (column === 'block_end') return row.block_end || '';
        if (column === 'question_id') return row.question_id || '';
        if (column === 'question_type') return row.question_type || '';
        if (column === 'chatid') return row.chatid || '';
        
        // 处理evaluation_results中的字段
        let evaluation = {};
        if (row.evaluation_results) {
            try {
                evaluation = typeof row.evaluation_results === 'string' 
                    ? JSON.parse(row.evaluation_results) 
                    : row.evaluation_results;
            } catch (e) {
                return '';
            }
        }
        
        if (column === '准确率') return evaluation.accuracy?.score || '';
        if (column === '准确率_理由') return evaluation.accuracy?.reason || '';
        if (column === '专业度') return evaluation.professionalism?.score || '';
        if (column === '专业度_理由') return evaluation.professionalism?.reason || '';
        if (column === '语气合理') return evaluation.tone_reasonableness?.score || '';
        if (column === '语气合理_理由') return evaluation.tone_reasonableness?.reason || '';
        
        return '';
    }

    updatePagination(pagination) {
        this.currentPage = pagination.page;
        this.totalPages = pagination.totalPages;
        this.totalCount = pagination.total;

        const pageInfo = document.getElementById('questionPageInfo');
        pageInfo.textContent = `第 ${pagination.page} 页，共 ${pagination.totalPages} 页`;

        const prevBtn = document.querySelector('.pagination button:first-child');
        const nextBtn = document.querySelector('.pagination button:last-child');
        
        if (prevBtn) prevBtn.disabled = pagination.page <= 1;
        if (nextBtn) nextBtn.disabled = pagination.page >= pagination.totalPages;
    }

    updateResultsCount(total) {
        document.getElementById('questionResultsCount').textContent = `共找到 ${total} 条记录`;
    }

    formatDateTime(dateString) {
        const date = new Date(dateString);
        return date.toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    getScoreClass(score) {
        if (score >= 1 && score <= 20) return 'score-1';
        if (score >= 21 && score <= 40) return 'score-2';
        if (score >= 41 && score <= 60) return 'score-3';
        if (score >= 61 && score <= 80) return 'score-4';
        if (score >= 81 && score <= 100) return 'score-5';
        return '';
    }

    showError(message) {
        document.getElementById('questionsTableBody').innerHTML = `<tr><td colspan="19" style="text-align: center; padding: 40px; color: #dc3545;">${message}</td></tr>`;
    }
}

// 全局函数
function showRecordsTab(tabName) {
    document.querySelectorAll('.sub-nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');

    document.getElementById('sessionsTab').style.display = tabName === 'sessions' ? 'block' : 'none';
    document.getElementById('questionsTab').style.display = tabName === 'questions' ? 'block' : 'none';

    if (tabName === 'questions' && !window.questionSearch) {
        window.questionSearch = new QuestionSearch();
    }
}

function searchQuestions() {
    if (window.questionSearch) {
        window.questionSearch.currentPage = 1;
        window.questionSearch.loadQuestions();
    }
}

function resetQuestionSearch() {
    document.getElementById('questionSearchInput').value = '';
    document.getElementById('questionStartDate').value = '';
    document.getElementById('questionEndDate').value = '';
    if (window.questionSearch) {
        window.questionSearch.currentPage = 1;
        window.questionSearch.loadQuestions();
    }
}

function changeQuestionPageSize() {
    const select = document.getElementById('questionPageSizeSelect');
    if (window.questionSearch) {
        window.questionSearch.pageSize = parseInt(select.value);
        window.questionSearch.currentPage = 1;
        window.questionSearch.loadQuestions();
    }
}

function prevQuestionPage() {
    if (window.questionSearch && window.questionSearch.currentPage > 1) {
        window.questionSearch.currentPage--;
        window.questionSearch.loadQuestions();
    }
}

function nextQuestionPage() {
    if (window.questionSearch && window.questionSearch.currentPage < window.questionSearch.totalPages) {
        window.questionSearch.currentPage++;
        window.questionSearch.loadQuestions();
    }
}