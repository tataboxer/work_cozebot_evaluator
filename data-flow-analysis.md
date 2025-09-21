# 🔍 数据流和换行符处理分析

## 📊 完整数据流向分析

### 1. **Excel输入 → Coze处理流程**

#### 1.1 Excel解析 (`routes/process-excel.js`)
```javascript
// 解析Excel文件
const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
const jsonData = xlsx.utils.sheet_to_json(worksheet);
// 数据格式: [{question_id, question_type, question_text, context}, ...]
```

#### 1.2 Coze API调用 (`lib/coze-client.js`)
```javascript
// 调用coze-bot-core.js处理每个问题
const result = await callCozeAPI(questionText, contextData);
// 返回原始输出字符串，包含换行符
```

#### 1.3 Coze输出解析 (`coze-bot-core.js`)
```javascript
// 在coze-bot-core.js中，内容直接从API获取
messageContents.set(eventData.id, eventData.content);
// 保持原始换行符 \n
```

#### 1.4 解析Bot输出 (`lib/coze-client.js`)
```javascript
// 解析多行内容时使用标准换行符
currentSegment.block_result = contentLines.join('\n');
// 关键：使用 \n 连接多行内容
```

### 2. **内存存储阶段**

#### 2.1 存储到内存 (`routes/process-excel.js`)
```javascript
// 存储处理结果到内存
memoryStore.updateSession(sessionId, {
  processedData: processedResults, // 包含block_result字段，内容有\n换行符
});
```

#### 2.2 内存数据结构
```javascript
// 每条记录格式:
{
  question_id: "Q001",
  question_text: "问题内容",
  block_result: "回复内容\n可能包含\n多行文本", // 保持\n换行符
  context: "[{\"role\":\"user\",\"content\":\"上下文\"}]", // JSON字符串
  // ... 其他字段
}
```

### 3. **评估处理流程**

#### 3.1 从内存读取 (`routes/run-assessment.js`)
```javascript
const session = memoryStore.getSession(sessionId);
const data = [...session.processedData]; // 复制数据，保持原始换行符
```

#### 3.2 LLM评估 (`lib/llm-client.js`)
```javascript
// 构建prompt时，直接使用原始内容
const prompt = `助手回复: ${answer}`; // answer包含\n换行符
// LLM API接收到的是原始换行符格式
```

#### 3.3 评估结果存储
```javascript
// 评估结果直接存储到数据中
dataRow['准确率_理由'] = result.evaluation['准确率']['理由'];
// 评估理由可能也包含换行符
```

### 4. **前端数据处理 (`public/js/app.js`)**

#### 4.1 前端数据存储
```javascript
// processExcel()方法中存储数据
if (result.data.previewData) {
    this.currentCsvData = result.data.previewData; // 存储完整数据，包含\n
    this.displayCsvData(this.currentCsvData);
}
```

#### 4.2 前端数据显示处理
```javascript
// renderTableBody()方法中的换行符处理
if (typeof value === 'string') {
    value = value.replace(/\\n/g, '<br>'); // 将\\n转换为<br>显示
    
    if (key === 'block_result' || key.includes('_理由')) {
        return `<td class="${cellClass}"><div class="text-adaptive">${value}</div></td>`;
    }
}
```

#### 4.3 前端下载处理
```javascript
// downloadCsv()方法 - 当前使用服务器下载
async downloadCsv() {
    const url = `/download-csv/${this.currentSessionId}`; // 调用服务器API
    const link = document.createElement('a');
    link.href = url;
    link.click(); // 服务器生成CSV
}
```

### 5. **CSV下载处理**

#### 5.1 CSV生成 (`routes/download-csv.js`)
```javascript
function escapeCSVField(field) {
  let str = String(field);
  
  // 关键处理：将换行符转义为字符串表示
  str = str.replace(/\n/g, '\\n').replace(/\r/g, '\\r');
  
  // 处理逗号和引号
  if (str.includes(',') || str.includes('"')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  
  return str;
}
```

#### 5.2 CSV文件格式
```csv
question_id,block_result,准确率_理由
Q001,"回复内容\n包含换行符","评估理由\n可能多行"
```

## 🔄 换行符处理关键点

### ✅ **正确的换行符流向**

1. **Coze API输出** → 原始 `\n` 换行符
2. **内存存储** → 保持 `\n` 换行符  
3. **前端接收** → 保持 `\n` 换行符
4. **前端显示** → `\\n` → `<br>` (已实现)
5. **LLM评估** → 接收 `\n` 换行符
6. **CSV导出** → 转义为 `\\n` 字符串 (需实现)

### 🚨 **关键转换点**

#### 转换点1: Coze输出解析
```javascript
// lib/coze-client.js:parseBotOutput()
currentSegment.block_result = contentLines.join('\n');
// 使用标准\n连接多行内容
```

#### 转换点2: 前端显示转换
```javascript
// public/js/app.js:renderTableBody()
value = value.replace(/\\n/g, '<br>'); 
// 将\\n转换为<br>用于HTML显示
```

#### 转换点3: CSV导出转义
```javascript
// routes/download-csv.js:escapeCSVField() (服务器端)
str = str.replace(/\n/g, '\\n').replace(/\r/g, '\\r');
// 将\n转义为\\n字符串，保持CSV格式正确

// 前端需要实现相同逻辑
str = str.replace(/\n/g, '\\n').replace(/\r/g, '\\r');
```

## 📋 前端数据管理改造影响

### 🔄 **改造后的数据流**

#### 新流程1: Excel处理API
```javascript
// /api/process-excel.js (新)
export default async function handler(req, res) {
  // 1. 解析Excel
  // 2. 调用Coze API (保持原有逻辑)
  // 3. 直接返回完整数据 (包含\n换行符)
  return res.json({
    success: true,
    data: processedResults // 包含原始换行符的完整数据
  });
}
```

#### 新流程2: 前端数据存储
```javascript
// 前端接收并存储数据 (基于现有app.js逻辑)
const result = await fetch('/api/process-excel');
const data = await result.json();
this.currentData = data.data; // 替代currentCsvData，前端存储完整数据
```

#### 新流程3: 评估API
```javascript
// /api/run-assessment.js (新)
export default async function handler(req, res) {
  const { data } = req.body; // 接收前端数据，包含换行符
  // LLM评估逻辑保持不变
  return res.json({ success: true, data: assessedData });
}
```

#### 新流程4: 前端CSV下载
```javascript
// 前端生成CSV
downloadCsv() {
  const csv = this.convertToCSV(this.currentData);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `results_${Date.now()}.csv`;
  link.click();
}

convertToCSV(data) {
  // 必须复制routes/download-csv.js的escapeCSVField逻辑
  function escapeCSVField(field) {
    if (field === null || field === undefined) return '';
    let str = String(field);
    
    // 关键：与服务器端完全一致的换行符转义
    str = str.replace(/\n/g, '\\n').replace(/\r/g, '\\r');
    
    if (str.includes(',') || str.includes('"')) {
      return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
  }
  
  // 生成CSV内容
  const headers = Object.keys(data[0]);
  const headerRow = headers.map(escapeCSVField).join(',');
  const dataRows = data.map(record => 
    headers.map(header => escapeCSVField(record[header])).join(',')
  );
  
  // 添加BOM确保Excel正确显示中文
  const BOM = '\uFEFF';
  return BOM + [headerRow, ...dataRows].join('\n');
}
```

## ⚠️ **改造注意事项**

### 1. **换行符处理一致性 (关键)**
- 前端CSV生成必须**完全复制** `routes/download-csv.js` 的 `escapeCSVField` 函数
- 确保 `\n` → `\\n` 转义规则**完全一致**
- 前端显示时：`\\n` → `<br>` (已实现)
- CSV导出时：`\n` → `\\n` (需要实现)

### 2. **前端数据显示处理**
- 当前前端已正确处理显示：`value.replace(/\\n/g, '<br>')`
- 这说明数据中的换行符已经是 `\\n` 格式
- 前端CSV生成时需要保持这个格式

### 3. **数据完整性**
- 前端存储的数据结构必须与原内存存储一致
- 所有字段都要保持，包括时间戳等
- `currentCsvData` 变量存储完整数据

### 4. **上下文数据处理**
- Context字段是JSON字符串格式
- 需要保持JSON解析逻辑一致

### 5. **错误处理**
- API超时、网络错误的处理
- 大文件处理的内存限制
- 前端内存管理（大数据集）

## 🎯 **改造重点**

1. **保持换行符处理逻辑不变**
2. **复制CSV转义函数到前端** - 必须与 `routes/download-csv.js` 完全一致
3. **确保数据结构完全一致** - `currentCsvData` 存储格式
4. **测试多行文本的完整流程**
5. **前端数据管理** - 使用 `this.currentData` 替代 `this.currentCsvData`

## 🔍 **关键发现**

### 前端已有的换行符处理
```javascript
// 前端显示时已正确处理
value = value.replace(/\\n/g, '<br>'); // \\n → <br>
```

### 需要添加的CSV生成逻辑
```javascript
// 必须添加与服务器端一致的转义
str = str.replace(/\n/g, '\\n').replace(/\r/g, '\\r');
```

---

**结论**: 换行符处理是整个系统的关键环节。前端已正确处理显示逻辑，但缺少CSV生成的转义逻辑。改造时必须确保前端CSV生成与 `routes/download-csv.js` 的 `escapeCSVField` 函数**完全一致**。