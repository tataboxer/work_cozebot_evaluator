// 优化版前端应用 - 基于现有Express架构
class OptimizedAssessmentApp {
    constructor() {
        this.initComplete = false;
        this.currentData = null;
        
        // 快速初始化核心功能
        this.initElements();
        this.initEventListeners();
        
        // 异步初始化非关键功能
        setTimeout(() => {
            this.waitForDependencies();
        }, 100);
    }
    
    initSSE() {
        // 延迟初始SSE连接，完全不阻塞页面加载
        setTimeout(() => {
            try {
                this.eventSource = new EventSource('/api/logs');
                
                // 设置连接超时
                const timeout = setTimeout(() => {
                    if (this.eventSource && this.eventSource.readyState === EventSource.CONNECTING) {
                        console.warn('SSE连接超时，关闭连接');
                        this.eventSource.close();
                    }
                }, 3000);
                
                this.eventSource.onopen = () => {
                    clearTimeout(timeout);
                    console.log('SSE连接已建立');
                };
                
                this.eventSource.onmessage = (event) => {
                    try {
                        const data = JSON.parse(event.data);
                        
                        if (data.type === 'progress') {
                            this.updateProgress(data.message);
                        } else if (data.type === 'excel-progress') {
                            this.updateExcelProgress(data.message);
                        }
                        
                        this.addLog(data.type, data.message);
                    } catch (error) {
                        console.error('解析SSE消息失败:', error);
                    }
                };
                
                this.eventSource.onerror = (error) => {
                    clearTimeout(timeout);
                    console.warn('SSE连接错误，忽略并继续');
                    if (this.eventSource) {
                        this.eventSource.close();
                    }
                    // 不再自动重连，避免影响性能
                };
            } catch (error) {
                console.error('SSE初始化失败，忽略:', error);
            }
        }, 2000); // 2秒后初始化SSE
    }
    
    toggleLogPanel() {
        this.logPanelOpen = !this.logPanelOpen;
        if (this.logPanel) {
            this.logPanel.style.display = this.logPanelOpen ? 'flex' : 'none';
        }
    }
    
    closeLogPanel() {
        this.logPanelOpen = false;
        if (this.logPanel) {
            this.logPanel.style.display = 'none';
        }
    }
    
    updateProgress(progressMessage) {
        const progressData = JSON.parse(progressMessage);
        if (this.progressFill && this.progressText) {
            this.progressFill.style.width = progressData.percent + '%';
            this.progressText.textContent = `进度: ${progressData.current}/${progressData.total}`;
            this.progressText.style.display = 'block';
        }
    }

    updateExcelProgress(progressMessage) {
        const progressData = JSON.parse(progressMessage);
        if (this.excelProgressFill && this.excelProgressText) {
            this.excelProgressFill.style.width = progressData.percent + '%';
            this.excelProgressText.textContent = `进度: ${progressData.current}/${progressData.total}`;
            this.excelProgressText.style.display = 'block';
            this.excelProgressBar.style.display = 'block';
        }
    }

    addLog(type, message) {
        if (!this.logContent) return;
        
        const timestamp = new Date().toLocaleTimeString();
        const logEntry = document.createElement('div');
        logEntry.className = `log-entry ${type}`;
        
        let icon = '';
        switch(type) {
            case 'success': icon = '✅'; break;
            case 'error': icon = '❌'; break;
            case 'info': icon = 'ℹ️'; break;
            default: icon = '📝';
        }
        
        logEntry.innerHTML = `<strong>[${timestamp}] ${icon}</strong> ${message}`;
        this.logContent.appendChild(logEntry);
        this.logContent.scrollTop = this.logContent.scrollHeight;
        
        if (this.logContent.children.length > 1000) {
            this.logContent.removeChild(this.logContent.firstChild);
        }
    }

    waitForDependencies() {
        const checkDeps = () => {
            if (window.dataManager && window.simpleListRenderer) {
                this.initComplete = true;
            } else {
                setTimeout(checkDeps, 100);
            }
        };
        checkDeps();
    }

    initElements() {
        // 核心按钮
        this.processExcelBtn = document.getElementById('processExcelBtn');
        this.runAssessmentBtn = document.getElementById('runAssessmentBtn');
        this.downloadCsvBtn = document.getElementById('downloadCsvBtn');
        this.refreshTokenBtn = document.getElementById('refreshTokenBtn');
        
        // 文件输入
        this.excelFileInput = document.getElementById('excelFile');
        this.fileName = document.getElementById('fileName');
        
        // 状态显示
        this.tokenStatus = document.getElementById('tokenStatus');
        this.excelStatus = document.getElementById('excelStatus');
        this.assessmentStatus = document.getElementById('assessmentStatus');
        
        // 显示区域
        this.csvDisplaySection = document.getElementById('csvDisplaySection');
        this.csvTableBody = document.getElementById('csvTableBody');
        this.csvTableHead = document.getElementById('csvTableHead');
        this.csvStats = document.getElementById('csvStats');
        this.csvFileName = document.getElementById('csvFileName');
        this.subtypeFilter = document.getElementById('subtypeFilter');
        this.questionTypeFilter = document.getElementById('questionTypeFilter');
        this.assessmentFileName = document.getElementById('assessmentFileName');
        
        // 进度元素
        this.excelProgressBar = document.getElementById('excelProgressBar');
        this.excelProgressFill = document.getElementById('excelProgressFill');
        this.excelProgressText = document.getElementById('excelProgressText');
        this.progressBar = document.getElementById('progressBar');
        this.progressFill = document.getElementById('progressFill');
        this.progressText = document.getElementById('progressText');
        
        // 日志面板
        this.logPanel = document.getElementById('logPanel');
        this.logContent = document.getElementById('logContent');
        this.logPanelOpen = false;
        
        // 延迟初始化SSE，避免影响页面加载
        this.initSSE();
    }

    initEventListeners() {
        this.excelFileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        this.processExcelBtn.addEventListener('click', () => this.processExcel());
        this.runAssessmentBtn.addEventListener('click', () => this.runAssessment());
        this.downloadCsvBtn.addEventListener('click', () => this.downloadCsv());
        this.refreshTokenBtn.addEventListener('click', () => this.refreshToken());
        this.subtypeFilter.addEventListener('change', () => this.filterData());
        this.questionTypeFilter.addEventListener('change', () => this.filterData());
        
        // 日志面板事件
        const logToggle = document.getElementById('logToggle');
        const logPanel = document.getElementById('logPanel');
        const closeLog = document.getElementById('closeLog');
        
        if (logToggle) {
            logToggle.addEventListener('click', () => this.toggleLogPanel());
        }
        if (closeLog) {
            closeLog.addEventListener('click', () => this.closeLogPanel());
        }
        if (logPanel) {
            logPanel.addEventListener('click', (e) => {
                if (e.target === logPanel) this.closeLogPanel();
            });
        }
        
        // 日志面板拖拽
        this.initLogPanelDrag();
    }

    handleFileSelect(e) {
        const file = e.target.files[0];
        if (file) {
            this.fileName.textContent = `已选择: ${file.name}`;
            this.processExcelBtn.disabled = false;
        } else {
            this.fileName.textContent = '';
            this.processExcelBtn.disabled = true;
        }
    }

    async refreshToken() {
        this.showStatus(this.tokenStatus, 'info', '正在刷新Token...');
        this.refreshTokenBtn.disabled = true;

        try {
            const response = await fetch('/api/refresh-token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });

            const result = await response.json();
            if (result.success) {
                this.showStatus(this.tokenStatus, 'success', '✅ Token刷新成功！');
            } else {
                this.showStatus(this.tokenStatus, 'error', `❌ Token刷新失败: ${result.message}`);
            }
        } catch (error) {
            this.showStatus(this.tokenStatus, 'error', `❌ 网络错误: ${error.message}`);
        } finally {
            this.refreshTokenBtn.disabled = false;
        }
    }

    async processExcel() {
        const file = this.excelFileInput.files[0];
        if (!file) {
            this.showStatus(this.excelStatus, 'error', '❌ 请先选择Excel文件');
            return;
        }

        this.showStatus(this.excelStatus, 'info', '正在处理Excel文件...');
        this.processExcelBtn.disabled = true;
        this.processExcelBtn.textContent = '处理中...';

        try {
            const formData = new FormData();
            formData.append('excelFile', file);

            const response = await fetch('/process-excel', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (result.success) {
                if (result.data && result.data.previewData) {
                    this.currentData = result.data.previewData;
                    window.dataManager.setData(this.currentData);
                    
                    this.showStatus(this.excelStatus, 'success', `✅ Excel处理成功！生成 ${result.data.outputRecords} 条记录`);
                    this.refreshUI();
                    this.runAssessmentBtn.disabled = false;
                } else {
                    this.showStatus(this.excelStatus, 'error', '❌ Excel处理失败：未返回数据');
                }
                
                // 隐藏Excel进度条
                setTimeout(() => {
                    this.excelProgressBar.style.display = 'none';
                    this.excelProgressText.style.display = 'none';
                }, 2000);
            } else {
                this.showStatus(this.excelStatus, 'error', `❌ Excel处理失败: ${result.message}`);
            }
        } catch (error) {
            this.showStatus(this.excelStatus, 'error', `❌ 网络错误: ${error.message}`);
        } finally {
            if (this.processExcelBtn.textContent.includes('处理中')) {
                this.processExcelBtn.disabled = false;
                this.processExcelBtn.textContent = '处理Excel';
            }
            // 错误时也隐藏进度条
            setTimeout(() => {
                this.excelProgressBar.style.display = 'none';
                this.excelProgressText.style.display = 'none';
            }, 1000);
        }
    }

    async runAssessment() {
        if (!this.currentData) {
            this.showStatus(this.assessmentStatus, 'error', '❌ 请先处理Excel文件');
            return;
        }

        this.showStatus(this.assessmentStatus, 'info', '正在执行评估...');
        this.runAssessmentBtn.disabled = true;
        this.runAssessmentBtn.textContent = '评估中...';
        
        this.progressBar.style.display = 'block';
        this.progressFill.style.width = '0%';
        this.progressText.textContent = '准备开始评估...';
        this.progressText.style.display = 'block';

        try {
            const response = await fetch('/api/run-assessment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data: this.currentData })
            });

            const result = await response.json();

            if (result.success) {
                this.showStatus(this.assessmentStatus, 'success', '✅ 评估完成！');
                
                if (result.data) {
                    this.currentData = result.data;
                    window.dataManager.setData(this.currentData);
                    this.refreshUI();
                }
            } else {
                this.addLog('error', '评估失败: ' + result.message);
                this.showStatus(this.assessmentStatus, 'error', `❌ 评估失败`);
            }
        } catch (error) {
            this.addLog('error', '评估请求失败: ' + error.message);
            this.showStatus(this.assessmentStatus, 'error', `❌ 评估请求失败`);
        } finally {
            this.runAssessmentBtn.disabled = false;
            this.runAssessmentBtn.textContent = '开始评估';
            setTimeout(() => {
                this.progressBar.style.display = 'none';
                this.progressText.style.display = 'none';
            }, 2000);
        }
    }



    downloadCsv() {
        if (!this.currentData || !window.dataManager) {
            this.showStatus(this.assessmentStatus, 'error', '❌ 没有可下载的数据');
            return;
        }

        try {
            const filename = `assessment_results_${new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-')}.csv`;
            window.dataManager.downloadCSV(filename);
            this.showStatus(this.assessmentStatus, 'success', '✅ CSV下载成功');
        } catch (error) {
            console.error('CSV下载失败:', error);
            this.showStatus(this.assessmentStatus, 'error', `❌ CSV下载失败: ${error.message}`);
        }
    }

    refreshUI() {
        if (!this.currentData || this.currentData.length === 0) {
            this.csvDisplaySection.style.display = 'none';
            return;
        }

        this.displayData(this.currentData);
        this.csvDisplaySection.style.display = 'block';
        this.downloadCsvBtn.disabled = false;
        this.csvFileName.textContent = `📁 数据预览 (${this.currentData.length}条记录)`;
        this.csvFileName.className = 'csv-filename loaded';
    }

    displayData(data) {
        if (!data || data.length === 0) {
            this.csvTableBody.innerHTML = '<tr><td colspan="100%">暂无数据</td></tr>';
            return;
        }

        // 填充question_type筛选器
        this.populateQuestionTypeFilter(data);

        // 定义列顺序
        const columnOrder = [
            'question_text', 'context', 'block_result', 'block_start', 'block_end', 'expected_answer',
            '准确率', '准确率_理由', '专业度', '专业度_理由', '语气合理度', '语气合理_理由',
            'question_id', 'question_type', 'chatid', 'block_type', 'block_subtype'
        ];
        
        // 获取所有列，按顺序排列
        const allColumns = Object.keys(data[0]);
        const orderedColumns = columnOrder.filter(col => allColumns.includes(col));
        const remainingColumns = allColumns.filter(col => !columnOrder.includes(col));
        const columns = [...orderedColumns, ...remainingColumns];

        this.csvTableHead.innerHTML = `
            <tr>
                ${columns.map(col => {
                    const width = this.getColumnWidth(col);
                    const isSortable = this.isSortableColumn(col);
                    return `
                        <th class="${isSortable ? 'sortable' : ''}" data-column="${col}" data-sort="none" style="width: ${width}px;">
                            ${col}
                            <div class="resize-handle"></div>
                        </th>
                    `;
                }).join('')}
            </tr>
        `;
        
        // 添加排序事件监听器
        this.initColumnSorting();

        // 过滤数据
        const subtypeFilter = this.subtypeFilter.value;
        const questionTypeFilter = this.questionTypeFilter.value;
        let filteredData = data;
        
        if (subtypeFilter !== 'all') {
            filteredData = filteredData.filter(row => row.block_subtype === subtypeFilter);
        }
        if (questionTypeFilter !== 'all') {
            filteredData = filteredData.filter(row => row.question_type === questionTypeFilter);
        }

        // 创建表格内容
        this.renderTableBody(filteredData);

        this.updateCsvStats(data, filteredData);
    }

    populateQuestionTypeFilter(data) {
        const questionTypes = [...new Set(data.map(row => row.question_type).filter(type => type))];
        
        this.questionTypeFilter.innerHTML = '<option value="all">显示全部</option>';
        questionTypes.forEach(type => {
            const option = document.createElement('option');
            option.value = type;
            option.textContent = type;
            this.questionTypeFilter.appendChild(option);
        });
    }

    filterData() {
        if (!this.currentData) return;
        
        const subtypeFilter = this.subtypeFilter.value;
        const questionTypeFilter = this.questionTypeFilter.value;
        let filteredData = [...this.currentData];
        
        if (subtypeFilter !== 'all') {
            filteredData = filteredData.filter(row => row.block_subtype === subtypeFilter);
        }
        if (questionTypeFilter !== 'all') {
            filteredData = filteredData.filter(row => row.question_type === questionTypeFilter);
        }
        
        this.renderTableBody(filteredData);
        this.updateCsvStats(this.currentData, filteredData);
    }



    isSortableColumn(columnName) {
        const sortableColumns = [
            'block_start',
            'block_end', 
            '准确率',
            '专业度',
            '语气合理度'
        ];
        return sortableColumns.includes(columnName);
    }

    getColumnWidth(columnName) {
        const widthMap = {
            'question_text': 220,
            'context': 150,
            'block_result': 500,
            'block_start': 70,
            'block_end': 70,
            'expected_answer': 300,
            '准确率': 80,
            '准确率_理由': 150,
            '专业度': 80,
            '专业度_理由': 150,
            '语气合理度': 80,
            '语气合理_理由': 150,
            'question_id': 40,
            'question_type': 60,  
            'chatid': 50,
            'block_type': 50,
            'block_subtype': 80,
        };
        return widthMap[columnName] || 150;
    }

    initColumnSorting() {
        const sortableHeaders = this.csvTableHead.querySelectorAll('th.sortable');
        
        sortableHeaders.forEach(header => {
            header.addEventListener('click', (e) => {
                if (e.target.classList.contains('resize-handle')) return;
                
                const columnName = header.dataset.column;
                const currentSort = header.dataset.sort;
                
                sortableHeaders.forEach(h => {
                    if (h !== header) {
                        h.dataset.sort = 'none';
                        h.classList.remove('sort-asc', 'sort-desc');
                    }
                });
                
                let newSort = (currentSort === 'none' || currentSort === 'desc') ? 'asc' : 'desc';
                
                header.dataset.sort = newSort;
                header.classList.remove('sort-asc', 'sort-desc');
                header.classList.add(`sort-${newSort}`);
                
                this.sortTableData(columnName, newSort);
            });
        });
        
        this.initColumnResize();
    }

    sortTableData(columnName, direction) {
        if (!this.currentData || this.currentData.length === 0) return;
        
        const subtypeFilter = this.subtypeFilter.value;
        const questionTypeFilter = this.questionTypeFilter.value;
        let filteredData = [...this.currentData];
        
        if (subtypeFilter !== 'all') {
            filteredData = filteredData.filter(row => row.block_subtype === subtypeFilter);
        }
        if (questionTypeFilter !== 'all') {
            filteredData = filteredData.filter(row => row.question_type === questionTypeFilter);
        }
        
        filteredData.sort((a, b) => {
            let valueA = a[columnName];
            let valueB = b[columnName];
            
            if (columnName === 'block_start' || columnName === 'block_end' || 
                columnName === '准确率' || columnName === '专业度' || columnName === '语气合理度' || columnName.includes('_分数')) {
                valueA = parseFloat(valueA) || 0;
                valueB = parseFloat(valueB) || 0;
            }
            
            if (valueA === null || valueA === undefined || valueA === '') valueA = direction === 'asc' ? Infinity : -Infinity;
            if (valueB === null || valueB === undefined || valueB === '') valueB = direction === 'asc' ? Infinity : -Infinity;
            
            if (direction === 'asc') {
                return valueA < valueB ? -1 : valueA > valueB ? 1 : 0;
            } else {
                return valueA > valueB ? -1 : valueA < valueB ? 1 : 0;
            }
        });
        
        this.renderTableBody(filteredData);
        this.updateCsvStats(this.currentData, filteredData);
    }

    renderTableBody(data) {
        // 使用与表头相同的列顺序
        const columnOrder = [
            'question_text', 'context', 'block_result', 'block_start', 'block_end', 'expected_answer',
            '准确率', '准确率_理由', '专业度', '专业度_理由', 
            '语气合理度', '语气合理_理由',
            'question_id', 'question_type', 'chatid', 'block_type', 'block_subtype'
        ];
        
        this.csvTableBody.innerHTML = data.slice(0, 100).map(row => {
            const allColumns = Object.keys(row);
            const orderedColumns = columnOrder.filter(col => allColumns.includes(col));
            const remainingColumns = allColumns.filter(col => !columnOrder.includes(col));
            const columns = [...orderedColumns, ...remainingColumns];
            
            const cells = columns.map(key => {
                let value = row[key] || '';
                let cellClass = '';
                const originalValue = String(value);
                const tooltipText = originalValue.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
                
                if ((key === '准确率' || key === '专业度' || key === '语气合理度' || key.includes('_分数')) && value) {
                    const score = parseFloat(value);
                    let scoreClass = '';
                    if (score >= 1 && score <= 20) {
                        scoreClass = 'score-1';
                    } else if (score >= 21 && score <= 40) {
                        scoreClass = 'score-2';
                    } else if (score >= 41 && score <= 60) {
                        scoreClass = 'score-3';
                    } else if (score >= 61 && score <= 80) {
                        scoreClass = 'score-4';
                    } else if (score >= 81 && score <= 100) {
                        scoreClass = 'score-5';
                    }
                    cellClass = `score-cell ${scoreClass}`;
                } else if ((key === 'block_start' || key === 'block_end') && value) {
                    const numValue = parseFloat(value);
                    if (!isNaN(numValue)) {
                        if (key === 'block_start' && numValue >= 8) {
                            cellClass = 'score-cell score-1';
                        } else {
                            cellClass = 'score-cell';
                        }
                        value = numValue.toFixed(1) + 's';
                    }
                }
                
                if (key === 'block_result' || key.includes('_理由') || key === 'expected_answer') {
                    const rendered = window.simpleListRenderer ? 
                        window.simpleListRenderer.render(value) : 
                        String(value).replace(/\\n/g, '<br>');
                    return `<td class="${cellClass}" title="${tooltipText}"><div class="text-adaptive">${rendered}</div></td>`;
                } else {
                    const displayText = originalValue.length > 50 ? originalValue.substring(0, 50) + '...' : originalValue;
                    return `<td class="${cellClass} long-text-cell" title="${tooltipText}">${displayText}</td>`;
                }
            }).join('');
            
            return `<tr>${cells}</tr>`;
        }).join('');
    }

    updateCsvStats(allData, filteredData) {
        const totalRows = allData.length;
        const filteredRows = filteredData.length;
        const answerRows = filteredData.filter(row => row.block_type === 'answer').length;
        const textReplyRows = filteredData.filter(row => row.block_subtype === '文本回复').length;
        
        const evaluatedRows = filteredData.filter(row => 
            row['准确率'] && row['专业度'] && row['语气合理度']
        ).length;
        
        const scores = { accuracy: [], professionalism: [], tone: [] };
        const timings = { firstToken: [], duration: [] };
        
        filteredData.forEach(row => {
            if (row['准确率']) scores.accuracy.push(parseFloat(row['准确率']));
            if (row['专业度']) scores.professionalism.push(parseFloat(row['专业度']));
            if (row['语气合理度']) scores.tone.push(parseFloat(row['语气合理度']));
            
            if (row.block_start && row.block_end) {
                const startTime = parseFloat(row.block_start);
                const endTime = parseFloat(row.block_end);
                if (!isNaN(startTime) && !isNaN(endTime)) {
                    timings.firstToken.push(startTime);
                    timings.duration.push(endTime - startTime);
                }
            }
        });
        
        const avgAccuracy = scores.accuracy.length ? (scores.accuracy.reduce((a, b) => a + b, 0) / scores.accuracy.length).toFixed(2) : 'N/A';
        const avgProfessionalism = scores.professionalism.length ? (scores.professionalism.reduce((a, b) => a + b, 0) / scores.professionalism.length).toFixed(2) : 'N/A';
        const avgTone = scores.tone.length ? (scores.tone.reduce((a, b) => a + b, 0) / scores.tone.length).toFixed(2) : 'N/A';
        
        const avgFirstToken = timings.firstToken.length ? (timings.firstToken.reduce((a, b) => a + b, 0) / timings.firstToken.length).toFixed(1) : 'N/A';
        const avgDuration = timings.duration.length ? (timings.duration.reduce((a, b) => a + b, 0) / timings.duration.length).toFixed(1) : 'N/A';
        
        const minFirstToken = timings.firstToken.length ? Math.min(...timings.firstToken).toFixed(1) : 'N/A';
        const maxFirstToken = timings.firstToken.length ? Math.max(...timings.firstToken).toFixed(1) : 'N/A';
        const minDuration = timings.duration.length ? Math.min(...timings.duration).toFixed(1) : 'N/A';
        const maxDuration = timings.duration.length ? Math.max(...timings.duration).toFixed(1) : 'N/A';
        
        this.csvStats.innerHTML = `
            <div class="stats-item">
                <span class="stats-label">数据统计:</span>
            </div>
            <div class="stats-item">
                <span class="stats-label">总行数:</span>
                <span class="stats-value">${totalRows}</span>
                <span class="stats-separator">|</span>
            </div>
            <div class="stats-item">
                <span class="stats-label">显示行数:</span>
                <span class="stats-value">${filteredRows}</span>
                <span class="stats-separator">|</span>
            </div>
            <div class="stats-item">
                <span class="stats-label">文本回复:</span>
                <span class="stats-value">${textReplyRows}</span>
                <span class="stats-separator">|</span>
            </div>
            <div class="stats-item">
                <span class="stats-label">已评估:</span>
                <span class="stats-value">${evaluatedRows}/${answerRows}</span>
                <span class="stats-separator">|</span>
            </div>
            <div class="stats-item timing-stats">
                <span class="stats-label">首token平均时长:</span>
                <span class="stats-value">${avgFirstToken}s (${minFirstToken}-${maxFirstToken})</span>
                <span class="stats-separator">|</span>
                <span class="stats-label">段平均时长:</span>
                <span class="stats-value">${avgDuration}s (${minDuration}-${maxDuration})</span>
            </div>
            <div class="stats-item">
                <span class="stats-label">平均分数:</span>
                <span class="stats-value">准确率: ${avgAccuracy} | 专业度: ${avgProfessionalism} | 语气: ${avgTone}</span>
                <span class="stats-separator">|</span>
            </div>
        `;
    }

    initColumnResize() {
        let isResizing = false;
        let currentColumn = null;
        let startX = 0;
        let startWidth = 0;
        
        document.addEventListener('mousedown', (e) => {
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

    initLogPanelDrag() {
        let isDragging = false;
        let startX, startY, startLeft, startTop;
        
        const logHeader = this.logPanel.querySelector('.log-header');
        if (!logHeader) return;
        
        logHeader.addEventListener('mousedown', (e) => {
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            const rect = this.logPanel.getBoundingClientRect();
            startLeft = rect.left;
            startTop = rect.top;
            
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
            e.preventDefault();
        });
        
        const onMouseMove = (e) => {
            if (!isDragging) return;
            
            const deltaX = e.clientX - startX;
            const deltaY = e.clientY - startY;
            
            this.logPanel.style.left = (startLeft + deltaX) + 'px';
            this.logPanel.style.top = (startTop + deltaY) + 'px';
            this.logPanel.style.right = 'auto';
        };
        
        const onMouseUp = () => {
            isDragging = false;
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };
    }
    


    
    showStatus(element, type, message) {
        element.className = `status ${type}`;
        element.textContent = message;
        element.style.display = 'block';

        if (type === 'success') {
            setTimeout(() => {
                element.style.display = 'none';
            }, 5000);
        }
    }
}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    new OptimizedAssessmentApp();
});