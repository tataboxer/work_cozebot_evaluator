// 前端数据管理器 - 支持Vercel无状态架构
class DataManager {
    constructor() {
        this.currentData = null;
        this.sessionId = null;
    }
    
    // 存储数据到前端
    setData(data, sessionId = null) {
        this.currentData = data;
        this.sessionId = sessionId;
    }
    
    // 获取当前数据
    getData() {
        return this.currentData;
    }
    
    // 禁用数据恢复
    restoreData() {
        return false;
    }
    
    // 清理数据
    clearData() {
        this.currentData = null;
        this.sessionId = null;
    }
    
    // 前端CSV生成 - 复制服务器端逻辑
    generateCSV() {
        if (!this.currentData || this.currentData.length === 0) {
            throw new Error('没有可导出的数据');
        }
        
        const data = this.currentData;
        const headers = Object.keys(data[0]);
        
        // CSV字段转义函数 - 与服务器端完全一致
        function escapeCSVField(field) {
            if (field === null || field === undefined) return '';
            let str = String(field);
            
            // 关键：换行符转义
            str = str.replace(/\n/g, '\\n').replace(/\r/g, '\\r');
            
            // 处理逗号和引号
            if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                return '"' + str.replace(/"/g, '""') + '"';
            }
            
            return str;
        }
        
        // 生成CSV内容
        const headerRow = headers.map(escapeCSVField).join(',');
        const dataRows = data.map(record => 
            headers.map(header => escapeCSVField(record[header])).join(',')
        );
        
        // 添加BOM确保Excel正确显示中文
        const BOM = '\uFEFF';
        return BOM + [headerRow, ...dataRows].join('\n');
    }
    
    // 前端下载CSV
    downloadCSV(filename = null) {
        try {
            const csv = this.generateCSV();
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.href = url;
            link.download = filename || `assessment_results_${Date.now()}.csv`;
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // 清理Blob URL以释放内存
            setTimeout(() => URL.revokeObjectURL(url), 100);
            
            return true;
        } catch (error) {
            console.error('CSV下载失败:', error);
            throw error;
        }
    }
    
    // 数据统计
    getStats() {
        if (!this.currentData) return null;
        
        const data = this.currentData;
        const total = data.length;
        const evaluated = data.filter(row => 
            row['准确率'] && row['专业度_分数'] && row['语气合理_分数']
        ).length;
        
        // 计算平均分
        const scores = {
            accuracy: data.filter(r => r['准确率']).map(r => parseFloat(r['准确率'])),
            professionalism: data.filter(r => r['专业度_分数']).map(r => parseFloat(r['专业度_分数'])),
            tone: data.filter(r => r['语气合理_分数']).map(r => parseFloat(r['语气合理_分数']))
        };
        
        return {
            total,
            evaluated,
            avgAccuracy: scores.accuracy.length ? (scores.accuracy.reduce((a, b) => a + b, 0) / scores.accuracy.length).toFixed(2) : 'N/A',
            avgProfessionalism: scores.professionalism.length ? (scores.professionalism.reduce((a, b) => a + b, 0) / scores.professionalism.length).toFixed(2) : 'N/A',
            avgTone: scores.tone.length ? (scores.tone.reduce((a, b) => a + b, 0) / scores.tone.length).toFixed(2) : 'N/A'
        };
    }
}

// 导出单例
window.dataManager = new DataManager();