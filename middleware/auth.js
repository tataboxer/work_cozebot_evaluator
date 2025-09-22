/**
 * 访问权限验证中间件
 */
function verifyAccess(req, res, next) {
  // 跳过验证接口本身
  if (req.path === '/api/verify-access' || req.url === '/api/verify-access') {
    return next();
  }
  
  // 对于/api/logs，检查URL参数中的accessKey
  if (req.path === '/api/logs' || req.url.startsWith('/api/logs')) {
    const accessKey = req.query.accessKey;
    const correctKey = process.env.ACCESS_KEY;
    
    if (accessKey === correctKey) {
      return next();
    } else {
      return res.status(401).json({
        success: false,
        message: '日志访问需要有效密钥'
      });
    }
  }
  
  const accessKey = req.headers['x-access-key'] || req.body?.accessKey || req.query?.accessKey;
  const correctKey = process.env.ACCESS_KEY;
  
  if (!accessKey) {
    return res.status(401).json({
      success: false,
      message: '缺少访问密钥，请先进行访问验证'
    });
  }
  
  if (accessKey !== correctKey) {
    return res.status(401).json({
      success: false,
      message: '访问密钥无效'
    });
  }
  
  next();
}

module.exports = verifyAccess;