const { supabaseAdmin, getSupabaseUser } = require('../_lib/auth');

module.exports = async function handler(req, res) {
  const user = await getSupabaseUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  if (req.method === 'GET') {
    const { data, error } = await supabaseAdmin
      .from('period_data')
      .select('ranges, ovulation_days, symptoms')
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      return res.status(500).json({ error: error.message });
    }

    return res.json({
      ranges: data?.ranges || [],
      ovulationDays: data?.ovulation_days || [],
      symptoms: data?.symptoms || {},
    });
  }

  if (req.method === 'PUT') {
    const { ranges, ovulationDays, symptoms } = req.body;

    const { error } = await supabaseAdmin
      .from('period_data')
      .upsert({
        user_id: user.id,
        ranges: ranges || [],
        ovulation_days: ovulationDays || [],
        symptoms: symptoms || {},
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ ok: true });
  }

  res.setHeader('Allow', 'GET, PUT');
  res.status(405).json({ error: 'Method not allowed' });
};
