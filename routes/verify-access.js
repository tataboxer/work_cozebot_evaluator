const express = require('express');
const router = express.Router();

/**
 * 验证访问密钥
 */
router.post('/verify-access', (req, res) => {
  try {
    const { key } = req.body;
    const correctKey = process.env.ACCESS_KEY;
    
    // Railway调试信息
    console.log('Railway 访问密钥验证:');
    console.log('输入密钥:', key);
    console.log('环境变量 ACCESS_KEY:', correctKey);
    console.log('密钥匹配:', key === correctKey);
    console.log('所有环境变量:', Object.keys(process.env).filter(k => k.includes('ACCESS')));
    
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
        message: `访问密钥错误 - 输入: ${key}, 期望: ${correctKey}`
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