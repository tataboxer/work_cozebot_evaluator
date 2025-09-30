const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

const ENV_FILE_PATH = path.join(__dirname, '..', '.env');

// 获取当前扣子ID
router.get('/', (req, res) => {
  try {
    const cozeBotId = process.env.COZE_BOT_ID || '7550204987524169763';
    res.json({
      success: true,
      cozeBotId: cozeBotId
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '获取扣子ID失败',
      error: error.message
    });
  }
});

// 更新扣子ID
router.put('/', (req, res) => {
  try {
    const { cozeBotId } = req.body;
    
    if (!cozeBotId || !cozeBotId.trim()) {
      return res.status(400).json({
        success: false,
        message: '扣子ID不能为空'
      });
    }

    // 验证扣子ID格式（数字）
    if (!/^\d+$/.test(cozeBotId.trim())) {
      return res.status(400).json({
        success: false,
        message: '扣子ID格式不正确，应为纯数字'
      });
    }

    // 读取.env文件
    let envContent = '';
    if (fs.existsSync(ENV_FILE_PATH)) {
      envContent = fs.readFileSync(ENV_FILE_PATH, 'utf8');
    }

    // 更新COZE_BOT_ID
    const lines = envContent.split('\n');
    let updated = false;
    
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith('COZE_BOT_ID=')) {
        lines[i] = `COZE_BOT_ID=${cozeBotId.trim()}`;
        updated = true;
        break;
      }
    }
    
    // 如果没找到，添加到文件末尾
    if (!updated) {
      lines.push(`COZE_BOT_ID=${cozeBotId.trim()}`);
    }

    // 写回文件
    fs.writeFileSync(ENV_FILE_PATH, lines.join('\n'), 'utf8');
    
    // 更新环境变量
    process.env.COZE_BOT_ID = cozeBotId.trim();
    
    console.log(`✅ 扣子ID已更新: ${cozeBotId.trim()}`);
    
    res.json({
      success: true,
      message: '扣子ID更新成功',
      cozeBotId: cozeBotId.trim()
    });
    
  } catch (error) {
    console.error('❌ 更新扣子ID失败:', error);
    res.status(500).json({
      success: false,
      message: '更新扣子ID失败',
      error: error.message
    });
  }
});

module.exports = router;