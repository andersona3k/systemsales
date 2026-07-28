const API_BASE = '/api';

function getToken() { return localStorage.getItem('cardbase_token'); }
function setToken(token) { localStorage.setItem('cardbase_token', token); }
function clearToken() { localStorage.removeItem('cardbase_token'); }

async function apiRequest(method, path, body = null, isFormData = false) {
  const token = getToken();
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (body && !isFormData) headers['Content-Type'] = 'application/json';
  const options = { method, headers };
  if (body) options.body = isFormData ? body : JSON.stringify(body);
  const response = await fetch(`${API_BASE}${path}`, options);
  if (response.status === 401) { clearToken(); window.location.reload(); return null; }
  if (response.status === 204) return null;
  const data = await response.json();
  if (!response.ok) throw new Error(data.detail || 'Erro desconhecido');
  return data;
}

const api = {
  login: (username, password) => apiRequest('POST', '/auth/login', { username, password }),
  dashboard: () => apiRequest('GET', '/dashboard'),
  listarContatos: (params = {}) => { const qs = new URLSearchParams(params).toString(); return apiRequest('GET', `/contatos${qs ? '?' + qs : ''}`); },
  obterContato: (id) => apiRequest('GET', `/contatos/${id}`),
  criarContato: (formData) => apiRequest('POST', '/contatos', formData, true),
  atualizarContato: (id, formData) => apiRequest('PUT', `/contatos/${id}`, formData, true),
  deletarContato: (id) => apiRequest('DELETE', `/contatos/${id}`),
  listarEmpresas: (params = {}) => { const qs = new URLSearchParams(params).toString(); return apiRequest('GET', `/empresas${qs ? '?' + qs : ''}`); },
  obterEmpresa: (id) => apiRequest('GET', `/empresas/${id}`),
  criarEmpresa: (dados) => apiRequest('POST', '/empresas', dados),
  atualizarEmpresa: (id, dados) => apiRequest('PUT', `/empresas/${id}`, dados),
  deletarEmpresa: (id) => apiRequest('DELETE', `/empresas/${id}`),
  listarCategorias: () => apiRequest('GET', '/categorias'),
  criarCategoria: (dados) => apiRequest('POST', '/categorias', dados),
  atualizarCategoria: (id, dados) => apiRequest('PUT', `/categorias/${id}`, dados),
  deletarCategoria: (id) => apiRequest('DELETE', `/categorias/${id}`),
  listarCampos: (params = {}) => { const qs = new URLSearchParams(params).toString(); return apiRequest('GET', `/campos-customizados${qs ? '?' + qs : ''}`); },
  criarCampo: (dados) => apiRequest('POST', '/campos-customizados', dados),
  atualizarCampo: (id, dados) => apiRequest('PUT', `/campos-customizados/${id}`, dados),
  deletarCampo: (id) => apiRequest('DELETE', `/campos-customizados/${id}`),
  extrairCartao: (formData) => apiRequest('POST', '/ocr/extrair', formData, true),
  obterConfig: (chave) => apiRequest('GET', `/configuracoes/${chave}`),
  salvarConfig: (chave, valor) => apiRequest('PUT', `/configuracoes/${chave}`, { chave, valor }),
  testarApiKey: () => apiRequest('GET', '/configuracoes/api-key/testar'),
  qrcodeUrl: () => `${API_BASE}/configuracoes/qrcode/imagem?t=${Date.now()}`,
  listarPerfis: () => apiRequest('GET', '/perfis-exportacao'),
  criarPerfil: (dados) => apiRequest('POST', '/perfis-exportacao', dados),
  atualizarPerfil: (id, dados) => apiRequest('PUT', `/perfis-exportacao/${id}`, dados),
  deletarPerfil: (id) => apiRequest('DELETE', `/perfis-exportacao/${id}`),
    uploadFotoPerfil: (id, file) => { const fd = new FormData(); fd.append('foto', file); return apiRequest('POST', '/contatos/' + id + '/foto-perfil', fd, true); },
  getToken, setToken, clearToken,
  isLoggedIn: () => !!getToken(),
};
