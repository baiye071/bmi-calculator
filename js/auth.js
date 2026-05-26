async function signUp(email, password) {
  const { data, error } = await window._supabase.auth.signUp({ email, password });
  if (error) throw error;
  return data;
}

async function signIn(email, password) {
  const { data, error } = await window._supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

async function signOut() {
  await window._supabase.auth.signOut();
  localStorage.removeItem('bmi_history');
  localStorage.removeItem('period_data');
  localStorage.removeItem('mimo_api_key');
  window.location.href = 'login.html';
}

async function getSession() {
  const { data: { session } } = await window._supabase.auth.getSession();
  return session;
}

async function getAccessToken() {
  const session = await getSession();
  return session?.access_token || null;
}

async function getCurrentUser() {
  const session = await getSession();
  return session?.user || null;
}

async function requireAuth() {
  await initSupabase();
  const session = await getSession();
  if (!session) {
    window.location.href = 'login.html';
    return null;
  }
  return session;
}

function onSessionChange(callback) {
  window._supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
      callback(session, event);
    }
  });
}
