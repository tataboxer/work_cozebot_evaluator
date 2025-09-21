// Excel处理路由
const express = require('express');
const multer = require('multer');
const xlsx = require('xlsx');
const router = express.Router();
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
  try {
    // 验证文件上传
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: '请上传Excel文件'
      });
    }
    
    console.log(`📊 收到Excel文件: ${req.file.originalname}`);
    
    // 解析Excel文件
    console.log('📋 开始解析Excel文件...');
    const workbook = xlsx.read(req.file.buffer, { 
      type: 'buffer',
      cellText: false,
      cellDates: true
    });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = xlsx.utils.sheet_to_json(worksheet, {
      raw: false,
      defval: ''
    });
    
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
    
    // 直接返回处理结果，不存储到内存
    res.json({
      success: true,
      message: 'Excel处理完成',
      data: {
        inputFile: req.file.originalname,
        inputRows: jsonData.length,
        outputRecords: processedResults.length,
        previewData: processedResults
      }
    });
    
  } catch (error) {
    console.error('❌ Excel处理失败:', error);
    
    res.status(500).json({
      success: false,
      message: 'Excel处理失败',
      error: error.message
    });
  }
});



module.exports = router;