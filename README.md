# 🏛️ 苏州科技馆 AI 助手评估平台

[![Version](https://img.shields.io/badge/version-3.0.0-blue.svg)](https://github.com/your-repo)
[![Node.js](https://img.shields.io/badge/node.js-v18+-green.svg)](https://nodejs.org/)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

> 🤖 **专业的AI助手质量评估与测试平台**  
> 为苏州科技馆数字人助手（趣波QuBoo）提供全面的智能化评估解决方案

## 🎯 项目概述

本平台是一个企业级的AI助手质量评估系统，采用**纯前端数据架构**，通过自动化流程对苏州科技馆数字人助手的回复进行多维度质量分析。

### 🌟 核心特性 
- **🎯 精准评估**: 基于科技馆业务场景的专业评估体系
- **📋 参考答案**: 支持标准答案对比评估，提升评估准确性
- **⚡ 高效处理**: 支持大批量数据真正并发处理
- **📊 可视化分析**: 响应式表格、智能排序、实时统计、悬浮提示
- **🔄 完整流程**: 3步完成评估的简化工作流
- **💾 纯前端架构**: 完全无服务器状态依赖，支持多用户并发
- **🎨 现代化UI**: 可拖拽日志面板、实时进度条、列宽调整

## 🚀 核心功能

### 📋 1. Excel数据处理引擎
- Excel批量数据处理 + 样例文件下载
- Coze API 自动化调用 + 实时进度显示
- 上下文感知的对话生成
- 可配置并发线程数 (默认coze5线程)
- 实时进度追踪与错误恢复
- 纯前端数据管理，支持即时预览和下载

### 🧠 2. AI 质量评估系统
- 多LLM平台支持 (火山引擎豆包、ModelScope)
- 三维度评估体系：
  - 准确率 (1-100分) - 支持参考答案对比
  - 专业度 (1-100分) - 术语和表达专业性
  - 语气合理性 (1-100分) - 科技馆场景适配度
- 智能参考答案系统：
  - 有参考答案时：以标准答案为准评估
  - 无参考答案时：按业务逻辑评估
- 科技馆业务场景深度定制
- Promise.all并发处理 (默认3个并发任务)
- 智能重试机制与API限流处理
- 断点续评功能

### 🌐 3. 现代化 Web 管理界面
- 响应式设计，支持桌面和移动端
- 拖拽上传，实时文件处理
- 智能工作流引导 (3步完成评估)
- 高级数据表格：
  - 智能列宽调整与拖拽调整
  - 多列排序功能 (时间、评分)
  - 双重筛选过滤 (问题类型 + 回复类型)
  - 冻结表头
  - 全列悬浮提示 (Tooltip)
  - Markdown渲染支持
- 可拖拽实时日志面板 (SSE推送)
- 实时进度条显示 (Excel处理 + 评估进度)

## 🛠️ 技术架构 (v3.0 无状态版)

### 前端技术栈
- **ES6+ 模块化架构** - 三模块分离设计（app.js + data-manager.js + simple-list-renderer.js）
- **CSS3 + Flexbox** - 响应式布局设计
- **Server-Sent Events (SSE)** - 实时日志推送
- **File API + Drag & Drop** - 现代文件处理
- **前端CSV生成** - 无服务器依赖的数据导出

### 后端技术栈
- **Node.js + Express** - 轻量Web服务器
- **无状态API** - 纯函数式接口设计
- **Multer** - 文件上传处理
- **CORS** - 跨域资源共享
- **dotenv** - 环境变量管理

### 数据处理
- **xlsx** - Excel文件处理
- **axios** - HTTP客户端
- **Promise.all并发** - 异步任务并发执行
- **前端数据流** - 无服务器状态依赖

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
- 上传Excel格式的测试问题集 ([下载样例](templates/test_set_example.xls))
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
| `expected_answer` | 字符串 | 否 | 参考答案/标准答案 |

### 输出数据格式 (CSV)

包含原始字段 + AI生成字段 + 评估字段：

**核心数据列顺序：**
1. `question_text` - 用户问题
2. `context` - 对话上下文
3. `block_result` - AI回复内容
4. `block_start` / `block_end` - 响应时间
5. `expected_answer` - 参考答案
6. `准确率` / `准确率_理由` - 准确性评估
7. `专业度_分数` / `专业度_理由` - 专业度评估
8. `语气合理_分数` / `语气合理_理由` - 语气评估
9. 其他元数据列

## 🔒 安全性

### ✅ 安全措施
- **环境变量保护**: 敏感信息存储在 `.env` 文件中
- **文件类型验证**: 严格限制上传文件类型
- **无状态设计**: 无服务器端数据存储风险
- **前端隔离**: 多用户数据完全隔离
- **输入验证**: 对所有用户输入进行验证和清理

## 📈 性能指标 

### 处理能力
- **Excel处理**: ~100-500 问题/分钟 (并发优化)
- **质量评估**: ~50-200 回复/分钟 (异步并发处理)  
- **并发支持**: 无限多用户并发，无状态冲突
- **内存效率**: 无服务器内存占用

### 系统要求
- **内存**: 建议 2GB+ RAM (轻量服务器)
- **网络**: 稳定的外网连接 (API调用)
- **浏览器**: Chrome 90+, Firefox 88+, Safari 14+ (支持ES6+)

## 🗂️ 项目结构 (v3.0 无状态版)

```
agent-assessment/
├── 📄 server.js              # Express轻量服务器
├── 🔌 coze-bot-core.js       # Coze API核心模块
├── 🔑 get-token.js           # 自动令牌刷新
├── ⚙️ .env                   # 环境配置文件
├── 📦 package.json           # Node.js依赖配置 (5个核心依赖)
├── 📋 README.md              # 项目文档
├── 📁 lib/                   # 业务逻辑层
│   ├── 🤖 coze-client.js     # Coze API客户端 + 并发处理
│   └── 🧠 llm-client.js      # LLM API客户端 (支持参考答案)
├── 📁 routes/               # Express路由层
│   ├── 📤 process-excel.js   # Excel处理路由 (无状态)
│   ├── ⬇️ download-csv.js    # CSV下载路由 (已废弃)
│   ├── 📊 run-assessment.js  # 评估执行路由 (无状态)
│   └── 👁️ preview-data.js    # 数据预览路由 (已废弃)
└── 📁 public/               # 静态资源目录
    ├── 🌐 index.html         # 响应式Web界面
    ├── 📁 js/
    │   ├── 📱 app.js          # 主前端应用 (无状态版)
    │   ├── 📊 data-manager.js # 前端数据管理模块
    │   └── 📝 simple-list-renderer.js # Markdown渲染模块
    └── 📁 templates/
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

### 文件修改重启说明
- **前端文件** (`public/` 目录) - 刷新浏览器即可
- **后端文件** (其他 `.js` 文件) - 需要重启服务器

### 扩展开发
- 支持新的LLM平台
- 添加新的评估维度
- 自定义业务场景配置
- 扩展参考答案格式

## 📄 开源协议

本项目采用 [MIT License](LICENSE) 开源协议。

---

<div align="center">

**🏛️ 苏州科技馆 AI 助手评估平台 v3.0 - 无状态版**

*纯前端架构 | 参考答案支持 | 智能评估 | 现代化UI*

</div>