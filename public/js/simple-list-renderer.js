// 简单的列表渲染器 - 专门处理电影排期等格式
class SimpleListRenderer {
    render(content) {
        if (!content) return '';
        
        // 转换换行符
        let processed = content.replace(/\\n/g, '\n');
        
        // 按行处理
        const lines = processed.split('\n');
        const result = [];
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const trimmed = line.trim();
            
            if (!trimmed) {
                result.push('<br>');
                continue;
            }
            
            // 检查原始缩进级别
            const originalLine = line;
            const indentLevel = originalLine.length - originalLine.trimStart().length;
            
            // 标准Markdown列表 (- 开头)
            if (trimmed.match(/^-\s+(.+)/)) {
                const content = trimmed.replace(/^-\s+/, '');
                
                // 根据缩进级别决定样式
                if (indentLevel >= 2) {
                    // 二级列表
                    if (content.endsWith('：')) {
                        result.push(`<div style="margin-left: 10px; font-weight: bold;">◦ ${content}</div>`);
                    } else {
                        result.push(`<div style="margin-left: 20px;">▪ ${content}</div>`);
                    }
                } else {
                    // 一级列表
                    if (content.endsWith('：')) {
                        result.push(`<div style="margin-left: 0px; font-weight: bold;">• ${content}</div>`);
                    } else {
                        result.push(`<div style="margin-left: 0px;">• ${content}</div>`);
                    }
                }
            }
            // 普通文本
            else {
                result.push(`<div>${trimmed}</div>`);
            }
        }
        
        return result.join('');
    }
}

window.simpleListRenderer = new SimpleListRenderer();