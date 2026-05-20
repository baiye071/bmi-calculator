const API_CONFIG = {
  baseUrl: 'https://token-plan-cn.xiaomimimo.com',
  model: 'mimo-v2.5-pro'
};

function getApiKey() {
  return localStorage.getItem('mimo_api_key') || '';
}
function setApiKey(key) {
  localStorage.setItem('mimo_api_key', key);
}
