let statisticsChart = null;

// 初始化统计分析页面
function initStatistics() {
    // 设置默认日期为最近一个月（包含当天）
    const now = new Date();
    const endDate = new Date(now); // 当天
    const startDate = new Date(now);
    startDate.setDate(now.getDate() - 30); // 往前推30天
    
    document.getElementById('statsStartDate').value = startDate.toISOString().split('T')[0];
    document.getElementById('statsEndDate').value = endDate.toISOString().split('T')[0];
    
    // 自动加载当前月数据
    loadStatistics();
}

// 加载统计数据
async function loadStatistics() {
    const startDate = document.getElementById('statsStartDate').value;
    const endDate = document.getElementById('statsEndDate').value;
    const statusDiv = document.getElementById('statisticsStatus');
    
    if (!startDate || !endDate) {
        showStatus('请选择日期范围', 'error');
        return;
    }
    
    if (new Date(startDate) > new Date(endDate)) {
        showStatus('开始日期不能晚于结束日期', 'error');
        return;
    }
    
    try {
        showStatus('正在加载统计数据...', 'info');
        
        const accessKey = localStorage.getItem('access_key');
        if (!accessKey) {
            throw new Error('未找到访问密钥，请刷新页面重新验证');
        }
        
        const response = await fetch(`/api/statistics/daily-stats?startDate=${startDate}&endDate=${endDate}`, {
            headers: {
                'x-access-key': accessKey
            }
        });
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.error || '获取统计数据失败');
        }
        
        if (!result.data || result.data.length === 0) {
            showStatus('所选日期范围内没有数据', 'info');
            clearChart();
            return;
        }
        
        renderChart(result.data);
        showStatus(`成功加载 ${result.data.length} 天的统计数据`, 'success');
        
    } catch (error) {
        console.error('加载统计数据失败:', error);
        showStatus(`加载失败: ${error.message}`, 'error');
        clearChart();
    }
}

// 渲染图表
function renderChart(data) {
    const ctx = document.getElementById('statisticsChart').getContext('2d');
    
    // 销毁现有图表
    if (statisticsChart) {
        statisticsChart.destroy();
    }
    
    // 准备数据
    const labels = data.map(item => item.日期);
    const tokenDurations = data.map(item => parseFloat(item.首TOKEN时长) || 0);
    const accuracyScores = data.map(item => parseFloat(item.准确率) || 0);
    const professionalismScores = data.map(item => parseFloat(item.专业度) || 0);
    const toneScores = data.map(item => parseFloat(item.语气合理) || 0);
    
    // 计算评估分数的动态范围
    const allScores = [...accuracyScores, ...professionalismScores, ...toneScores].filter(score => score > 0);
    const minScore = Math.min(...allScores);
    const maxScore = Math.max(...allScores);
    const padding = (maxScore - minScore) * 0.1; // 10%的边距
    const yMin = Math.max(0, minScore - padding);
    const yMax = Math.min(100, maxScore + padding);
    
    statisticsChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    type: 'bar',
                    label: '首TOKEN时长 (秒)',
                    data: tokenDurations,
                    backgroundColor: 'rgba(102, 126, 234, 0.6)',
                    borderColor: 'rgba(102, 126, 234, 1)',
                    borderWidth: 1,
                    yAxisID: 'y'
                },
                {
                    type: 'line',
                    label: '准确率',
                    data: accuracyScores,
                    borderColor: 'rgba(40, 167, 69, 1)',
                    backgroundColor: 'rgba(40, 167, 69, 0.1)',
                    borderWidth: 4,
                    fill: false,
                    tension: 0.4,
                    yAxisID: 'y1'
                },
                {
                    type: 'line',
                    label: '专业度',
                    data: professionalismScores,
                    borderColor: 'rgba(255, 193, 7, 1)',
                    backgroundColor: 'rgba(255, 193, 7, 0.1)',
                    borderWidth: 2,
                    fill: false,
                    tension: 0.4,
                    yAxisID: 'y1'
                },
                {
                    type: 'line',
                    label: '语气合理',
                    data: toneScores,
                    borderColor: 'rgba(220, 53, 69, 1)',
                    backgroundColor: 'rgba(220, 53, 69, 0.1)',
                    borderWidth: 2,
                    fill: false,
                    tension: 0.4,
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: {
                title: {
                    display: true,
                    text: '日度统计分析 - 首TOKEN时长 vs 评估指标',
                    font: {
                        size: 16,
                        weight: 'bold'
                    }
                },
                legend: {
                    display: true,
                    position: 'top'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.dataset.yAxisID === 'y') {
                                label += context.parsed.y.toFixed(3) + '秒';
                            } else {
                                label += context.parsed.y.toFixed(1) + '分';
                            }
                            return label;
                        },
                        afterBody: function(context) {
                            const dataIndex = context[0].dataIndex;
                            const questionCount = data[dataIndex].total_records;
                            return `问题数量: ${questionCount}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    display: true,
                    title: {
                        display: true,
                        text: '日期'
                    }
                },
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: {
                        display: true,
                        text: '首TOKEN时长 (秒)',
                        color: 'rgba(102, 126, 234, 1)'
                    },
                    ticks: {
                        callback: function(value) {
                            return value.toFixed(2) + 's';
                        }
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: {
                        display: true,
                        text: '评估分数',
                        color: 'rgba(40, 167, 69, 1)'
                    },
                    min: yMin,
                    max: yMax,
                    ticks: {
                        callback: function(value) {
                            return value.toFixed(1) + '分';
                        }
                    },
                    grid: {
                        drawOnChartArea: false,
                    },
                }
            }
        }
    });
}

// 清空图表
function clearChart() {
    if (statisticsChart) {
        statisticsChart.destroy();
        statisticsChart = null;
    }
}

// 显示状态信息
function showStatus(message, type) {
    const statusDiv = document.getElementById('statisticsStatus');
    statusDiv.textContent = message;
    statusDiv.className = `status ${type}`;
    statusDiv.style.display = 'block';
    
    if (type === 'success') {
        setTimeout(() => {
            statusDiv.style.display = 'none';
        }, 3000);
    }
}

// 统计分析功能已集成到navigation.js中