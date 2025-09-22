# 🏛️ 苏州科技馆 AI 助手评估平台

> 🤖 **AI助手质量评估与测试平台**  
> 为苏州科技馆数字人助手提供智能化评估解决方案

## 🎯 项目概述

本平台用于对AI助手的回复进行多维度质量分析，支持批量处理和自动化评估。

### 🌟 核心特性 
- **🎯 精准评估**: 三维度评估体系（准确率、专业度、语气合理性）
- **📋 参考答案**: 支持标准答案对比评估
- **⚡ 高效处理**: 支持批量数据并发处理
- **📊 可视化分析**: 响应式表格、实时统计
- **🔄 完整流程**: 4步完成评估
- **🔑 灵活Token**: 支持自动/手动Token管理
- **🔒 访问控制**: 密钥验证 + 本地缓存，防止未授权使用

## 🚀 核心功能

### 📋 1. Excel数据处理
- Excel批量数据处理
- Coze API 自动化调用
- 上下文感知的对话生成
- 可配置并发线程数
- 实时进度追踪

### 🧠 2. AI 质量评估
- 支持火山引擎豆包等LLM平台
- 三维度评估体系：
  - 准确率 (1-100分)
  - 专业度 (1-100分) 
  - 语气合理性 (1-100分)
- 智能参考答案对比
- 并发处理与重试机制

### 🌐 3. Web 管理界面
- 响应式设计
- 拖拽上传文件
- 数据表格展示
- 实时日志面板
- 进度条显示
- Token管理弹窗

### 🔑 4. Token 认证管理
- 自动Token刷新（支持内外网环境）
- 10秒超时机制，防止无限等待
- 实时环境变量更新
- Bearer格式自动处理

### 🔐 5. 访问控制系统
- 固定访问密钥验证
- 前端用户体验 + 后端 API 安全
- localStorage 本地缓存，刷新无需重复输入
- 实时日志和进度显示

## 🛠️ 技术架构

### 前端技术栈
- **ES6+ 模块化** - 三模块分离设计
- **CSS3 + Flexbox** - 响应式布局
- **File API + Drag & Drop** - 文件处理

### 后端技术栈
- **Node.js + Express** - Web服务器
- **Multer (内存存储)** - Excel文件内存处理，无磁盘存储
- **dotenv** - 环境变量管理

### 数据处理
- **xlsx** - Excel文件处理
- **axios** - HTTP客户端
- **Promise.all** - 异步并发执行

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

# LLM评估配置
llm_url=https://ark.cn-beijing.volces.com/api/v3/
llm_api_key=your_volcano_api_key
llm_model_name=doubao-1-5-pro-32k-250115

# 并发配置 (Railway优化)
DATA_PROCESSOR_THREADS=3
ASSESS_THREADS=2

# 服务器端口
PORT=3001
```

### 3. 启动服务
```bash
npm start

# 访问管理界面
# 本地: http://localhost:3001
# 局域网: http://your_ip:3001
```

## 📋 使用指南

### 🎯 评估流程 (3步完成)

#### 步骤0: 访问验证
- **首次访问**: 输入访问密钥 ***** 进行身份验证
- **本地缓存**: 验证成功后密钥保存在浏览器，刷新页面无需重复输入
- **安全保护**: 防止未授权用户消耗API Token资源

#### 步骤1: 刷新Token (可选)
- **自动刷新**: 支持内外网环境，自动调用登录接口刷新Token
- **HTTPS支持**: 已优化支持外网HTTPS连接
- **超时处理**: 自动刷新10秒超时机制

#### 步骤2: 上传测试问题集
- 上传Excel格式的测试问题集
- 系统调用Coze API生成回复
- 实时显示处理进度
- 预览生成的数据

#### 步骤3: 执行质量评估  
- 使用第2步处理结果
- 点击"开始评估"进行LLM评估
- 实时显示评估进度和日志
- 查看评估结果并下载CSV

## 📊 数据格式说明

### 输入数据格式 (Excel)
| 列名 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `question_id` | 字符串 | 否 | 问题唯一标识 |
| `question_type` | 字符串 | 否 | 问题分类 |
| `question_text` | 字符串 | 是 | 用户问题内容 |
| `context` | JSON字符串 | 否 | 对话历史上下文 |
| `expected_answer` | 字符串 | 否 | 参考答案/标准答案 |

### 输出数据格式 (CSV)

包含原始字段 + AI生成字段 + 评估字段：

**核心数据列：**
- `question_text` - 用户问题
- `context` - 对话上下文
- `block_result` - AI回复内容
- `expected_answer` - 参考答案
- `准确率` / `准确率_理由` - 准确性评估
- `专业度` / `专业度_理由` - 专业度评估
- `语气合理度` / `语气合理_理由` - 语气评估

## 🔒 安全性

### 访问控制
- **双重验证**: 前端用户体验 + 后端 API 安全验证
- **本地缓存**: 验证成功后密钥保存在 localStorage，刷新无需重复输入
- **API 保护**: 所有 API 接口都需要有效访问密钥，防止未授权调用
- **超时机制**: Token 刷新请求 10 秒超时，防止无限等待

### 数据安全
- 环境变量保护敏感信息
- 文件类型验证
- 输入验证和清理
- **无文件存储**: 所有数据处理均在内存中完成

## 📈 性能指标 

- **Excel处理**: ~100-500 问题/分钟
- **质量评估**: ~50-200 回复/分钟
- **系统要求**: 2GB+ RAM，稳定网络连接

## 🔑 Token管理功能

### 自动刷新Token
- 自动调用业务系统登录接口
- 获取最新的ACCESS_TOKEN
- 自动更新到.env文件和运行时环境
- 支持内外网环境，使用HTTPS协议
- 10秒超时保护机制

## 🗂️ 项目结构

```
agent-assessment/
├── server.js              # Express服务器
├── coze-bot-core.js       # Coze API核心模块
├── get-token.js           # 自动令牌刷新
├── .env                   # 环境配置
├── lib/                   # 业务逻辑
│   ├── coze-client.js     # Coze API客户端
│   └── llm-client.js      # LLM API客户端
├── routes/               # Express路由
│   ├── process-excel.js   # Excel处理路由
│   └── run-assessment.js  # 评估执行路由
└── public/               # 静态资源
    ├── index.html         # Web界面
    ├── js/
    │   ├── app.js          # 主前端应用
    │   ├── data-manager.js # 数据管理模块
    │   └── simple-list-renderer.js # 渲染模块
    └── templates/
        └── test_set_example.xls # Excel模板
```



---

**🏛️ 苏州科技馆 AI 助手评估平台**