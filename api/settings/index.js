const { supabaseAdmin, getSupabaseUser } = require('../_lib/auth');

module.exports = async function handler(req, res) {
  const user = await getSupabaseUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  if (req.method === 'GET') {
    const { data, error } = await supabaseAdmin
      .from('user_settings')
      .select('api_key')
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      return res.status(500).json({ error: error.message });
    }

    return res.json({ apiKey: data?.api_key || null });
  }

  if (req.method === 'PUT') {
    const { apiKey } = req.body;

    const { error } = await supabaseAdmin
      .from('user_settings')
      .upsert({
        user_id: user.id,
        api_key: apiKey || null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ ok: true });
  }

  res.setHeader('Allow', 'GET, PUT');
  res.status(405).json({ error: 'Method not allowed' });
};
