const express = require('express');
const router = express.Router();

/**
 * 验证访问密钥
 */
router.post('/verify-access', (req, res) => {
  try {
    const { key } = req.body;
    const correctKey = process.env.ACCESS_KEY;
    

    
    if (!key) {
      return res.status(400).json({
        success: false,
        message: '缺少访问密钥'
      });
    }
    
    if (key === correctKey) {
      return res.json({
        success: true,
        message: '访问验证成功'
      });
    } else {
      return res.status(401).json({
        success: false,
        message: '访问密钥错误'
      });
    }
    
  } catch (error) {
    console.error('访问验证失败:', error);
    res.status(500).json({
      success: false,
      message: '验证失败',
      error: error.message
    });
  }
});

module.exports = router;