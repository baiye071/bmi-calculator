function checkAbnormalities(data, stats) {
  const alerts = [];
  if (!stats) stats = getStats(data);
  const ranges = data.ranges.filter(r => r.start && r.end);
  const symptoms = data.symptoms || {};

  if (ranges.length < 2) return alerts;

  // Rule 1: Cycle length sudden change
  if (stats.rawCycles && stats.rawCycles.length >= 3) {
    const recent = stats.rawCycles.slice(-3);
    const avg = recent.reduce((a,b) => a+b, 0) / recent.length;
    if (Math.abs(recent[recent.length-1] - avg) > 7) {
      alerts.push({
        type: 'cycle_change', level: 'info', title: '周期长度变化',
        message: `最近一次周期为${recent[recent.length-1]}天，与近期平均${Math.round(avg)}天差异较大。偶尔波动属正常，如持续异常建议就医。`
      });
    }
  }

  // Rule 2: Abnormal bleeding duration
  if (stats.rawDurations && stats.rawDurations.length) {
    const lastDur = stats.rawDurations[stats.rawDurations.length - 1];
    if (lastDur > 8) {
      alerts.push({
        type: 'long_period', level: 'warn', title: '经期偏长',
        message: `最近一次月经持续${lastDur}天。正常月经期通常为3-7天，如反复出现建议就医检查。`
      });
    }
  }

  // Rule 3: Consistently high cramp scores
  const crampEntries = Object.entries(symptoms).filter(([d, s]) => s.cramps >= 4);
  if (crampEntries.length >= 3) {
    alerts.push({
      type: 'high_cramps', level: 'info', title: '痛经较频繁',
      message: `你有${crampEntries.length}天记录了较高程度的痛经。持续严重痛经可能需要关注，可以考虑就医咨询。`
    });
  }

  // Rule 4: Heavy flow patterns
  const heavyFlow = Object.entries(symptoms).filter(([d, s]) => s.flow === '大量');
  if (heavyFlow.length >= 3) {
    alerts.push({
      type: 'heavy_flow', level: 'info', title: '经量偏多',
      message: `你有${heavyFlow.length}天记录了大量经血。持续大量出血可能导致贫血，建议关注铁的摄入。`
    });
  }

  // Rule 5: Long-term irregularity
  if (stats.rawCycles && stats.rawCycles.length >= 6 && stats.cycleStd > 8) {
    alerts.push({
      type: 'irregular', level: 'warn', title: '周期波动较大',
      message: `基于${stats.rawCycles.length}次记录，周期标准差为${stats.cycleStd}天（正常波动在7天以内）。建议就医检查。`
    });
  }

  // Rule 6: Low sleep average
  const sleepEntries = Object.entries(symptoms).filter(([d, s]) => s.sleep);
  if (sleepEntries.length >= 5) {
    const avgSleep = sleepEntries.reduce((sum, [d, s]) => sum + parseFloat(s.sleep), 0) / sleepEntries.length;
    if (avgSleep < 6) {
      alerts.push({
        type: 'low_sleep', level: 'info', title: '睡眠不足',
        message: `你的平均睡眠时长为${avgSleep.toFixed(1)}小时，低于推荐的7-8小时。睡眠不足可能影响周期规律和情绪。`
      });
    }
  }

  return alerts;
}

function renderAlerts(alerts, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  if (!alerts.length) { container.innerHTML = ''; return; }
  container.innerHTML = alerts.map(a =>
    `<div class="alert-card ${a.level}"><div class="alert-title">${a.level === 'warn' ? '⚠️' : 'ℹ️'} ${a.title}</div><div class="alert-message">${a.message}</div></div>`
  ).join('');
}
