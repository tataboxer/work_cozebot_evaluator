# 🏛️ 苏州科技馆 AI 助手评估平台

[![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)](https://github.com/your-repo)
[![Node.js](https://img.shields.io/badge/node.js-v18+-green.svg)](https://nodejs.org/)
[![Python](https://img.shields.io/badge/python-3.8+-blue.svg)](https://python.org/)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

> 🤖 **专业的AI助手质量评估与测试平台**  
> 为苏州科技馆数字人助手（趣波QuBoo）提供全面的智能化评估解决方案

## 🎯 项目概述

本平台是一个企业级的AI助手质量评估系统，通过自动化流程对苏州科技馆数字人助手的回复进行多维度质量分析，包括准确性、专业度和语气合理性评估。

### 🌟 核心价值
- **🎯 精准评估**：基于科技馆业务场景的专业评估体系
- **⚡ 高效处理**：支持大批量数据并发处理
- **📊 可视化分析**：直观的数据展示和交互式表格
- **🔄 完整流程**：从数据上传到评估报告的一站式解决方案

## 🚀 核心功能模块

### 📋 1. 智能数据处理引擎 (`data_processor.py`)
```python
🔸 Excel/CSV 批量数据处理
🔸 Coze API 自动化调用
🔸 上下文感知的对话生成
🔸 多线程并发处理 (可配置线程数)
🔸 实时进度追踪与错误恢复
🔸 增量式结果保存到 data/output/ 目录
```

### 🧠 2. AI 质量评估系统 (`assess.py`)
```python
🔸 多LLM平台支持 (火山引擎豆包、ModelScope)
🔸 三维度评估体系：
   ├── 最终准确率 (1-100分)
   ├── 专业度 (1-100分) 
   └── 语气合理性 (1-100分)
🔸 科技馆业务场景深度定制
🔸 智能重试机制与API限流处理
🔸 并发评估处理 (可配置线程数)
```

### 🌐 3. 现代化 Web 管理界面
```javascript
🔸 响应式设计，支持桌面和移动端
🔸 拖拽上传，实时文件处理
🔸 智能工作流引导
🔸 高级数据表格：
   ├── 可拖拽调整列宽
   ├── 多列排序功能 (时间、评分)
   ├── 内容筛选过滤
   ├── 冻结表头
   └── 悬停预览长文本
🔸 实时日志流 (SSE)
🔸 CSV数据实时预览和自动刷新
```

### 🔌 4. 企业级 API 核心 (`coze-bot-core.js`)
```javascript
🔸 Coze API 完整封装
🔸 流式响应处理
🔸 智能上下文管理
🔸 自动令牌刷新 (get-token.js)
🔸 错误处理与重试机制
🔸 性能监控与日志记录
```

## 🛠️ 技术架构

### 前端技术栈
- **原生 JavaScript ES6+** - 现代化前端交互
- **CSS3 + Flexbox** - 响应式布局设计
- **Server-Sent Events (SSE)** - 实时日志推送
- **File API + Drag & Drop** - 现代文件处理

### 后端技术栈
- **Node.js + Express** - 高性能Web服务器
- **Python 3.8+** - 数据处理与AI评估
- **Multer** - 文件上传处理
- **CORS** - 跨域资源共享
- **dotenv** - 环境变量管理

### 数据处理
- **pandas** - 高效数据分析
- **requests** - HTTP客户端
- **concurrent.futures** - 并发处理
- **JSON + CSV** - 数据存储格式

## 📦 快速开始

### 环境要求
```bash
Node.js >= 18.0.0
Python >= 3.8.0
npm >= 8.0.0
```

### 1. 安装依赖
```bash
# 安装 Node.js 依赖
npm install

# 安装 Python 依赖
pip install pandas requests python-dotenv
```

### 2. 配置环境变量
创建 `.env` 文件：
```env
# Coze API配置
COZE_API_TOKEN=your_coze_api_token
COZE_BOT_ID=your_bot_id

# LLM评估配置 (推荐火山引擎豆包)
llm_url=https://ark.cn-beijing.volces.com/api/v3/
llm_api_key=your_volcano_api_key
llm_model_name=doubao-1-5-pro-32k-250115

# 并发配置
DATA_PROCESSOR_THREADS=5
ASSESS_THREADS=5

# 业务系统配置 (可选)
LOGIN_HOST=your_business_system_host
LOGIN_USERNAME=encrypted_username
LOGIN_PASSWORD=encrypted_password
```

### 3. 启动服务
```bash
# 启动Web服务器
npm start

# 访问管理界面
# 本地: http://127.0.0.1:3000
# 局域网: http://your_ip:3000
```

## 📋 使用指南

### 🎯 完整评估流程

#### 步骤1: 准备测试数据
准备包含以下列的Excel文件：
```
question_id    | 问题ID
question_type  | 问题类型  
question_text  | 问题内容
context        | 对话上下文 (JSON格式，可选)
```

#### 步骤2: 数据处理
1. 访问Web界面
2. 上传Excel测试文件
3. 点击"处理Excel" - 自动调用Coze API生成回复
4. 自动预览生成的CSV数据 (保存到 `data/output/`)

#### 步骤3: 质量评估  
1. 自动选择刚生成的CSV文件
2. 点击"开始评估" - 使用LLM进行智能评估
3. 实时查看评估进度和结果

#### 步骤4: 结果分析
- 使用表格排序功能按评分排序
- 拖拽列宽查看详细内容
- 筛选特定类型的回复进行分析
- 导出评估报告

### 🔧 高级配置

#### 并发性能调优
```env
# 数据处理并发数 (建议: CPU核心数)
DATA_PROCESSOR_THREADS=8

# 评估并发数 (建议: 根据API限制调整)
ASSESS_THREADS=3
```

#### LLM平台切换
```env
# 火山引擎豆包 (推荐)
llm_url=https://ark.cn-beijing.volces.com/api/v3/
llm_model_name=doubao-1-5-pro-32k-250115

# ModelScope (备选)
llm_url=https://api-inference.modelscope.cn/v1/
llm_model_name=Qwen/Qwen3-Coder-480B-A35B-Instruct
```

## 📊 数据格式说明

### 输入数据格式 (Excel)
| 列名 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `question_id` | 字符串 | 是 | 问题唯一标识 |
| `question_type` | 字符串 | 否 | 问题分类 |
| `question_text` | 字符串 | 是 | 用户问题内容 |
| `context` | JSON字符串 | 否 | 对话历史上下文 |

### 输出数据格式 (CSV)
原始字段 + 以下AI生成字段：
| 列名 | 类型 | 说明 |
|------|------|------|
| `chatid` | 字符串 | 对话会话ID |
| `block_type` | 字符串 | 回复类型 (answer/function_call等) |
| `block_subtype` | 字符串 | 回复子类型 (文本回复/图片等) |
| `block_result` | 文本 | AI助手的完整回复内容 |
| `block_start` | 数字 | 首token响应时间(秒) |
| `block_end` | 数字 | 完整响应时间(秒) |

评估字段：
| 列名 | 类型 | 说明 |
|------|------|------|
| `最终准确率_分数` | 数字 | 准确性评分 (1-100) |
| `最终准确率_理由` | 文本 | 准确性评估理由 |
| `专业度_分数` | 数字 | 专业度评分 (1-100) |
| `专业度_理由` | 文本 | 专业度评估理由 |
| `语气合理_分数` | 数字 | 语气评分 (1-100) |
| `语气合理_理由` | 文本 | 语气评估理由 |

## 🔒 安全性分析

### ✅ 安全措施
- **环境变量保护**：敏感信息存储在 `.env` 文件中
- **文件类型验证**：严格限制上传文件类型 (.xlsx, .xls, .csv)
- **路径安全**：防止目录遍历攻击
- **输入验证**：对所有用户输入进行验证和清理
- **错误处理**：避免敏感信息泄露
- **CORS配置**：控制跨域访问权限

### ⚠️ 安全建议
1. **API密钥管理**：定期轮换API密钥
2. **网络访问**：建议在内网环境部署
3. **文件权限**：确保 `.env` 文件权限为 600
4. **日志审计**：定期检查访问日志
5. **数据备份**：重要评估数据及时备份

### 🛡️ 已识别风险与缓解
| 风险类型 | 风险等级 | 缓解措施 |
|----------|----------|----------|
| API密钥泄露 | 中 | 环境变量 + .gitignore |
| 文件上传攻击 | 低 | 类型白名单 + 大小限制 |
| 路径遍历 | 低 | 路径规范化 + 访问控制 |
| DoS攻击 | 低 | 文件大小限制 + 并发控制 |

## 📈 性能指标

### 处理能力
- **Excel处理**：~100-500 问题/分钟 (取决于Coze API响应)
- **质量评估**：~50-200 回复/分钟 (取决于LLM API响应)  
- **并发支持**：最大10个并发线程
- **文件支持**：最大100MB Excel文件

### 系统要求
- **内存**：建议 4GB+ RAM
- **存储**：建议 10GB+ 可用空间
- **网络**：稳定的外网连接 (API调用)
- **浏览器**：Chrome 90+, Firefox 88+, Safari 14+

## 🗂️ 项目结构

```
agent-assessment/
├── 📄 server.js              # Express服务器主文件
├── 🐍 data_processor.py      # Excel数据处理引擎
├── 🧠 assess.py              # AI质量评估系统
├── 🔌 coze-bot-core.js       # Coze API核心模块
├── 🔑 get-token.js           # 自动令牌刷新
├── ⚙️ .env                   # 环境配置文件
├── 📦 package.json           # Node.js依赖配置
├── 📋 README.md              # 项目文档
├── 📁 public/
│   └── 🌐 index.html         # Web管理界面
└── 📁 data/
    ├── 📂 output/            # 处理结果输出目录
    └── 📄 .gitkeep           # Git目录占位符
 ```

## 🤝 开发指南

### 代码规范
- **JavaScript**：ES6+ 语法，async/await 异步处理
- **Python**：PEP 8 代码风格，类型注释
- **HTML/CSS**：语义化标签，响应式设计
- **注释**：中英文混合，关键逻辑必须注释

### 扩展开发
```javascript
// 添加新的LLM平台支持
function callCustomLLM(prompt, config) {
    // 实现自定义LLM调用逻辑
}

// 添加新的评估维度
const evaluationCriteria = {
    accuracy: "准确性评估",
    professionalism: "专业度评估", 
    tone: "语气评估",
    newCriterion: "新增评估维度"  // <-- 在这里扩展
};
```

## 📞 技术支持

### 常见问题排查
1. **API调用失败**：检查网络连接和API密钥配置
2. **Excel处理错误**：确认文件格式和列名正确性
3. **评估超时**：调整并发线程数和网络超时设置
4. **内存不足**：处理大文件时可能需要增加系统内存

### 获取帮助
- 📧 **邮件支持**：tech-support@museum.com
- 💬 **在线文档**：[项目Wiki](https://github.com/your-repo/wiki)
- 🐛 **问题报告**：[GitHub Issues](https://github.com/your-repo/issues)

## 📄 开源协议

本项目采用 [MIT License](LICENSE) 开源协议。

---

<div align="center">

**🏛️ 苏州科技馆 AI 助手评估平台**

*让AI评估更智能，让质量分析更精准*

[⭐ Star](https://github.com/your-repo) · [🍴 Fork](https://github.com/your-repo/fork) · [📝 Issues](https://github.com/your-repo/issues)

</div>