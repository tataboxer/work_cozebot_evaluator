// CSV下载路由
const express = require('express');
const router = express.Router();
const memoryStore = require('../lib/memory-store');

/**
 * 下载处理后的CSV文件
 */
router.get('/download-csv/:sessionId', (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = memoryStore.getSession(sessionId);
    
    if (!session) {
      return res.status(404).json({
        success: false,
        message: '会话不存在'
      });
    }
    
    if (!session.processedData) {
      return res.status(404).json({
        success: false,
        message: '没有可下载的处理数据'
      });
    }
    
    console.log(`📥 下载CSV文件: 会话 ${sessionId}`);
    
    // 生成CSV内容
    const csvContent = generateCSVContent(session.processedData);
    
    // 生成文件名
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const fileName = `results_${timestamp}.csv`;
    
    // 设置响应头
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', Buffer.byteLength(csvContent, 'utf8'));
    
    // 发送CSV内容
    res.send(csvContent);
    
    console.log(`✅ CSV文件下载完成: ${fileName}`);
    
  } catch (error) {
    console.error('❌ CSV下载失败:', error);
    res.status(500).json({
      success: false,
      message: 'CSV下载失败',
      error: error.message
    });
  }
});

/**
 * 下载评估结果CSV文件
 */
router.get('/download-result/:sessionId', (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = memoryStore.getSession(sessionId);
    
    if (!session) {
      return res.status(404).json({
        success: false,
        message: '会话不存在'
      });
    }
    
    if (!session.assessmentData) {
      return res.status(404).json({
        success: false,
        message: '没有可下载的评估数据'
      });
    }
    
    console.log(`📥 下载评估结果: 会话 ${sessionId}`);
    
    // 生成CSV内容
    const csvContent = generateCSVContent(session.assessmentData);
    
    // 生成文件名
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const fileName = `assessment_${timestamp}.csv`;
    
    // 设置响应头
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', Buffer.byteLength(csvContent, 'utf8'));
    
    // 发送CSV内容
    res.send(csvContent);
    
    console.log(`✅ 评估结果下载完成: ${fileName}`);
    
  } catch (error) {
    console.error('❌ 评估结果下载失败:', error);
    res.status(500).json({
      success: false,
      message: '评估结果下载失败',
      error: error.message
    });
  }
});

/**
 * 生成CSV内容
 * @param {Array} data - 数据数组
 * @returns {string} CSV字符串
 */
function generateCSVContent(data) {
  if (!data || data.length === 0) {
    return '';
  }
  
  // 获取所有列名
  const headers = Object.keys(data[0]);
  
  // 转义CSV字段
  function escapeCSVField(field) {
    if (field === null || field === undefined) {
      return '';
    }
    
    let str = String(field);
    
    // 将换行符转义为字符串，保持CSV格式正确
    str = str.replace(/\n/g, '\\n').replace(/\r/g, '\\r');
    
    // 如果包含逗号或引号，用引号包围并转义内部引号
    if (str.includes(',') || str.includes('"')) {
      return '"' + str.replace(/"/g, '""') + '"';
    }
    
    return str;
  }
  
  // 生成表头行
  const headerRow = headers.map(escapeCSVField).join(',');
  
  // 生成数据行
  const dataRows = data.map(record => {
    return headers.map(header => escapeCSVField(record[header])).join(',');
  });
  
  // 合并所有行
  const csvLines = [headerRow, ...dataRows];
  
  // 添加BOM以确保Excel正确显示中文
  const BOM = '\uFEFF';
  return BOM + csvLines.join('\n');
}

/**
 * 获取会话数据预览
 */
router.get('/download-csv/preview/:sessionId', (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = memoryStore.getSession(sessionId);
    
    if (!session) {
      return res.status(404).json({
        success: false,
        message: '会话不存在'
      });
    }
    
    // 优先返回评估数据，其次是处理数据
    const data = session.assessmentData || session.processedData;
    
    if (!data) {
      return res.json({
        success: true,
        data: [],
        message: '暂无数据'
      });
    }
    
    res.json({
      success: true,
      data: data,
      totalRecords: data.length
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '获取预览数据失败',
      error: error.message
    });
  }
});

router.get('/preview/:sessionId', (req, res) => {
  try {
    const { sessionId } = req.params;
    const { type = 'processed' } = req.query; // processed 或 assessment
    
    const session = memoryStore.getSession(sessionId);
    
    if (!session) {
      return res.status(404).json({
        success: false,
        message: '会话不存在'
      });
    }
    
    let data;
    if (type === 'assessment') {
      data = session.assessmentData;
    } else {
      data = session.processedData;
    }
    
    if (!data) {
      return res.json({
        success: true,
        data: [],
        message: '暂无数据'
      });
    }
    
    // 返回全部数据
    const previewData = data;
    
    res.json({
      success: true,
      data: previewData,
      totalRecords: data.length,
      previewCount: previewData.length,
      hasMore: data.length > 10
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '获取预览数据失败',
      error: error.message
    });
  }
});

module.exports = router;