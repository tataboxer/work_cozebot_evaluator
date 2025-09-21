// CSV下载路由 - 已废弃，使用前端生成CSV
const express = require('express');
const router = express.Router();

/**
 * 备用CSV下载接口（已废弃）
 * 现在使用前端直接生成CSV下载
 */
router.get('/download-csv/:sessionId', (req, res) => {
  res.status(410).json({
    success: false,
    message: '此接口已废弃，请使用前端CSV生成功能'
  });
});

router.get('/download-result/:sessionId', (req, res) => {
  res.status(410).json({
    success: false,
    message: '此接口已废弃，请使用前端CSV生成功能'
  });
});

module.exports = router;