# 🏛️ 苏州科技馆 AI 助手评估平台

[![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)](https://github.com/your-repo)
[![Node.js](https://img.shields.io/badge/node.js-v18+-green.svg)](https://nodejs.org/)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

> 🤖 **专业的AI助手质量评估与测试平台**  
> 为苏州科技馆数字人助手（趣波QuBoo）提供全面的智能化评估解决方案

## 🎯 项目概述

本平台是一个企业级的AI助手质量评估系统，采用**纯内存架构**，通过自动化流程对苏州科技馆数字人助手的回复进行多维度质量分析。

### 🌟 核心特性 (v2.0 重构版)
- **🎯 精准评估**: 基于科技馆业务场景的专业评估体系
- **⚡ 高效处理**: 支持大批量数据真正并发处理
- **📊 可视化分析**: 响应式表格、智能排序、实时统计
- **🔄 完整流程**: 3步完成评估的简化工作流
- **💾 纯内存架构**: 完全无文件系统依赖，支持多用户并发
- **🎨 现代化UI**: 可拖拽日志面板、实时进度条、样例下载

## 🚀 核心功能

### 📋 1. Excel数据处理引擎
- Excel批量数据处理 + 样例文件下载
- Coze API 自动化调用 + 实时进度显示
- 上下文感知的对话生成
- 可配置并发线程数 (默认10线程)
- 实时进度追踪与错误恢复
- 纯内存存储，支持即时预览和下载

### 🧠 2. AI 质量评估系统
- 多LLM平台支持 (火山引擎豆包、ModelScope)
- 三维度评估体系：
  - 最终准确率 (1-100分)
  - 专业度 (1-100分) 
  - 语气合理性 (1-100分)
- 科技馆业务场景深度定制
- Promise.all真正并发处理 (默认3线程)
- 智能重试机制与API限流处理
- 断点续评功能

### 🌐 3. 现代化 Web 管理界面
- 响应式设计，支持桌面和移动端
- 拖拽上传，实时文件处理
- 智能工作流引导 (3步完成评估)
- 高级数据表格：
  - 智能列宽调整
  - 多列排序功能 (时间、评分)
  - 内容筛选过滤
  - 冻结表头
  - 悬停预览长文本
- 可拖拽实时日志面板 (SSE推送)
- 实时进度条显示

## 🛠️ 技术架构 (v2.0 重构)

### 前端技术栈
- **ES6+ 模块化架构** - 单独app.js文件，逻辑清晰
- **CSS3 + Flexbox** - 响应式布局设计
- **Server-Sent Events (SSE)** - 实时日志推送
- **File API + Drag & Drop** - 现代文件处理

### 后端技术栈
- **Node.js + Express** - 高性能Web服务器
- **纯内存存储** - 会话管理 + 30分钟自动清理
- **Multer** - 文件上传处理
- **CORS** - 跨域资源共享
- **dotenv** - 环境变量管理

### 数据处理
- **xlsx** - Excel文件处理
- **axios** - HTTP客户端
- **Promise.all并发** - 真正的并发处理
- **JSON + 内存** - 数据存储格式

## 📦 快速开始

### 环境要求
```bash
Node.js >= 18.0.0
npm >= 8.0.0
```

### 1. 安装依赖
```bash
npm install
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
llm_model_name=doubao-1.5-pro-32k-250115

# 并发配置
DATA_PROCESSOR_THREADS=10
ASSESS_THREADS=3

# 业务系统配置 (可选)
LOGIN_HOST=your_business_system_host
LOGIN_USERNAME=encrypted_username
LOGIN_PASSWORD=encrypted_password
```

### 3. 启动服务
```bash
npm start

# 访问管理界面
# 本地: http://localhost:3000
# 局域网: http://your_ip:3000
```

## 📋 使用指南

### 🎯 完整评估流程 (3步完成)

#### 步骤1: 刷新Token (可选)
- 业务系统免验证码Token如过期，可手动刷新

#### 步骤2: 上传测试问题集
- 上传Excel格式的测试问题集 ([下载样例](test_set_example.xls))
- 系统自动调用Coze API生成回复
- 实时预览生成的数据
- 支持CSV下载

#### 步骤3: 执行质量评估  
- 自动使用第2步处理结果
- 点击"开始评估"进行LLM智能评估
- 实时查看评估进度和结果
- 支持评估结果下载

## 📊 数据格式说明

### 输入数据格式 (Excel)
| 列名 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `question_id` | 字符串 | 是 | 问题唯一标识 |
| `question_type` | 字符串 | 否 | 问题分类 |
| `question_text` | 字符串 | 是 | 用户问题内容 |
| `context` | JSON字符串 | 否 | 对话历史上下文 |

### 输出数据格式 (CSV)
包含原始字段 + AI生成字段 + 评估字段，支持完整的数据分析和质量评估。

## 🔒 安全性

### ✅ 安全措施
- **环境变量保护**: 敏感信息存储在 `.env` 文件中
- **文件类型验证**: 严格限制上传文件类型
- **内存隔离**: 多用户会话数据隔离
- **自动清理**: 30分钟会话过期机制
- **输入验证**: 对所有用户输入进行验证和清理

## 📈 性能指标 (v2.0 重构版)

### 处理能力
- **Excel处理**: ~100-500 问题/分钟 (并发优化)
- **质量评估**: ~50-200 回复/分钟 (Promise.all并发)  
- **并发支持**: 多用户会话隔离，真正并发处理
- **内存效率**: 30分钟自动清理机制

### 系统要求
- **内存**: 建议 4GB+ RAM (纯内存架构)
- **网络**: 稳定的外网连接 (API调用)
- **浏览器**: Chrome 90+, Firefox 88+, Safari 14+ (支持ES6+)

## 🗂️ 项目结构 (v2.0 重构版)

```
agent-assessment/
├── 📄 server.js              # Express服务器主文件
├── 🔌 coze-bot-core.js       # Coze API核心模块
├── 🔑 get-token.js           # 自动令牌刷新
├── ⚙️ .env                   # 环境配置文件
├── 📦 package.json           # Node.js依赖配置 (6个核心依赖)
├── 📋 README.md              # 项目文档
├── 📁 lib/                   # 业务逻辑层
│   ├── 💾 memory-store.js    # 内存存储管理 + 会话管理
│   ├── 🤖 coze-client.js     # Coze API客户端 + 并发处理
│   └── 🧠 llm-client.js      # LLM API客户端 (对应assess.py)
├── 📁 routes/               # Express路由层
│   ├── 📤 process-excel.js   # Excel处理路由
│   ├── ⬇️ download-csv.js    # CSV下载路由
│   ├── 📊 run-assessment.js  # 评估执行路由
│   └── 👁️ preview-data.js    # 数据预览路由
└── 📁 public/               # 静态资源目录
    ├── 🌐 index.html         # 响应式Web界面
    ├── 📁 js/
    │   └── 📱 app.js          # ES6模块化前端应用
    └── 📄 test_set_example.xls # Excel模板样例文件
```

## 🤝 开发指南

### 环境配置
```bash
# 开发模式启动
npm run dev

# 生产模式启动  
npm start
```

### 扩展开发
- 支持新的LLM平台
- 添加新的评估维度
- 自定义业务场景配置

## 📄 开源协议

本项目采用 [MIT License](LICENSE) 开源协议。

---

<div align="center">

**🏛️ 苏州科技馆 AI 助手评估平台 v2.0 - 重构完成版**

*纯内存架构 | 模块化重构 | 真正并发处理*

</div>