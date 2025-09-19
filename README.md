# 苏州科技馆数字人助手评估工具集

这是一个完整的工具链，用于测试和评估苏州科技馆Coze数字人助手的回复质量。支持命令行和Web界面两种使用方式，通过三步流程实现从数据准备到最终评估的完整自动化。

## 🎯 工作流程

### 🌐 Web界面操作（推荐）
启动Web服务：
```bash
npm start
```
访问 `http://localhost:3000` 进行可视化操作：

#### 步骤1: 刷新Token
- 点击"刷新Token"按钮
- 自动获取最新认证Token并更新`.env`文件

#### 步骤2: 上传并处理Excel
- 拖拽或选择Excel测试文件（.xls/.xlsx）
- 自动批量调用Coze Agent生成回复
- 实时查看处理进度和中文日志

#### 步骤3: 执行质量评估
- 选择生成的CSV文件
- 一键启动LLM质量评估
- 实时监控评估进度

### 💻 命令行操作（传统方式）

#### 步骤1: 获取最新的认证Token
```bash
node get-token.js
```
**作用**：调用业务系统接口获取最新的免验证码Token，并更新到 `.env` 文件

#### 步骤2: 批量生成助手回复
```bash
python data_processor.py data/test_set20250918.xls
```
**作用**：读取测试问题集，批量调用Coze Agent生成回复数据
**输出**：`data/results_YYYYMMDD_HHMMSS.csv` - 包含问题和回复的CSV文件

#### 步骤3: LLM质量评估
```bash
python assess.py data/results_20250918_184058.csv
```
**作用**：使用LLM对助手回复进行专业评估（多线程并发处理）
**特点**：
- 🚀 **5线程并发**：同时处理5个评估任务，大幅提升处理速度
- 💾 **实时写入**：每完成一行立即更新CSV文件，无需等待全部完成
- 🔄 **增量评估**：自动跳过已评估数据，支持断点续传
- 📊 **进度监控**：实时显示处理进度和成功率
**输出**：原CSV文件更新，新增6列评估结果

## 📊 评估维度

通过LLM从三个专业维度对回复进行评分（1-5分）：

- **最终准确率**：回复内容与用户问题的匹配程度，是否解决用户需求
- **专业度**：用词精准度、术语正确性、业务知识的专业水准
- **语气合理**：语气友好度、引导性、场景适应性

## ⚡ 多线程并发优化

- **并发处理**：使用5个线程同时处理多个评估任务
- **实时写入**：每完成一个评估立即更新CSV文件
- **锁保护**：使用线程锁确保CSV文件写入安全
- **智能调度**：ThreadPoolExecutor自动管理线程资源

## 🛠️ 环境配置

### 安装依赖
```bash
# 安装Node.js依赖
npm install

# 安装Python依赖
pip install requests python-dotenv pandas
```

### 配置文件 (.env)
```env
# 业务系统认证
ACCESS_TOKEN=your_access_token
REFRESH_TOKEN=your_refresh_token

# LLM评估配置
llm_url=https://api-inference.modelscope.cn/v1/
llm_api_key=your_api_key_here
llm_model_name=Qwen/Qwen3-Coder-480B-A35B-Instruct
```

## 📁 项目结构

```
├── server.js             # Web服务器（Express + 文件上传）
├── public/               # Web前端文件
│   └── index.html       # 可视化操作界面
├── get-token.js         # Token获取工具
├── data_processor.py    # 批量调用Coze Agent
├── assess.py            # LLM质量评估
├── coze-bot-core.js     # Coze API核心库
├── .env                 # 配置文件
├── uploads/             # 文件上传目录
├── data/                # 数据文件目录
│   ├── test_set*.xls   # 测试问题集
│   ├── results_*.csv   # Agent回复结果
│   └── results_evaluated_*.csv # 评估结果
├── package.json         # Node.js配置
└── README.md           # 使用说明
```

## 💡 使用示例

### 🌐 Web界面操作（推荐）
```bash
# 启动Web服务
npm start

# 浏览器访问 http://localhost:3000
# 1. 点击"刷新Token"按钮
# 2. 上传Excel文件（拖拽或选择）
# 3. 选择生成的CSV文件进行评估
```

### 💻 命令行操作
```bash
# 完整评估流程
# 1. 获取最新Token
node get-token.js

# 2. 批量生成回复（使用示例测试集）
python data_processor.py data/test_set20250918.xls

# 3. 进行质量评估（使用生成的回复文件）
python assess.py data/results_20250918_184058.csv

# 增量评估
python assess.py data/results_evaluated_20250918_193248.csv
```

## 📋 数据格式

### 输入测试集 (Excel格式)
```csv
question_id,question_type,question_text
2.1.2-1,闲聊chat,你好！/嗨！
2.1.1-1,参观票,我想买明天上午的票，还有吗？
```

### Agent回复结果 (CSV格式)
```csv
question_id,question_type,question_text,block_type,block_subtype,block_result,block_start,block_end
2.1.2-1,闲聊chat,你好！/嗨！,answer,,你好呀！有什么关于苏州科技馆的问题都可以问我呢。,3.6,3.84
```

### 评估结果 (CSV格式)
```csv
question_id,...,最终准确率_分数,最终准确率_理由,专业度_分数,专业度_理由,语气合理_分数,语气合理_理由
2.1.2-1,...,5,回复准确...,4,用词准确...,5,语气亲切...
```

## ⚙️ 技术实现

### 🌐 Web界面特性
- **可视化操作**：直观的拖拽上传和按钮操作
- **实时日志**：处理过程中文日志实时显示
- **文件管理**：自动列出生成的CSV文件供选择
- **响应式设计**：适配不同屏幕尺寸

### 🔧 核心功能
- **Token获取机制**：调用业务系统免验证码接口，自动更新`.env`文件
- **批量调用优化**：5线程并发处理，错误重试和异常处理
- **智能评估策略**：自动筛选有效回复，增量评估，LLM专业评估
- **编码兼容性**：完美支持中文显示，UTF-8编码处理

## 🆕 新增功能

### ✨ Web界面全功能支持
- **🔄 一键Token刷新**：无需命令行操作，点击按钮即可更新认证信息
- **📤 拖拽文件上传**：支持Excel文件拖拽上传或点击选择
- **👀 实时处理监控**：处理过程中文日志实时显示，支持UTF-8编码
- **📋 智能文件选择**：自动列出可用CSV文件，一键选择进行评估
- **🚀 零配置启动**：`npm start` 即可启动完整Web服务

## ⚠️ 注意事项

🔐 **认证安全**：确保 `.env` 文件不被提交到版本控制
🌐 **网络连接**：评估步骤需要访问外部LLM API
💰 **API费用**：注意LLM API调用费用
📊 **数据格式**：确保测试集格式符合要求
🌏 **编码问题**：Web界面已完美解决中文乱码问题

## 🔧 故障排除

### Token获取失败
```bash
# 检查网络连接和.env配置
node get-token.js
```

### Agent调用失败
```bash
# 检查Token是否过期
node get-token.js
# 重新运行批量调用
python data_processor.py data/test_set20250918.xls
```

### 评估API失败
```bash
# 检查LLM API配置和网络
python assess.py data/results_20250918_184058.csv
```

## 📈 评估报告

运行完成后会在 `data/` 目录生成评估报告，包含：
- ✅ 评估成功率统计
- 📊 各维度评分分布
- 💡 详细的改进建议

## 🤝 贡献

欢迎提交Issue和Pull Request来改进这个工具！

---

**使用前请确保所有依赖已正确安装，并配置好 `.env` 文件。**