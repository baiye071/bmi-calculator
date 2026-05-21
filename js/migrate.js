async function checkAndOfferMigration() {
  const bmiLocal = (() => {
    try { return JSON.parse(localStorage.getItem('bmi_history') || '[]'); }
    catch { return []; }
  })();
  const periodLocal = (() => {
    try { return JSON.parse(localStorage.getItem('period_data') || '{}'); }
    catch { return {}; }
  })();
  const apiKeyLocal = localStorage.getItem('mimo_api_key') || '';

  const hasData = bmiLocal.length > 0
    || (periodLocal.ranges && periodLocal.ranges.length > 0)
    || apiKeyLocal;

  if (!hasData) return;

  // Check if server already has data
  try {
    const { records } = await apiFetch('bmi');
    if (records.length > 0) return;
  } catch { return; }

  const parts = [];
  if (bmiLocal.length) parts.push(`${bmiLocal.length} 条BMI记录`);
  if (periodLocal.ranges?.length) parts.push(`${periodLocal.ranges.length} 次经期记录`);
  if (apiKeyLocal) parts.push('API Key');

  const msg = `检测到本地有 ${parts.join('、')}，是否同步到云端？\n\n同步后可在其他设备访问这些数据。`;

  if (!confirm(msg)) return;

  try {
    const result = await apiFetch('migrate', {
      method: 'POST',
      body: JSON.stringify({
        bmiHistory: bmiLocal,
        periodData: {
          ranges: periodLocal.ranges || [],
          ovulationDays: periodLocal.ovulationDays || [],
          symptoms: periodLocal.symptoms || {},
        },
        apiKey: apiKeyLocal || undefined,
      }),
    });
    const imported = result.imported;
    const msgs = [];
    if (imported.bmi) msgs.push(`${imported.bmi} 条BMI记录`);
    if (imported.period) msgs.push('经期数据');
    if (imported.settings) msgs.push('API Key');
    alert(`同步成功！已导入：${msgs.join('、')}`);
  } catch (err) {
    alert('同步失败：' + err.message + '\n本地数据未受影响。');
  }
}
