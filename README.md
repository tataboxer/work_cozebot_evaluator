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
- **🔄 完整流程**: 2步完成评估
- **🔑 灵活Token**: 支持自动/手动Token管理
- **🔒 访问控制**: 密钥验证 + 本地缓存，防止未授权使用
- **💾 数据管理**: 会话记录存储与查询
- **📈 性能监控**: Token获取时长统计

## 🚀 核心功能

- **📋 Excel数据处理**: 批量上传测试问题集，自动调用Coze API生成回复
- **🧠 AI质量评估**: 三维度评估体系（准确率、专业度、语气合理性），支持参考答案对比
- **🌐 Web管理界面**: 响应式设计，拖拽上传，实时进度追踪
- **💾 Supabase数据管理**: 云端存储，会话记录，历史查询，CSV导出
- **📊 统计分析**: 日度趋势图表，首Token时长与评估指标可视化分析
- **🔐 访问控制**: 密钥验证，本地缓存，API安全保护
- **⚡ 性能优化**: 数据库存储过程，高效数据聚合，Token时长统计

## 🛠️ 技术架构

- **前端**: ES6+模块化，响应式设计，拖拽上传
- **后端**: Node.js + Express，Supabase云数据库
- **数据处理**: Excel解析，并发API调用，LLM评估
- **安全**: 访问密钥验证，无文件存储，环境变量保护

> 详细架构说明请参考 [ARCHITECTURE.md](docs/ARCHITECTURE.md)

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
# 登录服务器配置
LOGIN_HOST=your_login_host
LOGIN_PATH=your_login_path
LOGIN_DEVICE=your_device_type
LOGIN_USERNAME=your_encrypted_username
LOGIN_PASSWORD=your_encrypted_password

# 登录凭据配置
LOGIN_DEVICE=UNITY
LOGIN_USERNAME=your_encrypted_username
LOGIN_PASSWORD=your_encrypted_password

# Coze API配置
COZE_API_TOKEN=your_coze_api_token
COZE_BOT_ID=your_bot_id

# LLM评估配置
llm_url=https://ark.cn-beijing.volces.com/api/v3/
llm_api_key=your_volcano_api_key
llm_model_name=doubao-1-5-pro-32k-250115

# Supabase数据库配置
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_supabase_service_key

# 访问控制配置
ACCESS_KEY=your_access_key

# 并发配置
DATA_PROCESSOR_THREADS=15
ASSESS_THREADS=15

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

### 🎯 评估流程 (2步完成)

#### 步骤0: 访问验证
- **首次访问**: 输入访问密钥进行身份验证
- **本地缓存**: 验证成功后密钥保存在浏览器，刷新页面无需重复输入
- **安全保护**: 防止未授权用户消耗API Token资源

#### 步骤1: 上传测试问题集
- 上传Excel格式的测试问题集（支持拖拽上传）
- 系统自动获取Token并调用Coze API生成回复
- 实时显示处理进度和Token获取状态
- 预览生成的数据

#### 步骤2: 执行质量评估  
- 使用第1步处理结果
- 点击"开始评估"进行LLM评估
- 实时显示评估进度和日志
- 查看评估结果并下载CSV
- 自动保存会话记录到数据库

#### 统计分析
- **日度趋势图表**: 柱状图显示首Token时长，折线图显示评估指标
- **日期筛选**: 默认显示当前自然月，支持自定义日期范围
- **动态Y轴**: 根据实际数据自动调整范围，突出数据差异
- **数据源**: 使用PostgreSQL存储过程高效聚合，按北京时间分组

### 📋 记录管理

#### 历史查询
- **时间筛选**: 按创建时间范围查询
- **名称搜索**: 按会话名称模糊搜索
- **配置显示**: 显示IP地址和模型名称
- **统计信息**: 显示准确率、专业度、语气评分
- **性能数据**: Token获取时长统计

#### 详情查看
- **弹窗展示**: 完整评估结果表格
- **数据筛选**: 按问题类型和回复类型筛选
- **列宽调整**: 支持表格列宽拖拽调整
- **数据导出**: 单个会话CSV导出
- **会话删除**: 支持删除历史记录

## 📊 数据格式

**输入**: Excel文件，必需字段 `question_text`，可选 `context`、`expected_answer`  
**输出**: CSV文件，包含AI回复和三维度评估结果

> 详细格式说明请参考 [API.md](docs/API.md)

## 🔒 安全与性能

- **安全**: 访问密钥验证，无文件存储，环境变量保护
- **性能**: Excel处理 ~100-500问题/分钟，评估 ~50-200回复/分钟
- **要求**: Node.js 18+，2GB+ RAM，稳定网络

## 🚀 部署

支持Railway、Vercel等云平台部署。

> 详细部署指南请参考 [DEPLOYMENT.md](docs/DEPLOYMENT.md)

## 📚 项目文档

- **[API.md](docs/API.md)** - API接口文档
- **[DATABASE.md](docs/DATABASE.md)** - 数据库设计文档  
- **[DEPLOYMENT.md](docs/DEPLOYMENT.md)** - 部署指南
- **[DEVELOPMENT.md](docs/DEVELOPMENT.md)** - 开发指南
- **[ARCHITECTURE.md](docs/ARCHITECTURE.md)** - 系统架构文档

## 🗂️ 项目结构

```
agent-assessment/
├── server.js              # Express服务器
├── lib/                   # 业务逻辑
├── routes/                # API路由
├── middleware/            # 中间件
├── public/                # 前端资源
└── docs/                  # 项目文档
```



---

**🏛️ 苏州科技馆 AI 助手评估平台**