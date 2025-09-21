// 数据预览路由 - 已废弃
const express = require('express');
const router = express.Router();

/**
 * 数据预览接口（已废弃）
 * 现在使用前端直接管理数据
 */
router.get('/preview/:sessionId', (req, res) => {
  res.status(410).json({
    success: false,
    message: '此接口已废弃，现在使用前端直接管理数据'
  });
});

module.exports = router;