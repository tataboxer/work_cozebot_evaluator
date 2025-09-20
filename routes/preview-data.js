// 数据预览路由
const express = require('express');
const router = express.Router();
const memoryStore = require('../lib/memory-store');

/**
 * 获取会话数据预览
 */
router.get('/preview/:sessionId', (req, res) => {
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

module.exports = router;