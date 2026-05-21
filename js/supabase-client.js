// Supabase 配置 — 部署时替换为你的项目值
const SUPABASE_URL = 'https://orsjnyulzwudogzswxyf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9yc2pueXVsend1ZG9nenN3eHlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzNDg5NTcsImV4cCI6MjA5NDkyNDk1N30.p-SGLJOdf441sBVZrU5xXIYZuNdKFcySmHsXU_0e7jk';

let _supabase = null;

async function initSupabase() {
  if (_supabase) return _supabase;
  // Load Supabase SDK from CDN if not already loaded
  if (typeof supabase === 'undefined') {
    await new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js';
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }
  _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  window._supabase = _supabase;
  return _supabase;
}
