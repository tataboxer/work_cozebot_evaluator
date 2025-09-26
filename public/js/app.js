// 优化版前端应用 - 基于现有Express架构
class OptimizedAssessmentApp {
    constructor() {
        this.initComplete = false;
        this.currentData = null;
        this.isAuthenticated = false;
        this.currentFileName = null;
        
        // 中文表头映射
        this.columnMapping = {
            'question_id': '问题ID',
            'question_type': '问题类型',
            'question_text': '问题内容',
            'context': '上下文',
            'chatid': '对话ID',
            'block_type': '块类型',
            'block_subtype': '块子类型',
            'block_result': '回答内容',
            'block_start': '开始',
            'block_end': '结束',
            'expected_answer': '期望答案',
            '准确率': '准确率',
            '准确率_理由': '准确率理由',
            '专业度': '专业度',
            '专业度_理由': '专业度理由',
            '语气合理': '语气合理',
            '语气合理_理由': '语气合理理由',
            'evaluator_info': '评估器'
        };
        
        // 检查访问权限
        this.checkAccess();
        
        // 快速初始化核心功能
        this.initElements();
        this.initEventListeners();
        
        // 异步初始化非关键功能
        setTimeout(() => {
            this.waitForDependencies();
        }, 100);
    }
    
    initSSE() {
        // 延迟初始SSE连接，并且只在认证后初始化
        setTimeout(() => {
            if (!this.isAuthenticated) {
                return;
            }
            
            try {
                // SSE不能直接设置请求头，所以在URL中传递密钥
                const accessKey = localStorage.getItem('access_key');
                const sseUrl = `/api/logs?accessKey=${encodeURIComponent(accessKey)}`;
                
                this.eventSource = new EventSource(sseUrl);
                
                // 设置连接超时
                const timeout = setTimeout(() => {
                    if (this.eventSource && this.eventSource.readyState === EventSource.CONNECTING) {
                        console.warn('SSE连接超时，关闭连接');
                        this.eventSource.close();
                    }
                }, 3000);
                
                this.eventSource.onopen = () => {
                    clearTimeout(timeout);
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
                };
            } catch (error) {
                console.error('SSE初始化失败，忽略:', error);
            }
        }, 2000);
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
        
        // 文件输入
        this.excelFileInput = document.getElementById('excelFile');
        this.fileName = document.getElementById('fileName');
        
        // 状态显示
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
        
        // SSE将在认证成功后初始化
    }

    initEventListeners() {
        if (this.excelFileInput) {
            this.excelFileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        }
        if (this.processExcelBtn) {
            this.processExcelBtn.addEventListener('click', () => this.processExcel());
        }
        if (this.runAssessmentBtn) {
            this.runAssessmentBtn.addEventListener('click', () => this.runAssessment());
        }

        if (this.subtypeFilter) {
            this.subtypeFilter.addEventListener('change', () => this.filterData());
        }
        if (this.questionTypeFilter) {
            this.questionTypeFilter.addEventListener('change', () => this.filterData());
        }
    }
    
    initLogPanelEvents() {
        // 重新获取日志面板元素
        this.logPanel = document.getElementById('logPanel');
        this.logContent = document.getElementById('logContent');
        
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
            // 存储文件名（去掉扩展名）
            this.currentFileName = file.name.replace(/\.[^/.]+$/, '');
        } else {
            this.fileName.textContent = '';
            this.processExcelBtn.disabled = true;
            this.currentFileName = null;
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
                headers: {
                    'X-Access-Key': localStorage.getItem('access_key')
                },
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
                headers: { 
                    'Content-Type': 'application/json',
                    'X-Access-Key': localStorage.getItem('access_key')
                },
                body: JSON.stringify({ 
                    data: this.currentData,
                    fileName: this.currentFileName 
                })
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





    refreshUI() {
        if (!this.currentData || this.currentData.length === 0) {
            this.csvDisplaySection.style.display = 'none';
            return;
        }

        this.displayData(this.currentData);
        this.csvDisplaySection.style.display = 'block';
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
            '准确率', '准确率_理由', '专业度', '专业度_理由', '语气合理', '语气合理_理由',
            'question_id', 'question_type', 'chatid', 'block_type', 'block_subtype', 'evaluator_info'
        ];
        
        // 获取所有列，按顺序排列，排除不需要显示的列
        const excludeColumns = ['evaluator_version_id'];
        const allColumns = Object.keys(data[0]).filter(col => !excludeColumns.includes(col));
        const orderedColumns = columnOrder.filter(col => allColumns.includes(col));
        const remainingColumns = allColumns.filter(col => !columnOrder.includes(col));
        const columns = [...orderedColumns, ...remainingColumns];

        this.csvTableHead.innerHTML = `
            <tr>
                ${columns.map(col => {
                    const width = this.getColumnWidth(col);
                    const isSortable = this.isSortableColumn(col);
                    const displayName = this.columnMapping[col] || col;
                    return `
                        <th class="${isSortable ? 'sortable' : ''}" data-column="${col}" data-sort="none" style="width: ${width}px;">
                            ${displayName}
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
            '语气合理'
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
                columnName === '准确率' || columnName === '专业度' || columnName === '语气合理' || columnName.includes('_分数')) {
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
            '语气合理', '语气合理_理由',
            'question_id', 'question_type', 'chatid', 'block_type', 'block_subtype', 'evaluator_info'
        ];
        
        this.csvTableBody.innerHTML = data.slice(0, 100).map(row => {
            const excludeColumns = ['evaluator_version_id'];
            const allColumns = Object.keys(row).filter(col => !excludeColumns.includes(col));
            const orderedColumns = columnOrder.filter(col => allColumns.includes(col));
            const remainingColumns = allColumns.filter(col => !columnOrder.includes(col));
            const columns = [...orderedColumns, ...remainingColumns];
            
            const cells = columns.map(key => {
                let value = row[key] || '';
                let cellClass = '';
                const originalValue = String(value);
                const tooltipText = originalValue.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
                
                if ((key === '准确率' || key === '专业度' || key === '语气合理' || key.includes('_分数')) && value) {
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
        // 使用统一的统计计算模块
        const stats = window.StatisticsUtils.calculateStatistics(filteredData);
        
        this.csvStats.innerHTML = window.StatisticsUtils.generateStatsHTML({
            ...stats,
            totalRows: allData.length,
            filteredRows: filteredData.length
        });
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

    // 访问权限管理
    checkAccess() {
        // 测试localStorage是否可用
        try {
            localStorage.setItem('test', 'test');
            localStorage.removeItem('test');
        } catch (e) {
            console.error('localStorage不可用:', e);
            alert('localStorage不可用，请检查浏览器设置');
            return;
        }
        
        const savedKey = localStorage.getItem('access_key');
        
        if (savedKey) {
            this.isAuthenticated = true;
            this.showMainApp();
        } else {
            this.showAccessModal();
        }
    }

    showAccessModal() {
        const accessModal = document.getElementById('accessModal');
        const accessInput = document.getElementById('accessInput');
        
        if (accessModal) {
            accessModal.style.display = 'flex';
        }
        
        if (accessInput) {
            accessInput.value = '';
            setTimeout(() => accessInput.focus(), 100);
        }
    }

    async verifyAccess() {
        const accessInput = document.getElementById('accessInput');
        const submitBtn = document.getElementById('submitAccessBtn');
        
        if (!accessInput || !accessInput.value.trim()) {
            this.showAccessError('请输入访问密钥');
            return;
        }
        
        const inputKey = accessInput.value.trim();
        
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = '验证中...';
        }
        
        try {
            const response = await fetch('/api/verify-access', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ key: inputKey })
            });
            
            const result = await response.json();
            
            if (result.success) {
                localStorage.setItem('access_key', inputKey);
                this.isAuthenticated = true;
                this.hideAccessModal();
                this.showMainApp();
            } else {
                this.showAccessError('访问密钥错误');
            }
        } catch (error) {
            this.showAccessError('验证失败，请重试');
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = '验证';
            }
        }
    }

    showAccessError(message) {
        const accessError = document.getElementById('accessError');
        if (accessError) {
            accessError.textContent = message;
            accessError.style.display = 'block';
            setTimeout(() => {
                accessError.style.display = 'none';
            }, 3000);
        }
    }

    hideAccessModal() {
        const accessModal = document.getElementById('accessModal');
        if (accessModal) {
            accessModal.style.display = 'none';
        }
    }

    showMainApp() {
        const mainContainer = document.getElementById('mainContainer');
        if (mainContainer) {
            mainContainer.style.display = 'block';
        }
        
        // 认证成功后初始化SSE
        this.initSSE();
        
        // 初始化日志面板事件
        this.initLogPanelEvents();
    }

}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    window.app = new OptimizedAssessmentApp();
});