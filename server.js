const express = require('express');
const multer = require('multer');
const cors = require('cors');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件配置
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// 文件上传配置 - 使用内存存储
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 限制文件大小为10MB
  }
});

// 不再需要uploads目录
// fs.mkdir('uploads', { recursive: true }).catch(console.error);

// API 路由

// 1. 刷新Token
app.post('/api/refresh-token', async (req, res) => {
  try {
    console.log('开始刷新Token...');

    const { spawn } = require('child_process');

    const child = spawn('node', ['get-token.js'], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
      console.log('Token刷新输出:', data.toString());
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
      console.error('Token刷新错误:', data.toString());
    });

    child.on('close', (code) => {
      if (code === 0) {
        res.json({
          success: true,
          message: 'Token刷新成功',
          output: stdout
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Token刷新失败',
          error: stderr
        });
      }
    });

  } catch (error) {
    console.error('Token刷新异常:', error);
    res.status(500).json({
      success: false,
      message: 'Token刷新异常',
      error: error.message
    });
  }
});

// 存储活跃的SSE连接
const sseClients = new Set();

// SSE端点
app.get('/api/logs', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });

  const clientId = Date.now();
  const client = { id: clientId, res };
  sseClients.add(client);

  // 发送连接确认
  res.write(`data: ${JSON.stringify({ type: 'connected', message: '日志连接已建立' })}\n\n`);

  // 客户端断开连接时清理
  req.on('close', () => {
    sseClients.delete(client);
  });
});

// 广播日志消息给所有SSE客户端
function broadcastLog(type, message) {
  const logData = JSON.stringify({ type, message, timestamp: new Date().toISOString() });
  sseClients.forEach(client => {
    try {
      client.res.write(`data: ${logData}\n\n`);
    } catch (error) {
      sseClients.delete(client);
    }
  });
}

// 1.5. 上传CSV文件用于评估
app.post('/api/upload-csv', upload.single('csvFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: '没有上传CSV文件' });
    }

    console.log('收到CSV文件:', req.file.originalname);
    
    // 创建临时文件路径
    const tempPath = path.join(__dirname, 'temp_' + Date.now() + '_' + req.file.originalname);
    
    try {
      // 将内存中的文件写入临时文件
      await fs.writeFile(tempPath, req.file.buffer);
      
      res.json({
        success: true,
        message: 'CSV文件上传成功',
        filePath: tempPath,
        originalName: req.file.originalname
      });
      
    } catch (writeError) {
      console.error('写入临时文件失败:', writeError);
      res.status(500).json({
        success: false,
        message: '写入临时文件失败',
        error: writeError.message
      });
    }

  } catch (error) {
    console.error('CSV上传异常:', error);
    res.status(500).json({
      success: false,
      message: 'CSV上传异常',
      error: error.message
    });
  }
});

// 2. 上传Excel并处理
app.post('/api/process-excel', upload.single('excelFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: '没有上传文件' });
    }

    console.log('收到Excel文件:', req.file.originalname);
    broadcastLog('info', `收到Excel文件: ${req.file.originalname}`);

    // 创建临时文件来传递给Python脚本
    const tempPath = path.join(__dirname, 'temp_' + Date.now() + '_' + req.file.originalname);
    
    try {
      // 将内存中的文件写入临时文件
      await fs.writeFile(tempPath, req.file.buffer);
      
      console.log('开始处理Excel文件...');
      broadcastLog('info', '开始处理Excel文件...');

      // 调用Python脚本处理Excel
      const pythonProcess = spawn('python', [
        '-u',  // 禁用输出缓冲
        'data_processor.py',
        tempPath
      ], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        PYTHONIOENCODING: 'utf-8',
        PYTHONUNBUFFERED: '1'  // 禁用Python输出缓冲
      }
    });

    let stdout = '';
    let stderr = '';

    pythonProcess.stdout.on('data', (data) => {
      const output = data.toString('utf8');
      stdout += output;
      // 按行分割输出，确保每行都能实时显示
      const lines = output.split('\n');
      lines.forEach(line => {
        if (line.trim()) {
          console.log('Python输出:', line);
          
          // 过滤掉无用的调试信息，只显示重要日志
          if (line.includes('开始处理Excel文件') ||
              line.includes('使用指定的输入文件') ||
              line.includes('支持格式') ||
              line.includes('示例:') ||
              line.includes('python data_processor.py') ||
              line.includes('开始处理文件:') ||
              line.includes('列名:') ||
              line.includes('检测到context列') ||
              line.includes('样例数据:') ||
              line.includes('question_id:') ||
              line.includes('question_type:') ||
              line.includes('question_text:') ||
              line.includes('准备调用Node.js') ||
              line.includes('使用简单模式: 无上下文') ||
              line.includes('最终命令:') ||
              line.includes('成功解析上下文JSONL格式') ||
              line.includes('🔄 传递上下文:') ||
              line.includes('Coze原始输出') ||
              line.includes('==========') ||
              line.includes('Coze API Bot 测试') ||
              line.includes('[dotenv') ||
              line.includes('injecting env') ||
              line.match(/^[\s=]+$/)) {
            // 跳过这些无用的调试信息
            return;
          }
          
          // 检查是否是来自coze-bot-core.js的重要日志
          if (line.includes('🔍 验证additional_messages内容') || 
              line.includes('验证additional_messages内容') ||
              line.includes('消息 ') || 
              line.includes('[user]') || 
              line.includes('[assistant]') ||
              line.includes('使用上下文模式') ||
              line.includes('使用简单模式') ||
              line.includes('📋 使用命令行上下文') ||
              line.includes('📋 使用环境变量上下文') ||
              line.includes('🔍 上下文内容')) {
            broadcastLog('coze', line); // 使用特殊的'coze'类型
          } else {
            broadcastLog('python', line);
          }
        }
      });
    });

    pythonProcess.stderr.on('data', (data) => {
      const error = data.toString('utf8');
      stderr += error;
      console.error('Python错误:', error);
      broadcastLog('error', error);
    });

    pythonProcess.on('close', async (code) => {
      // 清理临时文件
      try {
        await fs.unlink(tempPath);
        console.log('临时文件已清理:', tempPath);
      } catch (error) {
        console.warn('清理临时文件失败:', error.message);
      }
      
      if (code === 0) {
        broadcastLog('success', 'Python脚本执行完成');
        // 扫描data/output目录找到最新的results_*.csv文件
        const dataDir = 'data/output/';
        fs.readdir(dataDir)
          .then((files) => {
            const resultsFiles = files.filter(file => file.startsWith('results_') && file.endsWith('.csv'));
            
            if (resultsFiles.length > 0) {
              // 找到最新文件（按文件名排序，时间戳最大的）
              const latestFile = resultsFiles.sort().pop();
              const latestPath = path.join(dataDir, latestFile);

              broadcastLog('success', `Excel处理成功: ${latestPath}`);
              res.json({
                success: true,
                message: 'Excel处理成功',
                inputFile: req.file.originalname,
                outputFile: latestPath,
                output: stdout
              });
            } else {
              broadcastLog('error', '输出文件未生成');
              res.status(500).json({
                success: false,
                message: '输出文件未生成',
                error: 'Python脚本执行完成但未找到results_*.csv文件'
              });
            }
          })
          .catch(() => {
            broadcastLog('error', '扫描输出文件失败');
            res.status(500).json({
              success: false,
              message: '扫描输出文件失败',
              error: '无法读取data目录'
            });
          });
      } else {
        broadcastLog('error', `Python脚本执行失败，退出码: ${code}`);
        res.status(500).json({
          success: false,
          message: 'Excel处理失败',
          error: stderr
        });
      }
    });
    
    } catch (tempFileError) {
      console.error('创建临时文件失败:', tempFileError);
      broadcastLog('error', `创建临时文件失败: ${tempFileError.message}`);
      res.status(500).json({
        success: false,
        message: '创建临时文件失败',
        error: tempFileError.message
      });
    }

  } catch (error) {
    console.error('Excel处理异常:', error);
    broadcastLog('error', `Excel处理异常: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Excel处理异常',
      error: error.message
    });
  }
});

// 3. 执行评估
app.post('/api/run-assessment', async (req, res) => {
  try {
    const { csvFile } = req.body;

    if (!csvFile) {
      return res.status(400).json({ success: false, message: '请提供CSV文件路径' });
    }

    console.log('开始评估文件:', csvFile);
    broadcastLog('info', `开始评估文件: ${csvFile}`);

    // 调用Python评估脚本
    const pythonProcess = spawn('python', [
      '-u',  // 禁用输出缓冲
      'assess.py',
      csvFile
    ], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        PYTHONIOENCODING: 'utf-8',
        PYTHONUNBUFFERED: '1'  // 禁用Python输出缓冲
      }
    });

    let stdout = '';
    let stderr = '';

    pythonProcess.stdout.on('data', (data) => {
      const output = data.toString('utf8');
      stdout += output;
      // 按行分割输出，确保每行都能实时显示
      const lines = output.split('\n');
      lines.forEach(line => {
        if (line.trim()) {
          console.log('评估输出:', line);
          
          // 过滤掉无用的调试信息，只显示重要日志
          if (line.includes('开始处理Excel文件') ||
              line.includes('使用指定的输入文件') ||
              line.includes('支持格式') ||
              line.includes('示例:') ||
              line.includes('python data_processor.py') ||
              line.includes('开始处理文件:') ||
              line.includes('列名:') ||
              line.includes('检测到context列') ||
              line.includes('样例数据:') ||
              line.includes('question_id:') ||
              line.includes('question_type:') ||
              line.includes('question_text:') ||
              line.includes('准备调用Node.js') ||
              line.includes('使用简单模式: 无上下文') ||
              line.includes('成功解析上下文JSONL格式') ||
              line.includes('🔄 传递上下文:') ||
              line.includes('Coze原始输出') ||
              line.includes('==========') ||
              line.includes('Coze API Bot 测试') ||
              line.includes('[dotenv') ||
              line.includes('injecting env') ||
              line.match(/^[\s=]+$/)) {
            // 跳过这些无用的调试信息
            return;
          }
          
          // 检查是否是来自coze-bot-core.js的重要日志
          if (line.includes('🔍 验证additional_messages内容') || 
              line.includes('验证additional_messages内容') ||
              line.includes('最终命令:') ||
              line.includes('消息 ') || 
              line.includes('[user]') || 
              line.includes('[assistant]') ||
              line.includes('使用上下文模式') ||
              line.includes('使用简单模式') ||
              line.includes('📋 使用命令行上下文') ||
              line.includes('📋 使用环境变量上下文') ||
              line.includes('🔍 上下文内容')) {
            broadcastLog('coze', line); // 使用特殊的'coze'类型
          } else {
            broadcastLog('python', line);
          }
        }
      });
    });

    pythonProcess.stderr.on('data', (data) => {
      const error = data.toString('utf8');
      stderr += error;
      console.error('评估错误:', error);
      broadcastLog('error', error);
    });

    pythonProcess.on('close', (code) => {
      if (code === 0) {
        broadcastLog('success', '评估完成');
        res.json({
          success: true,
          message: '评估完成',
          csvFile: csvFile,
          output: stdout
        });
      } else {
        broadcastLog('error', `评估失败，退出码: ${code}`);
        res.status(500).json({
          success: false,
          message: '评估失败',
          error: stderr
        });
      }
    });

  } catch (error) {
    console.error('评估异常:', error);
    broadcastLog('error', `评估异常: ${error.message}`);
    res.status(500).json({
      success: false,
      message: '评估异常',
      error: error.message
    });
  }
});

// 获取文件列表
app.get('/api/files', async (req, res) => {
  try {
    const dataDirs = ['data/', 'data/output/'];
    let allFiles = [];

    for (const dataDir of dataDirs) {
      try {
        const files = await fs.readdir(dataDir);
        const csvFiles = files.filter(file => file.endsWith('.csv'));
        
        const dirFiles = csvFiles.map(file => ({
          name: file,
          path: path.join(dataDir, file),
          size: 0 // 可以后续添加文件大小
        }));
        
        allFiles = allFiles.concat(dirFiles);
      } catch (dirError) {
        // 如果目录不存在，继续处理其他目录
        console.log(`目录 ${dataDir} 不存在或无法访问`);
      }
    }

    res.json({
      success: true,
      files: allFiles
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '获取文件列表失败',
      error: error.message
    });
  }
});

// 获取CSV文件数据
app.get('/api/csv-data', async (req, res) => {
  try {
    const { file } = req.query;
    
    if (!file) {
      return res.status(400).json({
        success: false,
        message: '请提供文件路径'
      });
    }

    console.log('读取CSV文件:', file);
    broadcastLog('info', `读取CSV文件: ${file}`);

    // 检查文件是否存在
    try {
      await fs.access(file);
    } catch (error) {
      return res.status(404).json({
        success: false,
        message: `文件不存在: ${file}`
      });
    }

    // 尝试不同的编码读取CSV文件
    let csvContent;
    try {
      csvContent = await fs.readFile(file, 'utf-8');
    } catch (error) {
      try {
        // 如果UTF-8失败，尝试使用utf-8-sig（带BOM）
        csvContent = await fs.readFile(file, 'utf8');
      } catch (error2) {
        return res.status(500).json({
          success: false,
          message: '无法读取文件，编码可能不支持',
          error: error2.message
        });
      }
    }
    
    // 移除BOM标记如果存在
    if (csvContent.charCodeAt(0) === 0xFEFF) {
      csvContent = csvContent.slice(1);
    }
    
    // 使用高级CSV解析处理包含换行符的字段
    const allRows = parseCSVContent(csvContent);
    
    if (allRows.length === 0) {
      return res.json({
        success: true,
        data: [],
        message: '文件为空'
      });
    }

    // 解析表头
    const headers = allRows[0].map(header => header.trim().replace(/^"|"$/g, ''));
    
    // 解析数据行
    const data = [];
    for (let i = 1; i < allRows.length; i++) {
      try {
        const values = allRows[i];
        if (values.length > 0) {
          const row = {};
          headers.forEach((header, index) => {
            row[header] = (values[index] || '').replace(/^"|"$/g, '');
          });
          data.push(row);
        }
      } catch (lineError) {
        console.warn(`解析第${i+1}行时出错:`, lineError.message);
        // 继续处理其他行
      }
    }

    broadcastLog('success', `CSV数据读取成功，共 ${data.length} 行`);
    
    res.json({
      success: true,
      data: data,
      totalRows: data.length,
      headers: headers,
      message: `成功读取 ${data.length} 行数据`
    });

  } catch (error) {
    console.error('读取CSV文件失败:', error);
    broadcastLog('error', `读取CSV文件失败: ${error.message}`);
    res.status(500).json({
      success: false,
      message: '读取CSV文件失败',
      error: error.message
    });
  }
});

// 高级CSV解析函数（处理包含换行符和逗号的字段）
function parseCSVContent(csvContent) {
  const lines = csvContent.split(/\r?\n/);
  const result = [];
  let currentRow = [];
  let currentField = '';
  let inQuotes = false;
  let rowIndex = 0;
  
  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const line = lines[lineIndex];
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          // 转义的引号
          currentField += '"';
          i++; // 跳过下一个引号
        } else {
          // 切换引号状态
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        // 字段分隔符
        currentRow.push(currentField.trim());
        currentField = '';
      } else {
        currentField += char;
      }
    }
    
    // 行结束处理
    if (inQuotes) {
      // 如果还在引号内，这行是多行字段的一部分，添加换行符继续
      currentField += '\n';
    } else {
      // 行结束，添加最后一个字段
      currentRow.push(currentField.trim());
      currentField = '';
      
      // 如果这行有内容，添加到结果
      if (currentRow.some(field => field !== '')) {
        result.push(currentRow);
      }
      
      currentRow = [];
    }
  }
  
  // 处理最后一行
  if (currentRow.length > 0 || currentField) {
    if (currentField) {
      currentRow.push(currentField.trim());
    }
    if (currentRow.some(field => field !== '')) {
      result.push(currentRow);
    }
  }
  
  return result;
}

// 简单的CSV行解析函数（保留向后兼容）
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // 转义的引号
        current += '"';
        i++; // 跳过下一个引号
      } else {
        // 切换引号状态
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // 字段分隔符
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  // 添加最后一个字段
  result.push(current.trim());
  
  return result;
}

// 启动服务器
app.listen(PORT, '0.0.0.0', () => {
  // 获取本机IP地址
  const os = require('os');
  const networkInterfaces = os.networkInterfaces();
  let localIP = 'localhost';
  
  // 查找第一个非回环的IPv4地址
  for (const interfaceName in networkInterfaces) {
    const interfaces = networkInterfaces[interfaceName];
    for (const iface of interfaces) {
      if (iface.family === 'IPv4' && !iface.internal) {
        localIP = iface.address;
        break;
      }
    }
    if (localIP !== 'localhost') break;
  }
  
  console.log(`🚀 服务器启动成功！`);
  console.log(`📍 本地访问: http://localhost:${PORT}`);
  console.log(`🌐 局域网访问: http://${localIP}:${PORT}`);
  console.log(`📊 数据目录: data/`);
});

// 优雅关闭
process.on('SIGINT', () => {
  console.log('\n👋 服务器关闭');
  process.exit(0);
});