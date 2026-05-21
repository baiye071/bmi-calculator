const { supabaseAdmin, getSupabaseUser } = require('../_lib/auth');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = await getSupabaseUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const { bmiHistory, periodData, apiKey } = req.body;
  const result = { imported: { bmi: 0, period: false, settings: false } };

  // 1. Bulk insert BMI records
  if (Array.isArray(bmiHistory) && bmiHistory.length > 0) {
    const records = bmiHistory.slice(0, 100).map(r => ({
      user_id: user.id,
      date: r.date,
      bmi: r.bmi,
      bf: r.bf,
      tdee: r.tdee,
      whr: r.whr || null,
      weight: r.weight,
      height: r.height,
      age: r.age,
      gender: r.gender,
    }));

    const { data, error } = await supabaseAdmin
      .from('bmi_records')
      .insert(records)
      .select();

    if (!error) result.imported.bmi = data?.length || 0;

    // Enforce 100-record cap after import
    const { count } = await supabaseAdmin
      .from('bmi_records')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    if (count > 100) {
      const { data: old } = await supabaseAdmin
        .from('bmi_records')
        .select('id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
        .limit(count - 100);
      if (old?.length) {
        await supabaseAdmin
          .from('bmi_records')
          .delete()
          .in('id', old.map(r => r.id));
      }
    }
  }

  // 2. Upsert period data
  if (periodData && (periodData.ranges?.length || periodData.symptoms)) {
    const { error } = await supabaseAdmin
      .from('period_data')
      .upsert({
        user_id: user.id,
        ranges: periodData.ranges || [],
        ovulation_days: periodData.ovulationDays || [],
        symptoms: periodData.symptoms || {},
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

    if (!error) result.imported.period = true;
  }

  // 3. Upsert settings
  if (apiKey) {
    const { error } = await supabaseAdmin
      .from('user_settings')
      .upsert({
        user_id: user.id,
        api_key: apiKey,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

    if (!error) result.imported.settings = true;
  }

  return res.json(result);
};
