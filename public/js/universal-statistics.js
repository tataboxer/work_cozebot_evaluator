// 通用统计计算模块 - 支持Node.js和浏览器环境
(function(global) {
  'use strict';

  // 统计计算核心逻辑
  function calculateStatistics(data, options = {}) {
    if (!data || !Array.isArray(data) || data.length === 0) {
      return getEmptyStats();
    }

    const validData = data.filter(row => {
      if (options.filterAnswerOnly && row.block_type !== 'answer') return false;
      if (options.filterTextReplyOnly && row.block_subtype !== '文本回复') return false;
      return true;
    });

    const totalRows = validData.length;
    const answerRows = validData.filter(row => row.block_type === 'answer').length;
    const textReplyRows = validData.filter(row => row.block_subtype === '文本回复').length;

    const scores = collectScores(validData);
    const timings = collectTimings(validData);
    const avgScores = calculateAverageScores(scores);
    const timingStats = calculateTimingStats(timings);
    const evaluatedRows = countEvaluatedRows(validData);

    return {
      totalRows, answerRows, textReplyRows, evaluatedRows,
      ...avgScores, ...timingStats,
      rawScores: scores, rawTimings: timings
    };
  }

  function collectScores(data) {
    const scores = { accuracy: [], professionalism: [], tone: [] };
    data.forEach(row => {
      if (row.evaluation_results) {
        const eval_results = row.evaluation_results;
        if (eval_results.accuracy?.score) scores.accuracy.push(parseFloat(eval_results.accuracy.score));
        if (eval_results.professionalism?.score) scores.professionalism.push(parseFloat(eval_results.professionalism.score));
        if (eval_results.tone_reasonableness?.score) scores.tone.push(parseFloat(eval_results.tone_reasonableness.score));
      } else {
        if (row['准确率']) scores.accuracy.push(parseFloat(row['准确率']));
        if (row['专业度']) scores.professionalism.push(parseFloat(row['专业度']));
        if (row['语气合理']) scores.tone.push(parseFloat(row['语气合理']));
      }
    });
    return scores;
  }

  function collectTimings(data) {
    const timings = { firstToken: [], duration: [] };
    data.forEach(row => {
      if (row.block_start && row.block_end) {
        const startTime = parseFloat(row.block_start);
        const endTime = parseFloat(row.block_end);
        if (!isNaN(startTime) && !isNaN(endTime)) {
          timings.firstToken.push(startTime);
          timings.duration.push(endTime - startTime);
        }
      }
    });
    return timings;
  }

  function calculateAverageScores(scores) {
    const avgAccuracy = scores.accuracy.length > 0 ? 
      (scores.accuracy.reduce((a, b) => a + b, 0) / scores.accuracy.length) : 0;
    const avgProfessionalism = scores.professionalism.length > 0 ? 
      (scores.professionalism.reduce((a, b) => a + b, 0) / scores.professionalism.length) : 0;
    const avgTone = scores.tone.length > 0 ? 
      (scores.tone.reduce((a, b) => a + b, 0) / scores.tone.length) : 0;

    return {
      avgAccuracy: avgAccuracy > 0 ? avgAccuracy.toFixed(2) : 'N/A',
      avgProfessionalism: avgProfessionalism > 0 ? avgProfessionalism.toFixed(2) : 'N/A',
      avgTone: avgTone > 0 ? avgTone.toFixed(2) : 'N/A',
      avgAccuracyNum: avgAccuracy,
      avgProfessionalismNum: avgProfessionalism,
      avgToneNum: avgTone
    };
  }

  function calculateTimingStats(timings) {
    const avgFirstToken = timings.firstToken.length > 0 ? 
      (timings.firstToken.reduce((a, b) => a + b, 0) / timings.firstToken.length) : 0;
    const avgDuration = timings.duration.length > 0 ? 
      (timings.duration.reduce((a, b) => a + b, 0) / timings.duration.length) : 0;
    const minFirstToken = timings.firstToken.length > 0 ? Math.min(...timings.firstToken) : 0;
    const maxFirstToken = timings.firstToken.length > 0 ? Math.max(...timings.firstToken) : 0;
    const minDuration = timings.duration.length > 0 ? Math.min(...timings.duration) : 0;
    const maxDuration = timings.duration.length > 0 ? Math.max(...timings.duration) : 0;

    return {
      avgFirstToken: avgFirstToken > 0 ? avgFirstToken.toFixed(1) : 'N/A',
      avgDuration: avgDuration > 0 ? avgDuration.toFixed(1) : 'N/A',
      minFirstToken: minFirstToken > 0 ? minFirstToken.toFixed(1) : 'N/A',
      maxFirstToken: maxFirstToken > 0 ? maxFirstToken.toFixed(1) : 'N/A',
      minDuration: minDuration > 0 ? minDuration.toFixed(1) : 'N/A',
      maxDuration: maxDuration > 0 ? maxDuration.toFixed(1) : 'N/A',
      avgFirstTokenNum: avgFirstToken,
      avgDurationNum: avgDuration,
      minFirstTokenNum: minFirstToken,
      maxFirstTokenNum: maxFirstToken,
      minDurationNum: minDuration,
      maxDurationNum: maxDuration
    };
  }

  function countEvaluatedRows(data) {
    return data.filter(row => {
      if (row.evaluation_results) {
        const eval_results = row.evaluation_results;
        return eval_results.accuracy && eval_results.professionalism && eval_results.tone_reasonableness;
      } else {
        return row['准确率'] && row['专业度'] && row['语气合理'];
      }
    }).length;
  }

  function getEmptyStats() {
    return {
      totalRows: 0, answerRows: 0, textReplyRows: 0, evaluatedRows: 0,
      avgAccuracy: 'N/A', avgProfessionalism: 'N/A', avgTone: 'N/A',
      avgFirstToken: 'N/A', avgDuration: 'N/A',
      minFirstToken: 'N/A', maxFirstToken: 'N/A',
      minDuration: 'N/A', maxDuration: 'N/A',
      avgAccuracyNum: 0, avgProfessionalismNum: 0, avgToneNum: 0,
      avgFirstTokenNum: 0, avgDurationNum: 0,
      minFirstTokenNum: 0, maxFirstTokenNum: 0,
      minDurationNum: 0, maxDurationNum: 0,
      rawScores: { accuracy: [], professionalism: [], tone: [] },
      rawTimings: { firstToken: [], duration: [] }
    };
  }

  function formatForDatabase(stats) {
    return {
      avgAccuracy: stats.avgAccuracyNum,
      avgProfessionalism: stats.avgProfessionalismNum,
      avgToneReasonableness: stats.avgToneNum,
      totalEvaluated: stats.evaluatedRows
    };
  }

  function generateStatsHTML(stats) {
    return `
      <div class="stats-item">
        <span class="stats-label">数据统计:</span>
      </div>
      <div class="stats-item">
        <span class="stats-label">总行数:</span>
        <span class="stats-value">${stats.totalRows}</span>
        <span class="stats-separator">|</span>
      </div>
      <div class="stats-item">
        <span class="stats-label">显示行数:</span>
        <span class="stats-value">${stats.totalRows}</span>
        <span class="stats-separator">|</span>
      </div>
      <div class="stats-item">
        <span class="stats-label">文本回复:</span>
        <span class="stats-value">${stats.textReplyRows}</span>
        <span class="stats-separator">|</span>
      </div>
      <div class="stats-item">
        <span class="stats-label">已评估:</span>
        <span class="stats-value">${stats.evaluatedRows}/${stats.answerRows}</span>
        <span class="stats-separator">|</span>
      </div>
      <div class="stats-item timing-stats">
        <span class="stats-label">首token平均时长:</span>
        <span class="stats-value">${stats.avgFirstToken}s (${stats.minFirstToken}-${stats.maxFirstToken})</span>
        <span class="stats-separator">|</span>
        <span class="stats-label">段平均时长:</span>
        <span class="stats-value">${stats.avgDuration}s (${stats.minDuration}-${stats.maxDuration})</span>
      </div>
      <div class="stats-item">
        <span class="stats-label">平均分数:</span>
        <span class="stats-value">准确率: ${stats.avgAccuracy} | 专业度: ${stats.avgProfessionalism} | 语气: ${stats.avgTone}</span>
        <span class="stats-separator">|</span>
      </div>
    `;
  }

  // 导出API
  const StatisticsCalculator = {
    calculateStatistics,
    formatForDatabase,
    generateStatsHTML,
    getEmptyStats
  };

  // 环境检测和导出
  if (typeof module !== 'undefined' && module.exports) {
    // Node.js环境
    module.exports = StatisticsCalculator;
  } else if (typeof window !== 'undefined') {
    // 浏览器环境
    window.StatisticsUtils = StatisticsCalculator;
  } else {
    // 其他环境
    global.StatisticsCalculator = StatisticsCalculator;
  }

})(typeof globalThis !== 'undefined' ? globalThis : this);