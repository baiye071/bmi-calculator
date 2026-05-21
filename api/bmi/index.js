const { supabaseAdmin, getSupabaseUser } = require('../_lib/auth');

module.exports = async function handler(req, res) {
  const user = await getSupabaseUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  if (req.method === 'GET') {
    const { data, error } = await supabaseAdmin
      .from('bmi_records')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ records: data || [] });
  }

  if (req.method === 'POST') {
    const { date, bmi, bf, tdee, whr, weight, height, age, gender } = req.body;
    if (!date || bmi == null) return res.status(400).json({ error: 'Missing required fields' });

    const { data, error } = await supabaseAdmin
      .from('bmi_records')
      .insert({ user_id: user.id, date, bmi, bf, tdee, whr, weight, height, age, gender })
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });

    // Enforce 100-record cap
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

    return res.json({ record: data });
  }

  if (req.method === 'DELETE') {
    const { id, all } = req.query;
    if (all === 'true') {
      const { error } = await supabaseAdmin
        .from('bmi_records')
        .delete()
        .eq('user_id', user.id);
      if (error) return res.status(500).json({ error: error.message });
      return res.json({ ok: true });
    }
    if (id) {
      const { error } = await supabaseAdmin
        .from('bmi_records')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);
      if (error) return res.status(500).json({ error: error.message });
      return res.json({ ok: true });
    }
    return res.status(400).json({ error: 'Missing id or all param' });
  }

  res.setHeader('Allow', 'GET, POST, DELETE');
  res.status(405).json({ error: 'Method not allowed' });
};
