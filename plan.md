# 🚀 Vercel部署改造计划 (前端数据管理方案)

## 📋 项目概述

将现有的苏州科技馆AI助手评估平台改造为无状态架构，以支持Vercel部署。

### 🎯 核心改动
- **前端数据管理**: API返回完整数据，前端存储和管理
- **移除内存存储**: 服务器完全无状态
- **保持UI不变**: 3步骤流程保持，仅改造数据流

---

## 🎨 UI设计方案

### 保持现有3步骤布局
- **步骤1**: 刷新Token (无变化)
- **步骤2**: 上传Excel处理 (返回完整数据)
- **步骤3**: 执行评估 (基于前端数据)
- **预览区**: 显示和下载 (基于前端数据)

**UI完全不变，仅改造数据流向**

---

## 🔧 技术架构改造

### 1. API结构调整

#### 改造API路由
```
/api/process-excel.js     # 改造：返回完整数据而非sessionId
/api/run-assessment.js    # 改造：接收前端数据进行评估
/api/refresh-token.js     # 保持不变
```

#### 移除的文件
```
/lib/memory-store.js      # 移除内存存储
/routes/download-csv.js   # 改为前端下载
/routes/preview-data.js   # 改为前端预览
/server.js               # 改为Vercel Functions
```

### 2. 核心API设计

```javascript
// /api/process-excel.js (改造)
export default async function handler(req, res) {
  try {
    // 1. 解析Excel文件
    const excelData = parseExcel(req.body);
    
    // 2. 并发调用Coze API
    const cozeResults = await Promise.all(
      excelData.map(item => callCozeAPI(item))
    );
    
    // 3. 返回完整数据 (不存储到内存)
    return res.json({
      success: true,
      data: cozeResults,
      summary: { total: cozeResults.length }
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}

// /api/run-assessment.js (改造)
export default async function handler(req, res) {
  try {
    // 接收前端传来的数据
    const { data } = req.body;
    
    // 并发调用LLM评估
    const assessedData = await Promise.all(
      data.map(item => callLLMAssessment(item))
    );
    
    // 返回评估后的完整数据
    return res.json({
      success: true,
      data: assessedData
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}
```

### 3. 前端逻辑重构

```javascript
// 前端数据管理
class AssessmentApp {
  constructor() {
    this.currentData = null; // 存储当前数据
  }
  
  // 步骤2：处理Excel
  async processExcel() {
    const formData = new FormData();
    formData.append('file', this.selectedFile);
    
    const response = await fetch('/api/process-excel', {
      method: 'POST',
      body: formData
    });
    
    const result = await response.json();
    if (result.success) {
      this.currentData = result.data; // 存储到前端
      this.displayCsvData(this.currentData); // 立即预览
      this.runAssessmentBtn.disabled = false; // 启用步骤3
    }
  }
  
  // 步骤3：执行评估
  async runAssessment() {
    const response = await fetch('/api/run-assessment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: this.currentData })
    });
    
    const result = await response.json();
    if (result.success) {
      this.currentData = result.data; // 更新前端数据
      this.displayCsvData(this.currentData); // 刷新预览
    }
  }
  
  // 前端下载
  downloadCsv() {
    const csv = this.convertToCSV(this.currentData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `results_${Date.now()}.csv`;
    link.click();
  }
}
```

---

## 📅 分步实施计划

### 🔥 步骤1：创建Vercel API结构 (15分钟)
- [ ] 创建 `/api` 目录
- [ ] 移植 `/api/refresh-token.js`
- [ ] 创建 `vercel.json` 配置
- **测试点**: Token刷新功能正常

### 🔥 步骤2：改造Excel处理API (30分钟)
- [ ] 创建 `/api/process-excel.js`
- [ ] 移植Excel处理逻辑
- [ ] 移植Coze API调用逻辑
- [ ] 返回完整数据而非sessionId
- **测试点**: Excel上传返回完整JSON数据

### 🔥 步骤3：改造评估API (20分钟)
- [ ] 创建 `/api/run-assessment.js`
- [ ] 移植LLM评估逻辑
- [ ] 接收前端数据进行处理
- **测试点**: 传入数据，返回评估结果

### 🔥 步骤4：前端数据管理改造 (30分钟)
- [ ] 修改 `app.js` 添加 `currentData` 存储
- [ ] 改造 `processExcel()` 方法
- [ ] 改造 `runAssessment()` 方法
- [ ] 改造 `downloadCsv()` 方法
- **测试点**: 完整流程测试

### 🔥 步骤5：清理和部署 (15分钟)
- [ ] 删除 `memory-store.js`
- [ ] 删除 `/routes` 目录
- [ ] 删除 `server.js`
- [ ] 部署到Vercel测试
- **测试点**: Vercel部署成功

---

## 📁 文件变更清单

### 新增文件
```
/api/process-excel.js        # Excel处理API
/api/run-assessment.js       # 评估API
/api/refresh-token.js        # Token刷新API
/vercel.json                 # Vercel配置
```

### 修改文件
```
/public/js/app.js           # 前端数据管理逻辑
/package.json               # 移除Express依赖
```

### 删除文件
```
/lib/memory-store.js         # 内存存储
/routes/                     # 所有路由文件
/server.js                   # Express服务器
```

---

## 🔧 Vercel配置

### vercel.json
```json
{
  "functions": {
    "api/process-complete.js": {
      "maxDuration": 300
    }
  },
  "env": {
    "COZE_API_TOKEN": "@coze_api_token",
    "COZE_BOT_ID": "@coze_bot_id",
    "llm_api_key": "@llm_api_key",
    "llm_url": "@llm_url",
    "llm_model_name": "@llm_model_name"
  }
}
```

### 环境变量设置
```bash
vercel env add COZE_API_TOKEN
vercel env add COZE_BOT_ID  
vercel env add llm_api_key
vercel env add llm_url
vercel env add llm_model_name
```

---

## 🎯 预期效果

### 用户体验
- **保持流程**: 3步骤流程不变
- **即时预览**: 步骤2完成后立即显示数据
- **前端下载**: 无需服务器，直接生成CSV

### 技术优势
- **无状态**: 完全适配Serverless
- **高性能**: 并发处理，速度更快
- **零维护**: 无需服务器管理

### 部署优势
- **全球CDN**: Vercel自动优化
- **自动扩容**: 根据负载自动调整
- **零成本**: 免费额度充足

---

## 🚨 风险评估

### 潜在问题
1. **函数超时**: 大文件可能超过5分钟限制
2. **内存限制**: 1GB内存可能不够大批量处理
3. **并发限制**: API调用频率限制

### 解决方案
1. **分批处理**: 大文件自动分批
2. **流式处理**: 减少内存占用
3. **重试机制**: API失败自动重试

---

## ✅ 验收标准

### 功能验收
- [ ] 上传Excel文件正常
- [ ] Coze API调用成功
- [ ] LLM评估正常工作
- [ ] CSV下载功能正常
- [ ] 进度显示准确

### 性能验收
- [ ] 100条数据 < 2分钟
- [ ] 500条数据 < 5分钟
- [ ] 错误率 < 5%

### 部署验收
- [ ] Vercel部署成功
- [ ] 环境变量配置正确
- [ ] 国内外访问正常

---

**预计总工时**: 2小时
**预计完成时间**: 今天内
**部署平台**: Vercel (免费)

---

## 🚀 开始实施

**准备好了吗？我们从步骤1开始！**

每完成一个步骤，请测试后告诉我结果，然后进行下一步。