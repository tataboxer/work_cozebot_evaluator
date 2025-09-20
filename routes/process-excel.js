// Excel处理路由
const express = require('express');
const multer = require('multer');
const xlsx = require('xlsx');
const router = express.Router();
const memoryStore = require('../lib/memory-store');
const cozeClient = require('../lib/coze-client');

// 文件上传配置
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB限制
  }
});

/**
 * 处理Excel文件上传和Coze API调用
 */
router.post('/process-excel', upload.single('excelFile'), async (req, res) => {
  let sessionId = null;
  
  try {
    // 验证文件上传
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: '请上传Excel文件'
      });
    }
    
    console.log(`📊 收到Excel文件: ${req.file.originalname}`);
    
    // 创建新会话
    sessionId = memoryStore.createSession();
    console.log(`📝 创建处理会话: ${sessionId}`);
    
    // 更新会话状态
    memoryStore.updateSession(sessionId, {
      status: 'processing',
      fileName: req.file.originalname,
      fileSize: req.file.size
    });
    
    // 解析Excel文件
    console.log('📋 开始解析Excel文件...');
    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = xlsx.utils.sheet_to_json(worksheet);
    
    if (jsonData.length === 0) {
      throw new Error('Excel文件为空或格式不正确');
    }
    
    console.log(`📊 解析完成，共 ${jsonData.length} 行数据`);
    
    // 验证必要的列
    const requiredColumns = ['question_id', 'question_text'];
    const firstRow = jsonData[0];
    const missingColumns = requiredColumns.filter(col => !(col in firstRow));
    
    if (missingColumns.length > 0) {
      throw new Error(`缺少必要的列: ${missingColumns.join(', ')}`);
    }
    
    // 存储原始Excel数据
    memoryStore.updateSession(sessionId, {
      excelData: jsonData,
      status: 'excel_parsed'
    });
    
    console.log('🤖 开始调用Coze API处理问题...');
    
    // 批量处理问题
    const processedResults = await cozeClient.batchProcessQuestions(
      jsonData,
      (current, total, recordCount) => {
        console.log(`📈 进度: ${current}/${total} (已生成${recordCount}条记录)`);
        if (global.broadcastLog) {
          global.broadcastLog('info', `处理进度: ${current}/${total}`);
        }
      }
    );
    
    console.log(`✅ Coze API处理完成，共生成 ${processedResults.length} 条记录`);
    
    // 存储处理结果
    memoryStore.updateSession(sessionId, {
      processedData: processedResults,
      status: 'completed',
      processedCount: processedResults.length,
      completedAt: new Date().toISOString()
    });
    
    // 返回成功结果
    res.json({
      success: true,
      message: 'Excel处理完成',
      sessionId: sessionId,
      data: {
        inputFile: req.file.originalname,
        inputRows: jsonData.length,
        outputRecords: processedResults.length,
        previewData: processedResults // 返回全部数据作为预览
      }
    });
    
  } catch (error) {
    console.error('❌ Excel处理失败:', error);
    
    // 更新会话状态为错误
    if (sessionId) {
      memoryStore.updateSession(sessionId, {
        status: 'error',
        error: error.message,
        errorAt: new Date().toISOString()
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Excel处理失败',
      error: error.message,
      sessionId: sessionId
    });
  }
});

/**
 * 获取处理状态
 */
router.get('/process-status/:sessionId', (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = memoryStore.getSession(sessionId);
    
    if (!session) {
      return res.status(404).json({
        success: false,
        message: '会话不存在'
      });
    }
    
    res.json({
      success: true,
      session: {
        id: session.id,
        status: session.status,
        fileName: session.fileName,
        inputRows: session.excelData ? session.excelData.length : 0,
        outputRecords: session.processedData ? session.processedData.length : 0,
        error: session.error,
        completedAt: session.completedAt
      }
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '获取状态失败',
      error: error.message
    });
  }
});

module.exports = router;