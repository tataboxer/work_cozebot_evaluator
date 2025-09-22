const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

/**
 * 手动更新ACCESS_TOKEN到.env文件
 */
router.post('/manual-token', async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token || !token.trim()) {
      return res.status(400).json({
        success: false,
        message: '缺少Token参数'
      });
    }
    
    const cleanToken = token.trim();
    console.log(`📝 收到手动Token更新请求，Token长度: ${cleanToken.length}`);
    
    // 更新.env文件中的token（参考get-token.js的逻辑）
    const envPath = path.join(__dirname, '..', '.env');
    
    try {
      // 读取现有的.env文件内容
      let envContent = '';
      if (fs.existsSync(envPath)) {
        envContent = fs.readFileSync(envPath, 'utf8');
      }
      
      // 更新ACCESS_TOKEN（添加Bearer前缀）
      const newAccessToken = `ACCESS_TOKEN=Bearer ${cleanToken}`;
      if (envContent.includes('ACCESS_TOKEN=')) {
        envContent = envContent.replace(/ACCESS_TOKEN=.*$/m, newAccessToken);
      } else {
        envContent += `\n${newAccessToken}\n`;
      }
      
      // 写回文件
      fs.writeFileSync(envPath, envContent, 'utf8');
      console.log('✅ 手动Token已更新到 .env 文件');
      
      // 更新当前进程的环境变量
      process.env.ACCESS_TOKEN = `Bearer ${cleanToken}`;
      
      return res.json({
        success: true,
        message: 'Token更新成功'
      });
      
    } catch (error) {
      console.error('❌ 更新.env文件失败:', error.message);
      return res.status(500).json({
        success: false,
        message: `更新.env文件失败: ${error.message}`
      });
    }
    
  } catch (error) {
    console.error('❌ 手动Token更新失败:', error);
    res.status(500).json({
      success: false,
      message: '手动Token更新失败',
      error: error.message
    });
  }
});

module.exports = router;