// 苏州科技馆 AI 助手评估平台 - 前端应用
class AssessmentApp {
    constructor() {
        this.initElements();
        this.initEventListeners();
        this.initSSE();
        this.currentCsvData = null;
        this.currentSessionId = null;
    }

    initElements() {
        // 按钮元素
        this.refreshTokenBtn = document.getElementById('refreshTokenBtn');
        this.processExcelBtn = document.getElementById('processExcelBtn');
        this.downloadCsvBtn = document.getElementById('downloadCsvBtn');
        this.runAssessmentBtn = document.getElementById('runAssessmentBtn');
        
        // 输入元素
        this.excelFileInput = document.getElementById('excelFile');
        this.fileName = document.getElementById('fileName');
        this.assessmentFileName = document.getElementById('assessmentFileName');
        
        // 状态元素
        this.tokenStatus = document.getElementById('tokenStatus');
        this.excelStatus = document.getElementById('excelStatus');
        this.assessmentStatus = document.getElementById('assessmentStatus');
        
        // 进度元素
        this.excelProgressBar = document.getElementById('excelProgressBar');
        this.excelProgressFill = document.getElementById('excelProgressFill');
        this.excelProgressText = document.getElementById('excelProgressText');
        this.progressBar = document.getElementById('progressBar');
        this.progressFill = document.getElementById('progressFill');
        this.progressText = document.getElementById('progressText');
        
        // CSV显示元素
        this.csvDisplaySection = document.getElementById('csvDisplaySection');
        this.csvFileName = document.getElementById('csvFileName');
        this.subtypeFilter = document.getElementById('subtypeFilter');
        this.refreshCsvBtn = document.getElementById('refreshCsvBtn');
        this.csvTable = document.getElementById('csvTable');
        this.csvTableHead = document.getElementById('csvTableHead');
        this.csvTableBody = document.getElementById('csvTableBody');
        this.csvStats = document.getElementById('csvStats');
        
        // 日志元素
        this.logToggle = document.getElementById('logToggle');
        this.logPanel = document.getElementById('logPanel');
        this.logContent = document.getElementById('logContent');
        this.closeLog = document.getElementById('closeLog');
        
        this.logPanelOpen = false;
        this.eventSource = null;
    }

    initEventListeners() {
        // 文件选择
        this.excelFileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        
        // 按钮点击
        this.refreshTokenBtn.addEventListener('click', () => this.refreshToken());
        this.processExcelBtn.addEventListener('click', () => this.processExcel());
        this.downloadCsvBtn.addEventListener('click', () => this.downloadCsv());
        this.runAssessmentBtn.addEventListener('click', () => this.runAssessment());
        
        // 日志面板
        this.logToggle.addEventListener('click', () => this.toggleLogPanel());
        this.closeLog.addEventListener('click', () => this.closeLogPanel());
        this.logPanel.addEventListener('click', (e) => {
            if (e.target === this.logPanel) this.closeLogPanel();
        });
        
        // CSV控制
        this.subtypeFilter.addEventListener('change', () => this.filterCsvData());
        this.refreshCsvBtn.addEventListener('click', () => this.refreshCsvData());
        
        // 日志面板拖拽
        this.initLogPanelDrag();
    }

    initSSE() {
        this.eventSource = new EventSource('/api/logs');
        
        this.eventSource.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                
                // 处理进度更新
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
        
        this.eventSource.onerror = () => {
            setTimeout(() => this.initSSE(), 3000);
        };
    }

    handleFileSelect(e) {
        const file = e.target.files[0];
        if (file) {
            this.fileName.textContent = `已选择: ${file.name}`;
            this.processExcelBtn.disabled = false;
            this.processExcelBtn.textContent = '处理Excel';
            this.addLog('info', `文件选择: ${file.name}`);
        } else {
            this.fileName.textContent = '';
            this.processExcelBtn.disabled = true;
        }
    }

    async refreshToken() {
        this.addLog('info', '开始刷新Token...');
        this.showStatus(this.tokenStatus, 'info', '正在刷新Token...');
        this.refreshTokenBtn.disabled = true;
        this.refreshTokenBtn.innerHTML = '<div class="loading"></div>刷新中...';

        try {
            const response = await fetch('/api/refresh-token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });

            const result = await response.json();

            if (result.success) {
                this.showStatus(this.tokenStatus, 'success', '✅ Token刷新成功！');
                this.addLog('success', 'Token刷新成功');
            } else {
                this.showStatus(this.tokenStatus, 'error', `❌ Token刷新失败: ${result.message}`);
                this.addLog('error', `Token刷新失败: ${result.message}`);
            }
        } catch (error) {
            this.showStatus(this.tokenStatus, 'error', `❌ 网络错误: ${error.message}`);
            this.addLog('error', `网络错误: ${error.message}`);
        } finally {
            this.refreshTokenBtn.disabled = false;
            this.refreshTokenBtn.textContent = '刷新Token';
        }
    }

    async processExcel() {
        const file = this.excelFileInput.files[0];
        if (!file) {
            this.showStatus(this.excelStatus, 'error', '❌ 请先选择Excel文件');
            return;
        }

        this.addLog('info', '开始处理Excel...');
        this.showStatus(this.excelStatus, 'info', '正在处理Excel文件...');
        this.processExcelBtn.disabled = true;
        this.processExcelBtn.innerHTML = '<div class="loading"></div>处理中...';
        this.excelProgressBar.style.display = 'block';
        this.excelProgressFill.style.width = '0%';

        const formData = new FormData();
        formData.append('excelFile', file);

        try {
            const response = await fetch('/process-excel', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (result.success) {
                this.showStatus(this.excelStatus, 'success', `✅ Excel处理成功！会话ID: ${result.sessionId}`);
                this.addLog('success', `Excel处理成功，生成 ${result.data.outputRecords} 条记录`);
                
                this.currentSessionId = result.sessionId;
                this.downloadCsvBtn.disabled = false;
                this.processExcelBtn.disabled = true;
                this.processExcelBtn.textContent = '已处理';
                
                this.assessmentFileName.textContent = `已选择: 当前Excel处理结果 (${result.data.outputRecords}条)`;
                this.runAssessmentBtn.disabled = false;
                this.runAssessmentBtn.textContent = '开始评估';
                
                if (result.data.previewData) {
                    this.currentCsvData = result.data.previewData;
                    this.displayCsvData(this.currentCsvData);
                    this.csvDisplaySection.style.display = 'block';
                    this.csvFileName.textContent = `📁 ${result.data.inputFile} 处理结果 (内存数据)`;
                    this.csvFileName.className = 'csv-filename loaded';
                }
                // 隐藏Excel进度条
                setTimeout(() => {
                    this.excelProgressBar.style.display = 'none';
                    this.excelProgressText.style.display = 'none';
                }, 2000);
            } else {
                this.showStatus(this.excelStatus, 'error', `❌ Excel处理失败: ${result.message}`);
                this.addLog('error', `Excel处理失败: ${result.message}`);
            }
        } catch (error) {
            this.showStatus(this.excelStatus, 'error', `❌ 网络错误: ${error.message}`);
            this.addLog('error', `网络错误: ${error.message}`);
        } finally {
            if (this.processExcelBtn.textContent.includes('处理中')) {
                this.processExcelBtn.disabled = false;
                this.processExcelBtn.textContent = '处理Excel';
            }
            // 保持进度显示
            setTimeout(() => {
                this.excelProgressBar.style.display = 'none';
                this.excelProgressText.style.display = 'none';
            }, 3000);
        }
    }

    async downloadCsv() {
        if (!this.currentSessionId) {
            this.addLog('error', '没有可下载的数据，请先处理Excel文件');
            return;
        }

        try {
            this.addLog('info', '开始下载CSV文件...');
            const url = `/download-csv/${this.currentSessionId}`;
            
            const link = document.createElement('a');
            link.href = url;
            link.download = '';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            this.addLog('success', 'CSV文件下载开始');
        } catch (error) {
            this.addLog('error', `下载失败: ${error.message}`);
        }
    }

    async runAssessment() {
        if (!this.currentSessionId) {
            this.addLog('error', '请先完成第2步Excel处理');
            return;
        }

        this.addLog('info', '开始执行评估...');
        this.showStatus(this.assessmentStatus, 'info', '正在执行评估...');
        this.runAssessmentBtn.disabled = true;
        this.runAssessmentBtn.innerHTML = '<div class="loading"></div>评估中...';
        this.progressBar.style.display = 'block';
        this.progressFill.style.width = '0%';
        this.progressText.style.display = 'block';
        this.progressText.textContent = '进度: 0/0';

        try {
            const response = await fetch('/api/run-assessment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ csvFile: `session:${this.currentSessionId}` })
            });

            const result = await response.json();

            if (result.success) {
                this.addLog('success', '评估完成！');
                this.showStatus(this.assessmentStatus, 'success', '✅ 评估完成');
                this.progressFill.style.width = '100%';
                
                setTimeout(() => {
                    this.previewSessionData(this.currentSessionId);
                    this.addLog('info', '评估结果预览已刷新');
                }, 1000);
            } else {
                this.addLog('error', '评估失败: ' + result.message);
                this.showStatus(this.assessmentStatus, 'error', '❌ 评估失败');
            }
        } catch (error) {
            this.addLog('error', '评估请求失败: ' + error.message);
            this.showStatus(this.assessmentStatus, 'error', '❌ 评估请求失败');
        } finally {
            this.runAssessmentBtn.disabled = false;
            this.runAssessmentBtn.textContent = '开始评估';
            setTimeout(() => {
                this.progressBar.style.display = 'none';
                this.progressText.style.display = 'none';
            }, 2000);
        }
    }

    async previewSessionData(sessionId) {
        try {
            const response = await fetch(`/api/preview/${sessionId}`);
            const result = await response.json();
            
            if (result.success && result.data) {
                this.currentCsvData = result.data;
                this.displayCsvData(this.currentCsvData);
                this.csvDisplaySection.style.display = 'block';
                this.csvFileName.textContent = `📁 会话数据预览`;
                this.csvFileName.className = 'csv-filename loaded';
            }
        } catch (error) {
            console.error('预览会话数据失败:', error);
        }
    }

    updateProgress(progressMessage) {
        const progressData = JSON.parse(progressMessage);
        this.progressFill.style.width = progressData.percent + '%';
        this.progressText.textContent = `进度: ${progressData.current}/${progressData.total}`;
        this.progressText.style.display = 'block';
    }

    updateExcelProgress(progressMessage) {
        const progressData = JSON.parse(progressMessage);
        this.excelProgressFill.style.width = progressData.percent + '%';
        this.excelProgressText.textContent = `进度: ${progressData.current}/${progressData.total}`;
        this.excelProgressText.style.display = 'block';
        this.excelProgressBar.style.display = 'block';
    }

    displayCsvData(data) {
        if (!data || data.length === 0) {
            this.csvTableBody.innerHTML = '<tr><td colspan="100%">暂无数据</td></tr>';
            this.csvStats.innerHTML = '暂无数据';
            return;
        }

        const filterValue = this.subtypeFilter.value;
        let filteredData = data;
        
        if (filterValue !== 'all') {
            filteredData = data.filter(row => row.block_subtype === filterValue);
        }

        // 创建表头
        if (data.length > 0) {
            const columns = Object.keys(data[0]);
            this.csvTableHead.innerHTML = `
                <tr>
                    ${columns.map(col => {
                        const width = this.getColumnWidth(col);
                        const isSortable = this.isSortableColumn(col);
                        return `
                            <th class="${isSortable ? 'sortable' : ''}" data-column="${col}" data-sort="none" style="width: ${width}px;">
                                ${col}
                            </th>
                        `;
                    }).join('')}
                </tr>
            `;
            
            // 添加排序事件监听器
            this.initColumnSorting();
        }

        // 创建表格内容
        this.renderTableBody(filteredData);

        this.updateCsvStats(data, filteredData);
    }

    updateCsvStats(allData, filteredData) {
        const totalRows = allData.length;
        const filteredRows = filteredData.length;
        const answerRows = filteredData.filter(row => row.block_type === 'answer').length;
        const textReplyRows = filteredData.filter(row => row.block_subtype === '文本回复').length;
        
        const evaluatedRows = filteredData.filter(row => 
            row['最终准确率_分数'] && row['专业度_分数'] && row['语气合理_分数']
        ).length;
        
        const scores = { accuracy: [], professionalism: [], tone: [] };
        
        filteredData.forEach(row => {
            if (row['最终准确率_分数']) scores.accuracy.push(parseFloat(row['最终准确率_分数']));
            if (row['专业度_分数']) scores.professionalism.push(parseFloat(row['专业度_分数']));
            if (row['语气合理_分数']) scores.tone.push(parseFloat(row['语气合理_分数']));
        });
        
        const avgAccuracy = scores.accuracy.length ? (scores.accuracy.reduce((a, b) => a + b, 0) / scores.accuracy.length).toFixed(2) : 'N/A';
        const avgProfessionalism = scores.professionalism.length ? (scores.professionalism.reduce((a, b) => a + b, 0) / scores.professionalism.length).toFixed(2) : 'N/A';
        const avgTone = scores.tone.length ? (scores.tone.reduce((a, b) => a + b, 0) / scores.tone.length).toFixed(2) : 'N/A';
        
        this.csvStats.innerHTML = `
            <strong>数据统计 (内存数据源):</strong> 
            总行数: ${totalRows} | 
            显示行数: ${filteredRows} | 
            回答类型: ${answerRows} | 
            文本回复: ${textReplyRows} | 
            已评估: ${evaluatedRows}/${answerRows} | 
            <strong>平均分数:</strong> 
            准确率: ${avgAccuracy} | 
            专业度: ${avgProfessionalism} | 
            语气: ${avgTone} | 
            <strong>数据源:</strong> 内存存储
        `;
    }

    filterCsvData() {
        if (this.currentCsvData) {
            this.displayCsvData(this.currentCsvData);
        }
    }

    refreshCsvData() {
        if (this.currentCsvData) {
            this.displayCsvData(this.currentCsvData);
            this.addLog('info', '刷新内存数据预览');
        }
    }

    toggleLogPanel() {
        this.logPanelOpen = !this.logPanelOpen;
        this.logPanel.style.display = this.logPanelOpen ? 'flex' : 'none';
    }

    closeLogPanel() {
        this.logPanelOpen = false;
        this.logPanel.style.display = 'none';
    }

    addLog(type, message) {
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

    isSortableColumn(columnName) {
        const sortableColumns = [
            'block_start',
            'block_end', 
            '最终准确率_分数',
            '专业度_分数',
            '语气合理_分数'
        ];
        return sortableColumns.includes(columnName);
    }

    getColumnWidth(columnName) {
        const widthMap = {
            'question_id': 40,
            'question_type': 60,
            'question_text': 220,
            'context': 150,
            'chatid': 50,
            'block_type': 50,
            'block_subtype': 80,
            'block_result': 500,
            'block_start': 55,
            'block_end': 55,
            '最终准确率_分数': 80,
            '最终准确率_理由': 150,
            '专业度_分数': 80,
            '专业度_理由': 150,
            '语气合理_分数': 80,
            '语气合理_理由': 150
        };
        return widthMap[columnName] || 150;
    }

    initColumnSorting() {
        const sortableHeaders = this.csvTableHead.querySelectorAll('th.sortable');
        
        sortableHeaders.forEach(header => {
            header.addEventListener('click', () => {
                const columnName = header.dataset.column;
                const currentSort = header.dataset.sort;
                
                // 清除其他列的排序状态
                sortableHeaders.forEach(h => {
                    if (h !== header) {
                        h.dataset.sort = 'none';
                        h.classList.remove('sort-asc', 'sort-desc');
                    }
                });
                
                // 切换当前列的排序状态
                let newSort;
                if (currentSort === 'none' || currentSort === 'desc') {
                    newSort = 'asc';
                } else {
                    newSort = 'desc';
                }
                
                header.dataset.sort = newSort;
                header.classList.remove('sort-asc', 'sort-desc');
                header.classList.add(`sort-${newSort}`);
                
                // 执行排序
                this.sortTableData(columnName, newSort);
            });
        });
    }

    sortTableData(columnName, direction) {
        if (!this.currentCsvData || this.currentCsvData.length === 0) return;
        
        const filterValue = this.subtypeFilter.value;
        let filteredData = [...this.currentCsvData];
        
        if (filterValue !== 'all') {
            filteredData = this.currentCsvData.filter(row => row.block_subtype === filterValue);
        }
        
        // 排序数据
        filteredData.sort((a, b) => {
            let valueA = a[columnName];
            let valueB = b[columnName];
            
            // 处理数值类型
            if (columnName === 'block_start' || columnName === 'block_end' || 
                columnName.includes('_分数')) {
                valueA = parseFloat(valueA) || 0;
                valueB = parseFloat(valueB) || 0;
            }
            
            // 处理空值
            if (valueA === null || valueA === undefined || valueA === '') valueA = direction === 'asc' ? Infinity : -Infinity;
            if (valueB === null || valueB === undefined || valueB === '') valueB = direction === 'asc' ? Infinity : -Infinity;
            
            if (direction === 'asc') {
                return valueA < valueB ? -1 : valueA > valueB ? 1 : 0;
            } else {
                return valueA > valueB ? -1 : valueA < valueB ? 1 : 0;
            }
        });
        
        // 重新渲染表格内容
        this.renderTableBody(filteredData);
        this.updateCsvStats(this.currentCsvData, filteredData);
    }

    renderTableBody(data) {
        this.csvTableBody.innerHTML = data.map(row => {
            const cells = Object.keys(row).map(key => {
                let value = row[key] || '';
                let cellClass = '';
                
                if (key.includes('_分数') && value) {
                    cellClass = `score-cell score-${value}`;
                } else if ((key === 'block_start' || key === 'block_end') && value) {
                    cellClass = 'score-cell';
                }
                
                if (typeof value === 'string') {
                    value = value.replace(/\\n/g, '<br>');
                    
                    if (key === 'block_result' || key.includes('_理由')) {
                        return `<td class="${cellClass}"><div class="text-adaptive">${value}</div></td>`;
                    }
                }
                
                return `<td class="${cellClass}">${value}</td>`;
            }).join('');
            
            return `<tr>${cells}</tr>`;
        }).join('');
    }

    initLogPanelDrag() {
        let isDragging = false;
        let startX, startY, startLeft, startTop;
        
        this.logPanel.querySelector('.log-header').addEventListener('mousedown', (e) => {
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
    new AssessmentApp();
});