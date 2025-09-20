// 内存存储管理模块
// 提供会话管理、数据存储和自动清理功能

// 全局内存存储
if (!global.memoryStore) {
  global.memoryStore = {
    sessions: {},
    cleanupInterval: null
  };
}

// 生成会话ID
function generateSessionId() {
  return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// 创建新会话
function createSession() {
  const sessionId = generateSessionId();
  global.memoryStore.sessions[sessionId] = {
    id: sessionId,
    excelData: null,        // 原始Excel数据
    processedData: null,    // 处理后的CSV数据
    assessmentData: null,   // 评估后的数据
    timestamp: Date.now(),  // 创建时间
    status: 'created'       // 状态: created, processing, completed, error
  };
  
  console.log(`📝 创建新会话: ${sessionId}`);
  return sessionId;
}

// 获取会话
function getSession(sessionId) {
  return global.memoryStore.sessions[sessionId] || null;
}

// 更新会话数据
function updateSession(sessionId, data) {
  const session = global.memoryStore.sessions[sessionId];
  if (session) {
    Object.assign(session, data);
    session.timestamp = Date.now(); // 更新时间戳
    console.log(`📝 更新会话: ${sessionId}, 状态: ${session.status}`);
    return true;
  }
  return false;
}

// 删除会话
function deleteSession(sessionId) {
  if (global.memoryStore.sessions[sessionId]) {
    delete global.memoryStore.sessions[sessionId];
    console.log(`🗑️ 删除会话: ${sessionId}`);
    return true;
  }
  return false;
}

// 清理过期会话 (30分钟)
function cleanupExpiredSessions() {
  const now = Date.now();
  const expireTime = 30 * 60 * 1000; // 30分钟
  let cleanedCount = 0;
  
  for (const sessionId in global.memoryStore.sessions) {
    const session = global.memoryStore.sessions[sessionId];
    if (now - session.timestamp > expireTime) {
      delete global.memoryStore.sessions[sessionId];
      cleanedCount++;
    }
  }
  
  if (cleanedCount > 0) {
    console.log(`🧹 清理过期会话: ${cleanedCount} 个`);
  }
}

// 启动自动清理
function startAutoCleanup() {
  if (!global.memoryStore.cleanupInterval) {
    global.memoryStore.cleanupInterval = setInterval(cleanupExpiredSessions, 5 * 60 * 1000); // 每5分钟清理一次
    console.log('🔄 启动自动清理机制');
  }
}

// 停止自动清理
function stopAutoCleanup() {
  if (global.memoryStore.cleanupInterval) {
    clearInterval(global.memoryStore.cleanupInterval);
    global.memoryStore.cleanupInterval = null;
    console.log('⏹️ 停止自动清理机制');
  }
}

// 获取存储统计信息
function getStats() {
  const sessions = global.memoryStore.sessions;
  const sessionCount = Object.keys(sessions).length;
  let totalSize = 0;
  
  // 估算内存使用量
  for (const sessionId in sessions) {
    const session = sessions[sessionId];
    totalSize += JSON.stringify(session).length;
  }
  
  return {
    sessionCount,
    totalSize: Math.round(totalSize / 1024) + ' KB',
    sessions: Object.keys(sessions)
  };
}

module.exports = {
  createSession,
  getSession,
  updateSession,
  deleteSession,
  cleanupExpiredSessions,
  startAutoCleanup,
  stopAutoCleanup,
  getStats
};