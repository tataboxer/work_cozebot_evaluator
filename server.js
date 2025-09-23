const express = require('express');
const cors = require('cors');
const { spawn } = require('child_process');
// 本地开发时加载.env文件，Railway不需要
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

// 环境变量检查（用于调试Railway等云平台问题）
const projectEnvs = {
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  ACCESS_KEY: process.env.ACCESS_KEY,
  LOGIN_HOST: process.env.LOGIN_HOST,
  LOGIN_PATH: process.env.LOGIN_PATH,
  LOGIN_DEVICE: process.env.LOGIN_DEVICE,
  LOGIN_USERNAME: process.env.LOGIN_USERNAME ? '✅ 已设置' : undefined,
  LOGIN_PASSWORD: process.env.LOGIN_PASSWORD ? '✅ 已设置' : undefined,

  llm_url: process.env.llm_url,
  llm_api_key: process.env.llm_api_key ? '✅ 已设置' : undefined,
  llm_model_name: process.env.llm_model_name,
  COZE_API_TOKEN: process.env.COZE_API_TOKEN ? '✅ 已设置' : undefined,
  COZE_BOT_ID: process.env.COZE_BOT_ID,
  DEFAULT_CONTENT: process.env.DEFAULT_CONTENT,
  DATA_PROCESSOR_THREADS: process.env.DATA_PROCESSOR_THREADS,
  ASSESS_THREADS: process.env.ASSESS_THREADS
};
console.log('=== 项目环境变量 ===');
console.log(projectEnvs);
console.log('====================');



const app = express();
const PORT = process.env.PORT || 3000;

// 中间件配置
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 安全中间件
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// IP访问记录中间件
const supabase = require('./lib/supabase-client');
app.use(async (req, res, next) => {
  try {
    const clientIP = req.headers['x-forwarded-for'] || 
                     req.connection.remoteAddress || 
                     req.socket.remoteAddress ||
                     req.ip;
    
    // 记录到控制台（Railway日志可见）
    console.log(`访问IP: ${clientIP} - ${req.method} ${req.path} - ${new Date().toISOString()}`);
    
    // 只记录重要访问（过滤静态资源和特殊路径）
    const shouldLog = !req.path.match(/\.(css|js|ico|png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot)$/) &&
                     !req.path.startsWith('/.well-known/') &&
                     !req.path.startsWith('/api/logs');
    
    if (shouldLog) {
      console.log('准备插入数据库:', {
        ip_address: clientIP,
        user_agent: req.headers['user-agent'],
        path: req.path,
        method: req.method
      });
      
      const { data, error } = await supabase.from('access_logs').insert({
        ip_address: clientIP,
        user_agent: req.headers['user-agent'],
        path: req.path,
        method: req.method
      });
      
      if (error) {
        console.error('Supabase插入错误:', error);
      } else {
        console.log('数据库插入成功');
      }
    }
  } catch (error) {
    console.error('访问日志记录失败:', error);
  }
  next();
});

// 静态文件服务优化
app.use(express.static('public', {
  maxAge: '1d', // 缓存一天
  etag: true,
  lastModified: true
}));



// 注册新架构路由
const processExcelRouter = require('./routes/process-excel');
const downloadCsvRouter = require('./routes/download-csv');

// 先注册不需要验证的路由
app.use('/', processExcelRouter);
app.use('/', downloadCsvRouter);

app.use('/api', require('./routes/verify-access'));

// 访问权限验证中间件
const verifyAccess = require('./middleware/auth');
app.use('/api', verifyAccess);

// 需要权限的API路由
app.use('/api', require('./routes/run-assessment'));
app.use('/api', require('./routes/preview-data'));

app.use('/api/sessions', require('./routes/sessions'));
app.use('/api/sessions', require('./routes/session-details'));


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