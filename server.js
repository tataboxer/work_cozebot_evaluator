const express = require('express');
const cors = require('cors');
const { spawn } = require('child_process');
require('dotenv').config(); // 加载环境变量

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件配置
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 静态文件服务优化
app.use(express.static('public', {
  maxAge: '1d', // 缓存一天
  etag: true,
  lastModified: true
}));



// 注册新架构路由
const processExcelRouter = require('./routes/process-excel');
const downloadCsvRouter = require('./routes/download-csv');
app.use('/', processExcelRouter);
app.use('/', downloadCsvRouter);
app.use('/api', require('./routes/run-assessment'));
app.use('/api', require('./routes/preview-data'));

// SSE日志功能 (保留)
const sseClients = new Set();

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

  res.write(`data: ${JSON.stringify({ type: 'connected', message: '日志连接已建立' })}\n\n`);

  req.on('close', () => {
    sseClients.delete(client);
  });
});

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

// 导出broadcastLog供路由使用
global.broadcastLog = broadcastLog;

// 保留的API路由

// 1. 刷新Token (保留现有功能)
app.post('/api/refresh-token', async (req, res) => {
  try {
    console.log('开始刷新Token...');

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
  console.log(`📊 新架构已启用 - 纯前端数据模式`);
});

// 优雅关闭
process.on('SIGINT', () => {
  console.log('\n👋 服务器关闭');
  process.exit(0);
});