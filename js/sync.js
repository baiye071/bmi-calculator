// ============ BMI History ============

async function getHistory() {
  try {
    const { records } = await apiFetch('bmi');
    localStorage.setItem('bmi_history', JSON.stringify(records));
    return records;
  } catch {
    try { return JSON.parse(localStorage.getItem('bmi_history') || '[]'); }
    catch { return []; }
  }
}

async function saveRecord(record) {
  // Optimistic local write
  const local = (() => {
    try { return JSON.parse(localStorage.getItem('bmi_history') || '[]'); }
    catch { return []; }
  })();
  local.unshift(record);
  if (local.length > 100) local.length = 100;
  localStorage.setItem('bmi_history', JSON.stringify(local));

  // Server write
  try {
    const { record: serverRecord } = await apiFetch('bmi', {
      method: 'POST',
      body: JSON.stringify(record),
    });
    // Update local with server-assigned id
    if (serverRecord?.id) {
      const cached = JSON.parse(localStorage.getItem('bmi_history') || '[]');
      if (cached[0] && !cached[0].id) {
        cached[0].id = serverRecord.id;
        localStorage.setItem('bmi_history', JSON.stringify(cached));
      }
    }
  } catch { /* offline: local copy is enough */ }
}

async function delRecord(index) {
  const local = (() => {
    try { return JSON.parse(localStorage.getItem('bmi_history') || '[]'); }
    catch { return []; }
  })();
  const record = local[index];
  local.splice(index, 1);
  localStorage.setItem('bmi_history', JSON.stringify(local));

  if (record?.id) {
    try { await apiFetch('bmi?id=' + record.id, { method: 'DELETE' }); } catch {}
  }
}

async function clearHistory() {
  localStorage.removeItem('bmi_history');
  try { await apiFetch('bmi?all=true', { method: 'DELETE' }); } catch {}
}

// ============ Period Data ============

async function getPeriodData() {
  try {
    const data = await apiFetch('period');
    const normalized = {
      ranges: data.ranges || [],
      ovulationDays: data.ovulationDays || [],
      symptoms: data.symptoms || {},
    };
    localStorage.setItem('period_data', JSON.stringify(normalized));
    return normalized;
  } catch {
    try {
      const d = JSON.parse(localStorage.getItem('period_data') || '{}');
      if (!d.ranges) d.ranges = [];
      if (!d.ovulationDays) d.ovulationDays = [];
      if (!d.symptoms) d.symptoms = {};
      // Legacy migration
      if (d.periods && !d._migrated) {
        const sorted = [...d.periods].sort();
        const ranges = [];
        let start = sorted[0], end = sorted[0];
        for (let i = 1; i < sorted.length; i++) {
          const diff = (new Date(sorted[i]) - new Date(end)) / 86400000;
          if (diff <= 2) end = sorted[i];
          else { ranges.push({ start, end }); start = sorted[i]; end = sorted[i]; }
        }
        ranges.push({ start, end });
        d.ranges = ranges;
        d.ovulationDays = d.ovulationDays || [];
        delete d.periods;
        d._migrated = true;
        localStorage.setItem('period_data', JSON.stringify(d));
      }
      return d;
    } catch { return { ranges: [], ovulationDays: [], symptoms: {} }; }
  }
}

async function savePeriodData(data) {
  localStorage.setItem('period_data', JSON.stringify(data));
  try {
    await apiFetch('period', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  } catch { /* offline */ }
}

async function saveSymptom(dateStr, symptomData) {
  const data = await getPeriodData();
  data.symptoms[dateStr] = symptomData;
  await savePeriodData(data);
}

// ============ Settings (API Key) ============

let _cachedApiKey = '';

async function getApiKey() {
  if (_cachedApiKey) return _cachedApiKey;
  try {
    const { apiKey } = await apiFetch('settings');
    if (apiKey) {
      _cachedApiKey = apiKey;
      return apiKey;
    }
  } catch {}
  return '';
}

async function setApiKey(key) {
  _cachedApiKey = key;
  try {
    await apiFetch('settings', {
      method: 'PUT',
      body: JSON.stringify({ apiKey: key }),
    });
  } catch {}
}

// ============ Combined data for analysis ============

async function getAllData() {
  const [history, period] = await Promise.all([getHistory(), getPeriodData()]);
  return { history, period };
}

// ============ Privacy: Export & Delete ============

async function exportAllData() {
  const [history, period] = await Promise.all([getHistory(), getPeriodData()]);
  const exportObj = {
    exportDate: new Date().toISOString(),
    bmiHistory: history,
    periodData: period,
  };
  const blob = new Blob([JSON.stringify(exportObj, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `health_data_${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

async function deleteAllServerData() {
  try { await apiFetch('bmi?all=true', { method: 'DELETE' }); } catch {}
  try { await apiFetch('period', { method: 'DELETE' }); } catch {}
  localStorage.removeItem('bmi_history');
  localStorage.removeItem('period_data');
  _cachedApiKey = '';
}
