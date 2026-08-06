function toast(msg, tipo = 'default', duracao = 3000) {
  const container = document.getElementById('toast-container');
  const el = document.createElement('div');
  el.className = `toast ${tipo}`;
  el.textContent = msg;
  container.appendChild(el);
  setTimeout(() => el.remove(), duracao);
}

function showLoading(msg = 'Processando...') {
  const el = document.getElementById('loading-overlay');
  el.querySelector('p').textContent = msg;
  el.classList.remove('hidden');
}

function hideLoading() {
  document.getElementById('loading-overlay').classList.add('hidden');
}

function inicialsMaior(nome) {
  if (!nome) return '?';
  return nome.split(' ').slice(0, 2).map(p => p[0]).join('').toUpperCase();
}

function formatarTelefone(tel) {
  if (!tel) return '';
  return tel.replace(/\D/g, '').replace(/^(\d{2})(\d{4,5})(\d{4})$/, '($1) $2-$3') || tel;
}

function origemLabel(origem) {
  const labels = { cartao_fisico: '📇 Cartão Físico', manual: '✍️ Manual', feira_evento: '🎪 Feira/Evento', indicacao: '🤝 Indicação', outro: '📌 Outro' };
  return labels[origem] || origem;
}

let paginaAtual = 'dashboard';
let historicoPaginas = [];

function navegarPara(pagina, dados = {}) {
  const anterior = document.querySelector('.page.active');
  if (anterior) anterior.classList.remove('active');
  const nova = document.getElementById(`page-${pagina}`);
  if (!nova) return;
  nova.classList.add('active');
  paginaAtual = pagina;
  document.querySelectorAll('.tab-item').forEach(t => t.classList.remove('active'));
  const tabAtiva = document.querySelector(`[data-page="${pagina}"]`);
  if (tabAtiva) tabAtiva.classList.add('active');
  document.querySelectorAll('.desktop-nav-item').forEach(t => t.classList.remove('active'));
  const navAtivo = document.querySelector(`.desktop-nav-item[data-page="${pagina}"]`);
  if (navAtivo) navAtivo.classList.add('active');
  const carregadores = { dashboard: carregarDashboard, contatos: () => carregarContatos(), empresas: () => carregarEmpresas(), configuracoes: carregarConfiguracoes, qrcode: carregarQrcode };
  if (carregadores[pagina]) carregadores[pagina](dados);
  window.scrollTo(0, 0);
}

document.getElementById('form-login')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('login-username').value;
  const password = document.getElementById('login-password').value;
  const btn = e.target.querySelector('[type=submit]');
  btn.disabled = true; btn.textContent = 'Entrando...';
  try {
    const res = await api.login(username, password);
    api.setToken(res.access_token);
    mostrarApp();
  } catch (err) {
    toast('Usuário ou senha incorretos', 'error');
  } finally { btn.disabled = false; btn.textContent = 'Entrar'; }
});

function mostrarApp() {
  document.getElementById('page-login').style.display = 'none';
  var alvo = localStorage.getItem('sgc_pagina_atual');
  var idDom = (alvo && alvo.indexOf('rede:') === 0) ? 'publicacoes' : alvo;
  var elAlvo = idDom && document.getElementById('page-' + idDom);
  if (elAlvo) {
    document.querySelectorAll('.page.active').forEach(function(p){ p.classList.remove('active'); });
    elAlvo.classList.add('active');
    document.getElementById('app').style.display = 'block';
    if (typeof restaurarPaginaAtual === 'function') restaurarPaginaAtual(alvo);
  } else {
    document.getElementById('app').style.display = 'block';
    navegarPara('dashboard');
  }
}

function logout() { api.clearToken(); location.reload(); }

async function carregarDashboard() {
  try {
    const dados = await api.dashboard();
    document.getElementById('stat-contatos').textContent = dados.total_contatos;
    document.getElementById('stat-empresas').textContent = dados.total_empresas;
    const lista = document.getElementById('lista-recentes');
    if (!dados.ultimos_contatos.length) { lista.innerHTML = '<div class="empty-state"><p>Nenhum contato ainda</p></div>'; return; }
    lista.innerHTML = dados.ultimos_contatos.map(c => `
      <div class="contact-item" onclick="abrirDetalheContato('${c.id}')">
        <div class="contact-avatar">${inicialsMaior(c.nome)}</div>
        <div class="contact-info">
          <div class="contact-name">${c.nome}</div>
          <div class="contact-sub">${[c.cargo, c.empresa_nome].filter(Boolean).join(' · ') || 'Sem empresa'}</div>
        </div>
      </div>`).join('');
  } catch (err) { toast('Erro ao carregar dashboard', 'error'); }
}

let filtrosContatos = { q: '', pagina: 1, por_pagina: 30 };

async function carregarContatos(reset = true) {
  if (reset) filtrosContatos.pagina = 1;
  const lista = document.getElementById('lista-contatos');
  lista.innerHTML = '<div class="empty-state"><div class="spinner" style="margin:0 auto"></div></div>';
  try {
    const res = await api.listarContatos(filtrosContatos);
    renderizarContatos(res.itens, res.total);
  } catch (err) { lista.innerHTML = '<div class="empty-state"><p>Erro ao carregar contatos</p></div>'; }
}

function renderizarContatos(contatos, total) {
  const lista = document.getElementById('lista-contatos');
  document.getElementById('total-contatos-label').textContent = `${total} contato${total !== 1 ? 's' : ''}`;
  if (!contatos.length) { lista.innerHTML = '<div class="empty-state"><h3>Nenhum contato encontrado</h3><p>Adicione novos contatos</p></div>'; return; }
  lista.innerHTML = `<div class="card">${contatos.map(c => `
    <div class="contact-item" onclick="abrirDetalheContato('${c.id}')">
      <div class="contact-avatar">${inicialsMaior(c.nome)}</div>
      <div class="contact-info">
        <div class="contact-name">${c.nome}</div>
        <div class="contact-sub">${[c.cargo, c.empresa_nome].filter(Boolean).join(' · ') || 'Sem empresa'}</div>
      </div>
      <div class="contact-actions" onclick="event.stopPropagation()">
        ${c.telefone1 ? `<a class="action-btn" href="tel:${c.telefone1}">${iconeTelefone()}</a>` : ''}
        ${c.email ? `<a class="action-btn" href="mailto:${c.email}">${iconeEmail()}</a>` : ''}
      </div>
    </div>`).join('')}</div>`;
}

document.getElementById('busca-contatos')?.addEventListener('input', (e) => {
  filtrosContatos.q = e.target.value;
  clearTimeout(window._buscaTimer);
  window._buscaTimer = setTimeout(() => carregarContatos(), 400);
});

async function abrirDetalheContato(id) {
  showLoading('Carregando...');
  try {
    const c = await api.obterContato(id);
    renderizarDetalheContato(c);
    navegarParaDetalhe('detalhe-contato');
  } catch (err) { toast('Erro ao carregar contato', 'error'); }
  finally { hideLoading(); }
}

function renderizarDetalheContato(c) {
  const page = document.getElementById('page-detalhe-contato');
  const campos = [
    c.telefone1 && { icon: iconeTelefone(), label: 'Telefone', value: formatarTelefone(c.telefone1), href: `tel:${c.telefone1}` },
    c.telefone2 && { icon: iconeTelefone(), label: 'Telefone 2', value: formatarTelefone(c.telefone2), href: `tel:${c.telefone2}` },
    c.email && { icon: iconeEmail(), label: 'E-mail', value: c.email, href: `mailto:${c.email}` },
    c.website && { icon: iconeLink(), label: 'Website', value: c.website, href: c.website },
    c.linkedin && { icon: iconeLink(), label: 'LinkedIn', value: c.linkedin, href: c.linkedin },
    c.endereco && { icon: iconeLocal(), label: 'Endereço', value: c.endereco },
    c.notas && { icon: iconeNota(), label: 'Notas', value: c.notas },
  ].filter(Boolean);
  page.innerHTML = `
    <div class="app-header">
      <button class="btn-back" onclick="voltarDashboard()">${iconeVoltar()}</button>
      <h2>Contato</h2>
      <button class="btn btn-sm btn-secondary" onclick="editarContato('${c.id}')">Editar</button>
    </div>
    <div class="page-content">
      <div class="detail-header">
        <div class="detail-avatar" style="position:relative;cursor:pointer;overflow:visible" onclick="document.getElementById('avatar-input').click()">${c.foto_perfil ? '<img src="' + c.foto_perfil + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%">' : inicialsMaior(c.nome)}<span style="position:absolute;bottom:0;right:0;background:var(--primary);color:#fff;border-radius:50%;width:26px;height:26px;display:flex;align-items:center;justify-content:center;font-size:13px;border:2px solid #fff">📷</span></div>
        <input type="file" id="avatar-input" accept="image/*" style="display:none" onchange="enviarFotoPerfil('${c.id}', this)">
        <div class="detail-name">${c.nome}</div>
        <div class="detail-sub">${[c.cargo, c.empresa_nome].filter(Boolean).join(' · ') || ''}</div>
        <div class="detail-actions">
          ${c.telefone1 ? `<a class="detail-action-btn" href="tel:${c.telefone1}">${iconeTelefone()}<span>Ligar</span></a>` : ''}
          ${c.email ? `<a class="detail-action-btn" href="mailto:${c.email}">${iconeEmail()}<span>E-mail</span></a>` : ''}
          ${c.telefone1 ? `<a class="detail-action-btn" href="https://wa.me/55${c.telefone1.replace(/\D/g,'')}" target="_blank">${iconeWhatsapp()}<span>WhatsApp</span></a>` : ''}
      ${(c.foto_frente || c.foto_verso) ? '<a class="detail-action-btn" data-src="/' + (c.foto_frente || c.foto_verso) + '" onclick="abrirLightbox(this.getAttribute(\'data-src\'))" style="cursor:pointer"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="22" height="22"><path stroke-linecap="round" stroke-linejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z"/><path stroke-linecap="round" stroke-linejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Z"/></svg><span>Cartão</span></a>' : ''}
        </div>
      </div>
      <div class="card mb-4">
        ${campos.map(f => `<div class="info-row"><div class="info-icon">${f.icon}</div><div class="info-content"><div class="info-label">${f.label}</div><div class="info-value">${f.href ? `<a href="${f.href}" style="color:var(--primary)">${f.value}</a>` : f.value}</div></div></div>`).join('')}
        <div class="info-row"><div class="info-icon">${iconeTag()}</div><div class="info-content"><div class="info-label">Origem</div><div class="info-value">${origemLabel(c.origem)}</div></div></div>
      </div>
      <div class="flex gap-2 mt-2">
        <button class="btn btn-secondary w-full" onclick="editarContato('${c.id}')">✏️ Editar</button>
        <button class="btn btn-danger" onclick="confirmarDeletar('${c.id}', '${c.nome.replace(/'/g,"\\'")}')">🗑️</button>
      </div>
    </div>`;
}

function voltarDashboard() { const p = historicoPaginas.pop() || 'contatos'; navegarPara(p); }

function navegarParaDetalhe(pagina) {
  historicoPaginas.push(paginaAtual);
  const anterior = document.querySelector('.page.active');
  if (anterior) anterior.classList.remove('active');
  document.getElementById(`page-${pagina}`).classList.add('active');
  paginaAtual = pagina;
  window.scrollTo(0, 0);
}

async function confirmarDeletar(id, nome) {
  if (!confirm(`Excluir "${nome}"?`)) return;
  try { await api.deletarContato(id); toast('Contato excluído', 'success'); navegarPara('contatos'); }
  catch (err) { toast('Erro ao excluir', 'error'); }
}

let contatoEditandoId = null;
let fotoFrenteFile = null;
let fotoVersoFile = null;

function abrirNovoContato(modo = 'foto') {
  contatoEditandoId = null; fotoFrenteFile = null; fotoVersoFile = null;
  limparFormContato();
  document.getElementById('form-contato-titulo').textContent = 'Novo Contato';
  document.getElementById('btn-extrair').style.display = 'flex';
  ativarModo(modo);
  navegarParaDetalhe('form-contato');
}

async function editarContato(id) {
  showLoading('Carregando...');
  try {
    const c = await api.obterContato(id);
    contatoEditandoId = id; fotoFrenteFile = null; fotoVersoFile = null;
    preencherFormContato(c);
    document.getElementById('form-contato-titulo').textContent = 'Editar Contato';
    document.getElementById('btn-extrair').style.display = 'none';
    ativarModo('manual');
    navegarParaDetalhe('form-contato');
  } catch (err) { toast('Erro ao carregar contato', 'error'); }
  finally { hideLoading(); }
}

function ativarModo(modo) {
  document.querySelectorAll('.mode-tab').forEach(t => t.classList.remove('active'));
  document.querySelector(`[data-modo="${modo}"]`)?.classList.add('active');
  document.getElementById('secao-foto').style.display = modo === 'foto' ? 'block' : 'none';
}

function preencherFormContato(c) {
  ['nome','cargo','telefone1','telefone2','email','website','linkedin','instagram','endereco','notas'].forEach(campo => {
    const el = document.getElementById(`fc-${campo}`);
    if (el) el.value = c[campo] || '';
  });
  const el = document.getElementById('fc-empresa-nome');
  if (el) el.value = c.empresa_nome || '';
  const origem = document.getElementById('fc-origem');
  if (origem) origem.value = c.origem || 'cartao_fisico';
}

function limparFormContato() {
  document.querySelectorAll('#form-contato input, #form-contato textarea, #form-contato select').forEach(el => {
    if (el.tagName === 'SELECT') el.selectedIndex = 0; else el.value = '';
  });
  ['frente','verso'].forEach(lado => {
    const zone = document.getElementById(`zone-${lado}`);
    if (zone) { zone.querySelector('img')?.remove(); zone.classList.remove('has-image'); }
  });
}

document.getElementById('input-frente')?.addEventListener('change', (e) => {
  const file = e.target.files[0]; if (!file) return;
  fotoFrenteFile = file;
  const zone = document.getElementById('zone-frente');
  let img = zone.querySelector('img');
  if (!img) { img = document.createElement('img'); zone.appendChild(img); }
  img.src = URL.createObjectURL(file);
  zone.classList.add('has-image');
});

document.getElementById('input-verso')?.addEventListener('change', (e) => {
  const file = e.target.files[0]; if (!file) return;
  fotoVersoFile = file;
  const zone = document.getElementById('zone-verso');
  let img = zone.querySelector('img');
  if (!img) { img = document.createElement('img'); zone.appendChild(img); }
  img.src = URL.createObjectURL(file);
  zone.classList.add('has-image');
});

document.getElementById('btn-extrair')?.addEventListener('click', async () => {
  if (!fotoFrenteFile) { toast('Adicione ao menos a foto da frente do cartão', 'warning'); return; }
  showLoading('Extraindo dados com IA...');
  try {
    const fd = new FormData();
    fd.append('foto_frente', fotoFrenteFile);
    if (fotoVersoFile) fd.append('foto_verso', fotoVersoFile);
    const res = await api.extrairCartao(fd);
    if (res.sucesso) {
      const d = res.dados;
      if (d.nome) document.getElementById('fc-nome').value = d.nome;
      if (d.empresa_nome) document.getElementById('fc-empresa-nome').value = d.empresa_nome;
      if (d.cargo) document.getElementById('fc-cargo').value = d.cargo;
      if (d.telefone1) document.getElementById('fc-telefone1').value = d.telefone1;
      if (d.telefone2) document.getElementById('fc-telefone2').value = d.telefone2;
      if (d.email) document.getElementById('fc-email').value = d.email;
      if (d.website) document.getElementById('fc-website').value = d.website;
      if (d.linkedin) document.getElementById('fc-linkedin').value = d.linkedin;
      if (d.endereco) document.getElementById('fc-endereco').value = d.endereco;
      if (d.observacoes) document.getElementById('fc-notas').value = d.observacoes;
      ativarModo('manual');
      toast('Dados extraídos com sucesso!', 'success');
    } else { toast('Não foi possível extrair. Preencha manualmente.', 'warning'); ativarModo('manual'); }
  } catch (err) { toast('Erro na extração: ' + err.message, 'error'); ativarModo('manual'); }
  finally { hideLoading(); }
});

document.getElementById('form-contato')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  showLoading('Salvando...');
  try {
    const nomeCampo = document.getElementById('fc-nome').value.trim();
    if (!nomeCampo) { toast('Nome é obrigatório', 'warning'); hideLoading(); return; }
    let empresaId = null;
    const empresaNome = document.getElementById('fc-empresa-nome')?.value.trim();
    if (empresaNome) {
      const empresas = await api.listarEmpresas({ q: empresaNome, por_pagina: 1 });
      if (empresas.itens.length && empresas.itens[0].nome.toLowerCase() === empresaNome.toLowerCase()) {
        empresaId = empresas.itens[0].id;
      } else {
        const nova = await api.criarEmpresa({ nome: empresaNome });
        empresaId = nova.id;
      }
    }
    const dados = {
      nome: nomeCampo, empresa_id: empresaId,
      cargo: document.getElementById('fc-cargo')?.value || null,
      telefone1: document.getElementById('fc-telefone1')?.value || null,
      telefone2: document.getElementById('fc-telefone2')?.value || null,
      email: document.getElementById('fc-email')?.value || null,
      website: document.getElementById('fc-website')?.value || null,
      endereco: document.getElementById('fc-endereco')?.value || null,
      origem: document.getElementById('fc-origem')?.value || 'cartao_fisico',
      cidade: document.getElementById('fc-cidade')?.value || null,
      estado: (document.getElementById('fc-estado')?.value || '').toUpperCase() || null,
      regional: document.getElementById('fc-regional')?.value || null,
      aniversario: document.getElementById('fc-aniversario')?.value || null,
      status: document.getElementById('fc-status')?.value || 'sem_info',
      tipos: Array.prototype.slice.call(document.querySelectorAll('#fc-tipos input:checked')).map(function(x){return x.value;}),
      notas: document.getElementById('fc-notas')?.value || null,
    };
    const fd = new FormData();
    fd.append('dados', JSON.stringify(dados));
    if (fotoFrenteFile) fd.append('foto_frente', fotoFrenteFile);
    if (fotoVersoFile) fd.append('foto_verso', fotoVersoFile);
    if (contatoEditandoId) {
      await api.atualizarContato(contatoEditandoId, fd);
      toast('Contato atualizado!', 'success');
      abrirDetalheContato(contatoEditandoId);
    } else {
      const novo = await api.criarContato(fd);
      toast('Contato salvo!', 'success');
      abrirDetalheContato(novo.id);
    }
  } catch (err) { toast('Erro ao salvar: ' + err.message, 'error'); }
  finally { hideLoading(); }
});

async function carregarEmpresas() {
  const lista = document.getElementById('lista-empresas');
  lista.innerHTML = '<div class="empty-state"><div class="spinner" style="margin:0 auto"></div></div>';
  try {
    const res = await api.listarEmpresas({ pagina: 1, por_pagina: 50 });
    document.getElementById('total-empresas-label').textContent = `${res.total} empresa${res.total !== 1 ? 's' : ''}`;
    if (!res.itens.length) { lista.innerHTML = '<div class="empty-state"><h3>Nenhuma empresa</h3><p>Empresas são criadas ao salvar contatos</p></div>'; return; }
    lista.innerHTML = `<div class="card">${res.itens.map(e => `
      <div class="contact-item" onclick="abrirDetalheEmpresa('${e.id}')">
        <div class="contact-avatar" style="background:var(--primary);color:white;font-size:20px">🏢</div>
        <div class="contact-info">
          <div class="contact-name">${e.nome}</div>
          <div class="contact-sub">${[e.cnpj, e.email].filter(Boolean).join(' · ') || e.website || 'Sem dados adicionais'}</div>
        </div>
      </div>`).join('')}</div>`;
  } catch (err) { lista.innerHTML = '<div class="empty-state"><p>Erro ao carregar empresas</p></div>'; }
}

async function abrirDetalheEmpresa(id) {
  showLoading('Carregando...');
  try {
    const e = await api.obterEmpresa(id);
    const contatos = await api.listarContatos({ empresa_id: id, por_pagina: 50 });
    const page = document.getElementById('page-detalhe-empresa');
    page.innerHTML = `
      <div class="app-header"><button class="btn-back" onclick="voltarDashboard()">${iconeVoltar()}</button><h2>${e.nome}</h2></div>
      <div class="page-content">
        <div class="card mb-4">
          ${e.cnpj ? `<div class="info-row"><div class="info-icon">${iconeTag()}</div><div class="info-content"><div class="info-label">CNPJ</div><div class="info-value">${e.cnpj}</div></div></div>` : ''}
          ${e.telefone ? `<div class="info-row"><div class="info-icon">${iconeTelefone()}</div><div class="info-content"><div class="info-label">Telefone</div><div class="info-value"><a href="tel:${e.telefone}" style="color:var(--primary)">${e.telefone}</a></div></div></div>` : ''}
          ${e.email ? `<div class="info-row"><div class="info-icon">${iconeEmail()}</div><div class="info-content"><div class="info-label">E-mail</div><div class="info-value"><a href="mailto:${e.email}" style="color:var(--primary)">${e.email}</a></div></div></div>` : ''}
          ${e.website ? `<div class="info-row"><div class="info-icon">${iconeLink()}</div><div class="info-content"><div class="info-label">Website</div><div class="info-value"><a href="${e.website}" target="_blank" style="color:var(--primary)">${e.website}</a></div></div></div>` : ''}
          ${e.notas ? `<div class="info-row"><div class="info-icon">${iconeNota()}</div><div class="info-content"><div class="info-label">Notas</div><div class="info-value">${e.notas}</div></div></div>` : ''}
        </div>
        <p class="section-title">Contatos (${contatos.total})</p>
        <div class="card">${contatos.itens.length ? contatos.itens.map(c => `
          <div class="contact-item" onclick="abrirDetalheContato('${c.id}')">
            <div class="contact-avatar">${inicialsMaior(c.nome)}</div>
            <div class="contact-info"><div class="contact-name">${c.nome}</div><div class="contact-sub">${c.cargo || 'Sem cargo'}</div></div>
          </div>`).join('') : '<div class="card-body text-muted text-sm">Nenhum contato vinculado</div>'}</div>
      </div>`;
    navegarParaDetalhe('detalhe-empresa');
  } catch (err) { toast('Erro ao carregar empresa', 'error'); }
  finally { hideLoading(); }
}

async function carregarQrcode() {
  try {
    const cfg = await api.obterConfig('meu_cartao');
    const dados = cfg.valor || {};
    ['nome','empresa','cargo','telefone1','telefone2','email','website','linkedin','endereco'].forEach(c => {
      const el = document.getElementById(`qr-${c}`);
      if (el) el.value = dados[c] || '';
    });
    atualizarQrcode();
  } catch (err) {}
}

function atualizarQrcode() {
  const img = document.getElementById('qrcode-img');
  if (img) img.src = api.qrcodeUrl();
}

document.getElementById('form-qrcode')?.addEventListener('submit', async (e) => {
  e.preventDefault(); showLoading('Salvando...');
  try {
    const dados = {};
    ['nome','empresa','cargo','telefone1','telefone2','email','website','linkedin','endereco'].forEach(c => {
      const el = document.getElementById(`qr-${c}`);
      if (el && el.value) dados[c] = el.value;
    });
    await api.salvarConfig('meu_cartao', dados);
    atualizarQrcode();
    toast('QR Code atualizado!', 'success');
  } catch (err) { toast('Erro ao salvar', 'error'); }
  finally { hideLoading(); }
});

document.getElementById('btn-baixar-qr')?.addEventListener('click', () => {
  const a = document.createElement('a');
  a.href = api.qrcodeUrl(); a.download = 'meu-qrcode.png'; a.click();
});

async function carregarConfiguracoes() {
  try { const campos = await api.listarCampos({ apenas_ativos: false }); renderizarCamposCustomizados(campos); } catch (err) {}
  try { const cats = await api.listarCategorias(); renderizarCategorias(cats); } catch (err) {}
}

function renderizarCamposCustomizados(campos) {
  const lista = document.getElementById('lista-campos-custom');
  if (!campos.length) { lista.innerHTML = '<p class="text-muted text-sm">Nenhum campo customizado ainda.</p>'; return; }
  lista.innerHTML = campos.map(c => `
    <div class="flex items-center justify-between gap-2 mb-2">
      <div><span class="font-bold">${c.nome}</span><span class="badge" style="background:var(--primary-light);color:var(--primary);margin-left:6px">${c.tipo}</span>${!c.ativo ? '<span class="badge" style="background:#fef3c7;color:#92400e;margin-left:4px">Inativo</span>' : ''}</div>
      <button class="btn btn-sm btn-secondary" onclick="toggleCampo('${c.id}', ${!c.ativo})">${c.ativo ? 'Desativar' : 'Ativar'}</button>
    </div>`).join('');
}

async function toggleCampo(id, ativo) {
  try { await api.atualizarCampo(id, { ativo }); const campos = await api.listarCampos({ apenas_ativos: false }); renderizarCamposCustomizados(campos); }
  catch (err) { toast('Erro ao atualizar campo', 'error'); }
}

document.getElementById('form-novo-campo')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    await api.criarCampo({ nome: document.getElementById('campo-nome').value, chave: document.getElementById('campo-nome').value, tipo: document.getElementById('campo-tipo').value, entidade: document.getElementById('campo-entidade').value, obrigatorio: false, ordem: 0 });
    toast('Campo criado!', 'success'); e.target.reset();
    const campos = await api.listarCampos({ apenas_ativos: false }); renderizarCamposCustomizados(campos);
  } catch (err) { toast('Erro: ' + err.message, 'error'); }
});

function renderizarCategorias(cats) {
  const lista = document.getElementById('lista-categorias');
  if (!cats.length) { lista.innerHTML = '<p class="text-muted text-sm">Nenhuma categoria ainda.</p>'; return; }
  lista.innerHTML = cats.map(c => `
    <div class="flex items-center justify-between gap-2 mb-2">
      <div class="flex items-center gap-2"><div style="width:16px;height:16px;border-radius:4px;background:${c.cor}"></div><span class="font-bold">${c.nome}</span><span class="text-muted text-sm">${c.tipo}</span></div>
      <button class="btn btn-sm btn-danger" onclick="deletarCategoria('${c.id}', '${c.nome}')">✕</button>
    </div>`).join('');
}

document.getElementById('form-nova-categoria')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    await api.criarCategoria({ nome: document.getElementById('cat-nome').value, tipo: document.getElementById('cat-tipo').value, cor: document.getElementById('cat-cor').value });
    toast('Categoria criada!', 'success'); e.target.reset();
    const cats = await api.listarCategorias(); renderizarCategorias(cats);
  } catch (err) { toast('Erro: ' + err.message, 'error'); }
});

async function deletarCategoria(id, nome) {
  if (!confirm(`Excluir categoria "${nome}"?`)) return;
  try { await api.deletarCategoria(id); toast('Categoria excluída', 'success'); const cats = await api.listarCategorias(); renderizarCategorias(cats); }
  catch (err) { toast('Erro ao excluir', 'error'); }
}

document.getElementById('btn-testar-api')?.addEventListener('click', async () => {
  const btn = document.getElementById('btn-testar-api');
  btn.disabled = true; btn.textContent = 'Testando...';
  try { const res = await api.testarApiKey(); toast(res.mensagem, res.ok ? 'success' : 'error'); }
  finally { btn.disabled = false; btn.textContent = 'Testar Conexão'; }
});

function iconeTelefone() { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z"/></svg>`; }
function iconeEmail() { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75"/></svg>`; }
function iconeWhatsapp() { return `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>`; }
function iconeLink() { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244"/></svg>`; }
function iconeLocal() { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"/><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z"/></svg>`; }
function iconeNota() { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"/></svg>`; }
function iconeTag() { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9.568 3H5.25A2.25 2.25 0 0 0 3 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 0 0 5.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 0 0 9.568 3Z"/><path stroke-linecap="round" stroke-linejoin="round" d="M6 6h.008v.008H6V6Z"/></svg>`; }
function iconeVoltar() { return `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18"/></svg>`; }

function exportarContatos(formato) {
  const token = api.getToken();
  const q = document.getElementById('busca-contatos')?.value || '';
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  window.open(`/api/contatos/exportar/${formato}?${params}`, '_blank');
}

function init() {
  if (api.isLoggedIn()) mostrarApp();
  document.querySelectorAll('.tab-item[data-page]').forEach(tab => tab.addEventListener('click', () => navegarPara(tab.dataset.page)));
  document.querySelectorAll('.desktop-nav-item[data-page]').forEach(item => item.addEventListener('click', () => navegarPara(item.dataset.page)));
}

document.addEventListener('DOMContentLoaded', init);

function abrirLightbox(src) {
  const url = src.startsWith('http') ? src : window.location.origin + src;
  const lb = document.createElement('div');
  lb.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.85);z-index:9999;display:flex;align-items:center;justify-content:center;';
  lb.innerHTML = '<div style="position:relative;max-width:90vw;max-height:90vh"><img src="'+url+'" style="max-width:90vw;max-height:85vh;border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,0.5)"><button onclick="this.parentElement.parentElement.remove()" style="position:absolute;top:-12px;right:-12px;background:#fff;border:none;border-radius:50%;width:32px;height:32px;font-size:18px;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,0.3)">×</button><a href="'+url+'" download style="display:block;text-align:center;margin-top:8px;color:white;font-size:14px">⬇ Baixar foto</a></div>';
  lb.addEventListener('click', function(e){ if(e.target===lb) lb.remove(); });
  document.body.appendChild(lb);
}

async function enviarFotoPerfil(id, input) {
  const file = input.files[0];
  if (!file) return;
  showLoading('Enviando foto...');
  try {
    await api.uploadFotoPerfil(id, file);
    toast('Foto atualizada!', 'success');
    abrirDetalheContato(id);
  } catch (err) { toast('Erro ao enviar foto: ' + err.message, 'error'); }
  finally { hideLoading(); }
}

/* ===== Fase 3: tabela de contatos ===== */
function statusLabel(s){return {ativo:'🟢 Ativo', nao_ativo:'🔴 Não ativo', sem_info:'⚪ Sem info'}[s]||s;}

function formatarTelefone(tel){
  if(!tel) return '—';
  var raw=(''+tel).trim();
  var d=raw.replace(/\D/g,'');
  if(raw[0]==='+' && d.slice(0,2)!=='55') return '+'+d;
  if(d.slice(0,2)==='55' && d.length>=12) d=d.slice(2);
  if(d.length===11) return '+55 · '+d.slice(0,2)+' · '+d.slice(2,7)+'-'+d.slice(7);
  if(d.length===10) return '+55 · '+d.slice(0,2)+' · '+d.slice(2,6)+'-'+d.slice(6);
  return raw;
}

var TIPOS_CATALOGO=[{nome:'cliente',ativo:true},{nome:'finder',ativo:true},{nome:'fabricante',ativo:true}];
async function carregarCatalogoTipos(){
  try{ var c=await api.obterConfig('tipos_catalogo'); if(c && c.valor && Array.isArray(c.valor) && c.valor.length) TIPOS_CATALOGO=c.valor; }catch(e){}
}
function tiposAtivos(){ return TIPOS_CATALOGO.filter(function(t){return t.ativo!==false;}).map(function(t){return t.nome;}); }

async function carregarContatos(reset){
  if(reset===undefined) reset=true;
  if(!window._catLoaded){ await carregarCatalogoTipos(); window._catLoaded=true; }
  if(reset) filtrosContatos.pagina=1;
  if(!filtrosContatos.por_pagina) filtrosContatos.por_pagina=20;
  var lista=document.getElementById('lista-contatos');
  lista.innerHTML='<div class="empty-state"><div class="spinner" style="margin:0 auto"></div></div>';
  var params={pagina:filtrosContatos.pagina, por_pagina:filtrosContatos.por_pagina};
  ['q','empresa','cidade','estado','tipo','status'].forEach(function(k){ if(filtrosContatos[k]) params[k]=filtrosContatos[k]; });
  try{ var res=await api.listarContatos(params); renderizarContatos(res.itens, res.total); }
  catch(err){ lista.innerHTML='<div class="empty-state"><p>Erro ao carregar contatos</p></div>'; }
}

function renderizarContatos(contatos,total){
  var lista=document.getElementById('lista-contatos');
  var label=document.getElementById('total-contatos-label');
  if(label) label.textContent=total+' contato'+(total!==1?'s':'');
  var f=filtrosContatos;
  var optTipos=['<option value="">Tipo: todos</option>'].concat(tiposAtivos().map(function(t){return '<option value="'+t+'"'+(f.tipo===t?' selected':'')+'>'+t+'</option>';})).join('');
  var stOpts=[['','Status: todos'],['ativo','🟢 Ativo'],['nao_ativo','🔴 Não ativo'],['sem_info','⚪ Sem info']].map(function(o){return '<option value="'+o[0]+'"'+(f.status===o[0]?' selected':'')+'>'+o[1]+'</option>';}).join('');
  var filtros='<div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px">'
    +'<input data-f="empresa" placeholder="Empresa" value="'+(f.empresa||'')+'" class="form-control" style="flex:1;min-width:120px">'
    +'<input data-f="cidade" placeholder="Cidade" value="'+(f.cidade||'')+'" class="form-control" style="flex:1;min-width:100px">'
    +'<input data-f="estado" placeholder="UF" value="'+(f.estado||'')+'" class="form-control" style="width:70px">'
    +'<select data-f="tipo" class="form-control" style="width:130px">'+optTipos+'</select>'
    +'<select data-f="status" class="form-control" style="width:150px">'+stOpts+'</select>'
    +((f.empresa||f.cidade||f.estado||f.tipo||f.status)?'<button data-fclear="1" class="btn btn-sm btn-secondary">Limpar</button>':'')
    +'</div>';
  if(!contatos.length){ lista.innerHTML=filtros+'<div class="empty-state"><p>Nenhum contato encontrado</p></div>'; bindFiltros(); return; }
  var rows=contatos.map(function(c){
    var chips=(c.tipos||[]).map(function(t){return '<span class="chip-tipo" data-act="deltipo" data-id="'+c.id+'" data-tipo="'+t+'">'+t+' ×</span>';}).join('');
    var add='<span class="chip-add" data-act="addtipo" data-id="'+c.id+'">+ tipo</span>';
    var st=['ativo','nao_ativo','sem_info'].map(function(s){return '<option value="'+s+'"'+(c.status===s?' selected':'')+'>'+statusLabel(s)+'</option>';}).join('');
    return '<tr>'
      +'<td><a href="#" data-act="abrir" data-id="'+c.id+'" style="color:var(--primary);font-weight:600;text-decoration:none">'+(c.nome||'')+'</a></td>'
      +'<td>'+(c.empresa_nome||'—')+'</td>'
      +'<td style="white-space:nowrap">'+formatarTelefone(c.whatsapp||c.telefone1)+'</td>'
      +'<td>'+(c.email||'—')+'</td>'
      +'<td><div class="tipo-cell">'+chips+add+'</div></td>'
      +'<td><select class="form-control sel-status status-'+c.status+'" data-act="status" data-id="'+c.id+'" style="padding:4px;font-size:12px">'+st+'</select></td>'
      +'</tr>';
  }).join('');
  var pp=f.por_pagina||20, pag=f.pagina||1, totalPag=Math.max(1,Math.ceil(total/pp));
  var nav='<div style="display:flex;justify-content:space-between;align-items:center;margin-top:12px;gap:8px">'
    +'<button class="btn btn-sm btn-secondary" data-pag="'+(pag-1)+'"'+(pag<=1?' disabled':'')+'>← Anterior</button>'
    +'<span class="text-sm text-muted">Página '+pag+' de '+totalPag+'</span>'
    +'<button class="btn btn-sm btn-secondary" data-pag="'+(pag+1)+'"'+(pag>=totalPag?' disabled':'')+'>Próxima →</button></div>';
  lista.innerHTML=filtros+'<div style="overflow-x:auto"><table class="tabela-contatos"><thead><tr><th>Nome</th><th>Empresa</th><th>Telefone</th><th>Email</th><th>Tipo</th><th>Status</th></tr></thead><tbody>'+rows+'</tbody></table></div>'+nav;
  bindFiltros();
}

function bindFiltros(){
  document.querySelectorAll('#lista-contatos [data-f]').forEach(function(el){
    el.addEventListener('change', function(){ filtrosContatos[el.getAttribute('data-f')]=el.value.trim(); carregarContatos(true); });
  });
  var clr=document.querySelector('#lista-contatos [data-fclear]');
  if(clr) clr.addEventListener('click', function(){ ['empresa','cidade','estado','tipo','status'].forEach(function(k){filtrosContatos[k]='';}); carregarContatos(true); });
  document.querySelectorAll('#lista-contatos [data-pag]').forEach(function(b){
    b.addEventListener('click', function(){ if(b.hasAttribute('disabled'))return; filtrosContatos.pagina=parseInt(b.getAttribute('data-pag')); carregarContatos(false); });
  });
}

async function _patchContato(id,dados){
  await fetch('/api/contatos/'+id+'/inline',{method:'PATCH',headers:{'Content-Type':'application/json','Authorization':'Bearer '+getToken()},body:JSON.stringify(dados)});
}
async function mudarStatus(id,status){ await _patchContato(id,{status:status}); }
async function addTipoContato(id,tipo,atuais){ await _patchContato(id,{tipos:atuais.concat([tipo])}); carregarContatos(false); }
async function removeTipoContato(id,tipo,atuais){ await _patchContato(id,{tipos:atuais.filter(function(t){return t!==tipo;})}); carregarContatos(false); }

document.addEventListener('click', function(e){
  var el=e.target.closest('#lista-contatos [data-act]');
  if(!el) return;
  var act=el.getAttribute('data-act'), id=el.getAttribute('data-id');
  if(act==='abrir'){ e.preventDefault(); abrirDetalheContato(id); return; }
  var cell=el.closest('.tipo-cell');
  var atuais=cell?Array.prototype.slice.call(cell.querySelectorAll('.chip-tipo')).map(function(x){return x.getAttribute('data-tipo');}):[];
  if(act==='deltipo'){ e.preventDefault(); removeTipoContato(id,el.getAttribute('data-tipo'),atuais); return; }
  if(act==='addtipo'){
    e.preventDefault();
    var disp=tiposAtivos().filter(function(t){return atuais.indexOf(t)<0;});
    if(!disp.length){ toast('Cadastre tipos em Configurações','warning'); return; }
    var sel=document.createElement('select');
    sel.className='form-control'; sel.style.cssText='width:120px;font-size:12px;padding:4px';
    sel.innerHTML='<option value="">escolher…</option>'+disp.map(function(t){return '<option value="'+t+'">'+t+'</option>';}).join('');
    el.replaceWith(sel); sel.focus();
    sel.addEventListener('change', function(){ if(sel.value) addTipoContato(id,sel.value,atuais); });
  }
});
document.addEventListener('change', function(e){
  var el=e.target.closest('#lista-contatos [data-act="status"]');
  if(!el) return;
  mudarStatus(el.getAttribute('data-id'), el.value);
  el.className='form-control sel-status status-'+el.value;
});

(function(){
  if(document.getElementById('css-tabela-contatos')) return;
  var s=document.createElement('style'); s.id='css-tabela-contatos';
  s.textContent='.tabela-contatos{width:100%;border-collapse:collapse;font-size:13px}'
   +'.tabela-contatos th{text-align:left;padding:8px;border-bottom:2px solid var(--border);color:var(--text-muted);font-size:11px;text-transform:uppercase;white-space:nowrap}'
   +'.tabela-contatos td{padding:8px;border-bottom:1px solid var(--border)}'
   +'.tabela-contatos tr:hover{background:rgba(0,0,0,0.03)}'
   +'.tipo-cell{display:flex;flex-wrap:wrap;gap:4px;align-items:center}'
   +'.chip-tipo{background:var(--primary);color:#fff;border-radius:12px;padding:2px 8px;font-size:11px;cursor:pointer;white-space:nowrap}'
   +'.chip-add{border:1px dashed var(--border);color:var(--text-muted);border-radius:12px;padding:2px 8px;font-size:11px;cursor:pointer;white-space:nowrap}'
   +'.status-ativo{color:#15803d}.status-nao_ativo{color:#b91c1c}';
  document.head.appendChild(s);
})();

/* ===== Fase 4b: colunas, regional, aniversario, filtros alinhados ===== */
var REGIONAIS_CATALOGO=[{nome:'Sul',ativo:true},{nome:'Sudeste',ativo:true},{nome:'Norte',ativo:true},{nome:'Nordeste',ativo:true},{nome:'Centro-Oeste',ativo:true}];
async function carregarRegionais(){ try{ var c=await api.obterConfig('regionais_catalogo'); if(c&&c.valor&&Array.isArray(c.valor)&&c.valor.length) REGIONAIS_CATALOGO=c.valor; }catch(e){} }
function regionaisAtivos(){ return REGIONAIS_CATALOGO.filter(function(t){return t.ativo!==false;}).map(function(t){return t.nome;}); }
function fmtAniv(a){ if(!a) return '—'; var p=(''+a).split('-'); if(p.length!==3) return a; return p[2]+'/'+p[1]+(p[0]!=='0000'?'/'+p[0]:''); }

async function carregarContatos(reset){
  if(reset===undefined) reset=true;
  if(!window._catLoaded){ await carregarCatalogoTipos(); await carregarRegionais(); window._catLoaded=true; }
  if(reset) filtrosContatos.pagina=1;
  if(!filtrosContatos.por_pagina) filtrosContatos.por_pagina=20;
  var lista=document.getElementById('lista-contatos');
  lista.innerHTML='<div class="empty-state"><div class="spinner" style="margin:0 auto"></div></div>';
  var params={pagina:filtrosContatos.pagina, por_pagina:filtrosContatos.por_pagina};
  ['q','empresa','cidade','estado','regional','tipo','status','mes','dia'].forEach(function(k){ if(filtrosContatos[k]) params[k]=filtrosContatos[k]; });
  try{ var res=await api.listarContatos(params); renderizarContatos(res.itens, res.total); }
  catch(err){ lista.innerHTML='<div class="empty-state"><p>Erro ao carregar contatos</p></div>'; }
}

function renderizarContatos(contatos,total){
  var lista=document.getElementById('lista-contatos');
  var label=document.getElementById('total-contatos-label');
  if(label) label.textContent=total+' contato'+(total!==1?'s':'');
  var f=filtrosContatos;
  function selOpts(arr,val,ph){ return ['<option value="">'+ph+'</option>'].concat(arr.map(function(o){return '<option value="'+o.v+'"'+(val===o.v?' selected':'')+'>'+o.t+'</option>';})).join(''); }
  var meses=[['01','Jan'],['02','Fev'],['03','Mar'],['04','Abr'],['05','Mai'],['06','Jun'],['07','Jul'],['08','Ago'],['09','Set'],['10','Out'],['11','Nov'],['12','Dez']].map(function(m){return {v:m[0],t:m[1]};});
  var dias=[]; for(var i=1;i<=31;i++){var dd=(i<10?'0':'')+i; dias.push({v:dd,t:dd});}
  var stArr=[{v:'ativo',t:'🟢 Ativo'},{v:'nao_ativo',t:'🔴 Não'},{v:'sem_info',t:'⚪ S/info'}];
  var regArr=regionaisAtivos().map(function(r){return {v:r,t:r};});
  var tipoArr=tiposAtivos().map(function(t){return {v:t,t:t};});
  var inp=function(n,ph,w){return '<input data-f="'+n+'" value="'+(f[n]||'')+'" placeholder="'+ph+'" class="tf" style="width:'+w+'">';};
  var sf=function(n,arr,ph,w){return '<select data-f="'+n+'" class="tf" style="width:'+w+'">'+selOpts(arr,f[n]||'',ph)+'</select>';};
  var filtroRow='<tr class="filtros-row">'
    +'<th>'+inp('q','buscar','100px')+'</th>'
    +'<th>'+inp('empresa','empresa','100px')+'</th>'
    +'<th></th><th></th>'
    +'<th>'+inp('cidade','cidade','90px')+'</th>'
    +'<th>'+inp('estado','UF','45px')+'</th>'
    +'<th>'+sf('regional',regArr,'todas','100px')+'</th>'
    +'<th>'+sf('mes',meses,'mês','60px')+' '+sf('dia',dias,'dia','55px')+'</th>'
    +'<th>'+sf('tipo',tipoArr,'todos','100px')+'</th>'
    +'<th>'+sf('status',stArr,'todos','95px')+'</th>'
    +'</tr>';
  var head='<thead><tr><th>Nome</th><th>Empresa</th><th>Telefone</th><th>Email</th><th>Cidade</th><th>UF</th><th>Regional</th><th>Aniversário</th><th>Tipo</th><th>Status</th></tr>'+filtroRow+'</thead>';
  var rows=contatos.map(function(c){
    var chips=(c.tipos||[]).map(function(t){return '<span class="chip-tipo" data-act="deltipo" data-id="'+c.id+'" data-tipo="'+t+'">'+t+' ×</span>';}).join('');
    var add='<span class="chip-add" data-act="addtipo" data-id="'+c.id+'">+ tipo</span>';
    var st=['ativo','nao_ativo','sem_info'].map(function(s){return '<option value="'+s+'"'+(c.status===s?' selected':'')+'>'+statusLabel(s)+'</option>';}).join('');
    var regOpts='<option value="">—</option>'+regionaisAtivos().map(function(r){return '<option value="'+r+'"'+(c.regional===r?' selected':'')+'>'+r+'</option>';}).join('');
    return '<tr>'
      +'<td><a href="#" data-act="abrir" data-id="'+c.id+'" style="color:var(--primary);font-weight:600;text-decoration:none">'+(c.nome||'')+'</a></td>'
      +'<td>'+(c.empresa_nome||'—')+'</td>'
      +'<td style="white-space:nowrap">'+formatarTelefone(c.whatsapp||c.telefone1)+'</td>'
      +'<td>'+(c.email||'—')+'</td>'
      +'<td>'+(c.cidade||'—')+'</td>'
      +'<td>'+(c.estado||'—')+'</td>'
      +'<td><select class="tf" data-act="regional" data-id="'+c.id+'">'+regOpts+'</select></td>'
      +'<td style="white-space:nowrap">'+fmtAniv(c.aniversario)+'</td>'
      +'<td><div class="tipo-cell">'+chips+add+'</div></td>'
      +'<td><select class="tf sel-status status-'+c.status+'" data-act="status" data-id="'+c.id+'">'+st+'</select></td>'
      +'</tr>';
  }).join('');
  var pp=f.por_pagina||20, pag=f.pagina||1, totalPag=Math.max(1,Math.ceil(total/pp));
  var temFiltro=['q','empresa','cidade','estado','regional','tipo','status','mes','dia'].some(function(k){return f[k];});
  var nav='<div style="display:flex;justify-content:space-between;align-items:center;margin-top:12px;gap:8px">'
    +(temFiltro?'<button class="btn btn-sm btn-secondary" data-fclear="1">Limpar filtros</button>':'<span></span>')
    +'<span class="text-sm text-muted">Pág '+pag+'/'+totalPag+'</span>'
    +'<span><button class="btn btn-sm btn-secondary" data-pag="'+(pag-1)+'"'+(pag<=1?' disabled':'')+'>←</button> '
    +'<button class="btn btn-sm btn-secondary" data-pag="'+(pag+1)+'"'+(pag>=totalPag?' disabled':'')+'>→</button></span></div>';
  lista.innerHTML='<div style="overflow-x:auto"><table class="tabela-contatos">'+head+'<tbody>'+(rows||'<tr><td colspan="10" style="text-align:center;padding:20px;color:var(--text-muted)">Nenhum contato encontrado</td></tr>')+'</tbody></table></div>'+nav;
  bindFiltros();
}

function bindFiltros(){
  document.querySelectorAll('#lista-contatos [data-f]').forEach(function(el){
    el.addEventListener('change', function(){ filtrosContatos[el.getAttribute('data-f')]=el.value.trim(); carregarContatos(true); });
  });
  var clr=document.querySelector('#lista-contatos [data-fclear]');
  if(clr) clr.addEventListener('click', function(){ ['q','empresa','cidade','estado','regional','tipo','status','mes','dia'].forEach(function(k){filtrosContatos[k]='';}); carregarContatos(true); });
  document.querySelectorAll('#lista-contatos [data-pag]').forEach(function(b){
    b.addEventListener('click', function(){ if(b.hasAttribute('disabled'))return; filtrosContatos.pagina=parseInt(b.getAttribute('data-pag')); carregarContatos(false); });
  });
}

document.addEventListener('change', function(e){
  var el=e.target.closest('#lista-contatos [data-act="regional"]');
  if(!el) return;
  _patchContato(el.getAttribute('data-id'), {regional: el.value});
});

(function(){
  if(document.getElementById('css-tabela4')) return;
  var s=document.createElement('style'); s.id='css-tabela4';
  s.textContent='.tabela-contatos .tf{width:100%;padding:4px 6px;font-size:12px;border:1px solid var(--border);border-radius:6px;background:#fff}'
   +'.filtros-row th{padding:6px 8px !important;background:#fafafa}';
  document.head.appendChild(s);
})();

/* ===== Fase 4c: tabela responsiva ===== */
function renderizarContatos(contatos,total){
  var lista=document.getElementById('lista-contatos');
  var label=document.getElementById('total-contatos-label');
  if(label) label.textContent=total+' contato'+(total!==1?'s':'');
  var f=filtrosContatos;
  function selOpts(arr,val,ph){ return ['<option value="">'+ph+'</option>'].concat(arr.map(function(o){return '<option value="'+o.v+'"'+(val===o.v?' selected':'')+'>'+o.t+'</option>';})).join(''); }
  var meses=[['01','Jan'],['02','Fev'],['03','Mar'],['04','Abr'],['05','Mai'],['06','Jun'],['07','Jul'],['08','Ago'],['09','Set'],['10','Out'],['11','Nov'],['12','Dez']].map(function(m){return {v:m[0],t:m[1]};});
  var dias=[]; for(var i=1;i<=31;i++){var dd=(i<10?'0':'')+i; dias.push({v:dd,t:dd});}
  var stArr=[{v:'ativo',t:'🟢 Ativo'},{v:'nao_ativo',t:'🔴 Não'},{v:'sem_info',t:'⚪ S/info'}];
  var regArr=regionaisAtivos().map(function(r){return {v:r,t:r};});
  var tipoArr=tiposAtivos().map(function(t){return {v:t,t:t};});
  var inp=function(n,ph){return '<input data-f="'+n+'" value="'+(f[n]||'')+'" placeholder="'+ph+'" class="tf">';};
  var sf=function(n,arr,ph){return '<select data-f="'+n+'" class="tf">'+selOpts(arr,f[n]||'',ph)+'</select>';};
  var cg='<colgroup><col style="width:15%"><col style="width:14%"><col style="width:12%"><col class="col-email" style="width:14%"><col class="col-cidade" style="width:9%"><col class="col-uf" style="width:4%"><col class="col-reg" style="width:10%"><col class="col-aniv" style="width:10%"><col style="width:7%"><col style="width:5%"></colgroup>';
  var filtroRow='<tr class="filtros-row">'
    +'<th>'+inp('q','buscar')+'</th>'
    +'<th>'+inp('empresa','empresa')+'</th>'
    +'<th></th>'
    +'<th class="col-email"></th>'
    +'<th class="col-cidade">'+inp('cidade','cidade')+'</th>'
    +'<th class="col-uf">'+inp('estado','UF')+'</th>'
    +'<th class="col-reg">'+sf('regional',regArr,'todas')+'</th>'
    +'<th class="col-aniv"><select data-f="mes" class="tf" style="width:48%">'+selOpts(meses,f.mes||'','mês')+'</select> <select data-f="dia" class="tf" style="width:46%">'+selOpts(dias,f.dia||'','dia')+'</select></th>'
    +'<th>'+sf('tipo',tipoArr,'todos')+'</th>'
    +'<th>'+sf('status',stArr,'todos')+'</th>'
    +'</tr>';
  var head='<thead><tr><th>Nome</th><th>Empresa</th><th>Telefone</th><th class="col-email">Email</th><th class="col-cidade">Cidade</th><th class="col-uf">UF</th><th class="col-reg">Regional</th><th class="col-aniv">Aniversário</th><th>Tipo</th><th>Status</th></tr>'+filtroRow+'</thead>';
  var rows=contatos.map(function(c){
    var chips=(c.tipos||[]).map(function(t){return '<span class="chip-tipo" data-act="deltipo" data-id="'+c.id+'" data-tipo="'+t+'">'+t+' ×</span>';}).join('');
    var add='<span class="chip-add" data-act="addtipo" data-id="'+c.id+'">+</span>';
    var st=['ativo','nao_ativo','sem_info'].map(function(s){return '<option value="'+s+'"'+(c.status===s?' selected':'')+'>'+statusLabel(s)+'</option>';}).join('');
    var regOpts='<option value="">—</option>'+regionaisAtivos().map(function(r){return '<option value="'+r+'"'+(c.regional===r?' selected':'')+'>'+r+'</option>';}).join('');
    var tel=formatarTelefone(c.whatsapp||c.telefone1);
    return '<tr>'
      +'<td title="'+(c.nome||'')+'"><a href="#" data-act="abrir" data-id="'+c.id+'" style="color:var(--primary);font-weight:600;text-decoration:none">'+(c.nome||'')+'</a></td>'
      +'<td title="'+(c.empresa_nome||'')+'">'+(c.empresa_nome||'—')+'</td>'
      +'<td title="'+tel+'">'+tel+'</td>'
      +'<td class="col-email" title="'+(c.email||'')+'">'+(c.email||'—')+'</td>'
      +'<td class="col-cidade" title="'+(c.cidade||'')+'">'+(c.cidade||'—')+'</td>'
      +'<td class="col-uf">'+(c.estado||'—')+'</td>'
      +'<td class="col-reg"><select class="tf" data-act="regional" data-id="'+c.id+'">'+regOpts+'</select></td>'
      +'<td class="col-aniv">'+fmtAniv(c.aniversario)+'</td>'
      +'<td><div class="tipo-cell">'+chips+add+'</div></td>'
      +'<td><select class="tf sel-status status-'+c.status+'" data-act="status" data-id="'+c.id+'">'+st+'</select></td>'
      +'</tr>';
  }).join('');
  var pp=f.por_pagina||20, pag=f.pagina||1, totalPag=Math.max(1,Math.ceil(total/pp));
  var temFiltro=['q','empresa','cidade','estado','regional','tipo','status','mes','dia'].some(function(k){return f[k];});
  var nav='<div style="display:flex;justify-content:space-between;align-items:center;margin-top:12px;gap:8px">'
    +(temFiltro?'<button class="btn btn-sm btn-secondary" data-fclear="1">Limpar filtros</button>':'<span></span>')
    +'<span class="text-sm text-muted">Pág '+pag+'/'+totalPag+'</span>'
    +'<span><button class="btn btn-sm btn-secondary" data-pag="'+(pag-1)+'"'+(pag<=1?' disabled':'')+'>←</button> '
    +'<button class="btn btn-sm btn-secondary" data-pag="'+(pag+1)+'"'+(pag>=totalPag?' disabled':'')+'>→</button></span></div>';
  lista.innerHTML='<table class="tabela-contatos">'+cg+head+'<tbody>'+(rows||'<tr><td colspan="10" style="text-align:center;padding:20px;color:var(--text-muted)">Nenhum contato encontrado</td></tr>')+'</tbody></table>'+nav;
  bindFiltros();
}

(function(){
  var old=document.getElementById('css-tabela-contatos'); if(old) old.remove();
  var old4=document.getElementById('css-tabela4'); if(old4) old4.remove();
  var s=document.createElement('style'); s.id='css-tabela4c';
  s.textContent='.tabela-contatos{table-layout:fixed;width:100%;border-collapse:collapse;font-size:13px}'
   +'.tabela-contatos th,.tabela-contatos td{padding:6px 8px;border-bottom:1px solid var(--border);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:left}'
   +'.tabela-contatos thead tr:first-child th{border-bottom:2px solid var(--border);color:var(--text-muted);font-size:11px;text-transform:uppercase}'
   +'.filtros-row th{padding:5px 6px !important;background:#fafafa}'
   +'.tabela-contatos .tf{width:100%;padding:4px 5px;font-size:12px;border:1px solid var(--border);border-radius:6px;background:#fff;box-sizing:border-box}'
   +'.tabela-contatos tbody tr:hover{background:rgba(0,0,0,0.03)}'
   +'.tipo-cell{display:flex;flex-wrap:wrap;gap:3px;align-items:center}'
   +'.chip-tipo{background:var(--primary);color:#fff;border-radius:10px;padding:1px 6px;font-size:10px;cursor:pointer;white-space:nowrap}'
   +'.chip-add{border:1px dashed var(--border);color:var(--text-muted);border-radius:10px;padding:1px 7px;font-size:11px;cursor:pointer}'
   +'.status-ativo{color:#15803d}.status-nao_ativo{color:#b91c1c}'
   +'@media(max-width:1150px){.col-aniv{display:none}}'
   +'@media(max-width:1000px){.col-email{display:none}}'
   +'@media(max-width:860px){.col-cidade,.col-uf{display:none}}'
   +'@media(max-width:720px){.col-reg{display:none}}';
  document.head.appendChild(s);
})();

/* ===== Fase 4d: full-width, menu retrátil, ícones telefone/email ===== */
function celTelefone(c){
  var out=[];
  var w=(c.whatsapp||'').replace(/\D/g,'');
  if(w) out.push('<a href="https://wa.me/'+w+'" target="_blank" title="WhatsApp: '+formatarTelefone(c.whatsapp)+'" style="color:#25d366;display:inline-flex">'+iconeWhatsapp()+'</a>');
  if(c.telefone1){ var d1=(''+c.telefone1).replace(/\D/g,''); out.push('<a href="tel:'+d1+'" title="'+formatarTelefone(c.telefone1)+'" style="color:var(--primary);display:inline-flex">'+iconeTelefone()+'</a>'); }
  if(c.telefone2){ var d2=(''+c.telefone2).replace(/\D/g,''); out.push('<a href="tel:'+d2+'" title="'+formatarTelefone(c.telefone2)+'" style="color:var(--primary);display:inline-flex">'+iconeTelefone()+'</a>'); }
  return out.length ? '<span style="display:inline-flex;gap:10px;align-items:center">'+out.join('')+'</span>' : '<span style="color:var(--text-muted)">—</span>';
}
function celEmail(c){
  if(!c.email) return '';
  return '<button class="btn-ic-mail" data-act="cpmail" data-email="'+c.email+'" title="Copiar: '+c.email+'" style="background:none;border:none;cursor:pointer;color:var(--primary);display:inline-flex;padding:0">'+iconeEmail()+'</button>';
}

function renderizarContatos(contatos,total){
  var lista=document.getElementById('lista-contatos');
  var label=document.getElementById('total-contatos-label');
  if(label) label.textContent=total+' contato'+(total!==1?'s':'');
  var f=filtrosContatos;
  function selOpts(arr,val,ph){ return ['<option value="">'+ph+'</option>'].concat(arr.map(function(o){return '<option value="'+o.v+'"'+(val===o.v?' selected':'')+'>'+o.t+'</option>';})).join(''); }
  var meses=[['01','Jan'],['02','Fev'],['03','Mar'],['04','Abr'],['05','Mai'],['06','Jun'],['07','Jul'],['08','Ago'],['09','Set'],['10','Out'],['11','Nov'],['12','Dez']].map(function(m){return {v:m[0],t:m[1]};});
  var dias=[]; for(var i=1;i<=31;i++){var dd=(i<10?'0':'')+i; dias.push({v:dd,t:dd});}
  var stArr=[{v:'ativo',t:'🟢 Ativo'},{v:'nao_ativo',t:'🔴 Não'},{v:'sem_info',t:'⚪ S/info'}];
  var regArr=regionaisAtivos().map(function(r){return {v:r,t:r};});
  var tipoArr=tiposAtivos().map(function(t){return {v:t,t:t};});
  var inp=function(n,ph){return '<input data-f="'+n+'" value="'+(f[n]||'')+'" placeholder="'+ph+'" class="tf">';};
  var sf=function(n,arr,ph){return '<select data-f="'+n+'" class="tf">'+selOpts(arr,f[n]||'',ph)+'</select>';};
  var cg='<colgroup><col style="width:16%"><col style="width:15%"><col style="width:8%"><col class="col-email" style="width:6%"><col class="col-cidade" style="width:10%"><col class="col-uf" style="width:4%"><col class="col-reg" style="width:11%"><col class="col-aniv" style="width:9%"><col style="width:11%"><col style="width:8%"></colgroup>';
  var filtroRow='<tr class="filtros-row">'
    +'<th>'+inp('q','buscar')+'</th>'
    +'<th>'+inp('empresa','empresa')+'</th>'
    +'<th></th>'
    +'<th class="col-email"></th>'
    +'<th class="col-cidade">'+inp('cidade','cidade')+'</th>'
    +'<th class="col-uf">'+inp('estado','UF')+'</th>'
    +'<th class="col-reg">'+sf('regional',regArr,'todas')+'</th>'
    +'<th class="col-aniv"><select data-f="mes" class="tf" style="width:48%">'+selOpts(meses,f.mes||'','mês')+'</select> <select data-f="dia" class="tf" style="width:46%">'+selOpts(dias,f.dia||'','dia')+'</select></th>'
    +'<th>'+sf('tipo',tipoArr,'todos')+'</th>'
    +'<th>'+sf('status',stArr,'todos')+'</th>'
    +'</tr>';
  var head='<thead><tr><th>Nome</th><th>Empresa</th><th>Tel</th><th class="col-email">Email</th><th class="col-cidade">Cidade</th><th class="col-uf">UF</th><th class="col-reg">Regional</th><th class="col-aniv">Aniversário</th><th>Tipo</th><th>Status</th></tr>'+filtroRow+'</thead>';
  var rows=contatos.map(function(c){
    var chips=(c.tipos||[]).map(function(t){return '<span class="chip-tipo" data-act="deltipo" data-id="'+c.id+'" data-tipo="'+t+'">'+t+' ×</span>';}).join('');
    var add='<span class="chip-add" data-act="addtipo" data-id="'+c.id+'">+</span>';
    var st=['ativo','nao_ativo','sem_info'].map(function(s){return '<option value="'+s+'"'+(c.status===s?' selected':'')+'>'+statusLabel(s)+'</option>';}).join('');
    var regOpts='<option value="">—</option>'+regionaisAtivos().map(function(r){return '<option value="'+r+'"'+(c.regional===r?' selected':'')+'>'+r+'</option>';}).join('');
    return '<tr>'
      +'<td title="'+(c.nome||'')+'"><a href="#" data-act="abrir" data-id="'+c.id+'" style="color:var(--primary);font-weight:600;text-decoration:none">'+(c.nome||'')+'</a></td>'
      +'<td title="'+(c.empresa_nome||'')+'">'+(c.empresa_nome||'—')+'</td>'
      +'<td>'+celTelefone(c)+'</td>'
      +'<td class="col-email" style="text-align:center">'+celEmail(c)+'</td>'
      +'<td class="col-cidade" title="'+(c.cidade||'')+'">'+(c.cidade||'—')+'</td>'
      +'<td class="col-uf">'+(c.estado||'—')+'</td>'
      +'<td class="col-reg"><select class="tf" data-act="regional" data-id="'+c.id+'">'+regOpts+'</select></td>'
      +'<td class="col-aniv">'+fmtAniv(c.aniversario)+'</td>'
      +'<td><div class="tipo-cell">'+chips+add+'</div></td>'
      +'<td><select class="tf sel-status status-'+c.status+'" data-act="status" data-id="'+c.id+'">'+st+'</select></td>'
      +'</tr>';
  }).join('');
  var pp=f.por_pagina||20, pag=f.pagina||1, totalPag=Math.max(1,Math.ceil(total/pp));
  var temFiltro=['q','empresa','cidade','estado','regional','tipo','status','mes','dia'].some(function(k){return f[k];});
  var nav='<div style="display:flex;justify-content:space-between;align-items:center;margin-top:12px;gap:8px">'
    +(temFiltro?'<button class="btn btn-sm btn-secondary" data-fclear="1">Limpar filtros</button>':'<span></span>')
    +'<span class="text-sm text-muted">Pág '+pag+'/'+totalPag+'</span>'
    +'<span><button class="btn btn-sm btn-secondary" data-pag="'+(pag-1)+'"'+(pag<=1?' disabled':'')+'>←</button> '
    +'<button class="btn btn-sm btn-secondary" data-pag="'+(pag+1)+'"'+(pag>=totalPag?' disabled':'')+'>→</button></span></div>';
  lista.innerHTML='<table class="tabela-contatos">'+cg+head+'<tbody>'+(rows||'<tr><td colspan="10" style="text-align:center;padding:20px;color:var(--text-muted)">Nenhum contato encontrado</td></tr>')+'</tbody></table>'+nav;
  bindFiltros();
}

document.addEventListener('click', function(e){
  var el=e.target.closest('#lista-contatos [data-act="cpmail"]');
  if(!el) return;
  e.preventDefault();
  var em=el.getAttribute('data-email');
  try{ copiarTexto(em); }catch(_){}
  toast('Email copiado: '+em,'success');
});

(function(){
  var s=document.createElement('style'); s.id='css-layout4d';
  s.textContent='#page-contatos .page-content{max-width:none;margin:0;padding:12px 16px}'
   +'.tabela-contatos td a svg,.tabela-contatos td button svg{width:18px;height:18px}'
   +'.desktop-nav,.app-main{transition:transform .2s, margin-left .2s}'
   +'body.nav-off .desktop-nav{transform:translateX(-100%)}'
   +'body.nav-off .app-main{margin-left:0}'
   +'#nav-reopen-btn{display:none;position:fixed;top:10px;left:10px;z-index:300;background:var(--primary);color:#fff;border:none;border-radius:8px;width:40px;height:40px;cursor:pointer;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,.2)}'
   +'body.nav-off #nav-reopen-btn{display:flex}';
  document.head.appendChild(s);
  if(!document.getElementById('nav-collapse-btn')){
    var nav=document.querySelector('.desktop-nav');
    if(nav){
      var b=document.createElement('button'); b.id='nav-collapse-btn'; b.className='desktop-nav-item'; b.title='Recolher menu';
      b.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5"/></svg> Recolher';
      b.addEventListener('click', function(){ document.body.classList.add('nav-off'); });
      nav.insertBefore(b, nav.children[1]||null);
    }
    var r=document.createElement('button'); r.id='nav-reopen-btn'; r.title='Abrir menu';
    r.innerHTML='<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5"/></svg>';
    r.addEventListener('click', function(){ document.body.classList.remove('nav-off'); });
    document.body.appendChild(r);
  }
})();

/* ===== Fase 4e: cidade/uf/aniversario editaveis na tabela ===== */
function renderizarContatos(contatos,total){
  var lista=document.getElementById('lista-contatos');
  var label=document.getElementById('total-contatos-label');
  if(label) label.textContent=total+' contato'+(total!==1?'s':'');
  var f=filtrosContatos;
  function selOpts(arr,val,ph){ return ['<option value="">'+ph+'</option>'].concat(arr.map(function(o){return '<option value="'+o.v+'"'+(val===o.v?' selected':'')+'>'+o.t+'</option>';})).join(''); }
  var meses=[['01','Jan'],['02','Fev'],['03','Mar'],['04','Abr'],['05','Mai'],['06','Jun'],['07','Jul'],['08','Ago'],['09','Set'],['10','Out'],['11','Nov'],['12','Dez']].map(function(m){return {v:m[0],t:m[1]};});
  var dias=[]; for(var i=1;i<=31;i++){var dd=(i<10?'0':'')+i; dias.push({v:dd,t:dd});}
  var stArr=[{v:'ativo',t:'🟢 Ativo'},{v:'nao_ativo',t:'🔴 Não'},{v:'sem_info',t:'⚪ S/info'}];
  var regArr=regionaisAtivos().map(function(r){return {v:r,t:r};});
  var tipoArr=tiposAtivos().map(function(t){return {v:t,t:t};});
  var inp=function(n,ph){return '<input data-f="'+n+'" value="'+(f[n]||'')+'" placeholder="'+ph+'" class="tf">';};
  var sf=function(n,arr,ph){return '<select data-f="'+n+'" class="tf">'+selOpts(arr,f[n]||'',ph)+'</select>';};
  var cg='<colgroup><col style="width:16%"><col style="width:15%"><col style="width:8%"><col class="col-email" style="width:5%"><col class="col-cidade" style="width:10%"><col class="col-uf" style="width:5%"><col class="col-reg" style="width:11%"><col class="col-aniv" style="width:10%"><col style="width:10%"><col style="width:8%"></colgroup>';
  var filtroRow='<tr class="filtros-row">'
    +'<th>'+inp('q','buscar')+'</th>'
    +'<th>'+inp('empresa','empresa')+'</th>'
    +'<th></th>'
    +'<th class="col-email"></th>'
    +'<th class="col-cidade">'+inp('cidade','cidade')+'</th>'
    +'<th class="col-uf">'+inp('estado','UF')+'</th>'
    +'<th class="col-reg">'+sf('regional',regArr,'todas')+'</th>'
    +'<th class="col-aniv"><select data-f="mes" class="tf" style="width:48%">'+selOpts(meses,f.mes||'','mês')+'</select> <select data-f="dia" class="tf" style="width:46%">'+selOpts(dias,f.dia||'','dia')+'</select></th>'
    +'<th>'+sf('tipo',tipoArr,'todos')+'</th>'
    +'<th>'+sf('status',stArr,'todos')+'</th>'
    +'</tr>';
  var head='<thead><tr><th>Nome</th><th>Empresa</th><th>Tel</th><th class="col-email">Email</th><th class="col-cidade">Cidade</th><th class="col-uf">UF</th><th class="col-reg">Regional</th><th class="col-aniv">Aniversário</th><th>Tipo</th><th>Status</th></tr>'+filtroRow+'</thead>';
  var rows=contatos.map(function(c){
    var chips=(c.tipos||[]).map(function(t){return '<span class="chip-tipo" data-act="deltipo" data-id="'+c.id+'" data-tipo="'+t+'">'+t+' ×</span>';}).join('');
    var add='<span class="chip-add" data-act="addtipo" data-id="'+c.id+'">+</span>';
    var st=['ativo','nao_ativo','sem_info'].map(function(s){return '<option value="'+s+'"'+(c.status===s?' selected':'')+'>'+statusLabel(s)+'</option>';}).join('');
    var regOpts='<option value="">—</option>'+regionaisAtivos().map(function(r){return '<option value="'+r+'"'+(c.regional===r?' selected':'')+'>'+r+'</option>';}).join('');
    var av=(c.aniversario && /^\d{4}-\d{2}-\d{2}$/.test(c.aniversario) && c.aniversario.slice(0,4)!=='0000') ? c.aniversario : '';
    return '<tr>'
      +'<td title="'+(c.nome||'')+'"><a href="#" data-act="abrir" data-id="'+c.id+'" style="color:var(--primary);font-weight:600;text-decoration:none">'+(c.nome||'')+'</a></td>'
      +'<td title="'+(c.empresa_nome||'')+'">'+(c.empresa_nome||'—')+'</td>'
      +'<td>'+celTelefone(c)+'</td>'
      +'<td class="col-email" style="text-align:center">'+celEmail(c)+'</td>'
      +'<td class="col-cidade"><input class="tf" data-act="cidade" data-id="'+c.id+'" value="'+(c.cidade||'')+'" placeholder="—"></td>'
      +'<td class="col-uf"><input class="tf" data-act="estado" data-id="'+c.id+'" maxlength="2" value="'+(c.estado||'')+'" placeholder="—" style="text-transform:uppercase"></td>'
      +'<td class="col-reg"><select class="tf" data-act="regional" data-id="'+c.id+'">'+regOpts+'</select></td>'
      +'<td class="col-aniv"><input type="date" class="tf" data-act="aniversario" data-id="'+c.id+'" value="'+av+'"></td>'
      +'<td><div class="tipo-cell">'+chips+add+'</div></td>'
      +'<td><select class="tf sel-status status-'+c.status+'" data-act="status" data-id="'+c.id+'">'+st+'</select></td>'
      +'</tr>';
  }).join('');
  var pp=f.por_pagina||20, pag=f.pagina||1, totalPag=Math.max(1,Math.ceil(total/pp));
  var temFiltro=['q','empresa','cidade','estado','regional','tipo','status','mes','dia'].some(function(k){return f[k];});
  var nav='<div style="display:flex;justify-content:space-between;align-items:center;margin-top:12px;gap:8px">'
    +(temFiltro?'<button class="btn btn-sm btn-secondary" data-fclear="1">Limpar filtros</button>':'<span></span>')
    +'<span class="text-sm text-muted">Pág '+pag+'/'+totalPag+'</span>'
    +'<span><button class="btn btn-sm btn-secondary" data-pag="'+(pag-1)+'"'+(pag<=1?' disabled':'')+'>←</button> '
    +'<button class="btn btn-sm btn-secondary" data-pag="'+(pag+1)+'"'+(pag>=totalPag?' disabled':'')+'>→</button></span></div>';
  lista.innerHTML='<table class="tabela-contatos">'+cg+head+'<tbody>'+(rows||'<tr><td colspan="10" style="text-align:center;padding:20px;color:var(--text-muted)">Nenhum contato encontrado</td></tr>')+'</tbody></table>'+nav;
  bindFiltros();
}

document.addEventListener('change', function(e){
  var el=e.target.closest('#lista-contatos [data-act]');
  if(!el) return;
  var act=el.getAttribute('data-act');
  if(act==='cidade'||act==='estado'||act==='aniversario'){
    var d={}; d[act]=el.value.trim(); _patchContato(el.getAttribute('data-id'), d);
  }
});

/* ===== Fase 5: catalogos em Configuracoes + rotulo Lista ===== */
var _cfgCache={};
function _cfgNorm(arr){ return (arr||[]).map(function(it){ return (typeof it==='string')?{nome:it,ativo:true}:it; }); }
function _cfgContainer(chave){ return chave==='tipos_catalogo'?'cfg-listas':'cfg-regionais'; }

async function _cfgLoad(chave, def){
  try{ var c=await api.obterConfig(chave); if(c && c.valor && Array.isArray(c.valor)) return _cfgNorm(c.valor); }catch(e){}
  return def;
}
function cfgRenderLista(containerId, lista, chave){
  var el=document.getElementById(containerId); if(!el) return;
  if(!lista.length){ el.innerHTML='<span class="text-sm text-muted">nenhum item ainda</span>'; return; }
  el.innerHTML=lista.map(function(it,idx){
    var nome=it.nome, ativo=it.ativo!==false;
    return '<span style="display:inline-flex;align-items:center;gap:5px;margin:3px;padding:4px 10px;border-radius:14px;font-size:13px;background:'+(ativo?'var(--primary-light)':'#eee')+';color:'+(ativo?'var(--primary)':'#999')+'">'
      +'<span style="cursor:pointer" title="ativar/desativar" onclick="cfgToggle(\''+chave+'\','+idx+')">'+(ativo?'●':'○')+'</span>'
      +nome
      +'<span style="cursor:pointer;font-weight:700" title="remover" onclick="cfgRemover(\''+chave+'\','+idx+')">×</span></span>';
  }).join('');
}
function _cfgAplicaGlobal(chave){
  if(chave==='tipos_catalogo') TIPOS_CATALOGO=_cfgCache[chave]; else REGIONAIS_CATALOGO=_cfgCache[chave];
}
async function cfgInit(){
  _cfgCache.tipos_catalogo=await _cfgLoad('tipos_catalogo',[{nome:'cliente',ativo:true},{nome:'finder',ativo:true},{nome:'fabricante',ativo:true}]);
  _cfgCache.regionais_catalogo=await _cfgLoad('regionais_catalogo',[{nome:'Sul',ativo:true},{nome:'Sudeste',ativo:true},{nome:'Norte',ativo:true},{nome:'Nordeste',ativo:true},{nome:'Centro-Oeste',ativo:true}]);
  TIPOS_CATALOGO=_cfgCache.tipos_catalogo; REGIONAIS_CATALOGO=_cfgCache.regionais_catalogo;
  cfgRenderLista('cfg-listas',_cfgCache.tipos_catalogo,'tipos_catalogo');
  cfgRenderLista('cfg-regionais',_cfgCache.regionais_catalogo,'regionais_catalogo');
}
async function cfgAddCatalogo(chave, inputId){
  var inp=document.getElementById(inputId); var nome=(inp.value||'').trim(); if(!nome) return;
  var lista=_cfgNorm(_cfgCache[chave]||[]);
  if(lista.some(function(x){return x.nome.toLowerCase()===nome.toLowerCase();})){ toast('Já existe','warning'); return; }
  lista.push({nome:nome,ativo:true}); _cfgCache[chave]=lista;
  await api.salvarConfig(chave,lista); _cfgAplicaGlobal(chave);
  inp.value=''; cfgRenderLista(_cfgContainer(chave),lista,chave); toast('Salvo','success');
}
async function cfgToggle(chave, idx){
  var lista=_cfgNorm(_cfgCache[chave]||[]); lista[idx].ativo=!(lista[idx].ativo!==false); _cfgCache[chave]=lista;
  await api.salvarConfig(chave,lista); _cfgAplicaGlobal(chave); cfgRenderLista(_cfgContainer(chave),lista,chave);
}
async function cfgRemover(chave, idx){
  var lista=_cfgNorm(_cfgCache[chave]||[]); lista.splice(idx,1); _cfgCache[chave]=lista;
  await api.salvarConfig(chave,lista); _cfgAplicaGlobal(chave); cfgRenderLista(_cfgContainer(chave),lista,chave);
}
document.querySelectorAll('[data-page="configuracoes"]').forEach(function(b){ b.addEventListener('click', function(){ setTimeout(cfgInit,120); }); });
setTimeout(function(){ if(document.getElementById('cfg-catalogos-root') && api.isLoggedIn()) cfgInit(); }, 300);

/* renomear coluna Tipo -> Lista */
var _renderPrevLbl=renderizarContatos;
renderizarContatos=function(c,t){ _renderPrevLbl(c,t); document.querySelectorAll('#lista-contatos thead th').forEach(function(th){ if(th.textContent.trim()==='Tipo') th.textContent='Lista'; }); };

/* ajuste: header nao fica sob o botao flutuante quando menu recolhido */
(function(){
  var s=document.createElement('style'); s.id='css-navoff-header';
  s.textContent='body.nav-off .app-header{padding-left:62px}';
  document.head.appendChild(s);
})();

/* ===== Fase 6: campos extras no formulario ===== */
function montarFormExtras(c){
  c=c||{};
  var reg=document.getElementById('fc-regional');
  if(reg) reg.innerHTML='<option value="">—</option>'+regionaisAtivos().map(function(r){return '<option value="'+r+'"'+(c.regional===r?' selected':'')+'>'+r+'</option>';}).join('');
  var stt=document.getElementById('fc-status'); if(stt) stt.value=c.status||'sem_info';
  var cid=document.getElementById('fc-cidade'); if(cid) cid.value=c.cidade||'';
  var est=document.getElementById('fc-estado'); if(est) est.value=c.estado||'';
  var av=document.getElementById('fc-aniversario'); if(av) av.value=(c.aniversario && /^\d{4}-\d{2}-\d{2}$/.test(c.aniversario) && c.aniversario.slice(0,4)!=='0000')?c.aniversario:'';
  var tp=document.getElementById('fc-tipos');
  if(tp){ var atu=c.tipos||[]; var ts=tiposAtivos();
    tp.innerHTML= ts.length ? ts.map(function(t){var ck=atu.indexOf(t)>=0?' checked':''; return '<label style="display:inline-flex;align-items:center;gap:4px;font-size:13px"><input type="checkbox" value="'+t+'"'+ck+'> '+t+'</label>';}).join('') : '<span class="text-sm text-muted">cadastre listas em Configurações</span>';
  }
}
var _preencherPrev=preencherFormContato;
preencherFormContato=function(c){ _preencherPrev(c); montarFormExtras(c); };
var _abrirNovoPrev=abrirNovoContato;
abrirNovoContato=function(){ var r=_abrirNovoPrev.apply(this,arguments); setTimeout(function(){ montarFormExtras({}); }, 60); return r; };

/* ===== Modulo LINKEDIN > Felicitacoes ===== */
var FEL_DEFAULT={temas:[
  {titulo:'Aniversário',textos:['']},
  {titulo:'Aniversário de Empresa',textos:['']},
  {titulo:'Mudança de Cargo',textos:['']},
  {titulo:'Estudos',textos:['']}
]};
var _felModel=null, _felTimer=null;
function _felEsc(s){ return (''+(s||'')).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function _felSave(){ clearTimeout(_felTimer); _felTimer=setTimeout(function(){ try{ api.salvarConfig('felicitacoes', _felModel); }catch(e){} }, 600); }

async function carregarFelicitacoes(){
  if(!_felModel){
    _felModel=JSON.parse(JSON.stringify(FEL_DEFAULT));
    try{ var c=await api.obterConfig('felicitacoes'); if(c && c.valor && c.valor.temas) _felModel=c.valor; }catch(e){}
  }
  renderFelicitacoes();
}
function renderFelicitacoes(){
  var root=document.getElementById('felicitacoes-root'); if(!root) return;
  root.innerHTML=_felModel.temas.map(function(tema,ti){
    var boxes=tema.textos.map(function(txt,xi){
      var len=(''+(txt||'')).length;
      return '<div class="fel-box" style="border:1px solid var(--border);border-radius:10px;padding:10px;margin-bottom:10px">'
        +'<textarea class="form-control fel-ta" data-ti="'+ti+'" data-xi="'+xi+'" maxlength="500" rows="3" placeholder="Escreva o texto...">'+_felEsc(txt)+'</textarea>'
        +'<div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px">'
        +'<span class="fel-count text-sm" style="color:'+(len>=500?'var(--danger)':'var(--text-muted)')+'">'+len+'/500</span>'
        +'<span style="display:flex;gap:6px">'
        +'<button class="btn btn-sm btn-primary" data-act="copiar">📋 Copiar</button>'
        +'<button class="btn btn-sm btn-secondary" data-act="delbox" data-ti="'+ti+'" data-xi="'+xi+'" title="remover" style="color:var(--danger)">×</button>'
        +'</span></div></div>';
    }).join('');
    return '<div class="card mb-4"><div class="card-body">'
      +'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">'
      +'<h3 style="margin:0;font-size:16px">'+_felEsc(tema.titulo)+'</h3>'
      +'<button class="btn btn-sm btn-primary" data-act="addbox" data-ti="'+ti+'">＋ caixa</button></div>'
      +boxes+'</div></div>';
  }).join('')
  +'<div style="display:flex;gap:6px;margin-bottom:24px"><input id="fel-novo-tema" class="form-control" placeholder="novo tema (ex: Conquista)"><button class="btn btn-secondary" data-act="addtema">＋ Tema</button></div>';
}

document.addEventListener('input', function(e){
  var ta=e.target.closest('#felicitacoes-root .fel-ta'); if(!ta) return;
  var ti=+ta.getAttribute('data-ti'), xi=+ta.getAttribute('data-xi');
  _felModel.temas[ti].textos[xi]=ta.value;
  var cnt=ta.closest('.fel-box').querySelector('.fel-count');
  if(cnt){ cnt.textContent=ta.value.length+'/500'; cnt.style.color=ta.value.length>=500?'var(--danger)':'var(--text-muted)'; }
  _felSave();
});
document.addEventListener('click', function(e){
  var b=e.target.closest('#felicitacoes-root [data-act]'); if(!b) return;
  var act=b.getAttribute('data-act');
  if(act==='copiar'){ var ta=b.closest('.fel-box').querySelector('.fel-ta'); try{ copiarTexto(ta.value); }catch(_){} toast('Texto copiado','success'); return; }
  if(act==='addtema'){ var inp=document.getElementById('fel-novo-tema'); var nome=(inp.value||'').trim(); if(!nome) return; _felModel.temas.push({titulo:nome,textos:['']}); _felSave(); renderFelicitacoes(); return; }
  var ti=+b.getAttribute('data-ti');
  if(act==='addbox'){ _felModel.temas[ti].textos.push(''); _felSave(); renderFelicitacoes(); return; }
  if(act==='delbox'){ var xi=+b.getAttribute('data-xi'); _felModel.temas[ti].textos.splice(xi,1); if(!_felModel.temas[ti].textos.length) _felModel.temas[ti].textos.push(''); _felSave(); renderFelicitacoes(); return; }
});

(function(){
  if(!document.getElementById('page-felicitacoes')){
    var main=document.querySelector('.app-main');
    if(main){
      var pg=document.createElement('div'); pg.id='page-felicitacoes'; pg.className='page';
      pg.innerHTML='<div class="app-header"><h2>💬 Felicitações</h2></div><div class="page-content"><p class="text-sm text-muted mb-3">Textos prontos pra copiar e colar no LinkedIn — salvam automaticamente no servidor.</p><div id="felicitacoes-root"></div></div>';
      main.appendChild(pg);
    }
  }
  if(!document.querySelector('.desktop-nav-item[data-page="felicitacoes"]')){
    var nav=document.querySelector('.desktop-nav');
    if(nav){
      var lbl=document.createElement('div'); lbl.textContent='LINKEDIN'; lbl.style.cssText='font-size:10px;color:var(--text-muted);text-transform:uppercase;padding:10px 12px 2px;font-weight:700';
      var b=document.createElement('button'); b.className='desktop-nav-item'; b.setAttribute('data-page','felicitacoes');
      b.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path stroke-linecap="round" stroke-linejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 0 1 .778-.332 48.294 48.294 0 0 0 5.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z"/></svg> Felicitações';
      b.addEventListener('click', function(){ navegarPara('felicitacoes'); carregarFelicitacoes(); });
      var spacer=nav.querySelector('div[style*="flex:1"]');
      if(spacer){ nav.insertBefore(lbl, spacer); nav.insertBefore(b, spacer); } else { nav.appendChild(lbl); nav.appendChild(b); }
    }
  }
})();

/* ===== copia compativel com HTTP + felicitacoes com icones ===== */
function copiarTexto(txt){
  if(navigator.clipboard && window.isSecureContext){ try{ return navigator.clipboard.writeText(txt); }catch(e){} }
  var ta=document.createElement('textarea'); ta.value=txt; ta.style.position='fixed'; ta.style.top='-1000px';
  document.body.appendChild(ta); ta.focus(); ta.select();
  try{ document.execCommand('copy'); }catch(e){}
  document.body.removeChild(ta);
}

function renderFelicitacoes(){
  var root=document.getElementById('felicitacoes-root'); if(!root) return;
  var COPY='<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612a.75.75 0 0 1-.75.75H9a.75.75 0 0 1-.75-.75c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184"/></svg>';
  var TRASH='<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"/></svg>';
  root.innerHTML=_felModel.temas.map(function(tema,ti){
    var boxes=tema.textos.map(function(txt,xi){
      var len=(''+(txt||'')).length;
      return '<div class="fel-box" style="border:1px solid var(--border);border-radius:10px;padding:10px;margin-bottom:10px">'
        +'<textarea class="form-control fel-ta" data-ti="'+ti+'" data-xi="'+xi+'" maxlength="500" rows="3" placeholder="Escreva o texto...">'+_felEsc(txt)+'</textarea>'
        +'<div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px">'
        +'<span class="fel-count text-sm" style="color:'+(len>=500?'var(--danger)':'var(--text-muted)')+'">'+len+'/500</span>'
        +'<span style="display:flex;gap:12px">'
        +'<button class="fel-ic" data-act="copiar" title="Copiar">'+COPY+'</button>'
        +'<button class="fel-ic" data-act="delbox" data-ti="'+ti+'" data-xi="'+xi+'" title="Limpar" style="color:var(--danger)">'+TRASH+'</button>'
        +'</span></div></div>';
    }).join('');
    return '<div class="card mb-4"><div class="card-body">'
      +'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">'
      +'<h3 style="margin:0;font-size:16px">'+_felEsc(tema.titulo)+'</h3>'
      +'<button class="fel-ic" data-act="addbox" data-ti="'+ti+'" title="Adicionar caixa" style="font-size:22px;line-height:1;color:var(--primary)">＋</button></div>'
      +boxes+'</div></div>';
  }).join('')
  +'<div style="display:flex;gap:6px;margin-bottom:24px"><input id="fel-novo-tema" class="form-control" placeholder="novo tema (ex: Conquista)"><button class="btn btn-secondary" data-act="addtema">＋ Tema</button></div>';
}

(function(){ if(document.getElementById('css-fel'))return; var s=document.createElement('style'); s.id='css-fel'; s.textContent='.fel-ic{background:none;border:none;cursor:pointer;color:var(--primary);padding:2px;display:inline-flex;align-items:center}.fel-ic:hover{opacity:.65}'; document.head.appendChild(s); })();

/* ===== Menu de usuario (topo direito) ===== */
(function(){
  var main=document.querySelector('.app-main');
  if(main && !document.getElementById('page-perfil')){
    var p=document.createElement('div'); p.id='page-perfil'; p.className='page';
    p.innerHTML='<div class="app-header"><h2>👤 Meu Perfil</h2></div><div class="page-content"><div class="card"><div class="card-body"><p class="text-sm text-muted">Usuário logado: <b>admin</b></p><p class="text-sm text-muted" style="margin-top:8px">Em breve: foto de perfil, dados e preferências.</p></div></div></div>';
    main.appendChild(p);
  }
  if(main && !document.getElementById('page-atalhos')){
    var a=document.createElement('div'); a.id='page-atalhos'; a.className='page';
    a.innerHTML='<div class="app-header"><h2>⭐ Meus Atalhos</h2></div><div class="page-content"><div class="card"><div class="card-body"><p class="text-sm text-muted">Em breve: seus atalhos e favoritos.</p></div></div></div>';
    main.appendChild(a);
  }
  var app=document.getElementById('app');
  if(app && !document.getElementById('user-menu')){
    var wrap=document.createElement('div'); wrap.id='user-menu'; wrap.style.cssText='position:fixed;top:8px;right:16px;z-index:250';
    wrap.innerHTML='<button id="user-menu-btn" style="display:flex;align-items:center;gap:8px;background:#fff;border:1px solid var(--border);border-radius:24px;padding:4px 10px 4px 4px;cursor:pointer;box-shadow:0 1px 4px rgba(0,0,0,.08)">'
      +'<span style="width:32px;height:32px;border-radius:50%;background:var(--primary);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px">A</span>'
      +'<span class="um-name" style="font-size:13px;font-weight:600;color:var(--text)">Anderson</span>'
      +'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--text-muted)"><path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5"/></svg></button>'
      +'<div id="user-menu-drop" style="display:none;position:absolute;right:0;top:46px;background:#fff;border:1px solid var(--border);border-radius:10px;box-shadow:0 4px 16px rgba(0,0,0,.12);min-width:180px;overflow:hidden">'
      +'<button class="um-item" data-um="perfil">👤 Meu Perfil</button>'
      +'<button class="um-item" data-um="atalhos">⭐ Meus Atalhos</button>'
      +'<div style="height:1px;background:var(--border)"></div>'
      +'<button class="um-item" data-um="sair" style="color:var(--danger)">🚪 Sair</button></div>';
    app.appendChild(wrap);
    var st=document.createElement('style');
    st.textContent='.um-item{display:block;width:100%;text-align:left;background:none;border:none;padding:10px 14px;font-size:14px;cursor:pointer;color:var(--text)}.um-item:hover{background:var(--surface-2)}'
      +'.app-header{padding-right:150px}@media(max-width:600px){#user-menu .um-name{display:none}.app-header{padding-right:52px}}';
    document.head.appendChild(st);
    var drop=document.getElementById('user-menu-drop');
    document.getElementById('user-menu-btn').addEventListener('click', function(e){ e.stopPropagation(); drop.style.display=drop.style.display==='none'?'block':'none'; });
    document.addEventListener('click', function(){ drop.style.display='none'; });
    drop.addEventListener('click', function(e){ var it=e.target.closest('[data-um]'); if(!it)return; var act=it.getAttribute('data-um'); drop.style.display='none'; if(act==='sair'){ logout(); } else { navegarPara(act); } });
  }
})();

/* ===== Fase 7: tabela Contatos na ordem da planilha ===== */
function renderizarContatos(contatos,total){
  var lista=document.getElementById('lista-contatos');
  var label=document.getElementById('total-contatos-label');
  if(label) label.textContent=total+' contato'+(total!==1?'s':'');
  var f=filtrosContatos;
  function selOpts(arr,val,ph){ return ['<option value="">'+ph+'</option>'].concat(arr.map(function(o){return '<option value="'+o.v+'"'+(val===o.v?' selected':'')+'>'+o.t+'</option>';})).join(''); }
  var meses=[['01','Jan'],['02','Fev'],['03','Mar'],['04','Abr'],['05','Mai'],['06','Jun'],['07','Jul'],['08','Ago'],['09','Set'],['10','Out'],['11','Nov'],['12','Dez']].map(function(m){return {v:m[0],t:m[1]};});
  var dias=[]; for(var i=1;i<=31;i++){var dd=(i<10?'0':'')+i; dias.push({v:dd,t:dd});}
  var stArr=[{v:'ativo',t:'🟢 Ativo'},{v:'nao_ativo',t:'🔴 Não'},{v:'sem_info',t:'⚪ S/info'}];
  var regArr=regionaisAtivos().map(function(r){return {v:r,t:r};});
  var tipoArr=tiposAtivos().map(function(t){return {v:t,t:t};});
  var inp=function(n,ph){return '<input data-f="'+n+'" value="'+(f[n]||'')+'" placeholder="'+ph+'" class="tf">';};
  var sf=function(n,arr,ph){return '<select data-f="'+n+'" class="tf">'+selOpts(arr,f[n]||'',ph)+'</select>';};
  var cg='<colgroup>'
    +'<col style="width:12%"><col style="width:11%"><col class="col-cnpj" style="width:8%"><col class="col-cargo" style="width:9%">'
    +'<col style="width:5%"><col class="col-email" style="width:3%"><col class="col-resp" style="width:9%">'
    +'<col class="col-cidade" style="width:8%"><col class="col-uf" style="width:3%"><col class="col-reg" style="width:9%">'
    +'<col class="col-aniv" style="width:8%"><col style="width:7%"><col style="width:5%"></colgroup>';
  var filtroRow='<tr class="filtros-row">'
    +'<th>'+inp('empresa','empresa')+'</th>'
    +'<th>'+inp('q','nome')+'</th>'
    +'<th class="col-cnpj"></th>'
    +'<th class="col-cargo"></th>'
    +'<th></th>'
    +'<th class="col-email"></th>'
    +'<th class="col-resp">'+inp('responsavel','resp.')+'</th>'
    +'<th class="col-cidade">'+inp('cidade','cidade')+'</th>'
    +'<th class="col-uf">'+inp('estado','UF')+'</th>'
    +'<th class="col-reg">'+sf('regional',regArr,'todas')+'</th>'
    +'<th class="col-aniv"><select data-f="mes" class="tf" style="width:48%">'+selOpts(meses,f.mes||'','mês')+'</select> <select data-f="dia" class="tf" style="width:46%">'+selOpts(dias,f.dia||'','dia')+'</select></th>'
    +'<th>'+sf('tipo',tipoArr,'todos')+'</th>'
    +'<th>'+sf('status',stArr,'todos')+'</th>'
    +'</tr>';
  var head='<thead><tr><th>Empresa</th><th>Nome</th><th class="col-cnpj">CNPJ Empresa</th><th class="col-cargo">Cargo</th><th>Tel</th><th class="col-email">Email</th><th class="col-resp">Responsável</th><th class="col-cidade">Cidade</th><th class="col-uf">UF</th><th class="col-reg">Regional</th><th class="col-aniv">Aniversário</th><th>Lista</th><th>Status</th></tr>'+filtroRow+'</thead>';
  var rows=contatos.map(function(c){
    var chips=(c.tipos||[]).map(function(t){return '<span class="chip-tipo" data-act="deltipo" data-id="'+c.id+'" data-tipo="'+t+'">'+t+' ×</span>';}).join('');
    var add='<span class="chip-add" data-act="addtipo" data-id="'+c.id+'">+</span>';
    var st=['ativo','nao_ativo','sem_info'].map(function(s){return '<option value="'+s+'"'+(c.status===s?' selected':'')+'>'+statusLabel(s)+'</option>';}).join('');
    var regOpts='<option value="">—</option>'+regionaisAtivos().map(function(r){return '<option value="'+r+'"'+(c.regional===r?' selected':'')+'>'+r+'</option>';}).join('');
    var av=(c.aniversario && /^\d{4}-\d{2}-\d{2}$/.test(c.aniversario) && c.aniversario.slice(0,4)!=='0000') ? c.aniversario : '';
    return '<tr>'
      +'<td title="'+(c.empresa_nome||'')+'">'+(c.empresa_nome||'—')+'</td>'
      +'<td title="'+(c.nome||'')+'"><a href="#" data-act="abrir" data-id="'+c.id+'" style="color:var(--primary);font-weight:600;text-decoration:none">'+(c.nome||'')+'</a></td>'
      +'<td class="col-cnpj" title="'+(c.empresa_cnpj||'')+'">'+(c.empresa_cnpj||'—')+'</td>'
      +'<td class="col-cargo"><input class="tf" data-act="cargo" data-id="'+c.id+'" value="'+(c.cargo||'')+'" placeholder="—"></td>'
      +'<td>'+celTelefone(c)+'</td>'
      +'<td class="col-email" style="text-align:center">'+celEmail(c)+'</td>'
      +'<td class="col-resp"><input class="tf" data-act="responsavel" data-id="'+c.id+'" value="'+(c.responsavel||'')+'" placeholder="—"></td>'
      +'<td class="col-cidade"><input class="tf" data-act="cidade" data-id="'+c.id+'" value="'+(c.cidade||'')+'" placeholder="—"></td>'
      +'<td class="col-uf"><input class="tf" data-act="estado" data-id="'+c.id+'" maxlength="2" value="'+(c.estado||'')+'" placeholder="—" style="text-transform:uppercase"></td>'
      +'<td class="col-reg"><select class="tf" data-act="regional" data-id="'+c.id+'">'+regOpts+'</select></td>'
      +'<td class="col-aniv"><input type="date" class="tf" data-act="aniversario" data-id="'+c.id+'" value="'+av+'"></td>'
      +'<td><div class="tipo-cell">'+chips+add+'</div></td>'
      +'<td><select class="tf sel-status status-'+c.status+'" data-act="status" data-id="'+c.id+'">'+st+'</select></td>'
      +'</tr>';
  }).join('');
  var pp=f.por_pagina||20, pag=f.pagina||1, totalPag=Math.max(1,Math.ceil(total/pp));
  var temFiltro=['q','empresa','responsavel','cidade','estado','regional','tipo','status','mes','dia'].some(function(k){return f[k];});
  var nav='<div style="display:flex;justify-content:space-between;align-items:center;margin-top:12px;gap:8px">'
    +(temFiltro?'<button class="btn btn-sm btn-secondary" data-fclear="1">Limpar filtros</button>':'<span></span>')
    +'<span class="text-sm text-muted">Pág '+pag+'/'+totalPag+'</span>'
    +'<span><button class="btn btn-sm btn-secondary" data-pag="'+(pag-1)+'"'+(pag<=1?' disabled':'')+'>←</button> '
    +'<button class="btn btn-sm btn-secondary" data-pag="'+(pag+1)+'"'+(pag>=totalPag?' disabled':'')+'>→</button></span></div>';
  lista.innerHTML='<table class="tabela-contatos">'+cg+head+'<tbody>'+(rows||'<tr><td colspan="13" style="text-align:center;padding:20px;color:var(--text-muted)">Nenhum contato encontrado</td></tr>')+'</tbody></table>'+nav;
  bindFiltros();
}

document.addEventListener('change', function(e){
  var el=e.target.closest('#lista-contatos [data-act]'); if(!el) return;
  var act=el.getAttribute('data-act');
  if(act==='cargo'||act==='responsavel'){ var d={}; d[act]=el.value.trim(); _patchContato(el.getAttribute('data-id'), d); }
});

(function(){ if(document.getElementById('css-cols7'))return; var s=document.createElement('style'); s.id='css-cols7';
  s.textContent='@media(max-width:1300px){.col-cnpj{display:none}}@media(max-width:1150px){.col-cargo{display:none}}@media(max-width:1050px){.col-resp{display:none}}';
  document.head.appendChild(s); })();

/* renomear coluna Lista (header) ja coberto pelo wrapper anterior; garante tambem aqui */

/* ===== Modulo Empresas: tabela ===== */
var filtrosEmpresas={};
var SITUACAO_CAT=['Lead','Ativo','Ex Cliente','Lead Perdido'];
var SEGMENTO_CAT=['Logística','Manufatura','Serviços'];
var STATUS_EMP_CAT=[];
var _empCatLoaded=false;
async function _catNomes(chave, def){
  try{ var c=await api.obterConfig(chave); if(c && c.valor && Array.isArray(c.valor) && c.valor.length){
    return c.valor.map(function(it){return (typeof it==='string')?{nome:it,ativo:true}:it;}).filter(function(x){return x.ativo!==false;}).map(function(x){return x.nome;});
  } }catch(e){}
  return def;
}
async function _patchEmpresa(id,dados){ await fetch('/api/empresas/'+id+'/inline',{method:'PATCH',headers:{'Content-Type':'application/json','Authorization':'Bearer '+getToken()},body:JSON.stringify(dados)}); }
function _optSel(arr,val){ var has=false,opts='<option value="">—</option>'; arr.forEach(function(o){ if(o===val)has=true; opts+='<option value="'+o+'"'+(o===val?' selected':'')+'>'+o+'</option>'; }); if(val&&!has) opts='<option value="'+val+'" selected>'+val+'</option>'+opts; return opts; }

async function carregarEmpresas(reset){
  if(reset===undefined) reset=true;
  if(!_empCatLoaded){ SITUACAO_CAT=await _catNomes('situacao_catalogo',SITUACAO_CAT); SEGMENTO_CAT=await _catNomes('segmento_catalogo',SEGMENTO_CAT); STATUS_EMP_CAT=await _catNomes('status_empresa_catalogo',STATUS_EMP_CAT); _empCatLoaded=true; }
  if(reset) filtrosEmpresas.pagina=1;
  if(!filtrosEmpresas.por_pagina) filtrosEmpresas.por_pagina=20;
  var lista=document.getElementById('lista-empresas');
  lista.innerHTML='<div class="empty-state"><div class="spinner" style="margin:0 auto"></div></div>';
  var params={pagina:filtrosEmpresas.pagina, por_pagina:filtrosEmpresas.por_pagina};
  ['q','responsavel','cidade','situacao','segmento','status'].forEach(function(k){ if(filtrosEmpresas[k]) params[k]=filtrosEmpresas[k]; });
  try{ var res=await api.listarEmpresas(params); renderEmpresasTabela(res.itens,res.total); }
  catch(err){ lista.innerHTML='<div class="empty-state"><p>Erro ao carregar empresas</p></div>'; }
}

function renderEmpresasTabela(itens,total){
  var lista=document.getElementById('lista-empresas');
  var label=document.getElementById('total-empresas-label'); if(label) label.textContent=total+' empresa'+(total!==1?'s':'');
  var f=filtrosEmpresas;
  function selF(n,arr,ph){ return '<select data-f="'+n+'" class="tf"><option value="">'+ph+'</option>'+arr.map(function(o){return '<option value="'+o+'"'+(f[n]===o?' selected':'')+'>'+o+'</option>';}).join('')+'</select>'; }
  var inp=function(n,ph){return '<input data-f="'+n+'" value="'+(f[n]||'')+'" placeholder="'+ph+'" class="tf">';};
  var cg='<colgroup><col style="width:16%"><col class="col-razao" style="width:16%"><col class="col-cnpj" style="width:11%"><col class="col-stat" style="width:9%"><col style="width:10%"><col class="col-resp" style="width:10%"><col class="col-data" style="width:8%"><col style="width:9%"><col class="col-cidade" style="width:8%"><col style="width:5%"></colgroup>';
  var filtroRow='<tr class="filtros-row">'
    +'<th>'+inp('q','nome/razão/cnpj')+'</th>'
    +'<th class="col-razao"></th>'
    +'<th class="col-cnpj"></th>'
    +'<th class="col-stat">'+selF('status',STATUS_EMP_CAT,'todos')+'</th>'
    +'<th>'+selF('situacao',SITUACAO_CAT,'todas')+'</th>'
    +'<th class="col-resp">'+inp('responsavel','resp.')+'</th>'
    +'<th class="col-data"></th>'
    +'<th>'+selF('segmento',SEGMENTO_CAT,'todos')+'</th>'
    +'<th class="col-cidade">'+inp('cidade','cidade')+'</th>'
    +'<th></th></tr>';
  var head='<thead><tr><th>Nome</th><th class="col-razao">Razão social</th><th class="col-cnpj">CNPJ</th><th class="col-stat">Status</th><th>Situação</th><th class="col-resp">Responsável</th><th class="col-data">Últ. contato</th><th>Segmento</th><th class="col-cidade">Cidade</th><th>Contatos</th></tr>'+filtroRow+'</thead>';
  var rows=itens.map(function(e){
    var dt=(e.data_ultimo_contato && /^\d{4}-\d{2}-\d{2}$/.test(e.data_ultimo_contato))?e.data_ultimo_contato:'';
    return '<tr>'
      +'<td title="'+(e.nome||'')+'"><a href="#" data-act="emp-abrir" data-id="'+e.id+'" style="color:var(--primary);font-weight:600;text-decoration:none">'+(e.nome||'')+'</a></td>'
      +'<td class="col-razao"><input class="tf" data-act="razao_social" data-id="'+e.id+'" value="'+(e.razao_social||'')+'" placeholder="—"></td>'
      +'<td class="col-cnpj" title="'+(e.cnpj||'')+'">'+(e.cnpj||'—')+'</td>'
      +'<td class="col-stat"><select class="tf" data-act="status" data-id="'+e.id+'">'+_optSel(STATUS_EMP_CAT,e.status||'')+'</select></td>'
      +'<td><select class="tf" data-act="situacao" data-id="'+e.id+'">'+_optSel(SITUACAO_CAT,e.situacao||'')+'</select></td>'
      +'<td class="col-resp"><input class="tf" data-act="responsavel" data-id="'+e.id+'" value="'+(e.responsavel||'')+'" placeholder="—"></td>'
      +'<td class="col-data"><input type="date" class="tf" data-act="data_ultimo_contato" data-id="'+e.id+'" value="'+dt+'"></td>'
      +'<td><select class="tf" data-act="segmento" data-id="'+e.id+'">'+_optSel(SEGMENTO_CAT,e.segmento||'')+'</select></td>'
      +'<td class="col-cidade"><input class="tf" data-act="cidade" data-id="'+e.id+'" value="'+(e.cidade||'')+'" placeholder="—"></td>'
      +'<td style="text-align:center"><span style="background:var(--primary-light);color:var(--primary);border-radius:10px;padding:2px 8px;font-size:12px">'+(e.num_contatos||0)+'</span></td>'
      +'</tr>';
  }).join('');
  var pp=f.por_pagina||20, pag=f.pagina||1, totalPag=Math.max(1,Math.ceil(total/pp));
  var temFiltro=['q','responsavel','cidade','situacao','segmento','status'].some(function(k){return f[k];});
  var nav='<div style="display:flex;justify-content:space-between;align-items:center;margin-top:12px;gap:8px">'
    +(temFiltro?'<button class="btn btn-sm btn-secondary" data-fclear="1">Limpar filtros</button>':'<span></span>')
    +'<span class="text-sm text-muted">Pág '+pag+'/'+totalPag+'</span>'
    +'<span><button class="btn btn-sm btn-secondary" data-pag="'+(pag-1)+'"'+(pag<=1?' disabled':'')+'>←</button> '
    +'<button class="btn btn-sm btn-secondary" data-pag="'+(pag+1)+'"'+(pag>=totalPag?' disabled':'')+'>→</button></span></div>';
  lista.innerHTML='<table class="tabela-contatos">'+cg+head+'<tbody>'+(rows||'<tr><td colspan="10" style="text-align:center;padding:20px;color:var(--text-muted)">Nenhuma empresa encontrada</td></tr>')+'</tbody></table>'+nav;
  bindFiltrosEmpresas();
}

function bindFiltrosEmpresas(){
  document.querySelectorAll('#lista-empresas [data-f]').forEach(function(el){ el.addEventListener('change', function(){ filtrosEmpresas[el.getAttribute('data-f')]=el.value.trim(); carregarEmpresas(true); }); });
  var clr=document.querySelector('#lista-empresas [data-fclear]'); if(clr) clr.addEventListener('click', function(){ ['q','responsavel','cidade','situacao','segmento','status'].forEach(function(k){filtrosEmpresas[k]='';}); carregarEmpresas(true); });
  document.querySelectorAll('#lista-empresas [data-pag]').forEach(function(b){ b.addEventListener('click', function(){ if(b.hasAttribute('disabled'))return; filtrosEmpresas.pagina=parseInt(b.getAttribute('data-pag')); carregarEmpresas(false); }); });
}

document.addEventListener('change', function(e){
  var el=e.target.closest('#lista-empresas [data-act]'); if(!el) return;
  var act=el.getAttribute('data-act');
  if(['razao_social','status','situacao','responsavel','data_ultimo_contato','segmento','cidade'].indexOf(act)>=0){ var d={}; d[act]=el.value; _patchEmpresa(el.getAttribute('data-id'), d); }
});
document.addEventListener('click', function(e){ var el=e.target.closest('#lista-empresas [data-act="emp-abrir"]'); if(!el)return; e.preventDefault(); if(typeof abrirDetalheEmpresa==='function') abrirDetalheEmpresa(el.getAttribute('data-id')); });

(function(){ if(document.getElementById('css-emp'))return; var s=document.createElement('style'); s.id='css-emp';
  s.textContent='@media(max-width:1250px){.col-cnpj{display:none}}@media(max-width:1100px){.col-data{display:none}}@media(max-width:1000px){.col-resp{display:none}}@media(max-width:900px){.col-razao{display:none}}@media(max-width:800px){.col-cidade{display:none}}';
  document.head.appendChild(s); })();

/* Empresas full-width */
(function(){ var s=document.createElement('style'); s.id='css-emp-width'; s.textContent='#page-empresas .page-content{max-width:none;margin:0;padding:12px 16px}'; document.head.appendChild(s); })();

/* ===== Configuracoes: catalogos por blocos (override) ===== */
var CATALOGOS=[
  {chave:'situacao_catalogo', label:'Situação', bloco:'EMPRESAS', def:['Lead','Ativo','Ex Cliente','Lead Perdido']},
  {chave:'segmento_catalogo', label:'Segmento', bloco:'EMPRESAS', def:['Logística','Manufatura','Serviços']},
  {chave:'status_empresa_catalogo', label:'Status', bloco:'EMPRESAS', def:[]},
  {chave:'tipos_catalogo', label:'Listas', bloco:'CONTATOS', def:['cliente','finder','fabricante']},
  {chave:'regionais_catalogo', label:'Regionais', bloco:'CONTATOS', def:['Sul','Sudeste','Norte','Nordeste','Centro-Oeste']}
];
var _catCache={};
function _catNorm(arr){ return (arr||[]).map(function(it){return (typeof it==='string')?{nome:it,ativo:true}:it;}); }

async function cfgInit(){
  var root=document.getElementById('cfg-catalogos-root'); if(!root) return;
  for(var i=0;i<CATALOGOS.length;i++){ var c=CATALOGOS[i];
    if(!_catCache[c.chave]){
      try{ var r=await api.obterConfig(c.chave); _catCache[c.chave]=(r&&r.valor&&Array.isArray(r.valor)&&r.valor.length)?_catNorm(r.valor):_catNorm(c.def); }
      catch(e){ _catCache[c.chave]=_catNorm(c.def); }
      _catAplica(c.chave);
    }
  }
  cfgRenderCatalogos();
}
function cfgRenderCatalogos(){
  var root=document.getElementById('cfg-catalogos-root'); if(!root) return;
  var blocos={}; CATALOGOS.forEach(function(c){ (blocos[c.bloco]=blocos[c.bloco]||[]).push(c); });
  var html='';
  ['EMPRESAS','CONTATOS','USUARIOS'].forEach(function(bl){
    html+='<p class="section-title">'+bl+'</p>';
    var arr=blocos[bl];
    if(!arr){ html+='<div class="card mb-4"><div class="card-body"><p class="text-sm text-muted">Em breve — cadastro de usuários e permissões.</p></div></div>'; return; }
    arr.forEach(function(c){
      var lista=_catCache[c.chave]||[];
      var chips=lista.length? lista.map(function(it,idx){ var at=it.ativo!==false;
        return '<span style="display:inline-flex;align-items:center;gap:5px;margin:3px;padding:4px 10px;border-radius:14px;font-size:13px;background:'+(at?'var(--primary-light)':'#eee')+';color:'+(at?'var(--primary)':'#999')+'">'
          +'<span style="cursor:pointer" data-cat="'+c.chave+'" data-idx="'+idx+'" data-op="toggle" title="ativar/desativar">'+(at?'●':'○')+'</span>'+it.nome
          +'<span style="cursor:pointer;font-weight:700" data-cat="'+c.chave+'" data-idx="'+idx+'" data-op="del" title="remover">×</span></span>';
      }).join('') : '<span class="text-sm text-muted">nenhum item</span>';
      html+='<div class="card mb-4"><div class="card-body"><div style="font-weight:600;margin-bottom:8px">'+c.label+'</div>'
        +'<div style="margin-bottom:10px">'+chips+'</div>'
        +'<div style="display:flex;gap:6px"><input class="form-control cat-inp" data-cat="'+c.chave+'" placeholder="novo item"><button class="btn btn-primary" data-cat="'+c.chave+'" data-op="add">+</button></div></div></div>';
    });
  });
  root.innerHTML=html;
}
function _catAplica(chave){
  var nomes=(_catCache[chave]||[]).filter(function(x){return x.ativo!==false;}).map(function(x){return x.nome;});
  if(chave==='tipos_catalogo') TIPOS_CATALOGO=_catCache[chave];
  else if(chave==='regionais_catalogo') REGIONAIS_CATALOGO=_catCache[chave];
  else if(chave==='situacao_catalogo') SITUACAO_CAT=nomes;
  else if(chave==='segmento_catalogo') SEGMENTO_CAT=nomes;
  else if(chave==='status_empresa_catalogo') STATUS_EMP_CAT=nomes;
}
async function _catSave(chave){ try{ await api.salvarConfig(chave,_catCache[chave]); }catch(e){} _catAplica(chave); }

document.addEventListener('click', function(e){
  var b=e.target.closest('#cfg-catalogos-root [data-op]'); if(!b) return;
  var chave=b.getAttribute('data-cat'), op=b.getAttribute('data-op');
  _catCache[chave]=_catNorm(_catCache[chave]||[]);
  if(op==='add'){ var inp=document.querySelector('#cfg-catalogos-root .cat-inp[data-cat="'+chave+'"]'); var nome=(inp.value||'').trim(); if(!nome)return;
    if(_catCache[chave].some(function(x){return x.nome.toLowerCase()===nome.toLowerCase();})){ toast('Já existe','warning'); return; }
    _catCache[chave].push({nome:nome,ativo:true});
  } else if(op==='toggle'){ var i=+b.getAttribute('data-idx'); _catCache[chave][i].ativo=!(_catCache[chave][i].ativo!==false); }
  else if(op==='del'){ var j=+b.getAttribute('data-idx'); _catCache[chave].splice(j,1); }
  else return;
  _catSave(chave); cfgRenderCatalogos(); toast('Salvo','success');
});

/* ===== padroniza botao + dos catalogos ===== */
function cfgRenderCatalogos(){
  var root=document.getElementById('cfg-catalogos-root'); if(!root) return;
  var blocos={}; CATALOGOS.forEach(function(c){ (blocos[c.bloco]=blocos[c.bloco]||[]).push(c); });
  var html='';
  ['EMPRESAS','CONTATOS','USUARIOS'].forEach(function(bl){
    html+='<p class="section-title">'+bl+'</p>';
    var arr=blocos[bl];
    if(!arr){ html+='<div class="card mb-4"><div class="card-body"><p class="text-sm text-muted">Em breve — cadastro de usuários e permissões.</p></div></div>'; return; }
    arr.forEach(function(c){
      var lista=_catCache[c.chave]||[];
      var chips=lista.length? lista.map(function(it,idx){ var at=it.ativo!==false;
        return '<span style="display:inline-flex;align-items:center;gap:5px;margin:3px;padding:4px 10px;border-radius:14px;font-size:13px;background:'+(at?'var(--primary-light)':'#eee')+';color:'+(at?'var(--primary)':'#999')+'">'
          +'<span style="cursor:pointer" data-cat="'+c.chave+'" data-idx="'+idx+'" data-op="toggle" title="ativar/desativar">'+(at?'●':'○')+'</span>'+it.nome
          +'<span style="cursor:pointer;font-weight:700" data-cat="'+c.chave+'" data-idx="'+idx+'" data-op="del" title="remover">×</span></span>';
      }).join('') : '<span class="text-sm text-muted">nenhum item</span>';
      html+='<div class="card mb-4"><div class="card-body"><div style="font-weight:600;margin-bottom:8px">'+c.label+'</div>'
        +'<div style="margin-bottom:10px">'+chips+'</div>'
        +'<div style="display:flex;gap:6px;align-items:center"><input class="form-control cat-inp" data-cat="'+c.chave+'" placeholder="novo item"><button class="btn btn-sm btn-primary" data-cat="'+c.chave+'" data-op="add" title="Adicionar" style="font-size:18px;line-height:1;padding:6px 12px">＋</button></div></div></div>';
    });
  });
  root.innerHTML=html;
}

/* ===== padroniza botao + dos catalogos ===== */
function cfgRenderCatalogos(){
  var root=document.getElementById('cfg-catalogos-root'); if(!root) return;
  var blocos={}; CATALOGOS.forEach(function(c){ (blocos[c.bloco]=blocos[c.bloco]||[]).push(c); });
  var html='';
  ['EMPRESAS','CONTATOS','USUARIOS'].forEach(function(bl){
    html+='<p class="section-title">'+bl+'</p>';
    var arr=blocos[bl];
    if(!arr){ html+='<div class="card mb-4"><div class="card-body"><p class="text-sm text-muted">Em breve — cadastro de usuários e permissões.</p></div></div>'; return; }
    arr.forEach(function(c){
      var lista=_catCache[c.chave]||[];
      var chips=lista.length? lista.map(function(it,idx){ var at=it.ativo!==false;
        return '<span style="display:inline-flex;align-items:center;gap:5px;margin:3px;padding:4px 10px;border-radius:14px;font-size:13px;background:'+(at?'var(--primary-light)':'#eee')+';color:'+(at?'var(--primary)':'#999')+'">'
          +'<span style="cursor:pointer" data-cat="'+c.chave+'" data-idx="'+idx+'" data-op="toggle" title="ativar/desativar">'+(at?'●':'○')+'</span>'+it.nome
          +'<span style="cursor:pointer;font-weight:700" data-cat="'+c.chave+'" data-idx="'+idx+'" data-op="del" title="remover">×</span></span>';
      }).join('') : '<span class="text-sm text-muted">nenhum item</span>';
      html+='<div class="card mb-4"><div class="card-body"><div style="font-weight:600;margin-bottom:8px">'+c.label+'</div>'
        +'<div style="margin-bottom:10px">'+chips+'</div>'
        +'<div style="display:flex;gap:6px;align-items:center"><input class="form-control cat-inp" data-cat="'+c.chave+'" placeholder="novo item"><button class="btn btn-sm btn-primary" data-cat="'+c.chave+'" data-op="add" title="Adicionar" style="font-size:18px;line-height:1;padding:6px 12px">＋</button></div></div></div>';
    });
  });
  root.innerHTML=html;
}

/* ===== + dos catalogos igual ao felicitacoes (icone, sem fundo) ===== */
function cfgRenderCatalogos(){
  var root=document.getElementById('cfg-catalogos-root'); if(!root) return;
  var blocos={}; CATALOGOS.forEach(function(c){ (blocos[c.bloco]=blocos[c.bloco]||[]).push(c); });
  var html='';
  ['EMPRESAS','CONTATOS','USUARIOS'].forEach(function(bl){
    html+='<p class="section-title">'+bl+'</p>';
    var arr=blocos[bl];
    if(!arr){ html+='<div class="card mb-4"><div class="card-body"><p class="text-sm text-muted">Em breve — cadastro de usuários e permissões.</p></div></div>'; return; }
    arr.forEach(function(c){
      var lista=_catCache[c.chave]||[];
      var chips=lista.length? lista.map(function(it,idx){ var at=it.ativo!==false;
        return '<span style="display:inline-flex;align-items:center;gap:5px;margin:3px;padding:4px 10px;border-radius:14px;font-size:13px;background:'+(at?'var(--primary-light)':'#eee')+';color:'+(at?'var(--primary)':'#999')+'">'
          +'<span style="cursor:pointer" data-cat="'+c.chave+'" data-idx="'+idx+'" data-op="toggle" title="ativar/desativar">'+(at?'●':'○')+'</span>'+it.nome
          +'<span style="cursor:pointer;font-weight:700" data-cat="'+c.chave+'" data-idx="'+idx+'" data-op="del" title="remover">×</span></span>';
      }).join('') : '<span class="text-sm text-muted">nenhum item</span>';
      html+='<div class="card mb-4"><div class="card-body">'
        +'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><div style="font-weight:600">'+c.label+'</div>'
        +'<button class="fel-ic" data-cat="'+c.chave+'" data-op="add" title="Adicionar" style="font-size:22px;line-height:1;color:var(--primary)">＋</button></div>'
        +'<div style="margin-bottom:10px">'+chips+'</div>'
        +'<input class="form-control cat-inp" data-cat="'+c.chave+'" placeholder="digite e clique no +">'
        +'</div></div>';
    });
  });
  root.innerHTML=html;
}

/* ===== Menu em modulos ===== */
(function(){
  var nav=document.querySelector('.desktop-nav'); if(!nav) return;
  var GRUPOS=[
    {g:'ADMIN', it:[['configuracoes','Configurações','⚙️']]},
    {g:'CardBase', it:[['cadastro','Cadastro','➕'],['empresas','Empresas','🏢'],['contatos','Contatos','👥'],['dashboard','Dashboard','📊']]},
    {g:'ANDERSON', it:[['qrcode','Meu QR Code','🔳'],['acessos','Acessos','🔑'],['links','Links','🔗'],['fotos','Fotos','🖼️']]},
    {g:'LINKEDIN', it:[['felicitacoes','Felicitações','💬'],['publicacoes','Publicações','📣'],['lembretes','Lembretes','⏰'],['fluxo','Fluxo','🔁']]},
    {g:'PROSPECÇÃO', it:[['pitch','Pitch','🎯'],['saudacao','Saudação','👋'],['cadencia','Cadência','📅']]}
  ];
  var labels={}; GRUPOS.forEach(function(gr){ gr.it.forEach(function(it){ labels[it[0]]=it[1]; }); });
  var main=document.querySelector('.app-main');
  ['acessos','links','fotos','publicacoes','lembretes','fluxo','pitch','saudacao','cadencia'].forEach(function(id){
    if(main && !document.getElementById('page-'+id)){
      var pg=document.createElement('div'); pg.id='page-'+id; pg.className='page';
      pg.innerHTML='<div class="app-header"><h2>'+labels[id]+'</h2></div><div class="page-content"><div class="card"><div class="card-body"><p class="text-sm text-muted">Em breve.</p></div></div></div>';
      main.appendChild(pg);
    }
  });
  var html='<div class="desktop-nav-logo">📇 CardBase</div>';
  html+='<button id="nav-collapse-btn" class="desktop-nav-item" title="Recolher"><span style="width:20px;text-align:center;display:inline-block">≡</span> Recolher</button>';
  GRUPOS.forEach(function(gr){
    html+='<div class="nav-grp">'+gr.g+'</div>';
    gr.it.forEach(function(it){
      html+='<button class="desktop-nav-item" data-page="'+it[0]+'"><span style="width:20px;text-align:center;display:inline-block">'+it[2]+'</span> '+it[1]+'</button>';
    });
  });
  html+='<div style="flex:1"></div>';
  html+='<button class="desktop-nav-item" id="nav-sair" style="color:var(--danger)"><span style="width:20px;text-align:center;display:inline-block">🚪</span> Sair</button>';
  nav.innerHTML=html;
  if(!document.getElementById('css-navgrp')){ var s=document.createElement('style'); s.id='css-navgrp'; s.textContent='.nav-grp{font-size:10px;color:var(--text-muted);text-transform:uppercase;font-weight:700;padding:12px 12px 2px;letter-spacing:.04em}'; document.head.appendChild(s); }
  function navItemClick(id){
    if(id==='cadastro'){ if(typeof abrirNovoContato==='function') abrirNovoContato('foto'); return; }
    navegarPara(id);
    if(id==='felicitacoes' && typeof carregarFelicitacoes==='function') carregarFelicitacoes();
    if(id==='configuracoes') setTimeout(function(){ if(typeof cfgInit==='function') cfgInit(); },100);
  }
  nav.querySelectorAll('.desktop-nav-item[data-page]').forEach(function(b){ b.addEventListener('click', function(){ navItemClick(b.getAttribute('data-page')); }); });
  document.getElementById('nav-collapse-btn').addEventListener('click', function(){ document.body.classList.add('nav-off'); });
  document.getElementById('nav-sair').addEventListener('click', function(){ logout(); });
})();

/* ===== Menu em modulos: acordeao + rolagem ===== */
(function(){
  var nav=document.querySelector('.desktop-nav'); if(!nav) return;
  var GRUPOS=[
    {g:'ADMIN', it:[['configuracoes','Configurações','⚙️']]},
    {g:'CardBase', it:[['cadastro','Cadastro','➕'],['empresas','Empresas','🏢'],['contatos','Contatos','👥'],['dashboard','Dashboard','📊']]},
    {g:'ANDERSON', it:[['qrcode','Meu QR Code','🔳'],['acessos','Acessos','🔑'],['links','Links','🔗'],['fotos','Fotos','🖼️']]},
    {g:'LINKEDIN', it:[['felicitacoes','Felicitações','💬'],['publicacoes','Publicações','📣'],['lembretes','Lembretes','⏰'],['fluxo','Fluxo','🔁']]},
    {g:'PROSPECÇÃO', it:[['pitch','Pitch','🎯'],['saudacao','Saudação','👋'],['cadencia','Cadência','📅']]}
  ];
  var html='<div class="desktop-nav-logo">📇 CardBase</div>';
  html+='<button id="nav-collapse-btn" class="desktop-nav-item" title="Recolher"><span style="width:20px;text-align:center;display:inline-block">≡</span> Recolher</button>';
  html+='<div class="nav-scroll" style="flex:1;overflow-y:auto;min-height:0">';
  GRUPOS.forEach(function(gr,gi){
    html+='<button class="nav-grp-head" data-grp="'+gi+'"><span>'+gr.g+'</span><span class="nav-caret">▸</span></button>';
    html+='<div class="nav-grp-items" data-items="'+gi+'" style="display:none">';
    gr.it.forEach(function(it){ html+='<button class="desktop-nav-item nav-sub" data-page="'+it[0]+'"><span style="width:20px;text-align:center;display:inline-block">'+it[2]+'</span> '+it[1]+'</button>'; });
    html+='</div>';
  });
  html+='</div>';
  html+='<button class="desktop-nav-item" id="nav-sair" style="color:var(--danger)"><span style="width:20px;text-align:center;display:inline-block">🚪</span> Sair</button>';
  nav.innerHTML=html;
  if(!document.getElementById('css-nav-acc')){ var s=document.createElement('style'); s.id='css-nav-acc';
    s.textContent='.desktop-nav{overflow:hidden}'
     +'.nav-grp-head{display:flex;align-items:center;justify-content:space-between;width:100%;background:none;border:none;cursor:pointer;font-size:12px;font-weight:700;text-transform:uppercase;color:var(--text);padding:10px 12px;letter-spacing:.03em}'
     +'.nav-grp-head:hover{background:var(--surface-2)}.nav-caret{color:var(--text-muted);font-size:11px}'
     +'.nav-sub{padding-left:20px !important}';
    document.head.appendChild(s);
  }
  function setOpen(gi){
    gi=String(gi);
    nav.querySelectorAll('.nav-grp-items').forEach(function(d){ d.style.display=(d.getAttribute('data-items')===gi)?'block':'none'; });
    nav.querySelectorAll('.nav-grp-head').forEach(function(h){ h.querySelector('.nav-caret').textContent=(h.getAttribute('data-grp')===gi)?'▾':'▸'; });
  }
  nav.querySelectorAll('.nav-grp-head').forEach(function(h){ h.addEventListener('click', function(){ setOpen(h.getAttribute('data-grp')); }); });
  function navItemClick(id){
    if(id==='cadastro'){ if(typeof abrirNovoContato==='function') abrirNovoContato('foto'); return; }
    navegarPara(id);
    if(id==='felicitacoes' && typeof carregarFelicitacoes==='function') carregarFelicitacoes();
    if(id==='configuracoes') setTimeout(function(){ if(typeof cfgInit==='function') cfgInit(); },100);
  }
  nav.querySelectorAll('.desktop-nav-item[data-page]').forEach(function(b){ b.addEventListener('click', function(){ navItemClick(b.getAttribute('data-page')); }); });
  document.getElementById('nav-collapse-btn').addEventListener('click', function(){ document.body.classList.add('nav-off'); });
  document.getElementById('nav-sair').addEventListener('click', function(){ logout(); });
  setOpen(1);
})();

/* ===== Menu: SGC + botao Menu + remove Sair inferior ===== */
(function(){
  var nav=document.querySelector('.desktop-nav'); if(!nav) return;
  var GRUPOS=[
    {g:'ADMIN', it:[['configuracoes','Configurações','⚙️']]},
    {g:'CardBase', it:[['cadastro','Cadastro','➕'],['empresas','Empresas','🏢'],['contatos','Contatos','👥'],['dashboard','Dashboard','📊']]},
    {g:'ANDERSON', it:[['qrcode','Meu QR Code','🔳'],['acessos','Acessos','🔑'],['links','Links','🔗'],['fotos','Fotos','🖼️']]},
    {g:'LINKEDIN', it:[['felicitacoes','Felicitações','💬'],['publicacoes','Publicações','📣'],['lembretes','Lembretes','⏰'],['fluxo','Fluxo','🔁']]},
    {g:'PROSPECÇÃO', it:[['pitch','Pitch','🎯'],['saudacao','Saudação','👋'],['cadencia','Cadência','📅']]}
  ];
  var html='<div class="desktop-nav-logo">📇 SGC</div><div style="font-size:10px;color:var(--text-muted);padding:0 12px 8px;margin-top:-4px">Sistema de Gestão Comercial</div>';
  html+='<button id="nav-collapse-btn" class="desktop-nav-item" title="Recolher menu" style="display:flex;justify-content:space-between;align-items:center;width:100%"><span>Menu</span><span style="font-size:18px;line-height:1">≡</span></button>';
  html+='<div class="nav-scroll" style="flex:1;overflow-y:auto;min-height:0">';
  GRUPOS.forEach(function(gr,gi){
    html+='<button class="nav-grp-head" data-grp="'+gi+'"><span>'+gr.g+'</span><span class="nav-caret">▸</span></button>';
    html+='<div class="nav-grp-items" data-items="'+gi+'" style="display:none">';
    gr.it.forEach(function(it){ html+='<button class="desktop-nav-item nav-sub" data-page="'+it[0]+'"><span style="width:20px;text-align:center;display:inline-block">'+it[2]+'</span> '+it[1]+'</button>'; });
    html+='</div>';
  });
  html+='</div>';
  nav.innerHTML=html;
  function setOpen(gi){
    gi=String(gi);
    nav.querySelectorAll('.nav-grp-items').forEach(function(d){ d.style.display=(d.getAttribute('data-items')===gi)?'block':'none'; });
    nav.querySelectorAll('.nav-grp-head').forEach(function(h){ h.querySelector('.nav-caret').textContent=(h.getAttribute('data-grp')===gi)?'▾':'▸'; });
  }
  nav.querySelectorAll('.nav-grp-head').forEach(function(h){ h.addEventListener('click', function(){ setOpen(h.getAttribute('data-grp')); }); });
  function navItemClick(id){
    if(id==='cadastro'){ if(typeof abrirNovoContato==='function') abrirNovoContato('foto'); return; }
    navegarPara(id);
    if(id==='felicitacoes' && typeof carregarFelicitacoes==='function') carregarFelicitacoes();
    if(id==='configuracoes') setTimeout(function(){ if(typeof cfgInit==='function') cfgInit(); },100);
  }
  nav.querySelectorAll('.desktop-nav-item[data-page]').forEach(function(b){ b.addEventListener('click', function(){ navItemClick(b.getAttribute('data-page')); }); });
  document.getElementById('nav-collapse-btn').addEventListener('click', function(){ document.body.classList.add('nav-off'); });
  setOpen(1);
})();

/* ===== Modulo Usuarios ===== */
async function _authFetch(method, path, body){
  var opt={method:method, headers:{'Authorization':'Bearer '+getToken()}};
  if(body!==undefined){ opt.headers['Content-Type']='application/json'; opt.body=JSON.stringify(body); }
  var r=await fetch('/api'+path, opt);
  if(r.status===204) return null;
  var data=await r.json().catch(function(){return null;});
  if(!r.ok) throw new Error((data&&data.detail)||'Erro');
  return data;
}
async function _baixarArquivo(path, filename){
  try{
    var r=await fetch('/api'+path, {headers:{'Authorization':'Bearer '+getToken()}});
    if(!r.ok){ var d=await r.json().catch(function(){return null;}); toast((d&&d.detail)||'Erro ao exportar','error'); return; }
    var blob=await r.blob();
    var url=URL.createObjectURL(blob);
    var a=document.createElement('a'); a.href=url; a.download=filename; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function(){URL.revokeObjectURL(url);},1000);
  }catch(err){ toast(err.message,'error'); }
}
async function _importarArquivo(path, file){
  var fd=new FormData(); fd.append('arquivo', file);
  var r=await fetch('/api'+path, {method:'POST', headers:{'Authorization':'Bearer '+getToken()}, body:fd});
  var data=await r.json().catch(function(){return null;});
  if(!r.ok) throw new Error((data&&data.detail)||'Erro');
  return data;
}
function _resumoImportacao(res){
  return res.criadas+' criada(s), '+res.duplicadas+' ignorada(s) (duplicada), '+res.invalidas+' inválida(s) — total '+res.total_linhas+' linha(s)';
}
var MENU_ITENS=[['configuracoes','Configurações'],['usuarios','Usuários'],['cadastro','Cadastro'],['empresas','Empresas'],['contatos','Contatos'],['dashboard','Dashboard'],['qrcode','Meu QR Code'],['acessos','Acessos'],['links','Links'],['fotos','Fotos'],['felicitacoes','Felicitações'],['publicacoes','Publicações'],['lembretes','Lembretes'],['fluxo','Fluxo'],['pitch','Pitch'],['saudacao','Saudação'],['cadencia','Cadência']];
function _roleLabel(r){ return {super_admin:'Super Admin',admin:'Admin',comercial:'Comercial'}[r]||r; }
function _v(id){ var e=document.getElementById(id); return e?e.value.trim():''; }
function _set(id,val){ var e=document.getElementById(id); if(e) e.value=val; }
function _permMatrix(perms){
  perms=perms||{};
  var rows=MENU_ITENS.map(function(it){ var p=perms[it[0]]||{};
    return '<tr><td style="text-align:left;padding:4px 8px">'+it[1]+'</td>'
      +'<td style="text-align:center"><input type="checkbox" data-pi="'+it[0]+'" data-po="ver"'+(p.ver?' checked':'')+'></td>'
      +'<td style="text-align:center"><input type="checkbox" data-pi="'+it[0]+'" data-po="add"'+(p.add?' checked':'')+'></td>'
      +'<td style="text-align:center"><input type="checkbox" data-pi="'+it[0]+'" data-po="rem"'+(p.rem?' checked':'')+'></td></tr>';
  }).join('');
  return '<table style="width:100%;font-size:13px;border-collapse:collapse"><thead><tr><th style="text-align:left;padding:4px 8px">Módulo</th><th>Ver</th><th>Add</th><th>Rem</th></tr></thead><tbody>'+rows+'</tbody></table>';
}
function _gatherPerms(){ var perms={}; document.querySelectorAll('#u-perm input[data-pi]').forEach(function(c){ var i=c.getAttribute('data-pi'),o=c.getAttribute('data-po'); perms[i]=perms[i]||{}; perms[i][o]=c.checked; }); return perms; }

async function carregarUsuarios(){
  var root=document.getElementById('usuarios-root'); if(!root) return;
  root.innerHTML='<div class="empty-state"><div class="spinner" style="margin:0 auto"></div></div>';
  window._editU=null;
  try{
    var me=await _authFetch('GET','/usuarios/me');
    var lista=await _authFetch('GET','/usuarios');
    renderUsuarios(lista, me.role);
  }catch(e){ root.innerHTML='<div class="empty-state"><p>'+(e.message||'Sem permissão')+'</p></div>'; }
}
function renderUsuarios(lista, meRole){
  window._usuarios=lista;
  var isSuper=(meRole==='super_admin');
  var form='<div class="card mb-4"><div class="card-body"><div style="font-weight:600;margin-bottom:10px" id="u-form-titulo">Novo usuário</div>'
    +'<div class="form-group"><label class="form-label">Nome</label><input id="u-nome" class="form-control"></div>'
    +'<div class="form-group"><label class="form-label">Usuário (login)</label><input id="u-username" class="form-control"></div>'
    +'<div class="form-group"><label class="form-label">Senha inicial</label><input id="u-senha" class="form-control" type="text"></div>'
    +'<div class="form-group"><label class="form-label">Papel</label><select id="u-role" class="form-control"><option value="comercial">Comercial</option><option value="admin">Admin</option><option value="super_admin">Super Admin</option></select></div>'
    +'<div id="u-perm-wrap"><label class="form-label">Permissões (por módulo)</label><div id="u-perm">'+_permMatrix({})+'</div></div>'
    +'<button class="btn btn-primary btn-block" style="margin-top:12px" data-uact="salvar" id="u-salvar">Criar usuário</button>'
    +'</div></div>';
  var linhas=lista.map(function(u){
    var acoes='<button class="btn btn-sm btn-secondary" data-uact="edit" data-id="'+u.id+'">Editar</button> ';
    if(isSuper) acoes+='<button class="btn btn-sm btn-secondary" data-uact="reset" data-id="'+u.id+'">Resetar senha</button> ';
    acoes+='<button class="btn btn-sm btn-danger" data-uact="del" data-id="'+u.id+'">×</button>';
    return '<tr><td>'+u.nome+'</td><td>'+u.username+'</td><td>'+_roleLabel(u.role)+'</td>'
      +'<td style="text-align:center"><input type="checkbox" data-uact="ativo" data-id="'+u.id+'"'+(u.ativo?' checked':'')+'></td>'
      +'<td style="white-space:nowrap">'+acoes+'</td></tr>';
  }).join('');
  var tabela='<div class="card"><div class="card-body"><div style="font-weight:600;margin-bottom:10px">Usuários cadastrados</div><div style="overflow-x:auto"><table class="tabela-contatos"><thead><tr><th>Nome</th><th>Usuário</th><th>Papel</th><th>Ativo</th><th>Ações</th></tr></thead><tbody>'+linhas+'</tbody></table></div></div></div>';
  document.getElementById('usuarios-root').innerHTML=form+tabela;
  document.getElementById('u-perm-wrap').style.display='block';
}
function mostrarSenhaReset(username,senha){
  var lb=document.createElement('div'); lb.style.cssText='position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.5);z-index:9999;display:flex;align-items:center;justify-content:center';
  lb.innerHTML='<div style="background:#fff;border-radius:12px;padding:20px;max-width:360px;width:90%"><div style="font-weight:600;margin-bottom:8px">Nova senha de '+username+'</div><div style="font-family:monospace;font-size:18px;background:var(--surface-2);padding:10px;border-radius:8px;text-align:center;margin-bottom:12px">'+senha+'</div><div style="display:flex;gap:8px"><button class="btn btn-primary" id="rs-copy">📋 Copiar</button><button class="btn btn-secondary" id="rs-close">Fechar</button></div><p class="text-sm text-muted" style="margin-top:8px">Envie ao usuário. Ele deve trocar no primeiro acesso.</p></div>';
  document.body.appendChild(lb);
  lb.querySelector('#rs-copy').addEventListener('click',function(){ copiarTexto(senha); toast('Senha copiada','success'); });
  lb.querySelector('#rs-close').addEventListener('click',function(){ lb.remove(); });
}
document.addEventListener('change', function(e){
  var r=e.target.closest('#usuarios-root #u-role'); if(r){ document.getElementById('u-perm-wrap').style.display=(r.value==='comercial')?'block':'none'; return; }
  var t=e.target.closest('#usuarios-root [data-uact="ativo"]'); if(t){ _authFetch('PUT','/usuarios/'+t.getAttribute('data-id'),{ativo:t.checked}).catch(function(err){toast(err.message,'error');}); return; }
});
document.addEventListener('click', async function(e){
  var b=e.target.closest('#usuarios-root [data-uact]'); if(!b) return;
  var act=b.getAttribute('data-uact'), id=b.getAttribute('data-id');
  if(act==='salvar'){
    var nome=_v('u-nome'), username=_v('u-username'), senha=_v('u-senha'), role=_v('u-role');
    if(!nome){ toast('Nome obrigatório','warning'); return; }
    var perms=_gatherPerms();
    try{
      if(window._editU){ await _authFetch('PUT','/usuarios/'+window._editU,{nome:nome,role:role,permissoes:perms}); toast('Atualizado','success'); }
      else { if(!username||!senha){ toast('Usuário e senha obrigatórios','warning'); return; } await _authFetch('POST','/usuarios',{nome:nome,username:username,senha:senha,role:role,permissoes:perms}); toast('Usuário criado','success'); }
      window._editU=null; carregarUsuarios();
    }catch(err){ toast(err.message,'error'); }
  } else if(act==='reset'){
    try{ var rr=await _authFetch('POST','/usuarios/'+id+'/reset-senha'); mostrarSenhaReset(rr.username, rr.senha); }catch(err){ toast(err.message,'error'); }
  } else if(act==='del'){
    if(!confirm('Excluir este usuário?')) return;
    try{ await _authFetch('DELETE','/usuarios/'+id); carregarUsuarios(); }catch(err){ toast(err.message,'error'); }
  } else if(act==='edit'){
    var u=(window._usuarios||[]).filter(function(x){return x.id===id;})[0]; if(!u) return;
    window._editU=id;
    _set('u-nome',u.nome); _set('u-username',u.username); var un=document.getElementById('u-username'); if(un) un.disabled=true;
    _set('u-senha',''); document.getElementById('u-role').value=u.role;
    document.getElementById('u-perm').innerHTML=_permMatrix(u.permissoes||{});
    document.getElementById('u-perm-wrap').style.display=(u.role==='comercial')?'block':'none';
    document.getElementById('u-salvar').textContent='Salvar alterações';
    document.getElementById('u-form-titulo').textContent='Editar usuário';
    window.scrollTo(0,0);
  }
});

/* pagina + full width */
(function(){ var main=document.querySelector('.app-main'); if(main && !document.getElementById('page-usuarios')){ var p=document.createElement('div'); p.id='page-usuarios'; p.className='page'; p.innerHTML='<div class="app-header"><h2>👤 Usuários</h2></div><div class="page-content"><div id="usuarios-root"></div></div>'; main.appendChild(p); } var s=document.createElement('style'); s.textContent='#page-usuarios .page-content{max-width:none;margin:0;padding:12px 16px}'; document.head.appendChild(s); })();

/* remove bloco USUARIOS do Configuracoes */
function cfgRenderCatalogos(){
  var root=document.getElementById('cfg-catalogos-root'); if(!root) return;
  var blocos={}; CATALOGOS.forEach(function(c){ (blocos[c.bloco]=blocos[c.bloco]||[]).push(c); });
  var html='';
  ['EMPRESAS','CONTATOS'].forEach(function(bl){
    html+='<p class="section-title">'+bl+'</p>'; var arr=blocos[bl]; if(!arr) return;
    arr.forEach(function(c){
      var lista=_catCache[c.chave]||[];
      var chips=lista.length? lista.map(function(it,idx){ var at=it.ativo!==false;
        return '<span style="display:inline-flex;align-items:center;gap:5px;margin:3px;padding:4px 10px;border-radius:14px;font-size:13px;background:'+(at?'var(--primary-light)':'#eee')+';color:'+(at?'var(--primary)':'#999')+'"><span style="cursor:pointer" data-cat="'+c.chave+'" data-idx="'+idx+'" data-op="toggle">'+(at?'●':'○')+'</span>'+it.nome+'<span style="cursor:pointer;font-weight:700" data-cat="'+c.chave+'" data-idx="'+idx+'" data-op="del">×</span></span>';
      }).join('') : '<span class="text-sm text-muted">nenhum item</span>';
      html+='<div class="card mb-4"><div class="card-body"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><div style="font-weight:600">'+c.label+'</div><button class="fel-ic" data-cat="'+c.chave+'" data-op="add" title="Adicionar" style="font-size:22px;line-height:1;color:var(--primary)">＋</button></div><div style="margin-bottom:10px">'+chips+'</div><input class="form-control cat-inp" data-cat="'+c.chave+'" placeholder="digite e clique no +"></div></div>';
    });
  });
  root.innerHTML=html;
}

/* nav com Usuarios em ADMIN */
(function(){
  var nav=document.querySelector('.desktop-nav'); if(!nav) return;
  var GRUPOS=[
    {g:'ADMIN', it:[['configuracoes','Configurações','⚙️'],['usuarios','Usuários','👤']]},
    {g:'CardBase', it:[['cadastro','Cadastro','➕'],['empresas','Empresas','🏢'],['contatos','Contatos','👥'],['dashboard','Dashboard','📊']]},
    {g:'ANDERSON', it:[['qrcode','Meu QR Code','🔳'],['acessos','Acessos','🔑'],['links','Links','🔗'],['fotos','Fotos','🖼️']]},
    {g:'LINKEDIN', it:[['felicitacoes','Felicitações','💬'],['publicacoes','Publicações','📣'],['lembretes','Lembretes','⏰'],['fluxo','Fluxo','🔁']]},
    {g:'PROSPECÇÃO', it:[['pitch','Pitch','🎯'],['saudacao','Saudação','👋'],['cadencia','Cadência','📅']]}
  ];
  var html='<div class="desktop-nav-logo">📇 SGC</div><div style="font-size:10px;color:var(--text-muted);padding:0 12px 8px;margin-top:-4px">Sistema de Gestão Comercial</div>';
  html+='<button id="nav-collapse-btn" class="desktop-nav-item" title="Recolher menu" style="display:flex;justify-content:space-between;align-items:center;width:100%"><span>Menu</span><span style="font-size:18px;line-height:1">≡</span></button>';
  html+='<div class="nav-scroll" style="flex:1;overflow-y:auto;min-height:0">';
  GRUPOS.forEach(function(gr,gi){
    html+='<button class="nav-grp-head" data-grp="'+gi+'"><span>'+gr.g+'</span><span class="nav-caret">▸</span></button>';
    html+='<div class="nav-grp-items" data-items="'+gi+'" style="display:none">';
    gr.it.forEach(function(it){ html+='<button class="desktop-nav-item nav-sub" data-page="'+it[0]+'"><span style="width:20px;text-align:center;display:inline-block">'+it[2]+'</span> '+it[1]+'</button>'; });
    html+='</div>';
  });
  html+='</div>';
  nav.innerHTML=html;
  function setOpen(gi){ gi=String(gi); nav.querySelectorAll('.nav-grp-items').forEach(function(d){ d.style.display=(d.getAttribute('data-items')===gi)?'block':'none'; }); nav.querySelectorAll('.nav-grp-head').forEach(function(h){ h.querySelector('.nav-caret').textContent=(h.getAttribute('data-grp')===gi)?'▾':'▸'; }); }
  nav.querySelectorAll('.nav-grp-head').forEach(function(h){ h.addEventListener('click', function(){ setOpen(h.getAttribute('data-grp')); }); });
  function navItemClick(id){
    if(id==='cadastro'){ if(typeof abrirNovoContato==='function') abrirNovoContato('foto'); return; }
    navegarPara(id);
    if(id==='felicitacoes') carregarFelicitacoes();
    if(id==='usuarios') carregarUsuarios();
    if(id==='configuracoes') setTimeout(function(){ if(typeof cfgInit==='function') cfgInit(); },100);
  }
  nav.querySelectorAll('.desktop-nav-item[data-page]').forEach(function(b){ b.addEventListener('click', function(){ navItemClick(b.getAttribute('data-page')); }); });
  document.getElementById('nav-collapse-btn').addEventListener('click', function(){ document.body.classList.add('nav-off'); });
  setOpen(0);
})();

/* ===== Meu Perfil: trocar senha ===== */
(function(){
  var p=document.getElementById('page-perfil'); if(!p) return;
  var pc=p.querySelector('.page-content'); if(!pc) return;
  pc.innerHTML='<div class="card mb-4"><div class="card-body"><div id="perfil-info" class="text-sm text-muted">Carregando…</div></div></div>'
    +'<div class="card"><div class="card-body"><div style="font-weight:600;margin-bottom:10px">Alterar minha senha</div>'
    +'<div class="form-group"><label class="form-label">Senha atual</label><input id="pf-atual" class="form-control pf-pass" type="password"></div>'
    +'<div class="form-group"><label class="form-label">Nova senha</label><input id="pf-nova" class="form-control pf-pass" type="password"></div>'
    +'<div class="form-group"><label class="form-label">Confirmar nova senha</label><input id="pf-conf" class="form-control pf-pass" type="password"></div>'
    +'<label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer;margin-bottom:12px"><input type="checkbox" id="pf-show"> Mostrar senhas</label>'
    +'<button class="btn btn-primary btn-block" id="pf-salvar">Alterar senha</button></div></div>';
})();
async function carregarPerfil(){
  try{ var me=await _authFetch('GET','/usuarios/me'); var el=document.getElementById('perfil-info'); if(el) el.innerHTML='<b>'+me.nome+'</b> · '+me.username+' · '+_roleLabel(me.role); }catch(e){}
}
async function _trocarSenha(){
  var a=_v('pf-atual'), n=_v('pf-nova'), c=_v('pf-conf');
  if(!a||!n){ toast('Preencha as senhas','warning'); return; }
  if(n.length<4){ toast('Nova senha muito curta','warning'); return; }
  if(n!==c){ toast('As novas senhas não conferem','warning'); return; }
  try{ await _authFetch('POST','/usuarios/me/senha',{senha_atual:a,senha_nova:n}); toast('Senha alterada!','success'); _set('pf-atual','');_set('pf-nova','');_set('pf-conf',''); }
  catch(err){ toast(err.message,'error'); }
}
document.addEventListener('click', function(e){
  if(e.target.closest('[data-um="perfil"]')){ setTimeout(carregarPerfil,60); return; }
  if(e.target.closest('#page-perfil #pf-salvar')){ e.preventDefault(); _trocarSenha(); }
});
document.addEventListener('change', function(e){
  var c=e.target.closest('#page-perfil #pf-show'); if(!c) return;
  document.querySelectorAll('#page-perfil .pf-pass').forEach(function(i){ i.type=c.checked?'text':'password'; });
});

/* ===== Permissoes: visibilidade de menu + must_change ===== */
async function aplicarPermissoes(){
  if(!api.isLoggedIn()) return;
  try{ window.MEU=await _authFetch('GET','/usuarios/me'); }catch(e){ return; }
  var me=window.MEU;
  var av=document.querySelector('#user-menu .um-name'); if(av) av.textContent=(me.nome||'').split(' ')[0]||me.nome;
  var ini=document.querySelector('#user-menu-btn span'); if(ini) ini.textContent=(me.nome||'?').charAt(0).toUpperCase();
  if(me.must_change){ toast('Defina uma nova senha para continuar','warning'); navegarPara('perfil'); setTimeout(carregarPerfil,60); }
  var full=(me.role==='admin'||me.role==='super_admin');
  document.querySelectorAll('.desktop-nav-item[data-page]').forEach(function(b){
    var id=b.getAttribute('data-page');
    var vis = full || (me.permissoes && me.permissoes[id] && me.permissoes[id].ver);
    b.style.display = vis ? '' : 'none';
  });
  document.querySelectorAll('.nav-grp-head').forEach(function(h){
    var items=h.nextElementSibling; if(!items) return;
    var anyVis=Array.prototype.slice.call(items.querySelectorAll('.desktop-nav-item[data-page]')).some(function(b){return b.style.display!=='none';});
    h.style.display=anyVis?'':'none';
  });
}
if(typeof mostrarApp==='function'){ var _mostrarAppPrev=mostrarApp; mostrarApp=function(){ var r=_mostrarAppPrev.apply(this,arguments); setTimeout(aplicarPermissoes,150); return r; }; }
setTimeout(function(){ if(api.isLoggedIn()) aplicarPermissoes(); }, 400);

/* ===== Login SGC ===== */
(function(){
  var lg=document.querySelector('#page-login .login-logo');
  if(lg){
    var h1=lg.querySelector('h1'); if(h1) h1.textContent='SGC';
    var p=lg.querySelector('p'); if(p) p.textContent='Sistema de Gestão Comercial';
    var svg=lg.querySelector('svg'); if(svg) svg.outerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="1.5" style="width:48px;height:48px"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"/></svg>';
  }
  var s=document.createElement('style'); s.id='css-login-sgc';
  s.textContent='#page-login .login-logo h1{letter-spacing:3px}'
   +'#page-login .form-control{border:none;border-bottom:2px solid var(--border);border-radius:0;background:transparent;padding:10px 2px}'
   +'#page-login .form-control:focus{border-bottom-color:var(--primary);box-shadow:none;outline:none}';
  document.head.appendChild(s);
})();

/* ===== Catalogos: bloco LINKEDIN (Publicacoes) ===== */
var PUB_CATEGORIAS=['Experiência','Produto'];
var PUB_PLANEJADOR=['Publicado','Planejado'];
var CATALOGOS=[
  {chave:'situacao_catalogo', label:'Situação', bloco:'EMPRESAS', def:['Lead','Ativo','Ex Cliente','Lead Perdido']},
  {chave:'segmento_catalogo', label:'Segmento', bloco:'EMPRESAS', def:['Logística','Manufatura','Serviços']},
  {chave:'status_empresa_catalogo', label:'Status', bloco:'EMPRESAS', def:[]},
  {chave:'tipos_catalogo', label:'Listas', bloco:'CONTATOS', def:['cliente','finder','fabricante']},
  {chave:'regionais_catalogo', label:'Regionais', bloco:'CONTATOS', def:['Sul','Sudeste','Norte','Nordeste','Centro-Oeste']},
  {chave:'pub_categorias', label:'Categorias (Publicações)', bloco:'LINKEDIN', def:['Experiência','Produto']},
  {chave:'pub_planejador', label:'Planejador (Publicações)', bloco:'LINKEDIN', def:['Publicado','Planejado']}
];
function _catAplica(chave){
  var nomes=(_catCache[chave]||[]).filter(function(x){return x.ativo!==false;}).map(function(x){return x.nome;});
  if(chave==='tipos_catalogo') TIPOS_CATALOGO=_catCache[chave];
  else if(chave==='regionais_catalogo') REGIONAIS_CATALOGO=_catCache[chave];
  else if(chave==='situacao_catalogo') SITUACAO_CAT=nomes;
  else if(chave==='segmento_catalogo') SEGMENTO_CAT=nomes;
  else if(chave==='status_empresa_catalogo') STATUS_EMP_CAT=nomes;
  else if(chave==='pub_categorias') PUB_CATEGORIAS=nomes;
  else if(chave==='pub_planejador') PUB_PLANEJADOR=nomes;
}
function cfgRenderCatalogos(){
  var root=document.getElementById('cfg-catalogos-root'); if(!root) return;
  var blocos={}; CATALOGOS.forEach(function(c){ (blocos[c.bloco]=blocos[c.bloco]||[]).push(c); });
  var html='';
  ['EMPRESAS','CONTATOS','LINKEDIN'].forEach(function(bl){
    html+='<p class="section-title">'+bl+'</p>'; var arr=blocos[bl]; if(!arr) return;
    arr.forEach(function(c){
      var lista=_catCache[c.chave]||[];
      var chips=lista.length? lista.map(function(it,idx){ var at=it.ativo!==false;
        return '<span style="display:inline-flex;align-items:center;gap:5px;margin:3px;padding:4px 10px;border-radius:14px;font-size:13px;background:'+(at?'var(--primary-light)':'#eee')+';color:'+(at?'var(--primary)':'#999')+'"><span style="cursor:pointer" data-cat="'+c.chave+'" data-idx="'+idx+'" data-op="toggle">'+(at?'●':'○')+'</span>'+it.nome+'<span style="cursor:pointer;font-weight:700" data-cat="'+c.chave+'" data-idx="'+idx+'" data-op="del">×</span></span>';
      }).join('') : '<span class="text-sm text-muted">nenhum item</span>';
      html+='<div class="card mb-4"><div class="card-body"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><div style="font-weight:600">'+c.label+'</div><button class="fel-ic" data-cat="'+c.chave+'" data-op="add" title="Adicionar" style="font-size:22px;line-height:1;color:var(--primary)">＋</button></div><div style="margin-bottom:10px">'+chips+'</div><input class="form-control cat-inp" data-cat="'+c.chave+'" placeholder="digite e clique no +"></div></div>';
    });
  });
  root.innerHTML=html;
}

/* ===== Modulo LINKEDIN > Publicacoes ===== */
var filtrosPub={};
(function(){
  var p=document.getElementById('page-publicacoes'); if(p){ var pc=p.querySelector('.page-content'); if(pc) pc.innerHTML='<div id="publicacoes-root"></div>'; }
  var s=document.createElement('style'); s.textContent='#page-publicacoes .page-content{max-width:none;margin:0;padding:12px 16px}'; document.head.appendChild(s);
})();

async function carregarPublicacoes(){
  var root=document.getElementById('publicacoes-root'); if(!root) return;
  if(!window._pubCat){ PUB_CATEGORIAS=await _catNomes('pub_categorias',PUB_CATEGORIAS); PUB_PLANEJADOR=await _catNomes('pub_planejador',PUB_PLANEJADOR); window._pubCat=true; }
  root.innerHTML='<div class="empty-state"><div class="spinner" style="margin:0 auto"></div></div>';
  var qs=[]; ['categoria','planejador','tema','data'].forEach(function(k){ if(filtrosPub[k]) qs.push(k+'='+encodeURIComponent(filtrosPub[k])); });
  try{ var lista=await _authFetch('GET','/publicacoes'+(qs.length?'?'+qs.join('&'):'')); renderPublicacoes(lista); }
  catch(e){ root.innerHTML='<div class="empty-state"><p>'+(e.message||'Erro')+'</p></div>'; }
}
function renderPublicacoes(lista){
  var root=document.getElementById('publicacoes-root');
  var f=filtrosPub;
  function selF(n,arr,ph){ return '<select data-pf="'+n+'" class="tf"><option value="">'+ph+'</option>'+arr.map(function(o){return '<option value="'+o+'"'+(f[n]===o?' selected':'')+'>'+o+'</option>';}).join('')+'</select>'; }
  var temFiltro=['categoria','tema','data','planejador'].some(function(k){return f[k];});
  var toolbar='<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:12px">'
    +'<button class="btn btn-primary btn-sm" data-pact="nova">＋ Nova publicação</button>'
    +'<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center">'
    +selF('categoria',PUB_CATEGORIAS,'Categoria: todas')
    +'<input data-pf="tema" class="tf" placeholder="Tema" value="'+(f.tema||'')+'" style="width:140px">'
    +'<input type="date" data-pf="data" class="tf" value="'+(f.data||'')+'" style="width:150px">'
    +selF('planejador',PUB_PLANEJADOR,'Planejador: todos')
    +(temFiltro?'<button class="btn btn-sm btn-secondary" data-pact="limpar">Limpar filtro</button>':'')
    +'</div></div>';
  var cg='<colgroup><col style="width:18%"><col style="width:42%"><col style="width:16%"><col style="width:16%"><col style="width:8%"></colgroup>';
  var rows=lista.map(function(p){
    return '<tr>'
      +'<td><select class="tf" data-act="categoria" data-id="'+p.id+'">'+_optSel(PUB_CATEGORIAS,p.categoria||'')+'</select></td>'
      +'<td><input class="tf" data-act="tema" data-id="'+p.id+'" value="'+(p.tema||'').replace(/"/g,'&quot;')+'" placeholder="Escreva o tema..."></td>'
      +'<td><input type="date" class="tf" data-act="data" data-id="'+p.id+'" value="'+(p.data||'')+'"></td>'
      +'<td><select class="tf" data-act="planejador" data-id="'+p.id+'">'+_optSel(PUB_PLANEJADOR,p.planejador||'')+'</select></td>'
      +'<td style="text-align:center"><button class="btn btn-sm btn-danger" data-pact="del" data-id="'+p.id+'">×</button></td>'
      +'</tr>';
  }).join('');
  var head='<thead><tr><th>Categoria</th><th>Tema</th><th>Data</th><th>Planejador</th><th></th></tr></thead>';
  root.innerHTML=toolbar+'<table class="tabela-contatos">'+cg+head+'<tbody>'+(rows||'<tr><td colspan="5" style="text-align:center;padding:20px;color:var(--text-muted)">Nenhuma publicação</td></tr>')+'</tbody></table>';
}
document.addEventListener('change', function(e){
  var ff=e.target.closest('#publicacoes-root [data-pf]');
  if(ff){ filtrosPub[ff.getAttribute('data-pf')]=ff.value.trim(); carregarPublicacoes(); return; }
  var el=e.target.closest('#publicacoes-root [data-act]');
  if(el){ var d={}; d[el.getAttribute('data-act')]=el.value; _authFetch('PATCH','/publicacoes/'+el.getAttribute('data-id'),d).catch(function(err){toast(err.message,'error');}); }
});
document.addEventListener('click', async function(e){
  var b=e.target.closest('#publicacoes-root [data-pact]'); if(!b) return;
  var act=b.getAttribute('data-pact');
  if(act==='nova'){ try{ await _authFetch('POST','/publicacoes',{categoria:(PUB_CATEGORIAS[0]||null),planejador:'Planejado'}); carregarPublicacoes(); }catch(err){toast(err.message,'error');} }
  else if(act==='limpar'){ filtrosPub={}; carregarPublicacoes(); }
  else if(act==='del'){ if(!confirm('Excluir esta publicação?'))return; try{ await _authFetch('DELETE','/publicacoes/'+b.getAttribute('data-id')); carregarPublicacoes(); }catch(err){toast(err.message,'error');} }
});
document.addEventListener('click', function(e){ if(e.target.closest('.desktop-nav-item[data-page="publicacoes"]')){ setTimeout(carregarPublicacoes,80); } });

/* ===== Publicacoes: filtro por botoes + duplicar + acoes discretas ===== */
function renderPublicacoes(lista){
  window._pubs=lista;
  var root=document.getElementById('publicacoes-root');
  var DUP='<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 0 0-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 0 1-1.125-1.125v-9.25"/></svg>';
  var TRASH='<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"/></svg>';
  var plan=[{v:'',t:'Todos'}].concat(PUB_PLANEJADOR.map(function(p){return {v:p,t:p};}));
  var botoes=plan.map(function(b){ var on=(filtrosPub.planejador||'')===b.v; return '<button class="btn btn-sm '+(on?'btn-primary':'btn-secondary')+'" data-plan="'+b.v+'">'+b.t+'</button>'; }).join(' ');
  var toolbar='<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:12px">'
    +'<button class="btn btn-primary btn-sm" data-pact="nova">＋ Nova publicação</button>'
    +'<div style="display:flex;gap:6px;flex-wrap:wrap">'+botoes+'</div></div>';
  var cg='<colgroup><col style="width:18%"><col style="width:44%"><col style="width:16%"><col style="width:14%"><col style="width:8%"></colgroup>';
  var rows=lista.map(function(p){
    return '<tr>'
      +'<td><select class="tf" data-act="categoria" data-id="'+p.id+'">'+_optSel(PUB_CATEGORIAS,p.categoria||'')+'</select></td>'
      +'<td><input class="tf" data-act="tema" data-id="'+p.id+'" value="'+(p.tema||'').replace(/"/g,'&quot;')+'" placeholder="Escreva o tema..."></td>'
      +'<td><input type="date" class="tf" data-act="data" data-id="'+p.id+'" value="'+(p.data||'')+'"></td>'
      +'<td><select class="tf" data-act="planejador" data-id="'+p.id+'">'+_optSel(PUB_PLANEJADOR,p.planejador||'')+'</select></td>'
      +'<td style="text-align:center;white-space:nowrap"><button class="fel-ic" data-pact="dup" data-id="'+p.id+'" title="Duplicar">'+DUP+'</button> <button class="fel-ic" data-pact="del" data-id="'+p.id+'" title="Excluir" style="color:var(--danger)">'+TRASH+'</button></td>'
      +'</tr>';
  }).join('');
  var head='<thead><tr><th>Categoria</th><th>Tema</th><th>Data</th><th>Planejador</th><th></th></tr></thead>';
  root.innerHTML=toolbar+'<table class="tabela-contatos">'+cg+head+'<tbody>'+(rows||'<tr><td colspan="5" style="text-align:center;padding:20px;color:var(--text-muted)">Nenhuma publicação</td></tr>')+'</tbody></table>';
}
document.addEventListener('click', async function(e){
  var pb=e.target.closest('#publicacoes-root [data-plan]');
  if(pb){ filtrosPub.planejador=pb.getAttribute('data-plan'); carregarPublicacoes(); return; }
  var du=e.target.closest('#publicacoes-root [data-pact="dup"]');
  if(du){ var id=du.getAttribute('data-id'); var src=(window._pubs||[]).filter(function(x){return x.id===id;})[0]; if(src){ try{ await _authFetch('POST','/publicacoes',{categoria:src.categoria,tema:src.tema,data:src.data,planejador:src.planejador}); carregarPublicacoes(); }catch(err){toast(err.message,'error');} } }
});

/* ===== Publicacoes: indicadores visuais ===== */
function _pubIcons(p){
  var ic=[];
  if(p.post) ic.push('<span title="Post preenchido">📝</span>');
  if(p.imagens && p.imagens.length) ic.push('<span title="'+p.imagens.length+' imagem(ns)">🖼️</span>');
  if(p.hashtags) ic.push('<span title="Hashtags" style="font-weight:700;color:var(--primary)">#</span>');
  if(p.data) ic.push('<span title="Data definida">📅</span>');
  return ic.length? '<span style="display:inline-flex;gap:8px;font-size:15px">'+ic.join('')+'</span>' : '<span style="color:var(--text-muted)">—</span>';
}
function renderPublicacoes(lista){
  window._pubs=lista;
  var root=document.getElementById('publicacoes-root');
  var DUP='<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 0 0-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 0 1-1.125-1.125v-9.25"/></svg>';
  var TRASH='<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"/></svg>';
  var plan=[{v:'',t:'Todos'}].concat(PUB_PLANEJADOR.map(function(p){return {v:p,t:p};}));
  var botoes=plan.map(function(b){ var on=(filtrosPub.planejador||'')===b.v; return '<button class="btn btn-sm '+(on?'btn-primary':'btn-secondary')+'" data-plan="'+b.v+'">'+b.t+'</button>'; }).join(' ');
  var toolbar='<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:12px"><button class="btn btn-primary btn-sm" data-pact="nova">＋ Nova publicação</button><div style="display:flex;gap:6px;flex-wrap:wrap">'+botoes+'</div></div>';
  var cg='<colgroup><col style="width:15%"><col style="width:27%"><col style="width:16%"><col style="width:14%"><col style="width:14%"><col style="width:8%"></colgroup>';
  var rows=lista.map(function(p){
    return '<tr>'
      +'<td><select class="tf" data-act="categoria" data-id="'+p.id+'">'+_optSel(PUB_CATEGORIAS,p.categoria||'')+'</select></td>'
      +'<td><input class="tf" data-act="tema" data-id="'+p.id+'" value="'+(p.tema||'').replace(/"/g,'&quot;')+'" placeholder="Tema..."></td>'
      +'<td style="text-align:center">'+_pubIcons(p)+'</td>'
      +'<td><input type="date" class="tf" data-act="data" data-id="'+p.id+'" value="'+(p.data||'')+'"></td>'
      +'<td><select class="tf" data-act="planejador" data-id="'+p.id+'">'+_optSel(PUB_PLANEJADOR,p.planejador||'')+'</select></td>'
      +'<td style="text-align:center;white-space:nowrap"><button class="fel-ic" data-pact="dup" data-id="'+p.id+'" title="Duplicar">'+DUP+'</button> <button class="fel-ic" data-pact="del" data-id="'+p.id+'" title="Excluir" style="color:var(--danger)">'+TRASH+'</button></td>'
      +'</tr>';
  }).join('');
  var head='<thead><tr><th>Categoria</th><th>Tema</th><th style="text-align:center">Conteúdo</th><th>Data</th><th>Planejador</th><th></th></tr></thead>';
  root.innerHTML=toolbar+'<table class="tabela-contatos">'+cg+head+'<tbody>'+(rows||'<tr><td colspan="6" style="text-align:center;padding:20px;color:var(--text-muted)">Nenhuma publicação</td></tr>')+'</tbody></table>';
}

/* ===== Publicacoes v3: lista read-only + modal ===== */
function renderPublicacoes(lista){
  window._pubs=lista;
  var root=document.getElementById('publicacoes-root');
  var EDIT='<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125"/></svg>';
  var DUP='<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 0 0-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5"/></svg>';
  var TRASH='<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166M18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"/></svg>';
  var plan=[{v:'',t:'Todos'}].concat(PUB_PLANEJADOR.map(function(p){return {v:p,t:p};}));
  var botoes=plan.map(function(b){ var on=(filtrosPub.planejador||'')===b.v; return '<button class="btn btn-sm '+(on?'btn-primary':'btn-secondary')+'" data-plan="'+b.v+'">'+b.t+'</button>'; }).join(' ');
  var toolbar='<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:12px"><button class="btn btn-primary btn-sm" data-pmact="nova">＋ Nova publicação</button><div style="display:flex;gap:6px;flex-wrap:wrap">'+botoes+'</div></div>';
  var cg='<colgroup><col style="width:15%"><col style="width:28%"><col style="width:15%"><col style="width:13%"><col style="width:15%"><col style="width:10%"></colgroup>';
  var rows=lista.map(function(p){
    var pub=p.planejador==='Publicado';
    var badge=p.planejador? '<span style="background:'+(pub?'#dcfce7':'var(--primary-light)')+';color:'+(pub?'#15803d':'var(--primary)')+';padding:2px 8px;border-radius:10px;font-size:12px">'+p.planejador+'</span>' : '<span style="color:var(--text-muted)">—</span>';
    return '<tr>'
      +'<td>'+(p.categoria||'—')+'</td>'
      +'<td><a href="#" data-pmact="view" data-id="'+p.id+'" style="color:var(--primary);font-weight:600;text-decoration:none">'+(p.tema||'(sem tema)')+'</a></td>'
      +'<td style="text-align:center">'+_pubIcons(p)+'</td>'
      +'<td>'+(p.data||'—')+'</td>'
      +'<td>'+badge+'</td>'
      +'<td style="text-align:center;white-space:nowrap"><button class="fel-ic" data-pmact="editar" data-id="'+p.id+'" title="Editar">'+EDIT+'</button> <button class="fel-ic" data-pmact="dup" data-id="'+p.id+'" title="Duplicar">'+DUP+'</button> <button class="fel-ic" data-pmact="del" data-id="'+p.id+'" title="Excluir" style="color:var(--danger)">'+TRASH+'</button></td>'
      +'</tr>';
  }).join('');
  var head='<thead><tr><th>Categoria</th><th>Tema</th><th style="text-align:center">Conteúdo</th><th>Data</th><th>Planejador</th><th></th></tr></thead>';
  root.innerHTML=toolbar+'<table class="tabela-contatos">'+cg+head+'<tbody>'+(rows||'<tr><td colspan="6" style="text-align:center;padding:20px;color:var(--text-muted)">Nenhuma publicação</td></tr>')+'</tbody></table>';
}
document.addEventListener('click', async function(e){
  var b=e.target.closest('#publicacoes-root [data-pmact]'); if(!b) return; e.preventDefault();
  var act=b.getAttribute('data-pmact'), id=b.getAttribute('data-id');
  if(act==='nova'){ abrirPubModal({planejador:'Planejado',categoria:(PUB_CATEGORIAS[0]||null),imagens:[]}, 'novo'); return; }
  var p=(window._pubs||[]).filter(function(x){return x.id===id;})[0];
  if(act==='view'){ if(p) abrirPubModal(p,'view'); }
  else if(act==='editar'){ if(p) abrirPubModal(p,'edit'); }
  else if(act==='dup'){ if(p){ try{ await _authFetch('POST','/publicacoes',{categoria:p.categoria,tema:p.tema,post:p.post,hashtags:p.hashtags,data:p.data,planejador:p.planejador}); carregarPublicacoes(); }catch(err){toast(err.message,'error');} } }
  else if(act==='del'){ if(confirm('Excluir esta publicação?')){ try{ await _authFetch('DELETE','/publicacoes/'+id); carregarPublicacoes(); }catch(err){toast(err.message,'error');} } }
});

/* ===== Publicacoes: janela (modal) ===== */
function abrirPubModal(pub, mode){
  var state={ id:(pub&&pub.id)||null, mode:mode||'view', data:Object.assign({imagens:[]}, pub||{}) };
  var ov=document.getElementById('pub-modal'); if(ov) ov.remove();
  ov=document.createElement('div'); ov.id='pub-modal';
  ov.style.cssText='position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.5);z-index:9999;display:flex;align-items:flex-start;justify-content:center;padding:20px;overflow:auto';
  document.body.appendChild(ov);
  function fechar(){ ov.remove(); carregarPublicacoes(); }
  function render(){
    var d=state.data;
    if(state.mode==='view'){
      var imgs=(d.imagens||[]).map(function(u){ return '<div style="display:inline-block;margin:4px;text-align:center"><img src="'+u+'" style="width:90px;height:90px;object-fit:cover;border-radius:8px;border:1px solid var(--border)"><br><a href="'+u+'" download class="text-sm" style="color:var(--primary)">baixar</a></div>'; }).join('') || '<span class="text-sm text-muted">sem imagens</span>';
      ov.innerHTML='<div style="background:#fff;border-radius:12px;max-width:560px;width:100%;padding:20px">'
        +'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px"><h3 style="margin:0">Visualizar publicação</h3><button class="fel-ic" data-x="close" style="font-size:20px">×</button></div>'
        +'<div class="text-sm text-muted">Categoria</div><div style="margin-bottom:8px;font-weight:600">'+(d.categoria||'—')+'</div>'
        +'<div class="text-sm text-muted">Tema</div><div style="display:flex;gap:8px;align-items:center;margin-bottom:8px"><div style="flex:1">'+(d.tema||'—')+'</div><button class="fel-ic" data-copy="tema" title="Copiar">📋</button></div>'
        +'<div class="text-sm text-muted">Post</div><div style="display:flex;gap:8px;align-items:flex-start;margin-bottom:8px"><div style="flex:1;white-space:pre-wrap;background:var(--surface-2);padding:8px;border-radius:8px">'+(_felEsc(d.post||'—'))+'</div><button class="fel-ic" data-copy="post" title="Copiar">📋</button></div>'
        +'<div class="text-sm text-muted">Hashtags</div><div style="display:flex;gap:8px;align-items:center;margin-bottom:8px"><div style="flex:1">'+(_felEsc(d.hashtags||'—'))+'</div><button class="fel-ic" data-copy="hashtags" title="Copiar">📋</button></div>'
        +'<div style="display:flex;gap:24px;margin-bottom:8px"><div><div class="text-sm text-muted">Data</div><div>'+(d.data||'—')+'</div></div><div><div class="text-sm text-muted">Planejador</div><div>'+(d.planejador||'—')+'</div></div></div>'
        +'<div class="text-sm text-muted">Imagens</div><div style="margin-bottom:14px">'+imgs+'</div>'
        +'<div style="display:flex;gap:8px;justify-content:flex-end">'+(d.planejador==='Publicado'?'':'<button class="btn btn-secondary" data-x="publicado">✓ Marcar Publicado</button>')+'<button class="btn btn-primary" data-x="editar">✏ Editar</button></div></div>';
    } else {
      var d2=state.data;
      var imgs=(d2.imagens||[]).map(function(u){ return '<div style="display:inline-block;margin:4px;text-align:center;position:relative"><img src="'+u+'" style="width:80px;height:80px;object-fit:cover;border-radius:8px;border:1px solid var(--border)"><button class="fel-ic" data-delimg="'+u+'" title="Remover" style="position:absolute;top:-8px;right:-8px;background:#fff;border-radius:50%;color:var(--danger)">×</button><br><a href="'+u+'" download class="text-sm" style="color:var(--primary)">baixar</a></div>'; }).join('');
      ov.innerHTML='<div style="background:#fff;border-radius:12px;max-width:560px;width:100%;padding:20px">'
        +'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px"><h3 style="margin:0">'+(state.id?'Editar publicação':'Nova publicação')+'</h3><button class="fel-ic" data-x="close" style="font-size:20px">×</button></div>'
        +'<div class="form-group"><label class="form-label">Categoria</label><select id="pm-categoria" class="form-control">'+_optSel(PUB_CATEGORIAS,d2.categoria||'')+'</select></div>'
        +'<div class="form-group"><label class="form-label">Tema</label><input id="pm-tema" class="form-control" value="'+(d2.tema||'').replace(/"/g,'&quot;')+'"></div>'
        +'<div class="form-group"><label class="form-label">Post</label><textarea id="pm-post" class="form-control" rows="5">'+_felEsc(d2.post||'')+'</textarea></div>'
        +'<div class="form-group"><label class="form-label">Hashtags</label><input id="pm-hashtags" class="form-control" value="'+(d2.hashtags||'').replace(/"/g,'&quot;')+'"></div>'
        +'<div style="display:flex;gap:12px"><div class="form-group" style="flex:1"><label class="form-label">Data</label><input type="date" id="pm-data" class="form-control" value="'+(d2.data||'')+'"></div><div class="form-group" style="flex:1"><label class="form-label">Planejador</label><select id="pm-planejador" class="form-control">'+_optSel(PUB_PLANEJADOR,d2.planejador||'')+'</select></div></div>'
        +'<div class="form-group"><label class="form-label">Imagens</label><div>'+(imgs||'<span class="text-sm text-muted">nenhuma</span>')+'</div>'+(state.id?'<input type="file" id="pm-img" accept="image/*" multiple style="margin-top:8px">':'<div class="text-sm text-muted" style="margin-top:6px">Salve primeiro para anexar imagens</div>')+'</div>'
        +'<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:8px"><button class="btn btn-secondary" data-x="close">Fechar</button><button class="btn btn-primary" data-x="salvar">Salvar</button></div></div>';
    }
  }
  ov.addEventListener('click', async function(e){
    if(e.target===ov){ fechar(); return; }
    var cp=e.target.closest('[data-copy]'); if(cp){ copiarTexto(state.data[cp.getAttribute('data-copy')]||''); toast('Copiado','success'); return; }
    var di=e.target.closest('[data-delimg]'); if(di){ try{ state.data=await _authFetch('DELETE','/publicacoes/'+state.id+'/imagem',{url:di.getAttribute('data-delimg')}); render(); }catch(err){toast(err.message,'error');} return; }
    var x=e.target.closest('[data-x]'); if(!x) return;
    var act=x.getAttribute('data-x');
    if(act==='close'){ fechar(); }
    else if(act==='editar'){ state.mode='edit'; render(); }
    else if(act==='publicado'){ try{ state.data=await _authFetch('PATCH','/publicacoes/'+state.id,{planejador:'Publicado'}); render(); }catch(err){toast(err.message,'error');} }
    else if(act==='salvar'){
      var body={categoria:_v('pm-categoria'),tema:_v('pm-tema'),post:document.getElementById('pm-post').value,hashtags:_v('pm-hashtags'),data:_v('pm-data'),planejador:_v('pm-planejador')};
      try{
        if(state.id){ state.data=await _authFetch('PATCH','/publicacoes/'+state.id,body); }
        else { var r=await _authFetch('POST','/publicacoes',body); state.data=r; state.id=r.id; }
        toast('Salvo','success'); state.mode='view'; render();
      }catch(err){ toast(err.message,'error'); }
    }
  });
  ov.addEventListener('change', async function(e){
    var f=e.target.closest('#pm-img'); if(!f||!f.files.length) return;
    for(var i=0;i<f.files.length;i++){
      var fd=new FormData(); fd.append('foto',f.files[i]);
      try{ var r=await fetch('/api/publicacoes/'+state.id+'/imagem',{method:'POST',headers:{'Authorization':'Bearer '+getToken()},body:fd}); var data=await r.json(); if(r.ok) state.data=data; }catch(err){}
    }
    render();
  });
  render();
}

/* ===== Publicacoes v4: highlight incompleto + dup/nova planejador em branco ===== */
function renderPublicacoes(lista){
  window._pubs=lista;
  var root=document.getElementById('publicacoes-root');
  var EDIT='<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125"/></svg>';
  var DUP='<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 0 0-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5"/></svg>';
  var TRASH='<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166M18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"/></svg>';
  var plan=[{v:'',t:'Todos'}].concat(PUB_PLANEJADOR.map(function(p){return {v:p,t:p};}));
  var botoes=plan.map(function(b){ var on=(filtrosPub.planejador||'')===b.v; return '<button class="btn btn-sm '+(on?'btn-primary':'btn-secondary')+'" data-plan="'+b.v+'">'+b.t+'</button>'; }).join(' ');
  var toolbar='<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:12px"><button class="btn btn-primary btn-sm" data-pm2="nova">＋ Nova publicação</button><div style="display:flex;gap:6px;flex-wrap:wrap">'+botoes+'</div></div>';
  var cg='<colgroup><col style="width:15%"><col style="width:28%"><col style="width:15%"><col style="width:13%"><col style="width:15%"><col style="width:10%"></colgroup>';
  var rows=lista.map(function(p){
    var pub=p.planejador==='Publicado';
    var badge=p.planejador? '<span style="background:'+(pub?'#dcfce7':'var(--primary-light)')+';color:'+(pub?'#15803d':'var(--primary)')+';padding:2px 8px;border-radius:10px;font-size:12px">'+p.planejador+'</span>' : '<span style="color:var(--text-muted)">—</span>';
    var _n=[p.post,(p.imagens&&p.imagens.length),p.hashtags,p.data].filter(function(x){return !!x;}).length;
    var trStyle=(_n>0 && _n<4) ? ' style="background:#fde68a"' : '';
    return '<tr'+trStyle+'>'
      +'<td>'+(p.categoria||'—')+'</td>'
      +'<td><a href="#" data-pm2="view" data-id="'+p.id+'" style="color:var(--primary);font-weight:600;text-decoration:none">'+(p.tema||'(sem tema)')+'</a></td>'
      +'<td style="text-align:center">'+_pubIcons(p)+'</td>'
      +'<td>'+(p.data||'—')+'</td>'
      +'<td>'+badge+'</td>'
      +'<td style="text-align:center;white-space:nowrap"><button class="fel-ic" data-pm2="editar" data-id="'+p.id+'" title="Editar">'+EDIT+'</button> <button class="fel-ic" data-pm2="dup" data-id="'+p.id+'" title="Duplicar">'+DUP+'</button> <button class="fel-ic" data-pm2="del" data-id="'+p.id+'" title="Excluir" style="color:var(--danger)">'+TRASH+'</button></td>'
      +'</tr>';
  }).join('');
  var head='<thead><tr><th>Categoria</th><th>Tema</th><th style="text-align:center">Conteúdo</th><th>Data</th><th>Planejador</th><th></th></tr></thead>';
  root.innerHTML=toolbar+'<table class="tabela-contatos">'+cg+head+'<tbody>'+(rows||'<tr><td colspan="6" style="text-align:center;padding:20px;color:var(--text-muted)">Nenhuma publicação</td></tr>')+'</tbody></table>';
}
document.addEventListener('click', async function(e){
  var b=e.target.closest('#publicacoes-root [data-pm2]'); if(!b) return; e.preventDefault();
  var act=b.getAttribute('data-pm2'), id=b.getAttribute('data-id');
  if(act==='nova'){ abrirPubModal({planejador:'',categoria:(PUB_CATEGORIAS[0]||null),imagens:[]}, 'novo'); return; }
  var p=(window._pubs||[]).filter(function(x){return x.id===id;})[0];
  if(act==='view'){ if(p) abrirPubModal(p,'view'); }
  else if(act==='editar'){ if(p) abrirPubModal(p,'edit'); }
  else if(act==='dup'){ if(p){ try{ await _authFetch('POST','/publicacoes',{categoria:p.categoria,tema:p.tema,post:p.post,hashtags:p.hashtags,data:p.data,planejador:null}); carregarPublicacoes(); }catch(err){toast(err.message,'error');} } }
  else if(act==='del'){ if(confirm('Excluir esta publicação?')){ try{ await _authFetch('DELETE','/publicacoes/'+id); carregarPublicacoes(); }catch(err){toast(err.message,'error');} } }
});

/* Publicacoes: margem direita pra nao cortar acoes */
(function(){ var s=document.createElement('style'); s.id='css-pub-fix';
  s.textContent='#page-publicacoes .page-content{padding-right:28px}'
   +'#page-publicacoes .tabela-contatos td:last-child,#page-publicacoes .tabela-contatos th:last-child{padding-right:14px}';
  document.head.appendChild(s); })();

/* ===== Publicacoes v6: ID, arquivar, filtro arquivados ===== */
async function carregarPublicacoes(){
  var root=document.getElementById('publicacoes-root'); if(!root) return;
  if(!window._pubCat){ PUB_CATEGORIAS=await _catNomes('pub_categorias',PUB_CATEGORIAS); PUB_PLANEJADOR=await _catNomes('pub_planejador',PUB_PLANEJADOR); window._pubCat=true; }
  root.innerHTML='<div class="empty-state"><div class="spinner" style="margin:0 auto"></div></div>';
  var qs=['arquivado='+(filtrosPub.arquivado?'true':'false')];
  if(filtrosPub.planejador) qs.push('planejador='+encodeURIComponent(filtrosPub.planejador));
  try{ var lista=await _authFetch('GET','/publicacoes?'+qs.join('&')); renderPublicacoes(lista); }
  catch(e){ root.innerHTML='<div class="empty-state"><p>'+(e.message||'Erro')+'</p></div>'; }
}
function renderPublicacoes(lista){
  window._pubs=lista;
  var root=document.getElementById('publicacoes-root');
  var EDIT='<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125"/></svg>';
  var DUP='<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 0 0-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5"/></svg>';
  var ARCH='<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0-3-3m3 3 3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z"/></svg>';
  var TRASH='<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166M18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"/></svg>';
  var plan=[{v:'',t:'Todos'}].concat(PUB_PLANEJADOR.map(function(p){return {v:p,t:p};}));
  var botoes=plan.map(function(b){ var on=(filtrosPub.planejador||'')===b.v; return '<button class="btn btn-sm '+(on?'btn-primary':'btn-secondary')+'" data-plan="'+b.v+'">'+b.t+'</button>'; }).join(' ');
  var arqBtn='<button class="btn btn-sm '+(filtrosPub.arquivado?'btn-primary':'btn-secondary')+'" data-arq="1">📦 Arquivados</button>';
  var toolbar='<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:12px"><button class="btn btn-primary btn-sm" data-pm2="nova">＋ Nova publicação</button><div style="display:flex;gap:6px;flex-wrap:wrap">'+botoes+' '+arqBtn+'</div></div>';
  var arq=filtrosPub.arquivado;
  var cg='<colgroup><col style="width:5%"><col style="width:12%"><col style="width:25%"><col style="width:12%"><col style="width:11%"><col style="width:12%"><col style="width:17%"></colgroup>';
  var rows=lista.map(function(p){
    var pub=p.planejador==='Publicado';
    var badge=p.planejador? '<span style="background:'+(pub?'#dcfce7':'var(--primary-light)')+';color:'+(pub?'#15803d':'var(--primary)')+';padding:2px 8px;border-radius:10px;font-size:12px">'+p.planejador+'</span>' : '<span style="color:var(--text-muted)">—</span>';
    var _n=[p.post,(p.imagens&&p.imagens.length),p.hashtags,p.data].filter(function(x){return !!x;}).length;
    var trStyle=(_n>0 && _n<4) ? ' style="background:#fde68a"' : '';
    return '<tr'+trStyle+'>'
      +'<td style="color:var(--text-muted);font-size:12px">#'+(p.numero||'')+'</td>'
      +'<td>'+(p.categoria||'—')+'</td>'
      +'<td><a href="#" data-pm2="view" data-id="'+p.id+'" style="color:var(--primary);font-weight:600;text-decoration:none">'+(p.tema||'(sem tema)')+'</a></td>'
      +'<td style="text-align:center">'+_pubIcons(p)+'</td>'
      +'<td>'+(p.data||'—')+'</td>'
      +'<td>'+badge+'</td>'
      +'<td style="text-align:center;white-space:nowrap"><button class="fel-ic" data-pm2="editar" data-id="'+p.id+'" title="Editar">'+EDIT+'</button><button class="fel-ic" data-pm2="dup" data-id="'+p.id+'" title="Duplicar">'+DUP+'</button><button class="fel-ic" data-pm2="arquivar" data-id="'+p.id+'" title="'+(arq?'Desarquivar':'Arquivar')+'" style="color:'+(arq?'#15803d':'#b45309')+'">'+ARCH+'</button><button class="fel-ic" data-pm2="del" data-id="'+p.id+'" title="Excluir" style="color:var(--danger)">'+TRASH+'</button></td>'
      +'</tr>';
  }).join('');
  var head='<thead><tr><th>ID</th><th>Categoria</th><th>Tema</th><th style="text-align:center">Conteúdo</th><th>Data</th><th>Planejador</th><th></th></tr></thead>';
  root.innerHTML=toolbar+'<table class="tabela-contatos">'+cg+head+'<tbody>'+(rows||'<tr><td colspan="7" style="text-align:center;padding:20px;color:var(--text-muted)">'+(arq?'Nenhuma arquivada':'Nenhuma publicação')+'</td></tbody>')+'</tbody></table>';
}
document.addEventListener('click', async function(e){
  var ar=e.target.closest('#publicacoes-root [data-arq]');
  if(ar){ filtrosPub.arquivado=!filtrosPub.arquivado; carregarPublicacoes(); return; }
  var av=e.target.closest('#publicacoes-root [data-pm2="arquivar"]');
  if(av){ try{ await _authFetch('PATCH','/publicacoes/'+av.getAttribute('data-id'),{arquivado: !filtrosPub.arquivado}); carregarPublicacoes(); }catch(err){toast(err.message,'error');} return; }
});
(function(){ var s=document.createElement('style'); s.id='css-pub-fix2';
  s.textContent='#page-publicacoes .page-content{padding-right:32px}'
   +'#page-publicacoes .tabela-contatos td:last-child,#page-publicacoes .tabela-contatos th:last-child{padding-right:18px}'
   +'#page-publicacoes .tabela-contatos td:last-child .fel-ic{margin:0 1px}';
  document.head.appendChild(s); })();

/* ===== LINKEDIN > Lembretes (igual Felicitacoes) ===== */
(function(){ var p=document.getElementById('page-lembretes'); if(p){ var pc=p.querySelector('.page-content'); if(pc) pc.innerHTML='<p class="text-sm text-muted mb-3">Lembretes prontos pra copiar — salvam automaticamente.</p><div id="lembretes-root"></div>'; } })();
/* remove botao Fluxo */
(function(){ var b=document.querySelector('.desktop-nav-item[data-page="fluxo"]'); if(b) b.remove(); })();

var _lembModel=null, _lembTimer=null;
function _lembSave(){ clearTimeout(_lembTimer); _lembTimer=setTimeout(function(){ try{ api.salvarConfig('lembretes', _lembModel); }catch(e){} }, 600); }
async function carregarLembretes(){
  if(!_lembModel){ _lembModel={temas:[]}; try{ var c=await api.obterConfig('lembretes'); if(c && c.valor && c.valor.temas) _lembModel=c.valor; }catch(e){} }
  renderLembretes();
}
function renderLembretes(){
  var root=document.getElementById('lembretes-root'); if(!root) return;
  var COPY='<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612a.75.75 0 0 1-.75.75H9a.75.75 0 0 1-.75-.75c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184"/></svg>';
  var TRASH='<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166M18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"/></svg>';
  root.innerHTML=_lembModel.temas.map(function(tema,ti){
    var boxes=tema.textos.map(function(txt,xi){
      var len=(''+(txt||'')).length;
      return '<div class="fel-box" style="border:1px solid var(--border);border-radius:10px;padding:10px;margin-bottom:10px"><textarea class="form-control lemb-ta" data-ti="'+ti+'" data-xi="'+xi+'" maxlength="500" rows="3" placeholder="Escreva o texto...">'+_felEsc(txt)+'</textarea><div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px"><span class="fel-count text-sm" style="color:'+(len>=500?'var(--danger)':'var(--text-muted)')+'">'+len+'/500</span><span style="display:flex;gap:12px"><button class="fel-ic" data-lact="copiar" title="Copiar">'+COPY+'</button><button class="fel-ic" data-lact="delbox" data-ti="'+ti+'" data-xi="'+xi+'" title="Limpar" style="color:var(--danger)">'+TRASH+'</button></span></div></div>';
    }).join('');
    return '<div class="card mb-4"><div class="card-body"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px"><h3 style="margin:0;font-size:16px">'+_felEsc(tema.titulo)+'</h3><button class="fel-ic" data-lact="addbox" data-ti="'+ti+'" title="Adicionar caixa" style="font-size:22px;line-height:1;color:var(--primary)">＋</button></div>'+boxes+'</div></div>';
  }).join('')
  +'<div style="display:flex;gap:6px;margin-bottom:24px"><input id="lemb-novo-tema" class="form-control" placeholder="novo lembrete (título)"><button class="btn btn-secondary" data-lact="addtema">＋ Lembrete</button></div>';
}
document.addEventListener('input', function(e){
  var ta=e.target.closest('#lembretes-root .lemb-ta'); if(!ta) return;
  var ti=+ta.getAttribute('data-ti'), xi=+ta.getAttribute('data-xi');
  _lembModel.temas[ti].textos[xi]=ta.value;
  var cnt=ta.closest('.fel-box').querySelector('.fel-count'); if(cnt){ cnt.textContent=ta.value.length+'/500'; cnt.style.color=ta.value.length>=500?'var(--danger)':'var(--text-muted)'; }
  _lembSave();
});
document.addEventListener('click', function(e){
  var b=e.target.closest('#lembretes-root [data-lact]'); if(!b) return;
  var act=b.getAttribute('data-lact');
  if(act==='copiar'){ var ta=b.closest('.fel-box').querySelector('.lemb-ta'); copiarTexto(ta.value); toast('Texto copiado','success'); return; }
  if(act==='addtema'){ var inp=document.getElementById('lemb-novo-tema'); var nome=(inp.value||'').trim(); if(!nome) return; _lembModel.temas.push({titulo:nome,textos:['']}); _lembSave(); renderLembretes(); return; }
  var ti=+b.getAttribute('data-ti');
  if(act==='addbox'){ _lembModel.temas[ti].textos.push(''); _lembSave(); renderLembretes(); return; }
  if(act==='delbox'){ var xi=+b.getAttribute('data-xi'); _lembModel.temas[ti].textos.splice(xi,1); if(!_lembModel.temas[ti].textos.length) _lembModel.temas[ti].textos.push(''); _lembSave(); renderLembretes(); return; }
});
document.addEventListener('click', function(e){ if(e.target.closest('.desktop-nav-item[data-page="lembretes"]')){ setTimeout(carregarLembretes,80); } });

/* ===== Publicacoes v7: canal-aware ===== */
async function carregarPublicacoes(){
  var root=document.getElementById('publicacoes-root'); if(!root) return;
  if(!window.PUB_CANAL) window.PUB_CANAL='linkedin';
  var hdr=document.querySelector('#page-publicacoes .app-header h2'); if(hdr) hdr.textContent='Publicações · '+(window.PUB_CANAL==='instagram'?'Instagram':'LinkedIn');
  if(!window._pubCat){ PUB_CATEGORIAS=await _catNomes('pub_categorias',PUB_CATEGORIAS); PUB_PLANEJADOR=await _catNomes('pub_planejador',PUB_PLANEJADOR); window._pubCat=true; }
  root.innerHTML='<div class="empty-state"><div class="spinner" style="margin:0 auto"></div></div>';
  var qs=['canal='+window.PUB_CANAL,'arquivado='+(filtrosPub.arquivado?'true':'false')];
  if(filtrosPub.planejador) qs.push('planejador='+encodeURIComponent(filtrosPub.planejador));
  try{ var lista=await _authFetch('GET','/publicacoes?'+qs.join('&')); renderPublicacoes(lista); }
  catch(e){ root.innerHTML='<div class="empty-state"><p>'+(e.message||'Erro')+'</p></div>'; }
}
function renderPublicacoes(lista){
  window._pubs=lista;
  var root=document.getElementById('publicacoes-root');
  var EDIT='<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125"/></svg>';
  var DUP='<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 0 0-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5"/></svg>';
  var ARCH='<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0-3-3m3 3 3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z"/></svg>';
  var TRASH='<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166M18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"/></svg>';
  var plan=[{v:'',t:'Todos'}].concat(PUB_PLANEJADOR.map(function(p){return {v:p,t:p};}));
  var botoes=plan.map(function(b){ var on=(filtrosPub.planejador||'')===b.v; return '<button class="btn btn-sm '+(on?'btn-primary':'btn-secondary')+'" data-plan="'+b.v+'">'+b.t+'</button>'; }).join(' ');
  var arqBtn='<button class="btn btn-sm '+(filtrosPub.arquivado?'btn-primary':'btn-secondary')+'" data-arq="1">📦 Arquivados</button>';
  var toolbar='<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:12px"><button class="btn btn-primary btn-sm" data-pm3="nova">＋ Nova publicação</button><div style="display:flex;gap:6px;flex-wrap:wrap">'+botoes+' '+arqBtn+'</div></div>';
  var arq=filtrosPub.arquivado;
  var cg='<colgroup><col style="width:5%"><col style="width:12%"><col style="width:25%"><col style="width:12%"><col style="width:11%"><col style="width:12%"><col style="width:17%"></colgroup>';
  var rows=lista.map(function(p){
    var pub=p.planejador==='Publicado';
    var badge=p.planejador? '<span style="background:'+(pub?'#dcfce7':'var(--primary-light)')+';color:'+(pub?'#15803d':'var(--primary)')+';padding:2px 8px;border-radius:10px;font-size:12px">'+p.planejador+'</span>' : '<span style="color:var(--text-muted)">—</span>';
    var _n=[p.post,(p.imagens&&p.imagens.length),p.hashtags,p.data].filter(function(x){return !!x;}).length;
    var trStyle=(_n>0 && _n<4) ? ' style="background:#fde68a"' : '';
    return '<tr'+trStyle+'>'
      +'<td style="color:var(--text-muted);font-size:12px">#'+(p.numero||'')+'</td>'
      +'<td>'+(p.categoria||'—')+'</td>'
      +'<td><a href="#" data-pm3="view" data-id="'+p.id+'" style="color:var(--primary);font-weight:600;text-decoration:none">'+(p.tema||'(sem tema)')+'</a></td>'
      +'<td style="text-align:center">'+_pubIcons(p)+'</td>'
      +'<td>'+(p.data||'—')+'</td>'
      +'<td>'+badge+'</td>'
      +'<td style="text-align:center;white-space:nowrap"><button class="fel-ic" data-pm3="editar" data-id="'+p.id+'" title="Editar">'+EDIT+'</button><button class="fel-ic" data-pm3="dup" data-id="'+p.id+'" title="Duplicar">'+DUP+'</button><button class="fel-ic" data-pm3="arquivar" data-id="'+p.id+'" title="'+(arq?'Desarquivar':'Arquivar')+'" style="color:'+(arq?'#15803d':'#b45309')+'">'+ARCH+'</button><button class="fel-ic" data-pm3="del" data-id="'+p.id+'" title="Excluir" style="color:var(--danger)">'+TRASH+'</button></td>'
      +'</tr>';
  }).join('');
  var head='<thead><tr><th>ID</th><th>Categoria</th><th>Tema</th><th style="text-align:center">Conteúdo</th><th>Data</th><th>Planejador</th><th></th></tr></thead>';
  root.innerHTML=toolbar+'<table class="tabela-contatos">'+cg+head+'<tbody>'+(rows||'<tr><td colspan="7" style="text-align:center;padding:20px;color:var(--text-muted)">'+(arq?'Nenhuma arquivada':'Nenhuma publicação')+'</td></tr>')+'</tbody></table>';
}
document.addEventListener('click', async function(e){
  var b=e.target.closest('#publicacoes-root [data-pm3]'); if(!b) return; e.preventDefault();
  var act=b.getAttribute('data-pm3'), id=b.getAttribute('data-id');
  if(act==='nova'){ try{ var nv=await _authFetch('POST','/publicacoes',{canal:window.PUB_CANAL,categoria:(PUB_CATEGORIAS[0]||null),planejador:''}); abrirPubModal(nv,'edit'); }catch(err){toast(err.message,'error');} return; }
  var p=(window._pubs||[]).filter(function(x){return x.id===id;})[0];
  if(act==='view'){ if(p) abrirPubModal(p,'view'); }
  else if(act==='editar'){ if(p) abrirPubModal(p,'edit'); }
  else if(act==='dup'){ if(p){ try{ await _authFetch('POST','/publicacoes',{canal:window.PUB_CANAL,categoria:p.categoria,tema:p.tema,post:p.post,hashtags:p.hashtags,data:p.data,planejador:null}); carregarPublicacoes(); }catch(err){toast(err.message,'error');} } }
  else if(act==='del'){ if(confirm('Excluir esta publicação?')){ try{ await _authFetch('DELETE','/publicacoes/'+id); carregarPublicacoes(); }catch(err){toast(err.message,'error');} } }
  else if(act==='arquivar'){ try{ await _authFetch('PATCH','/publicacoes/'+id,{arquivado: !filtrosPub.arquivado}); carregarPublicacoes(); }catch(err){toast(err.message,'error');} }
});

/* ===== Modulo de textos generico (Felicitacoes/Lembretes LinkedIn e Instagram) ===== */
var _txtModels={};
function _txtSave(key){ clearTimeout(window['_tt_'+key]); window['_tt_'+key]=setTimeout(function(){ try{ api.salvarConfig(key,_txtModels[key]); }catch(e){} },600); }
async function carregarTxtModulo(key, rootId){
  if(!_txtModels[key]){ _txtModels[key]={temas:[]}; try{ var c=await api.obterConfig(key); if(c&&c.valor&&c.valor.temas) _txtModels[key]=c.valor; }catch(e){} }
  renderTxtModulo(key, rootId);
}
function renderTxtModulo(key, rootId){
  var root=document.getElementById(rootId); if(!root) return;
  var m=_txtModels[key];
  var COPY='<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612a.75.75 0 0 1-.75.75H9a.75.75 0 0 1-.75-.75c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184"/></svg>';
  var TRASH='<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166M18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"/></svg>';
  root.innerHTML=m.temas.map(function(tema,ti){
    var boxes=tema.textos.map(function(txt,xi){ var len=(''+(txt||'')).length;
      return '<div class="fel-box" style="border:1px solid var(--border);border-radius:10px;padding:10px;margin-bottom:10px"><textarea class="form-control txt-ta" data-key="'+key+'" data-root="'+rootId+'" data-ti="'+ti+'" data-xi="'+xi+'" maxlength="500" rows="3" placeholder="Escreva o texto...">'+_felEsc(txt)+'</textarea><div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px"><span class="fel-count text-sm" style="color:'+(len>=500?'var(--danger)':'var(--text-muted)')+'">'+len+'/500</span><span style="display:flex;gap:12px"><button class="fel-ic" data-tact="copiar" data-key="'+key+'" data-root="'+rootId+'" data-ti="'+ti+'" data-xi="'+xi+'" title="Copiar">'+COPY+'</button><button class="fel-ic" data-tact="delbox" data-key="'+key+'" data-root="'+rootId+'" data-ti="'+ti+'" data-xi="'+xi+'" title="Limpar" style="color:var(--danger)">'+TRASH+'</button></span></div></div>';
    }).join('');
    return '<div class="card mb-4"><div class="card-body"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px"><h3 style="margin:0;font-size:16px">'+_felEsc(tema.titulo)+'</h3><button class="fel-ic" data-tact="addbox" data-key="'+key+'" data-root="'+rootId+'" data-ti="'+ti+'" title="Adicionar caixa" style="font-size:22px;line-height:1;color:var(--primary)">＋</button></div>'+boxes+'</div></div>';
  }).join('')
  +'<div style="display:flex;gap:6px;margin-bottom:24px"><input class="form-control txt-novotema" data-key="'+key+'" data-root="'+rootId+'" placeholder="novo título"><button class="btn btn-secondary" data-tact="addtema" data-key="'+key+'" data-root="'+rootId+'">＋ Adicionar</button></div>';
}
document.addEventListener('input', function(e){
  var ta=e.target.closest('.txt-ta'); if(!ta) return;
  var key=ta.getAttribute('data-key'), ti=+ta.getAttribute('data-ti'), xi=+ta.getAttribute('data-xi');
  _txtModels[key].temas[ti].textos[xi]=ta.value;
  var cnt=ta.closest('.fel-box').querySelector('.fel-count'); if(cnt){ cnt.textContent=ta.value.length+'/500'; cnt.style.color=ta.value.length>=500?'var(--danger)':'var(--text-muted)'; }
  _txtSave(key);
});
document.addEventListener('click', function(e){
  var b=e.target.closest('[data-tact]'); if(!b) return;
  var act=b.getAttribute('data-tact'), key=b.getAttribute('data-key'), rootId=b.getAttribute('data-root'), m=_txtModels[key];
  if(act==='copiar'){ copiarTexto(b.closest('.fel-box').querySelector('.txt-ta').value); toast('Texto copiado','success'); return; }
  if(act==='addtema'){ var inp=b.parentElement.querySelector('.txt-novotema'); var nome=(inp.value||'').trim(); if(!nome)return; m.temas.push({titulo:nome,textos:['']}); _txtSave(key); renderTxtModulo(key,rootId); return; }
  var ti=+b.getAttribute('data-ti');
  if(act==='addbox'){ m.temas[ti].textos.push(''); _txtSave(key); renderTxtModulo(key,rootId); return; }
  if(act==='delbox'){ var xi=+b.getAttribute('data-xi'); m.temas[ti].textos.splice(xi,1); if(!m.temas[ti].textos.length) m.temas[ti].textos.push(''); _txtSave(key); renderTxtModulo(key,rootId); return; }
});
/* overrides + versoes IG */
carregarFelicitacoes=function(){ carregarTxtModulo('felicitacoes','felicitacoes-root'); };
carregarLembretes=function(){ carregarTxtModulo('lembretes','lembretes-root'); };
function carregarFelicitacoesIG(){ carregarTxtModulo('felicitacoes_instagram','felicitacoes-ig-root'); }
function carregarLembretesIG(){ carregarTxtModulo('lembretes_instagram','lembretes-ig-root'); }
/* paginas IG */
(function(){ var main=document.querySelector('.app-main'); if(!main) return;
  [['felicitacoes-ig','💬 Felicitações · Instagram','felicitacoes-ig-root'],['lembretes-ig','⏰ Lembretes · Instagram','lembretes-ig-root']].forEach(function(x){
    if(!document.getElementById('page-'+x[0])){ var p=document.createElement('div'); p.id='page-'+x[0]; p.className='page'; p.innerHTML='<div class="app-header"><h2>'+x[1]+'</h2></div><div class="page-content"><p class="text-sm text-muted mb-3">Textos prontos — salvam automaticamente.</p><div id="'+x[2]+'"></div></div>'; main.appendChild(p); }
  });
})();

/* ===== Modulo de textos generico (Felicitacoes/Lembretes LinkedIn e Instagram) ===== */
var _txtModels={};
function _txtSave(key){ clearTimeout(window['_tt_'+key]); window['_tt_'+key]=setTimeout(function(){ try{ api.salvarConfig(key,_txtModels[key]); }catch(e){} },600); }
async function carregarTxtModulo(key, rootId){
  if(!_txtModels[key]){ _txtModels[key]={temas:[]}; try{ var c=await api.obterConfig(key); if(c&&c.valor&&c.valor.temas) _txtModels[key]=c.valor; }catch(e){} }
  renderTxtModulo(key, rootId);
}
function renderTxtModulo(key, rootId){
  var root=document.getElementById(rootId); if(!root) return;
  var m=_txtModels[key];
  var COPY='<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612a.75.75 0 0 1-.75.75H9a.75.75 0 0 1-.75-.75c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184"/></svg>';
  var TRASH='<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166M18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"/></svg>';
  root.innerHTML=m.temas.map(function(tema,ti){
    var boxes=tema.textos.map(function(txt,xi){ var len=(''+(txt||'')).length;
      return '<div class="fel-box" style="border:1px solid var(--border);border-radius:10px;padding:10px;margin-bottom:10px"><textarea class="form-control txt-ta" data-key="'+key+'" data-root="'+rootId+'" data-ti="'+ti+'" data-xi="'+xi+'" maxlength="500" rows="3" placeholder="Escreva o texto...">'+_felEsc(txt)+'</textarea><div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px"><span class="fel-count text-sm" style="color:'+(len>=500?'var(--danger)':'var(--text-muted)')+'">'+len+'/500</span><span style="display:flex;gap:12px"><button class="fel-ic" data-tact="copiar" data-key="'+key+'" data-root="'+rootId+'" data-ti="'+ti+'" data-xi="'+xi+'" title="Copiar">'+COPY+'</button><button class="fel-ic" data-tact="delbox" data-key="'+key+'" data-root="'+rootId+'" data-ti="'+ti+'" data-xi="'+xi+'" title="Limpar" style="color:var(--danger)">'+TRASH+'</button></span></div></div>';
    }).join('');
    return '<div class="card mb-4"><div class="card-body"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px"><h3 style="margin:0;font-size:16px">'+_felEsc(tema.titulo)+'</h3><button class="fel-ic" data-tact="addbox" data-key="'+key+'" data-root="'+rootId+'" data-ti="'+ti+'" title="Adicionar caixa" style="font-size:22px;line-height:1;color:var(--primary)">＋</button></div>'+boxes+'</div></div>';
  }).join('')
  +'<div style="display:flex;gap:6px;margin-bottom:24px"><input class="form-control txt-novotema" data-key="'+key+'" data-root="'+rootId+'" placeholder="novo título"><button class="btn btn-secondary" data-tact="addtema" data-key="'+key+'" data-root="'+rootId+'">＋ Adicionar</button></div>';
}
document.addEventListener('input', function(e){
  var ta=e.target.closest('.txt-ta'); if(!ta) return;
  var key=ta.getAttribute('data-key'), ti=+ta.getAttribute('data-ti'), xi=+ta.getAttribute('data-xi');
  _txtModels[key].temas[ti].textos[xi]=ta.value;
  var cnt=ta.closest('.fel-box').querySelector('.fel-count'); if(cnt){ cnt.textContent=ta.value.length+'/500'; cnt.style.color=ta.value.length>=500?'var(--danger)':'var(--text-muted)'; }
  _txtSave(key);
});
document.addEventListener('click', function(e){
  var b=e.target.closest('[data-tact]'); if(!b) return;
  var act=b.getAttribute('data-tact'), key=b.getAttribute('data-key'), rootId=b.getAttribute('data-root'), m=_txtModels[key];
  if(act==='copiar'){ copiarTexto(b.closest('.fel-box').querySelector('.txt-ta').value); toast('Texto copiado','success'); return; }
  if(act==='addtema'){ var inp=b.parentElement.querySelector('.txt-novotema'); var nome=(inp.value||'').trim(); if(!nome)return; m.temas.push({titulo:nome,textos:['']}); _txtSave(key); renderTxtModulo(key,rootId); return; }
  var ti=+b.getAttribute('data-ti');
  if(act==='addbox'){ m.temas[ti].textos.push(''); _txtSave(key); renderTxtModulo(key,rootId); return; }
  if(act==='delbox'){ var xi=+b.getAttribute('data-xi'); m.temas[ti].textos.splice(xi,1); if(!m.temas[ti].textos.length) m.temas[ti].textos.push(''); _txtSave(key); renderTxtModulo(key,rootId); return; }
});
/* overrides + versoes IG */
carregarFelicitacoes=function(){ carregarTxtModulo('felicitacoes','felicitacoes-root'); };
carregarLembretes=function(){ carregarTxtModulo('lembretes','lembretes-root'); };
function carregarFelicitacoesIG(){ carregarTxtModulo('felicitacoes_instagram','felicitacoes-ig-root'); }
function carregarLembretesIG(){ carregarTxtModulo('lembretes_instagram','lembretes-ig-root'); }
/* paginas IG */
(function(){ var main=document.querySelector('.app-main'); if(!main) return;
  [['felicitacoes-ig','💬 Felicitações · Instagram','felicitacoes-ig-root'],['lembretes-ig','⏰ Lembretes · Instagram','lembretes-ig-root']].forEach(function(x){
    if(!document.getElementById('page-'+x[0])){ var p=document.createElement('div'); p.id='page-'+x[0]; p.className='page'; p.innerHTML='<div class="app-header"><h2>'+x[1]+'</h2></div><div class="page-content"><p class="text-sm text-muted mb-3">Textos prontos — salvam automaticamente.</p><div id="'+x[2]+'"></div></div>'; main.appendChild(p); }
  });
})();

/* ===== Publicacoes v3: lista read-only + modal ===== */
function renderPublicacoes(lista){
  window._pubs=lista;
  var root=document.getElementById('publicacoes-root');
  var EDIT='<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125"/></svg>';
  var DUP='<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 0 0-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5"/></svg>';
  var TRASH='<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166M18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"/></svg>';
  var plan=[{v:'',t:'Todos'}].concat(PUB_PLANEJADOR.map(function(p){return {v:p,t:p};}));
  var botoes=plan.map(function(b){ var on=(filtrosPub.planejador||'')===b.v; return '<button class="btn btn-sm '+(on?'btn-primary':'btn-secondary')+'" data-plan="'+b.v+'">'+b.t+'</button>'; }).join(' ');
  var toolbar='<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:12px"><button class="btn btn-primary btn-sm" data-pmact="nova">＋ Nova publicação</button><div style="display:flex;gap:6px;flex-wrap:wrap">'+botoes+'</div></div>';
  var cg='<colgroup><col style="width:15%"><col style="width:28%"><col style="width:15%"><col style="width:13%"><col style="width:15%"><col style="width:10%"></colgroup>';
  var rows=lista.map(function(p){
    var pub=p.planejador==='Publicado';
    var badge=p.planejador? '<span style="background:'+(pub?'#dcfce7':'var(--primary-light)')+';color:'+(pub?'#15803d':'var(--primary)')+';padding:2px 8px;border-radius:10px;font-size:12px">'+p.planejador+'</span>' : '<span style="color:var(--text-muted)">—</span>';
    return '<tr>'
      +'<td>'+(p.categoria||'—')+'</td>'
      +'<td><a href="#" data-pmact="view" data-id="'+p.id+'" style="color:var(--primary);font-weight:600;text-decoration:none">'+(p.tema||'(sem tema)')+'</a></td>'
      +'<td style="text-align:center">'+_pubIcons(p)+'</td>'
      +'<td>'+(p.data||'—')+'</td>'
      +'<td>'+badge+'</td>'
      +'<td style="text-align:center;white-space:nowrap"><button class="fel-ic" data-pmact="editar" data-id="'+p.id+'" title="Editar">'+EDIT+'</button> <button class="fel-ic" data-pmact="dup" data-id="'+p.id+'" title="Duplicar">'+DUP+'</button> <button class="fel-ic" data-pmact="del" data-id="'+p.id+'" title="Excluir" style="color:var(--danger)">'+TRASH+'</button></td>'
      +'</tr>';
  }).join('');
  var head='<thead><tr><th>Categoria</th><th>Tema</th><th style="text-align:center">Conteúdo</th><th>Data</th><th>Planejador</th><th></th></tr></thead>';
  root.innerHTML=toolbar+'<table class="tabela-contatos">'+cg+head+'<tbody>'+(rows||'<tr><td colspan="6" style="text-align:center;padding:20px;color:var(--text-muted)">Nenhuma publicação</td></tr>')+'</tbody></table>';
}
document.addEventListener('click', async function(e){
  var b=e.target.closest('#publicacoes-root [data-pmact]'); if(!b) return; e.preventDefault();
  var act=b.getAttribute('data-pmact'), id=b.getAttribute('data-id');
  if(act==='nova'){ abrirPubModal({planejador:'Planejado',categoria:(PUB_CATEGORIAS[0]||null),imagens:[]}, 'novo'); return; }
  var p=(window._pubs||[]).filter(function(x){return x.id===id;})[0];
  if(act==='view'){ if(p) abrirPubModal(p,'view'); }
  else if(act==='editar'){ if(p) abrirPubModal(p,'edit'); }
  else if(act==='dup'){ if(p){ try{ await _authFetch('POST','/publicacoes',{categoria:p.categoria,tema:p.tema,post:p.post,hashtags:p.hashtags,data:p.data,planejador:p.planejador}); carregarPublicacoes(); }catch(err){toast(err.message,'error');} } }
  else if(act==='del'){ if(confirm('Excluir esta publicação?')){ try{ await _authFetch('DELETE','/publicacoes/'+id); carregarPublicacoes(); }catch(err){toast(err.message,'error');} } }
});

/* ===== Publicacoes v8: restaura coluna ID (sobrescreve versao corrompida) ===== */
function renderPublicacoes(lista){
  window._pubs=lista;
  var root=document.getElementById('publicacoes-root');
  var EDIT='<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125"/></svg>';
  var DUP='<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 0 0-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5"/></svg>';
  var ARCH='<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0-3-3m3 3 3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z"/></svg>';
  var TRASH='<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166M18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"/></svg>';
  var plan=[{v:'',t:'Todos'}].concat(PUB_PLANEJADOR.map(function(p){return {v:p,t:p};}));
  var botoes=plan.map(function(b){ var on=(filtrosPub.planejador||'')===b.v; return '<button class="btn btn-sm '+(on?'btn-primary':'btn-secondary')+'" data-plan="'+b.v+'">'+b.t+'</button>'; }).join(' ');
  var arqBtn='<button class="btn btn-sm '+(filtrosPub.arquivado?'btn-primary':'btn-secondary')+'" data-arq="1">📦 Arquivados</button>';
  var toolbar='<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:12px"><button class="btn btn-primary btn-sm" data-pm3="nova">＋ Nova publicação</button><div style="display:flex;gap:6px;flex-wrap:wrap">'+botoes+' '+arqBtn+'</div></div>';
  var arq=filtrosPub.arquivado;
  var cg='<colgroup><col style="width:5%"><col style="width:12%"><col style="width:25%"><col style="width:12%"><col style="width:11%"><col style="width:12%"><col style="width:17%"></colgroup>';
  var rows=lista.map(function(p){
    var pub=p.planejador==='Publicado';
    var badge=p.planejador? '<span style="background:'+(pub?'#dcfce7':'var(--primary-light)')+';color:'+(pub?'#15803d':'var(--primary)')+';padding:2px 8px;border-radius:10px;font-size:12px">'+p.planejador+'</span>' : '<span style="color:var(--text-muted)">—</span>';
    var _n=[p.post,(p.imagens&&p.imagens.length),p.hashtags,p.data].filter(function(x){return !!x;}).length;
    var trStyle=(_n>0 && _n<4) ? ' style="background:#fde68a"' : '';
    return '<tr'+trStyle+'>'
      +'<td style="color:var(--text-muted);font-size:12px">#'+(p.numero||'')+'</td>'
      +'<td>'+(p.categoria||'—')+'</td>'
      +'<td><a href="#" data-pm3="view" data-id="'+p.id+'" style="color:var(--primary);font-weight:600;text-decoration:none">'+(p.tema||'(sem tema)')+'</a></td>'
      +'<td style="text-align:center">'+_pubIcons(p)+'</td>'
      +'<td>'+(p.data||'—')+'</td>'
      +'<td>'+badge+'</td>'
      +'<td style="text-align:center;white-space:nowrap"><button class="fel-ic" data-pm3="editar" data-id="'+p.id+'" title="Editar">'+EDIT+'</button><button class="fel-ic" data-pm3="dup" data-id="'+p.id+'" title="Duplicar">'+DUP+'</button><button class="fel-ic" data-pm3="arquivar" data-id="'+p.id+'" title="'+(arq?'Desarquivar':'Arquivar')+'" style="color:'+(arq?'#15803d':'#b45309')+'">'+ARCH+'</button><button class="fel-ic" data-pm3="del" data-id="'+p.id+'" title="Excluir" style="color:var(--danger)">'+TRASH+'</button></td>'
      +'</tr>';
  }).join('');
  var head='<thead><tr><th>ID</th><th>Categoria</th><th>Tema</th><th style="text-align:center">Conteúdo</th><th>Data</th><th>Planejador</th><th></th></tr></thead>';
  root.innerHTML=toolbar+'<table class="tabela-contatos">'+cg+head+'<tbody>'+(rows||'<tr><td colspan="7" style="text-align:center;padding:20px;color:var(--text-muted)">'+(arq?'Nenhuma arquivada':'Nenhuma publicação')+'</td></tr>')+'</tbody></table>';
}

/* ===== Menu com grupo INSTAGRAM (final) ===== */
(function(){
  var nav=document.querySelector('.desktop-nav'); if(!nav) return;
  var GRUPOS=[
    {g:'ADMIN', it:[['configuracoes','Configurações','⚙️'],['usuarios','Usuários','👤']]},
    {g:'CardBase', it:[['cadastro','Cadastro','➕'],['empresas','Empresas','🏢'],['contatos','Contatos','👥'],['dashboard','Dashboard','📊']]},
    {g:'ANDERSON', it:[['qrcode','Meu QR Code','🔳'],['acessos','Acessos','🔑'],['links','Links','🔗'],['fotos','Fotos','🖼️']]},
    {g:'LINKEDIN', it:[['felicitacoes','Felicitações','💬'],['publicacoes','Publicações','📣'],['lembretes','Lembretes','⏰']]},
    {g:'PROSPECÇÃO', it:[['pitch','Pitch','🎯'],['saudacao','Saudação','👋'],['cadencia','Cadência','📅']]}
  ];
  var html='<div class="desktop-nav-logo">📇 SGC</div><div style="font-size:10px;color:var(--text-muted);padding:0 12px 8px;margin-top:-4px">Sistema de Gestão Comercial</div>';
  html+='<button id="nav-collapse-btn" class="desktop-nav-item" title="Recolher menu" style="display:flex;justify-content:space-between;align-items:center;width:100%"><span>Menu</span><span style="font-size:18px;line-height:1">≡</span></button>';
  html+='<div class="nav-scroll" style="flex:1;overflow-y:auto;min-height:0">';
  GRUPOS.forEach(function(gr,gi){
    html+='<button class="nav-grp-head" data-grp="'+gi+'"><span>'+gr.g+'</span><span class="nav-caret">▸</span></button>';
    html+='<div class="nav-grp-items" data-items="'+gi+'" style="display:none">';
    gr.it.forEach(function(it){ html+='<button class="desktop-nav-item nav-sub" data-page="'+it[0]+'"><span style="width:20px;text-align:center;display:inline-block">'+it[2]+'</span> '+it[1]+'</button>'; });
    html+='</div>';
  });
  html+='</div>';
  nav.innerHTML=html;
  function setOpen(gi){ gi=String(gi); nav.querySelectorAll('.nav-grp-items').forEach(function(d){ d.style.display=(d.getAttribute('data-items')===gi)?'block':'none'; }); nav.querySelectorAll('.nav-grp-head').forEach(function(h){ h.querySelector('.nav-caret').textContent=(h.getAttribute('data-grp')===gi)?'▾':'▸'; }); }
  nav.querySelectorAll('.nav-grp-head').forEach(function(h){ h.addEventListener('click', function(){ setOpen(h.getAttribute('data-grp')); }); });
  function _showPub(canal,b){
    window.PUB_CANAL=canal;
    var cur=document.querySelector('.page.active'); if(cur) cur.classList.remove('active');
    var pg=document.getElementById('page-publicacoes'); if(pg) pg.classList.add('active');
    nav.querySelectorAll('.desktop-nav-item').forEach(function(x){x.classList.remove('active');});
    if(b) b.classList.add('active');
    window.scrollTo(0,0); carregarPublicacoes();
  }
  function navItemClick(id,b){
    if(id==='cadastro'){ abrirNovoContato('foto'); return; }
    if(id==='publicacoes'){ _showPub('linkedin',b); return; }
    if(id==='publicacoes-ig'){ _showPub('instagram',b); return; }
    navegarPara(id);
    if(id==='felicitacoes') carregarFelicitacoes();
    if(id==='felicitacoes-ig') carregarFelicitacoesIG();
    if(id==='lembretes') carregarLembretes();
    if(id==='lembretes-ig') carregarLembretesIG();
    if(id==='usuarios') carregarUsuarios();
    if(id==='configuracoes') setTimeout(function(){ if(typeof cfgInit==='function') cfgInit(); },100);
  }
  nav.querySelectorAll('.desktop-nav-item[data-page]').forEach(function(b){ b.addEventListener('click', function(){ navItemClick(b.getAttribute('data-page'), b); }); });
  document.getElementById('nav-collapse-btn').addEventListener('click', function(){ document.body.classList.add('nav-off'); });
  setOpen(1);
  if(typeof aplicarPermissoes==='function') setTimeout(aplicarPermissoes,200);
})();

/* ===== Fix robusto: navegacao Publicacoes LinkedIn/Instagram ===== */
function _mostrarPaginaPub(btn){
  document.querySelectorAll('.page').forEach(function(p){ p.classList.remove('active'); });
  var pg=document.getElementById('page-publicacoes'); if(pg) pg.classList.add('active');
  document.querySelectorAll('.desktop-nav-item').forEach(function(x){ x.classList.remove('active'); });
  if(btn) btn.classList.add('active');
  window.scrollTo(0,0);
  if(typeof carregarPublicacoes==='function') carregarPublicacoes();
}
document.addEventListener('click', function(e){
  var ig=e.target.closest('.desktop-nav-item[data-page="publicacoes-ig"]');
  if(ig){ e.preventDefault(); e.stopPropagation(); window.PUB_CANAL='instagram'; _mostrarPaginaPub(ig); return; }
  var li=e.target.closest('.desktop-nav-item[data-page="publicacoes"]');
  if(li){ e.preventDefault(); e.stopPropagation(); window.PUB_CANAL='linkedin'; _mostrarPaginaPub(li); return; }
}, true);

/* ===== PROSPECCAO: Pitch e Saudacao (modulo de textos, 800 chars) ===== */
function _txtLimit(key){ return (key==='pitch' || key==='saudacao') ? 800 : 500; }
function renderTxtModulo(key, rootId){
  var root=document.getElementById(rootId); if(!root) return;
  var m=_txtModels[key]; var lim=_txtLimit(key);
  var COPY='<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612a.75.75 0 0 1-.75.75H9a.75.75 0 0 1-.75-.75c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184"/></svg>';
  var TRASH='<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166M18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"/></svg>';
  root.innerHTML=m.temas.map(function(tema,ti){
    var boxes=tema.textos.map(function(txt,xi){ var len=(''+(txt||'')).length;
      return '<div class="fel-box" style="border:1px solid var(--border);border-radius:10px;padding:10px;margin-bottom:10px"><textarea class="form-control txt-ta" data-key="'+key+'" data-root="'+rootId+'" data-ti="'+ti+'" data-xi="'+xi+'" maxlength="'+lim+'" rows="3" placeholder="Escreva o texto...">'+_felEsc(txt)+'</textarea><div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px"><span class="fel-count text-sm" style="color:'+(len>=lim?'var(--danger)':'var(--text-muted)')+'">'+len+'/'+lim+'</span><span style="display:flex;gap:12px"><button class="fel-ic" data-tact="copiar" data-key="'+key+'" data-root="'+rootId+'" data-ti="'+ti+'" data-xi="'+xi+'" title="Copiar">'+COPY+'</button><button class="fel-ic" data-tact="delbox" data-key="'+key+'" data-root="'+rootId+'" data-ti="'+ti+'" data-xi="'+xi+'" title="Limpar" style="color:var(--danger)">'+TRASH+'</button></span></div></div>';
    }).join('');
    return '<div class="card mb-4"><div class="card-body"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px"><h3 style="margin:0;font-size:16px">'+_felEsc(tema.titulo)+'</h3><button class="fel-ic" data-tact="addbox" data-key="'+key+'" data-root="'+rootId+'" data-ti="'+ti+'" title="Adicionar caixa" style="font-size:22px;line-height:1;color:var(--primary)">＋</button></div>'+boxes+'</div></div>';
  }).join('')
  +'<div style="display:flex;gap:6px;margin-bottom:24px"><input class="form-control txt-novotema" data-key="'+key+'" data-root="'+rootId+'" placeholder="novo título"><button class="btn btn-secondary" data-tact="addtema" data-key="'+key+'" data-root="'+rootId+'">＋ Adicionar</button></div>';
}
document.addEventListener('input', function(e){
  var ta=e.target.closest('.txt-ta'); if(!ta) return;
  var key=ta.getAttribute('data-key'); var lim=_txtLimit(key);
  var cnt=ta.closest('.fel-box').querySelector('.fel-count');
  if(cnt){ cnt.textContent=ta.value.length+'/'+lim; cnt.style.color=ta.value.length>=lim?'var(--danger)':'var(--text-muted)'; }
});
[['pitch','pitch-root'],['saudacao','saudacao-root']].forEach(function(x){
  var p=document.getElementById('page-'+x[0]); if(p){ var pc=p.querySelector('.page-content'); if(pc) pc.innerHTML='<p class="text-sm text-muted mb-3">Textos prontos pra copiar — salvam automaticamente.</p><div id="'+x[1]+'"></div>'; }
});
function carregarPitch(){ carregarTxtModulo('pitch','pitch-root'); }
function carregarSaudacao(){ carregarTxtModulo('saudacao','saudacao-root'); }
document.addEventListener('click', function(e){
  if(e.target.closest('.desktop-nav-item[data-page="pitch"]')){ setTimeout(carregarPitch,80); }
  if(e.target.closest('.desktop-nav-item[data-page="saudacao"]')){ setTimeout(carregarSaudacao,80); }
});

/* ===== Titulo + menu mobile (drawer) ===== */
document.title='SGC';
(function(){
  if(document.getElementById('mobile-menu-btn')) return;
  var btn=document.createElement('button'); btn.id='mobile-menu-btn';
  btn.innerHTML='<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5"/></svg>';
  btn.style.cssText='display:none;position:fixed;top:8px;left:8px;z-index:260;background:var(--primary);color:#fff;border:none;border-radius:8px;width:40px;height:40px;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.2)';
  document.body.appendChild(btn);
  var bd=document.createElement('div'); bd.id='mobile-backdrop'; bd.style.cssText='display:none;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.4);z-index:240';
  document.body.appendChild(bd);
  btn.addEventListener('click', function(){ document.body.classList.toggle('nav-open'); });
  bd.addEventListener('click', function(){ document.body.classList.remove('nav-open'); });
  document.addEventListener('click', function(e){ if(e.target.closest('.desktop-nav .desktop-nav-item')){ setTimeout(function(){ document.body.classList.remove('nav-open'); },80); } }, true);
  var s=document.createElement('style'); s.id='css-mobile-nav';
  s.textContent='@media(max-width:768px){'
    +'#mobile-menu-btn{display:flex!important}'
    +'.desktop-nav{display:flex!important;transform:translateX(-100%);transition:transform .25s;width:84%;max-width:300px;z-index:250;box-shadow:2px 0 18px rgba(0,0,0,.3)}'
    +'body.nav-open .desktop-nav{transform:translateX(0)}'
    +'body.nav-open #mobile-backdrop{display:block}'
    +'#nav-reopen-btn{display:none!important}'
    +'.app-header{padding-left:56px;padding-right:52px}'
    +'}';
  document.head.appendChild(s);
})();

/* ===== Home / Dashboard com resumo ===== */
async function carregarDashboard(){
  var pc=document.querySelector('#page-dashboard .page-content'); if(!pc) return;
  var h=document.querySelector('#page-dashboard .app-header h2'); if(h) h.textContent='🏠 Início';
  pc.innerHTML='<div class="empty-state"><div class="spinner" style="margin:0 auto"></div></div>';
  try{ var r=await _authFetch('GET','/resumo'); renderDashboard(r); }
  catch(e){ pc.innerHTML='<div class="empty-state"><p>'+(e.message||'Erro')+'</p></div>'; }
}
function _pubResumo(titulo, d){
  d=d||{}; function n(k){ return d[k]||0; }
  return '<div class="card mb-3"><div class="card-body"><div style="font-weight:600;margin-bottom:8px">'+titulo+'</div><div style="display:flex;gap:8px;flex-wrap:wrap">'
    +'<span style="background:var(--primary-light);color:var(--primary);padding:4px 10px;border-radius:10px;font-size:13px">📝 Planejado: <b>'+n('Planejado')+'</b></span>'
    +'<span style="background:#dcfce7;color:#15803d;padding:4px 10px;border-radius:10px;font-size:13px">✅ Publicado: <b>'+n('Publicado')+'</b></span>'
    +'<span style="background:#fef3c7;color:#b45309;padding:4px 10px;border-radius:10px;font-size:13px">💡 Insight: <b>'+n('Insight')+'</b></span>'
    +'</div></div></div>';
}
function renderDashboard(r){
  var pc=document.querySelector('#page-dashboard .page-content'); if(!pc) return;
  var contatos=(r.novos_contatos||[]).map(function(c){ return '<div style="padding:8px 0;border-bottom:1px solid var(--border)"><div style="font-weight:600">'+c.nome+'</div><div class="text-sm text-muted">'+(c.empresa||'Sem empresa')+'</div></div>'; }).join('') || '<p class="text-sm text-muted">Nenhum nos últimos 5 dias</p>';
  var empresas=(r.novas_empresas||[]).map(function(e){ return '<div style="padding:8px 0;border-bottom:1px solid var(--border);font-weight:500">'+e.nome+'</div>'; }).join('') || '<p class="text-sm text-muted">Nenhuma nos últimos 5 dias</p>';
  var pub=r.publicacoes||{};
  pc.innerHTML=
    '<div style="display:flex;gap:12px;margin-bottom:16px">'
    +'<div class="stat-card" style="flex:1"><div class="stat-number">'+(r.empresas_total||0)+'</div><div class="stat-label">Empresas</div><div class="text-sm" style="color:#15803d;margin-top:4px">+'+(r.empresas_5d||0)+' em 5 dias</div></div>'
    +'<div class="stat-card" style="flex:1"><div class="stat-number">'+(r.contatos_total||0)+'</div><div class="stat-label">Contatos</div><div class="text-sm" style="color:#15803d;margin-top:4px">+'+(r.contatos_5d||0)+' em 5 dias</div></div>'
    +'</div>'
    +'<div style="display:flex;gap:12px;margin-bottom:20px"><div class="action-card primary" style="flex:1;cursor:pointer" onclick="abrirNovoContato(\'foto\')"><span>📷 Novo Cartão</span></div><div class="action-card" style="flex:1;cursor:pointer" onclick="abrirNovoContato(\'manual\')"><span>✍️ Manual</span></div></div>'
    +'<p class="section-title">Publicações</p>'+_pubResumo('LinkedIn', pub.linkedin)+_pubResumo('Instagram', pub.instagram)
    +'<p class="section-title">Novos contatos (5 dias)</p><div class="card mb-4"><div class="card-body">'+contatos+'</div></div>'
    +'<p class="section-title">Novas empresas (5 dias)</p><div class="card mb-4"><div class="card-body">'+empresas+'</div></div>';
}
/* renomeia o header inicial e recarrega o dashboard agora se estiver nele */
(function(){ var h=document.querySelector('#page-dashboard .app-header h2'); if(h) h.textContent='🏠 Início'; if(document.querySelector('#page-dashboard.page.active')) carregarDashboard(); })();

/* ===== Mobile: tab-bar customizada + drawer corrigido ===== */
(function(){
  var tb=document.querySelector('.tab-bar');
  if(tb){
    tb.innerHTML=''
      +'<button class="tab-item" data-page="dashboard"><span style="font-size:20px">🏠</span>Início</button>'
      +'<button class="tab-item" data-page="felicitacoes"><span style="font-size:20px">💬</span>Felicit.</button>'
      +'<button class="tab-item tab-item-scan" data-scan="1"><span style="font-size:22px">📷</span>Scan</button>'
      +'<button class="tab-item" data-page="pitch"><span style="font-size:20px">🎯</span>Pitch</button>'
      +'<button class="tab-item" data-page="configuracoes"><span style="font-size:20px">⚙️</span>Config</button>';
    tb.addEventListener('click', function(e){
      var b=e.target.closest('.tab-item'); if(!b) return;
      if(b.hasAttribute('data-scan')){ abrirNovoContato('foto'); return; }
      var id=b.getAttribute('data-page'); if(!id) return;
      navegarPara(id);
      if(id==='dashboard') carregarDashboard();
      else if(id==='felicitacoes') carregarFelicitacoes();
      else if(id==='pitch') carregarPitch();
      else if(id==='configuracoes') setTimeout(function(){ if(typeof cfgInit==='function') cfgInit(); },100);
    });
  }
  var old=document.getElementById('css-mobile-nav'); if(old) old.remove();
  var s=document.createElement('style'); s.id='css-mobile-nav2';
  s.textContent='@media(max-width:768px){'
    +'#mobile-menu-btn{display:flex!important}'
    +'.app-main{margin-left:0!important}'
    +'.app-header{padding-left:56px}'
    +'#nav-reopen-btn{display:none!important}#nav-collapse-btn{display:none!important}'
    +'.desktop-nav{display:flex!important;flex-direction:column!important;position:fixed!important;top:0;left:0;bottom:0;width:80%;max-width:300px;background:#fff;transform:translateX(-100%);transition:transform .25s;z-index:250;box-shadow:2px 0 18px rgba(0,0,0,.3);padding:16px 10px;overflow-y:auto}'
    +'body.nav-open .desktop-nav{transform:translateX(0)}'
    +'body.nav-open #mobile-backdrop{display:block}'
    +'}';
  document.head.appendChild(s);
})();

/* ===== Publicacoes: visao enxuta no celular (Categoria/Tema/Planejador) ===== */
(function(){
  var s=document.createElement('style'); s.id='css-pub-mobile';
  s.textContent='@media(max-width:768px){'
    +'#page-publicacoes .tabela-contatos{table-layout:auto}'
    +'#page-publicacoes .tabela-contatos col:nth-child(1),#page-publicacoes .tabela-contatos col:nth-child(4),#page-publicacoes .tabela-contatos col:nth-child(5),#page-publicacoes .tabela-contatos col:nth-child(7){display:none}'
    +'#page-publicacoes .tabela-contatos th:nth-child(1),#page-publicacoes .tabela-contatos td:nth-child(1),'
    +'#page-publicacoes .tabela-contatos th:nth-child(4),#page-publicacoes .tabela-contatos td:nth-child(4),'
    +'#page-publicacoes .tabela-contatos th:nth-child(5),#page-publicacoes .tabela-contatos td:nth-child(5),'
    +'#page-publicacoes .tabela-contatos th:nth-child(7),#page-publicacoes .tabela-contatos td:nth-child(7){display:none!important}'
    +'#page-publicacoes [data-pm3="nova"]{display:none}'
    +'#page-publicacoes .tabela-contatos td,#page-publicacoes .tabela-contatos th{font-size:14px;white-space:normal}'
    +'}';
  document.head.appendChild(s);
})();

/* ===== Instagram 2: Publicacoes (bebidas) ===== */
var filtrosBeb={arquivado:false, pagina:1, q:''};
var FLAGS={'brasil':'🇧🇷','argentina':'🇦🇷','eua':'🇺🇸','usa':'🇺🇸','estados unidos':'🇺🇸','alemanha':'🇩🇪','belgica':'🇧🇪','bélgica':'🇧🇪','holanda':'🇳🇱','mexico':'🇲🇽','méxico':'🇲🇽','inglaterra':'🇬🇧','reino unido':'🇬🇧','irlanda':'🇮🇪','tcheca':'🇨🇿','república tcheca':'🇨🇿','republica tcheca':'🇨🇿','portugal':'🇵🇹','espanha':'🇪🇸','italia':'🇮🇹','itália':'🇮🇹','franca':'🇫🇷','frança':'🇫🇷','japao':'🇯🇵','japão':'🇯🇵','escocia':'🏴','escócia':'🏴','dinamarca':'🇩🇰','austria':'🇦🇹','áustria':'🇦🇹','uruguai':'🇺🇾','chile':'🇨🇱','china':'🇨🇳','polonia':'🇵🇱','polônia':'🇵🇱'};
function _flag(p){ if(!p) return ''; var f=FLAGS[(''+p).toLowerCase().trim()]; return f? f+' ' : ''; }
function _bebIcons(b){
  var ic=[];
  if(b.story) ic.push('<span title="Story">📱</span>');
  if(b.whatsapp) ic.push('<span title="WhatsApp" style="color:#25d366">🟢</span>');
  if(b.imagens && b.imagens.length) ic.push('<span title="Imagem">🖼️</span>');
  if(b.legenda) ic.push('<span title="Legenda">📝</span>');
  return ic.length? '<span style="display:inline-flex;gap:6px">'+ic.join('')+'</span>' : '<span style="color:var(--text-muted)">—</span>';
}
(function(){ var main=document.querySelector('.app-main'); if(main && !document.getElementById('page-bebidas')){ var p=document.createElement('div'); p.id='page-bebidas'; p.className='page'; p.innerHTML='<div class="app-header"><h2>🍺 Publicações · Instagram 2</h2></div><div class="page-content"><div id="bebidas-root"></div></div>'; main.appendChild(p); } var s=document.createElement('style'); s.textContent='#page-bebidas .page-content{max-width:none;margin:0;padding:12px 16px}'; document.head.appendChild(s); })();

async function carregarBebidas(){
  var root=document.getElementById('bebidas-root'); if(!root) return;
  root.innerHTML='<div class="empty-state"><div class="spinner" style="margin:0 auto"></div></div>';
  var qs=['arquivado='+(filtrosBeb.arquivado?'true':'false')];
  if(filtrosBeb.q) qs.push('q='+encodeURIComponent(filtrosBeb.q));
  try{ var lista=await _authFetch('GET','/cervejas?'+qs.join('&')); renderBebidas(lista); }
  catch(e){ root.innerHTML='<div class="empty-state"><p>'+(e.message||'Erro')+'</p></div>'; }
}
function renderBebidas(lista){
  window._bebs=lista;
  var root=document.getElementById('bebidas-root');
  var pp=50, total=lista.length, pag=filtrosBeb.pagina||1, totalPag=Math.max(1,Math.ceil(total/pp));
  if(pag>totalPag) pag=totalPag, filtrosBeb.pagina=pag;
  var slice=lista.slice((pag-1)*pp, pag*pp);
  var arq=filtrosBeb.arquivado;
  var toolbar='<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:12px">'
    +'<div style="display:flex;gap:6px"><button class="btn btn-primary btn-sm" data-bact="nova">＋ Nova</button><input class="tf" data-bf="q" value="'+(filtrosBeb.q||'')+'" placeholder="buscar nome/fabricante/classe" style="width:200px"></div>'
    +'<button class="btn btn-sm '+(arq?'btn-primary':'btn-secondary')+'" data-barq="1">📦 Arquivados</button></div>';
  var cg='<colgroup><col style="width:6%"><col style="width:26%"><col style="width:16%"><col style="width:20%"><col style="width:14%"><col style="width:10%"><col style="width:8%"></colgroup>';
  var rows=slice.map(function(b){
    return '<tr>'
      +'<td style="color:var(--text-muted);font-size:12px">#'+(b.numero||'')+'</td>'
      +'<td><a href="#" data-bact="view" data-id="'+b.id+'" style="color:var(--primary);font-weight:600;text-decoration:none">'+(b.cerveja||'(sem nome)')+'</a></td>'
      +'<td>'+(b.classe||'—')+'</td>'
      +'<td>'+(b.fabricante||'—')+'</td>'
      +'<td title="'+(b.pais||'')+'">'+_flag(b.pais)+(b.pais||'—')+'</td>'
      +'<td style="text-align:center">'+_bebIcons(b)+'</td>'
      +'<td style="text-align:center;white-space:nowrap"><button class="fel-ic" data-bact="editar" data-id="'+b.id+'" title="Editar">✏️</button><button class="fel-ic" data-bact="arquivar" data-id="'+b.id+'" title="'+(arq?'Desarquivar':'Arquivar')+'">📦</button><button class="fel-ic" data-bact="del" data-id="'+b.id+'" title="Excluir" style="color:var(--danger)">🗑️</button></td>'
      +'</tr>';
  }).join('');
  var head='<thead><tr><th>Nº</th><th>Nome</th><th>Classe</th><th>Fabricante</th><th>País</th><th style="text-align:center">Conteúdo</th><th></th></tr></thead>';
  var nav='<div style="display:flex;justify-content:space-between;align-items:center;margin-top:12px"><span class="text-sm text-muted">'+total+' bebidas · pág '+pag+'/'+totalPag+'</span><span><button class="btn btn-sm btn-secondary" data-bpag="'+(pag-1)+'"'+(pag<=1?' disabled':'')+'>←</button> <button class="btn btn-sm btn-secondary" data-bpag="'+(pag+1)+'"'+(pag>=totalPag?' disabled':'')+'>→</button></span></div>';
  root.innerHTML=toolbar+'<table class="tabela-contatos">'+cg+head+'<tbody>'+(rows||'<tr><td colspan="7" style="text-align:center;padding:20px;color:var(--text-muted)">Nenhuma bebida</td></tr>')+'</tbody></table>'+nav;
}
document.addEventListener('click', async function(e){
  var pg=e.target.closest('#bebidas-root [data-bpag]'); if(pg && !pg.hasAttribute('disabled')){ filtrosBeb.pagina=parseInt(pg.getAttribute('data-bpag')); renderBebidas(window._bebs||[]); return; }
  var aq=e.target.closest('#bebidas-root [data-barq]'); if(aq){ filtrosBeb.arquivado=!filtrosBeb.arquivado; filtrosBeb.pagina=1; carregarBebidas(); return; }
  var b=e.target.closest('#bebidas-root [data-bact]'); if(!b) return; e.preventDefault();
  var act=b.getAttribute('data-bact'), id=b.getAttribute('data-id');
  if(act==='nova'){ try{ var nv=await _authFetch('POST','/cervejas',{classe:'Cerveja'}); abrirBebidaModal(nv,'edit'); }catch(err){toast(err.message,'error');} return; }
  var item=(window._bebs||[]).filter(function(x){return x.id===id;})[0];
  if(act==='view'){ if(item) abrirBebidaModal(item,'view'); }
  else if(act==='editar'){ if(item) abrirBebidaModal(item,'edit'); }
  else if(act==='arquivar'){ try{ await _authFetch('PATCH','/cervejas/'+id,{arquivado: !filtrosBeb.arquivado}); carregarBebidas(); }catch(err){toast(err.message,'error');} }
  else if(act==='del'){ if(confirm('Excluir esta bebida?')){ try{ await _authFetch('DELETE','/cervejas/'+id); carregarBebidas(); }catch(err){toast(err.message,'error');} } }
});
document.addEventListener('change', function(e){ var f=e.target.closest('#bebidas-root [data-bf="q"]'); if(f){ filtrosBeb.q=f.value.trim(); filtrosBeb.pagina=1; carregarBebidas(); } });

/* ===== Instagram 2: janela da bebida ===== */
function abrirBebidaModal(beb, mode){
  var state={ id:(beb&&beb.id)||null, mode:mode||'view', data:Object.assign({imagens:[]}, beb||{}) };
  var ov=document.getElementById('beb-modal'); if(ov) ov.remove();
  ov=document.createElement('div'); ov.id='beb-modal';
  ov.style.cssText='position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.5);z-index:9999;display:flex;align-items:flex-start;justify-content:center;padding:20px;overflow:auto';
  document.body.appendChild(ov);
  function fechar(){ ov.remove(); carregarBebidas(); }
  function stars(n){ n=parseInt(n)||0; var s=''; for(var i=1;i<=5;i++) s+=(i<=n?'★':'☆'); return s; }
  function rowv(l,v){ return '<div style="margin-bottom:4px"><div class="text-sm text-muted">'+l+'</div><div>'+(v||'—')+'</div></div>'; }
  function V(id){ var el=document.getElementById(id); return el?el.value:''; }
  function inp(id,val,ph){ return '<input id="'+id+'" class="form-control" value="'+(''+(val||'')).replace(/"/g,'&quot;')+'" placeholder="'+(ph||'')+'">'; }
  function render(){
    var d=state.data;
    if(state.mode==='view'){
      var imgs=(d.imagens||[]).map(function(u){return '<div style="display:inline-block;margin:4px;text-align:center"><img src="'+u+'" style="width:90px;height:90px;object-fit:cover;border-radius:8px;border:1px solid var(--border)"><br><a href="'+u+'" download class="text-sm" style="color:var(--primary)">baixar</a></div>';}).join('')||'<span class="text-sm text-muted">sem imagens</span>';
      var tags=''; if(d.story) tags+='<span style="background:var(--primary-light);color:var(--primary);padding:2px 8px;border-radius:10px;font-size:12px;margin-right:6px">📱 Story</span>'; if(d.whatsapp) tags+='<span style="background:#dcfce7;color:#15803d;padding:2px 8px;border-radius:10px;font-size:12px">🟢 WhatsApp</span>';
      ov.innerHTML='<div style="background:#fff;border-radius:12px;max-width:600px;width:100%;padding:20px">'
        +'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px"><h3 style="margin:0">#'+(d.numero||'')+' · '+(d.cerveja||'')+'</h3><button class="fel-ic" data-x="close" style="font-size:20px">×</button></div>'
        +(tags?'<div style="margin-bottom:10px">'+tags+'</div>':'')
        +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:4px 16px">'+rowv('Classe',d.classe)+rowv('Estilo',d.estilo)+rowv('Embalagem',d.embalagem)+rowv('Fabricação',d.fabricacao)+rowv('Fabricante',d.fabricante)+rowv('País',_flag(d.pais)+(d.pais||''))+rowv('Cidade',d.cidade)+rowv('Estado',d.estado)+rowv('Onde Bebi',d.onde_bebi)+rowv('Nota',stars(d.nota)+' ('+(d.nota||0)+'/5)')+rowv('Status',d.status)+'</div>'
        +'<div class="text-sm text-muted" style="margin-top:8px">Legenda</div><div style="display:flex;gap:8px;align-items:flex-start"><div style="flex:1;white-space:pre-wrap;background:var(--surface-2);padding:8px;border-radius:8px">'+_felEsc(d.legenda||'—')+'</div><button class="fel-ic" data-copy="legenda" title="Copiar">📋</button></div>'
        +(d.observacao?'<div class="text-sm text-muted" style="margin-top:8px">Observação</div><div>'+_felEsc(d.observacao)+'</div>':'')
        +(d.comentario_interno?'<div class="text-sm text-muted" style="margin-top:8px">Comentário interno</div><div style="color:var(--text-muted)">'+_felEsc(d.comentario_interno)+'</div>':'')
        +'<div class="text-sm text-muted" style="margin-top:8px">Imagens</div><div style="margin-bottom:12px">'+imgs+'</div>'
        +'<div style="display:flex;justify-content:flex-end"><button class="btn btn-primary" data-x="editar">✏ Editar</button></div></div>';
    } else {
      var d2=state.data;
      var notaOpts=''; for(var i=0;i<=5;i++){ notaOpts+='<option value="'+i+'"'+((parseInt(d2.nota)||0)===i?' selected':'')+'>'+(i===0?'—':i+' ★')+'</option>'; }
      var imgs=(d2.imagens||[]).map(function(u){return '<div style="display:inline-block;margin:4px;text-align:center;position:relative"><img src="'+u+'" style="width:80px;height:80px;object-fit:cover;border-radius:8px;border:1px solid var(--border)"><button class="fel-ic" data-delimg="'+u+'" style="position:absolute;top:-8px;right:-8px;background:#fff;border-radius:50%;color:var(--danger)">×</button><br><a href="'+u+'" download class="text-sm" style="color:var(--primary)">baixar</a></div>';}).join('');
      ov.innerHTML='<div style="background:#fff;border-radius:12px;max-width:600px;width:100%;padding:20px">'
        +'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px"><h3 style="margin:0">Editar #'+(d2.numero||'')+'</h3><button class="fel-ic" data-x="close" style="font-size:20px">×</button></div>'
        +'<div style="display:flex;gap:16px;margin-bottom:10px"><label style="display:flex;align-items:center;gap:6px;cursor:pointer"><input type="checkbox" id="bm-story"'+(d2.story?' checked':'')+'> 📱 Story</label><label style="display:flex;align-items:center;gap:6px;cursor:pointer"><input type="checkbox" id="bm-whatsapp"'+(d2.whatsapp?' checked':'')+'> 🟢 WhatsApp</label></div>'
        +'<div class="form-group"><label class="form-label">Nome</label>'+inp('bm-cerveja',d2.cerveja)+'</div>'
        +'<div style="display:flex;gap:12px"><div class="form-group" style="flex:1"><label class="form-label">Classe</label>'+inp('bm-classe',d2.classe)+'</div><div class="form-group" style="flex:1"><label class="form-label">Estilo</label>'+inp('bm-estilo',d2.estilo)+'</div></div>'
        +'<div style="display:flex;gap:12px"><div class="form-group" style="flex:1"><label class="form-label">Embalagem</label>'+inp('bm-embalagem',d2.embalagem)+'</div><div class="form-group" style="flex:1"><label class="form-label">Fabricação</label>'+inp('bm-fabricacao',d2.fabricacao)+'</div></div>'
        +'<div class="form-group"><label class="form-label">Fabricante</label>'+inp('bm-fabricante',d2.fabricante)+'</div>'
        +'<div style="display:flex;gap:12px"><div class="form-group" style="flex:1"><label class="form-label">Cidade</label>'+inp('bm-cidade',d2.cidade)+'</div><div class="form-group" style="flex:1"><label class="form-label">Estado</label>'+inp('bm-estado',d2.estado)+'</div><div class="form-group" style="flex:1"><label class="form-label">País</label>'+inp('bm-pais',d2.pais)+'</div></div>'
        +'<div style="display:flex;gap:12px"><div class="form-group" style="flex:2"><label class="form-label">Onde Bebi</label>'+inp('bm-onde_bebi',d2.onde_bebi)+'</div><div class="form-group" style="flex:1"><label class="form-label">Nota</label><select id="bm-nota" class="form-control">'+notaOpts+'</select></div></div>'
        +'<div class="form-group"><label class="form-label">Status</label>'+inp('bm-status',d2.status)+'</div>'
        +'<div class="form-group"><label class="form-label">Legenda (caption)</label><textarea id="bm-legenda" class="form-control" rows="4">'+_felEsc(d2.legenda||'')+'</textarea></div>'
        +'<div class="form-group"><label class="form-label">Observação</label><textarea id="bm-observacao" class="form-control" rows="2">'+_felEsc(d2.observacao||'')+'</textarea></div>'
        +'<div class="form-group"><label class="form-label">Comentário interno</label><textarea id="bm-comentario_interno" class="form-control" rows="2">'+_felEsc(d2.comentario_interno||'')+'</textarea></div>'
        +'<div class="form-group"><label class="form-label">Imagens</label><div>'+(imgs||'<span class="text-sm text-muted">nenhuma</span>')+'</div><input type="file" id="bm-img" accept="image/*" multiple style="margin-top:8px"></div>'
        +'<div style="display:flex;gap:8px;justify-content:flex-end"><button class="btn btn-secondary" data-x="close">Fechar</button><button class="btn btn-primary" data-x="salvar">Salvar</button></div></div>';
    }
  }
  ov.addEventListener('click', async function(e){
    if(e.target===ov){ fechar(); return; }
    var cp=e.target.closest('[data-copy]'); if(cp){ copiarTexto(state.data[cp.getAttribute('data-copy')]||''); toast('Copiado','success'); return; }
    var di=e.target.closest('[data-delimg]'); if(di){ try{ state.data=await _authFetch('DELETE','/cervejas/'+state.id+'/imagem',{url:di.getAttribute('data-delimg')}); render(); }catch(err){toast(err.message,'error');} return; }
    var x=e.target.closest('[data-x]'); if(!x) return;
    var act=x.getAttribute('data-x');
    if(act==='close') fechar();
    else if(act==='editar'){ state.mode='edit'; render(); }
    else if(act==='salvar'){
      var body={cerveja:V('bm-cerveja'),classe:V('bm-classe'),estilo:V('bm-estilo'),embalagem:V('bm-embalagem'),fabricacao:V('bm-fabricacao'),fabricante:V('bm-fabricante'),cidade:V('bm-cidade'),estado:V('bm-estado'),pais:V('bm-pais'),onde_bebi:V('bm-onde_bebi'),nota:(parseInt(V('bm-nota'))||null),status:V('bm-status'),legenda:V('bm-legenda'),observacao:V('bm-observacao'),comentario_interno:V('bm-comentario_interno'),story:document.getElementById('bm-story').checked,whatsapp:document.getElementById('bm-whatsapp').checked};
      try{ state.data=await _authFetch('PATCH','/cervejas/'+state.id,body); toast('Salvo','success'); state.mode='view'; render(); }catch(err){ toast(err.message,'error'); }
    }
  });
  ov.addEventListener('change', async function(e){
    var f=e.target.closest('#bm-img'); if(!f||!f.files.length) return;
    for(var i=0;i<f.files.length;i++){ var fd=new FormData(); fd.append('foto',f.files[i]); try{ var r=await fetch('/api/cervejas/'+state.id+'/imagem',{method:'POST',headers:{'Authorization':'Bearer '+getToken()},body:fd}); var data=await r.json(); if(r.ok) state.data=data; }catch(err){} }
    render();
  });
  render();
}

/* ===== Instagram 2: paginas de texto + menu final ===== */
(function(){ var main=document.querySelector('.app-main'); if(!main) return;
  [['mensagem-ig2','💌 Mensagem · Instagram 2','mensagem-ig2-root'],['lembretes-ig2','⏰ Lembretes · Instagram 2','lembretes-ig2-root']].forEach(function(x){
    if(!document.getElementById('page-'+x[0])){ var p=document.createElement('div'); p.id='page-'+x[0]; p.className='page'; p.innerHTML='<div class="app-header"><h2>'+x[1]+'</h2></div><div class="page-content"><p class="text-sm text-muted mb-3">Textos prontos pra copiar — salvam automaticamente.</p><div id="'+x[2]+'"></div></div>'; main.appendChild(p); }
  });
})();
function carregarMensagemIG2(){ carregarTxtModulo('mensagem_instagram2','mensagem-ig2-root'); }
function carregarLembretesIG2v(){ carregarTxtModulo('lembretes_instagram2','lembretes-ig2-root'); }

(function(){
  var nav=document.querySelector('.desktop-nav'); if(!nav) return;
  var GRUPOS=[
    {g:'ADMIN', it:[['configuracoes','Configurações','⚙️'],['usuarios','Usuários','👤']]},
    {g:'CardBase', it:[['cadastro','Cadastro','➕'],['empresas','Empresas','🏢'],['contatos','Contatos','👥'],['dashboard','Dashboard','📊']]},
    {g:'ANDERSON', it:[['qrcode','Meu QR Code','🔳'],['acessos','Acessos','🔑'],['links','Links','🔗'],['fotos','Fotos','🖼️']]},
    {g:'LINKEDIN', it:[['felicitacoes','Felicitações','💬'],['publicacoes','Publicações','📣'],['lembretes','Lembretes','⏰']]},
    {g:'Instagram 1', it:[['felicitacoes-ig','Felicitações','💬'],['publicacoes-ig','Publicações','📣'],['lembretes-ig','Lembretes','⏰']]},
    {g:'Instagram 2', it:[['mensagem-ig2','Mensagem','💌'],['bebidas','Publicações','📣'],['lembretes-ig2','Lembretes','⏰']]},
    {g:'PROSPECÇÃO', it:[['pitch','Pitch','🎯'],['saudacao','Saudação','👋'],['cadencia','Cadência','📅']]}
  ];
  var html='<div class="desktop-nav-logo">📇 SGC</div><div style="font-size:10px;color:var(--text-muted);padding:0 12px 8px;margin-top:-4px">Sistema de Gestão Comercial</div>';
  html+='<button id="nav-collapse-btn" class="desktop-nav-item" title="Recolher menu" style="display:flex;justify-content:space-between;align-items:center;width:100%"><span>Menu</span><span style="font-size:18px;line-height:1">≡</span></button>';
  html+='<div class="nav-scroll" style="flex:1;overflow-y:auto;min-height:0">';
  GRUPOS.forEach(function(gr,gi){
    html+='<button class="nav-grp-head" data-grp="'+gi+'"><span>'+gr.g+'</span><span class="nav-caret">▸</span></button>';
    html+='<div class="nav-grp-items" data-items="'+gi+'" style="display:none">';
    gr.it.forEach(function(it){ html+='<button class="desktop-nav-item nav-sub" data-page="'+it[0]+'"><span style="width:20px;text-align:center;display:inline-block">'+it[2]+'</span> '+it[1]+'</button>'; });
    html+='</div>';
  });
  html+='</div>';
  nav.innerHTML=html;
  function setOpen(gi){ gi=String(gi); nav.querySelectorAll('.nav-grp-items').forEach(function(d){ d.style.display=(d.getAttribute('data-items')===gi)?'block':'none'; }); nav.querySelectorAll('.nav-grp-head').forEach(function(h){ h.querySelector('.nav-caret').textContent=(h.getAttribute('data-grp')===gi)?'▾':'▸'; }); }
  nav.querySelectorAll('.nav-grp-head').forEach(function(h){ h.addEventListener('click', function(){ setOpen(h.getAttribute('data-grp')); }); });
  function navItemClick(id,b){
    if(id==='cadastro'){ abrirNovoContato('foto'); return; }
    if(id==='bebidas'){ navegarPara('bebidas'); carregarBebidas(); return; }
    navegarPara(id);
    if(id==='felicitacoes') carregarFelicitacoes();
    else if(id==='felicitacoes-ig') carregarFelicitacoesIG();
    else if(id==='mensagem-ig2') carregarMensagemIG2();
    else if(id==='lembretes') carregarLembretes();
    else if(id==='lembretes-ig') carregarLembretesIG();
    else if(id==='lembretes-ig2') carregarLembretesIG2v();
    else if(id==='usuarios') carregarUsuarios();
    else if(id==='configuracoes') setTimeout(function(){ if(typeof cfgInit==='function') cfgInit(); },100);
  }
  nav.querySelectorAll('.desktop-nav-item[data-page]').forEach(function(b){ b.addEventListener('click', function(){ navItemClick(b.getAttribute('data-page'), b); }); });
  document.getElementById('nav-collapse-btn').addEventListener('click', function(){ document.body.classList.add('nav-off'); });
  setOpen(1);
  if(typeof aplicarPermissoes==='function') setTimeout(aplicarPermissoes,200);
})();

/* ===== Permissoes por grupo ===== */
var MENU_GRUPOS=[
  {g:'ADMIN', it:[['configuracoes','Configurações'],['usuarios','Usuários']]},
  {g:'CARDBASE', it:[['cadastro','Cadastro'],['empresas','Empresas'],['contatos','Contatos'],['dashboard','Dashboard']]},
  {g:'ANDERSON', it:[['qrcode','Meu QR Code'],['acessos','Acessos'],['links','Links'],['fotos','Fotos']]},
  {g:'LINKEDIN', it:[['felicitacoes','Felicitações'],['publicacoes','Publicações'],['lembretes','Lembretes']]},
  {g:'INSTAGRAM 1', it:[['felicitacoes-ig','Felicitações'],['publicacoes-ig','Publicações'],['lembretes-ig','Lembretes']]},
  {g:'INSTAGRAM 2', it:[['mensagem-ig2','Mensagem'],['bebidas','Publicações'],['lembretes-ig2','Lembretes']]},
  {g:'PROSPECÇÃO', it:[['pitch','Pitch'],['saudacao','Saudação'],['cadencia','Cadência']]}
];
function _permMatrix(perms){
  perms=perms||{};
  var html='<table style="width:100%;font-size:13px;border-collapse:collapse"><thead><tr><th style="text-align:left;padding:4px 8px">Módulo</th><th style="width:60px">Ver</th><th style="width:60px">Add</th><th style="width:60px">Rem</th></tr></thead><tbody>';
  MENU_GRUPOS.forEach(function(gr,gi){
    var allOn=gr.it.every(function(it){ var p=perms[it[0]]||{}; return p.ver&&p.add&&p.rem; });
    html+='<tr style="background:var(--surface-2)"><td colspan="4" style="padding:6px 8px"><label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-weight:700"><input type="checkbox" data-grp-all="'+gi+'"'+(allOn?' checked':'')+'> '+gr.g+' <span style="font-weight:400;color:var(--text-muted);font-size:11px">(marca/desmarca tudo)</span></label></td></tr>';
    gr.it.forEach(function(it){ var p=perms[it[0]]||{};
      html+='<tr data-grp="'+gi+'"><td style="text-align:left;padding:4px 8px 4px 28px">'+it[1]+'</td>'
        +'<td style="text-align:center"><input type="checkbox" data-pi="'+it[0]+'" data-po="ver"'+(p.ver?' checked':'')+'></td>'
        +'<td style="text-align:center"><input type="checkbox" data-pi="'+it[0]+'" data-po="add"'+(p.add?' checked':'')+'></td>'
        +'<td style="text-align:center"><input type="checkbox" data-pi="'+it[0]+'" data-po="rem"'+(p.rem?' checked':'')+'></td></tr>';
    });
  });
  html+='</tbody></table>';
  return html;
}
document.addEventListener('change', function(e){
  var g=e.target.closest('#u-perm [data-grp-all]'); if(!g) return;
  var gi=g.getAttribute('data-grp-all'), on=g.checked;
  document.querySelectorAll('#u-perm tr[data-grp="'+gi+'"] input[data-pi]').forEach(function(c){ c.checked=on; });
});

/* ===== Modulo de textos: handler unico (corrige duplicacao/exclusao) ===== */
function renderTxtModulo(key, rootId){
  var root=document.getElementById(rootId); if(!root) return;
  var m=_txtModels[key]; var lim=_txtLimit(key);
  var COPY='<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612a.75.75 0 0 1-.75.75H9a.75.75 0 0 1-.75-.75c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184"/></svg>';
  var TRASH='<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166M18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"/></svg>';
  root.innerHTML=m.temas.map(function(tema,ti){
    var boxes=tema.textos.map(function(txt,xi){ var len=(''+(txt||'')).length;
      return '<div class="fel-box" style="border:1px solid var(--border);border-radius:10px;padding:10px;margin-bottom:10px"><textarea class="form-control txt-ta2" data-key="'+key+'" data-root="'+rootId+'" data-ti="'+ti+'" data-xi="'+xi+'" maxlength="'+lim+'" rows="3" placeholder="Escreva o texto...">'+_felEsc(txt)+'</textarea><div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px"><span class="fel-count text-sm" style="color:'+(len>=lim?'var(--danger)':'var(--text-muted)')+'">'+len+'/'+lim+'</span><span style="display:flex;gap:12px"><button class="fel-ic" data-tact2="copiar" data-key="'+key+'" data-root="'+rootId+'" data-ti="'+ti+'" data-xi="'+xi+'" title="Copiar">'+COPY+'</button><button class="fel-ic" data-tact2="delbox" data-key="'+key+'" data-root="'+rootId+'" data-ti="'+ti+'" data-xi="'+xi+'" title="Apagar caixa" style="color:var(--danger)">'+TRASH+'</button></span></div></div>';
    }).join('');
    return '<div class="card mb-4"><div class="card-body"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px"><h3 style="margin:0;font-size:16px">'+_felEsc(tema.titulo)+'</h3><span style="display:flex;gap:10px;align-items:center"><button class="fel-ic" data-tact2="deltema" data-key="'+key+'" data-root="'+rootId+'" data-ti="'+ti+'" title="Excluir tema" style="color:var(--danger);font-size:18px">🗑️</button><button class="fel-ic" data-tact2="addbox" data-key="'+key+'" data-root="'+rootId+'" data-ti="'+ti+'" title="Adicionar caixa" style="font-size:22px;line-height:1;color:var(--primary)">＋</button></span></div>'+boxes+'</div></div>';
  }).join('')
  +'<div style="display:flex;gap:6px;margin-bottom:24px"><input class="form-control txt-novotema2" data-key="'+key+'" data-root="'+rootId+'" placeholder="novo título"><button class="btn btn-secondary" data-tact2="addtema" data-key="'+key+'" data-root="'+rootId+'">＋ Adicionar</button></div>';
}
if(!window._txt2bound){
  window._txt2bound=true;
  document.addEventListener('input', function(e){
    var ta=e.target.closest('.txt-ta2'); if(!ta) return;
    var key=ta.getAttribute('data-key'), ti=+ta.getAttribute('data-ti'), xi=+ta.getAttribute('data-xi'), lim=_txtLimit(key);
    _txtModels[key].temas[ti].textos[xi]=ta.value;
    var cnt=ta.closest('.fel-box').querySelector('.fel-count'); if(cnt){ cnt.textContent=ta.value.length+'/'+lim; cnt.style.color=ta.value.length>=lim?'var(--danger)':'var(--text-muted)'; }
    _txtSave(key);
  });
  document.addEventListener('click', function(e){
    var b=e.target.closest('[data-tact2]'); if(!b) return;
    var act=b.getAttribute('data-tact2'), key=b.getAttribute('data-key'), rootId=b.getAttribute('data-root'), m=_txtModels[key];
    if(act==='copiar'){ copiarTexto(b.closest('.fel-box').querySelector('.txt-ta2').value); toast('Texto copiado','success'); return; }
    if(act==='addtema'){ var inp=b.parentElement.querySelector('.txt-novotema2'); var nome=(inp.value||'').trim(); if(!nome)return; m.temas.push({titulo:nome,textos:['']}); _txtSave(key); renderTxtModulo(key,rootId); return; }
    var ti=+b.getAttribute('data-ti');
    if(act==='deltema'){ if(!confirm('Excluir este tema inteiro?'))return; m.temas.splice(ti,1); _txtSave(key); renderTxtModulo(key,rootId); return; }
    if(act==='addbox'){ m.temas[ti].textos.push(''); _txtSave(key); renderTxtModulo(key,rootId); return; }
    if(act==='delbox'){ var xi=+b.getAttribute('data-xi'); m.temas[ti].textos.splice(xi,1); if(!m.temas[ti].textos.length) m.temas[ti].textos.push(''); _txtSave(key); renderTxtModulo(key,rootId); return; }
  });
}

/* ===== Cadastro (pagina propria) + Dashboard so visualizacao ===== */
(function(){
  var main=document.querySelector('.app-main');
  if(main && !document.getElementById('page-cadastro')){
    var p=document.createElement('div'); p.id='page-cadastro'; p.className='page';
    p.innerHTML='<div class="app-header"><h2>➕ Cadastro</h2></div><div class="page-content"><p class="section-title">Novo contato</p><div style="display:flex;gap:12px;flex-wrap:wrap"><div class="action-card primary" data-novo="foto" style="flex:1;min-width:200px;cursor:pointer"><span>📷 Novo Cartão (foto)</span></div><div class="action-card" data-novo="manual" style="flex:1;min-width:200px;cursor:pointer"><span>✍️ Manual</span></div></div></div>';
    main.appendChild(p);
  }
})();
function _mostrarCadastro(b){
  document.querySelectorAll('.page').forEach(function(p){ p.classList.remove('active'); });
  var pg=document.getElementById('page-cadastro'); if(pg) pg.classList.add('active');
  document.querySelectorAll('.desktop-nav-item').forEach(function(x){ x.classList.remove('active'); });
  if(b) b.classList.add('active'); window.scrollTo(0,0);
}
document.addEventListener('click', function(e){
  var nav=e.target.closest('.desktop-nav-item[data-page="cadastro"]');
  if(nav){ e.preventDefault(); e.stopPropagation(); _mostrarCadastro(nav); return; }
  var c=e.target.closest('#page-cadastro [data-novo]');
  if(c){ abrirNovoContato(c.getAttribute('data-novo')); }
}, true);

/* Dashboard sem botoes de criar (so visualizar) */
function renderDashboard(r){
  var pc=document.querySelector('#page-dashboard .page-content'); if(!pc) return;
  var contatos=(r.novos_contatos||[]).map(function(c){ return '<div style="padding:8px 0;border-bottom:1px solid var(--border)"><div style="font-weight:600">'+c.nome+'</div><div class="text-sm text-muted">'+(c.empresa||'Sem empresa')+'</div></div>'; }).join('') || '<p class="text-sm text-muted">Nenhum nos últimos 5 dias</p>';
  var empresas=(r.novas_empresas||[]).map(function(e){ return '<div style="padding:8px 0;border-bottom:1px solid var(--border);font-weight:500">'+e.nome+'</div>'; }).join('') || '<p class="text-sm text-muted">Nenhuma nos últimos 5 dias</p>';
  var pub=r.publicacoes||{};
  pc.innerHTML=
    '<div style="display:flex;gap:12px;margin-bottom:16px">'
    +'<div class="stat-card" style="flex:1"><div class="stat-number">'+(r.empresas_total||0)+'</div><div class="stat-label">Empresas</div><div class="text-sm" style="color:#15803d;margin-top:4px">+'+(r.empresas_5d||0)+' em 5 dias</div></div>'
    +'<div class="stat-card" style="flex:1"><div class="stat-number">'+(r.contatos_total||0)+'</div><div class="stat-label">Contatos</div><div class="text-sm" style="color:#15803d;margin-top:4px">+'+(r.contatos_5d||0)+' em 5 dias</div></div>'
    +'</div>'
    +'<p class="section-title">Publicações</p>'+_pubResumo('LinkedIn', pub.linkedin)+_pubResumo('Instagram', pub.instagram)
    +'<p class="section-title">Novos contatos (5 dias)</p><div class="card mb-4"><div class="card-body">'+contatos+'</div></div>'
    +'<p class="section-title">Novas empresas (5 dias)</p><div class="card mb-4"><div class="card-body">'+empresas+'</div></div>';
}

/* ===== ANDERSON > Links ===== */
var LINKS_CAT=['Cat A','Cat B','Cat C','Cat D','Cat E'];
var filtrosLink={categoria:''};
function _normUrl(u){ u=(''+(u||'')).trim(); if(!u) return ''; if(!/^https?:\/\//i.test(u)) u='https://'+u; return u; }
(function(){ var p=document.getElementById('page-links'); if(p){ var pc=p.querySelector('.page-content'); if(pc) pc.innerHTML='<div id="links-root"></div>'; } var s=document.createElement('style'); s.textContent='#page-links .page-content{max-width:none;margin:0;padding:12px 16px}'; document.head.appendChild(s); })();

async function carregarLinks(){ window._linkNovo=false;
  var root=document.getElementById('links-root'); if(!root) return;
  if(!window._linkCat){ LINKS_CAT=await _catNomes('links_categorias',LINKS_CAT); window._linkCat=true; }
  root.innerHTML='<div class="empty-state"><div class="spinner" style="margin:0 auto"></div></div>';
  var qs=[]; if(filtrosLink.categoria) qs.push('categoria='+encodeURIComponent(filtrosLink.categoria));
  try{ var lista=await _authFetch('GET','/links'+(qs.length?'?'+qs.join('&'):'')); renderLinks(lista); }
  catch(e){ root.innerHTML='<div class="empty-state"><p>'+(e.message||'Erro')+'</p></div>'; }
}
function renderLinks(lista){
  window._links=lista;
  var root=document.getElementById('links-root');
  var cats=[{v:'',t:'Todos'}].concat(LINKS_CAT.map(function(c){return {v:c,t:c};}));
  var botoes=cats.map(function(b){var on=(filtrosLink.categoria||'')===b.v;return '<button class="btn btn-sm '+(on?'btn-primary':'btn-secondary')+'" data-lf="'+b.v+'">'+b.t+'</button>';}).join(' ');
  var toolbar='<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:12px"><button class="btn btn-primary btn-sm" data-lact="novo">＋ Novo link</button><div style="display:flex;gap:6px;flex-wrap:wrap">'+botoes+'</div></div>';
  var cg='<colgroup><col style="width:22%"><col style="width:60%"><col style="width:18%"></colgroup>';
  var rows=lista.map(function(l){
    return '<tr><td><select class="tf" data-lk="categoria" data-id="'+l.id+'">'+_optSel(LINKS_CAT,l.categoria||'')+'</select></td>'
      +'<td><input class="tf" data-lk="website" data-id="'+l.id+'" value="'+(''+(l.website||'')).replace(/"/g,'&quot;')+'" placeholder="https://..."></td>'
      +'<td style="text-align:center;white-space:nowrap"><button class="fel-ic" data-lact="copiar" data-id="'+l.id+'" title="Copiar">📋</button><button class="fel-ic" data-lact="abrir" data-id="'+l.id+'" title="Abrir em nova aba" style="color:var(--primary)">🔗</button><button class="fel-ic" data-lact="del" data-id="'+l.id+'" title="Excluir" style="color:var(--danger)">🗑️</button></td></tr>';
  }).join('');
  var head='<thead><tr><th>Categoria</th><th>Website</th><th style="text-align:center">Ações</th></tr></thead>';
  root.innerHTML=toolbar+'<table class="tabela-contatos">'+cg+head+'<tbody>'+(rows||'<tr><td colspan="3" style="text-align:center;padding:20px;color:var(--text-muted)">Nenhum link</td></tr>')+'</tbody></table>';
}
document.addEventListener('change', function(e){
  var el=e.target.closest('#links-root [data-lk]'); if(!el) return;
  var d={}; d[el.getAttribute('data-lk')]=el.value; _authFetch('PATCH','/links/'+el.getAttribute('data-id'),d).catch(function(err){toast(err.message,'error');});
});
document.addEventListener('click', async function(e){
  var f=e.target.closest('#links-root [data-lf]'); if(f){ filtrosLink.categoria=f.getAttribute('data-lf'); carregarLinks(); return; }
  var b=e.target.closest('#links-root [data-lact]'); if(!b) return; e.preventDefault();
  var act=b.getAttribute('data-lact'), id=b.getAttribute('data-id');
  if(act==='novo'){ try{ await _authFetch('POST','/links',{categoria:(LINKS_CAT[0]||''),website:''}); carregarLinks(); }catch(err){toast(err.message,'error');} return; }
  var l=(window._links||[]).filter(function(x){return x.id===id;})[0];
  if(act==='copiar'){ if(l){ copiarTexto(l.website||''); toast('Link copiado','success'); } }
  else if(act==='abrir'){ if(l && l.website){ window.open(_normUrl(l.website),'_blank','noopener'); } }
  else if(act==='del'){ if(confirm('Excluir este link?')){ try{ await _authFetch('DELETE','/links/'+id); carregarLinks(); }catch(err){toast(err.message,'error');} } }
});
document.addEventListener('click', function(e){ if(e.target.closest('.desktop-nav-item[data-page="links"]')){ setTimeout(carregarLinks,80); } });

/* Categorias de Links editaveis em Configuracoes (bloco LINKS) */
CATALOGOS=[
  {chave:'situacao_catalogo', label:'Situação', bloco:'EMPRESAS', def:['Lead','Ativo','Ex Cliente','Lead Perdido']},
  {chave:'segmento_catalogo', label:'Segmento', bloco:'EMPRESAS', def:['Logística','Manufatura','Serviços']},
  {chave:'status_empresa_catalogo', label:'Status', bloco:'EMPRESAS', def:[]},
  {chave:'tipos_catalogo', label:'Listas', bloco:'CONTATOS', def:['cliente','finder','fabricante']},
  {chave:'regionais_catalogo', label:'Regionais', bloco:'CONTATOS', def:['Sul','Sudeste','Norte','Nordeste','Centro-Oeste']},
  {chave:'pub_categorias', label:'Categorias (Publicações)', bloco:'LINKEDIN', def:['Experiência','Produto']},
  {chave:'pub_planejador', label:'Planejador (Publicações)', bloco:'LINKEDIN', def:['Publicado','Planejado']},
  {chave:'links_categorias', label:'Categorias (Links)', bloco:'LINKS', def:['Cat A','Cat B','Cat C','Cat D','Cat E']}
];
function _catAplica(chave){
  var nomes=(_catCache[chave]||[]).filter(function(x){return x.ativo!==false;}).map(function(x){return x.nome;});
  if(chave==='tipos_catalogo') TIPOS_CATALOGO=_catCache[chave];
  else if(chave==='regionais_catalogo') REGIONAIS_CATALOGO=_catCache[chave];
  else if(chave==='situacao_catalogo') SITUACAO_CAT=nomes;
  else if(chave==='segmento_catalogo') SEGMENTO_CAT=nomes;
  else if(chave==='status_empresa_catalogo') STATUS_EMP_CAT=nomes;
  else if(chave==='pub_categorias') PUB_CATEGORIAS=nomes;
  else if(chave==='pub_planejador') PUB_PLANEJADOR=nomes;
  else if(chave==='links_categorias'){ LINKS_CAT=nomes; window._linkCat=true; }
}
function cfgRenderCatalogos(){
  var root=document.getElementById('cfg-catalogos-root'); if(!root) return;
  var blocos={}; CATALOGOS.forEach(function(c){ (blocos[c.bloco]=blocos[c.bloco]||[]).push(c); });
  var html='';
  ['EMPRESAS','CONTATOS','LINKEDIN','LINKS'].forEach(function(bl){
    html+='<p class="section-title">'+bl+'</p>'; var arr=blocos[bl]; if(!arr) return;
    arr.forEach(function(c){
      var lista=_catCache[c.chave]||[];
      var chips=lista.length? lista.map(function(it,idx){ var at=it.ativo!==false;
        return '<span style="display:inline-flex;align-items:center;gap:5px;margin:3px;padding:4px 10px;border-radius:14px;font-size:13px;background:'+(at?'var(--primary-light)':'#eee')+';color:'+(at?'var(--primary)':'#999')+'"><span style="cursor:pointer" data-cat="'+c.chave+'" data-idx="'+idx+'" data-op="toggle">'+(at?'●':'○')+'</span>'+it.nome+'<span style="cursor:pointer;font-weight:700" data-cat="'+c.chave+'" data-idx="'+idx+'" data-op="del">×</span></span>';
      }).join('') : '<span class="text-sm text-muted">nenhum item</span>';
      html+='<div class="card mb-4"><div class="card-body"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><div style="font-weight:600">'+c.label+'</div><button class="fel-ic" data-cat="'+c.chave+'" data-op="add" title="Adicionar" style="font-size:22px;line-height:1;color:var(--primary)">＋</button></div><div style="margin-bottom:10px">'+chips+'</div><input class="form-control cat-inp" data-cat="'+c.chave+'" placeholder="digite e clique no +"></div></div>';
    });
  });
  root.innerHTML=html;
}

/* ===== ANDERSON > Fotos (galerias) ===== */
(function(){ var p=document.getElementById('page-fotos'); if(p){ var pc=p.querySelector('.page-content'); if(pc) pc.innerHTML='<div id="fotos-root"></div>'; } var s=document.createElement('style'); s.textContent='#page-fotos .page-content{max-width:none;margin:0;padding:12px 16px}'; document.head.appendChild(s); })();

async function carregarFotos(){
  var root=document.getElementById('fotos-root'); if(!root) return;
  root.innerHTML='<div class="empty-state"><div class="spinner" style="margin:0 auto"></div></div>';
  try{ var lista=await _authFetch('GET','/galerias'); renderFotos(lista); }
  catch(e){ root.innerHTML='<div class="empty-state"><p>'+(e.message||'Erro')+'</p></div>'; }
}
function renderFotos(lista){
  window._galerias=lista;
  var root=document.getElementById('fotos-root');
  var novo='<div style="display:flex;gap:6px;margin-bottom:18px;max-width:440px"><input id="nova-galeria" class="form-control" placeholder="Nome da galeria (ex: Perfil, Logo)"><button class="btn btn-primary" data-gact="novag">＋ Galeria</button></div>';
  var cards=lista.map(function(g){
    var fotos=(g.imagens||[]).map(function(u){
      return '<div style="position:relative;display:inline-block;margin:6px"><img src="'+u+'" data-gact="ver" data-url="'+u+'" style="width:120px;height:120px;object-fit:cover;border-radius:10px;border:1px solid var(--border);cursor:pointer"><button class="fel-ic" data-gact="delfoto" data-id="'+g.id+'" data-url="'+u+'" title="Remover" style="position:absolute;top:-6px;right:-6px;background:#fff;border-radius:50%;color:var(--danger)">×</button><a href="'+u+'" download title="Baixar" style="position:absolute;bottom:4px;right:4px;background:rgba(0,0,0,.55);color:#fff;border-radius:6px;padding:2px 7px;font-size:13px;text-decoration:none">⬇</a></div>';
    }).join('') || '<span class="text-sm text-muted">Sem fotos ainda</span>';
    return '<div class="card mb-4"><div class="card-body">'
      +'<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:10px"><input class="form-control" data-gact="rename" data-id="'+g.id+'" value="'+(''+(g.titulo||'')).replace(/"/g,'&quot;')+'" placeholder="Título da galeria" style="font-weight:600;max-width:320px"><div style="display:flex;gap:8px;align-items:center"><label class="btn btn-sm btn-secondary" style="cursor:pointer;margin:0">＋ Fotos<input type="file" accept="image/*" multiple data-gact="upload" data-id="'+g.id+'" style="display:none"></label><button class="fel-ic" data-gact="delgaleria" data-id="'+g.id+'" title="Excluir galeria" style="color:var(--danger)">🗑️</button></div></div>'
      +'<div style="display:flex;flex-wrap:wrap">'+fotos+'</div></div></div>';
  }).join('') || '<p class="text-sm text-muted">Nenhuma galeria ainda — crie a primeira acima.</p>';
  root.innerHTML=novo+cards;
}
document.addEventListener('change', async function(e){
  var up=e.target.closest('#fotos-root [data-gact="upload"]');
  if(up){ var id=up.getAttribute('data-id'); for(var i=0;i<up.files.length;i++){ var fd=new FormData(); fd.append('foto',up.files[i]); try{ await fetch('/api/galerias/'+id+'/imagem',{method:'POST',headers:{'Authorization':'Bearer '+getToken()},body:fd}); }catch(err){} } carregarFotos(); return; }
  var rn=e.target.closest('#fotos-root [data-gact="rename"]');
  if(rn){ _authFetch('PATCH','/galerias/'+rn.getAttribute('data-id'),{titulo:rn.value}).catch(function(err){toast(err.message,'error');}); }
});
document.addEventListener('click', async function(e){
  var b=e.target.closest('#fotos-root [data-gact]'); if(!b) return;
  var act=b.getAttribute('data-gact');
  if(act==='novag'){ e.preventDefault(); var inp=document.getElementById('nova-galeria'); var t=(inp.value||'').trim(); if(!t){toast('Dê um nome à galeria','warning');return;} try{ await _authFetch('POST','/galerias',{titulo:t}); carregarFotos(); }catch(err){toast(err.message,'error');} return; }
  if(act==='ver'){ e.preventDefault(); abrirLightbox(b.getAttribute('data-url')); return; }
  if(act==='delfoto'){ e.preventDefault(); try{ await _authFetch('DELETE','/galerias/'+b.getAttribute('data-id')+'/imagem',{url:b.getAttribute('data-url')}); carregarFotos(); }catch(err){toast(err.message,'error');} return; }
  if(act==='delgaleria'){ e.preventDefault(); if(confirm('Excluir esta galeria e suas fotos?')){ try{ await _authFetch('DELETE','/galerias/'+b.getAttribute('data-id')); carregarFotos(); }catch(err){toast(err.message,'error');} } return; }
});
document.addEventListener('click', function(e){ if(e.target.closest('.desktop-nav-item[data-page="fotos"]')){ setTimeout(carregarFotos,80); } });

/* ===== Links v3.1: novo link inline (rascunho azul no topo, sem gravar até salvar) ===== */
function renderLinks(lista){
  lista=(lista||[]).slice().sort(function(a,b){ var ka=[(a.categoria||'').toLowerCase(),(a.grupo||'').toLowerCase(),(a.nome||'').toLowerCase()], kb=[(b.categoria||'').toLowerCase(),(b.grupo||'').toLowerCase(),(b.nome||'').toLowerCase()]; for(var i=0;i<3;i++){ if(ka[i]<kb[i])return -1; if(ka[i]>kb[i])return 1; } return 0; });
  window._links=lista;
  var root=document.getElementById('links-root');
  var ed=window._linkEdit;
  var cats=[{v:'',t:'Todos'}].concat(LINKS_CAT.map(function(c){return {v:c,t:c};}));
  var botoes=cats.map(function(b){var on=(filtrosLink.categoria||'')===b.v;return '<button class="btn btn-sm '+(on?'btn-primary':'btn-secondary')+'" data-lf2="'+b.v+'">'+b.t+'</button>';}).join(' ');
  var toolbar='<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:12px"><button class="btn btn-primary btn-sm" data-lact2="novo">＋ Novo link</button><div style="display:flex;gap:6px;flex-wrap:wrap">'+botoes+'</div></div>';
  var cg='<colgroup><col style="width:14%"><col style="width:14%"><col style="width:20%"><col style="width:32%"><col style="width:20%"></colgroup>';
  var novoRow = window._linkNovo ? ('<tr style="background:#93c5fd">'
    +'<td><select class="tf" data-le="categoria">'+_optSel(LINKS_CAT,'')+'</select></td>'
    +'<td><input class="tf" data-le="grupo" placeholder="grupo"></td>'
    +'<td><input class="tf" data-le="nome" placeholder="nome"></td>'
    +'<td><input class="tf" data-le="website" placeholder="https://..."></td>'
    +'<td style="text-align:center;white-space:nowrap"><button class="fel-ic" data-lact2="salvar-novo" title="Salvar" style="color:#15803d">💾</button><button class="fel-ic" data-lact2="cancelar-novo" title="Cancelar">✖</button></td></tr>') : '';
  var rows=lista.map(function(l){
    if(l.id===ed){
      return '<tr><td><select class="tf" data-le="categoria">'+_optSel(LINKS_CAT,l.categoria||'')+'</select></td>'
        +'<td><input class="tf" data-le="grupo" value="'+(''+(l.grupo||'')).replace(/"/g,'&quot;')+'" placeholder="grupo"></td>'
        +'<td><input class="tf" data-le="nome" value="'+(''+(l.nome||'')).replace(/"/g,'&quot;')+'" placeholder="nome"></td>'
        +'<td><input class="tf" data-le="website" value="'+(''+(l.website||'')).replace(/"/g,'&quot;')+'" placeholder="https://..."></td>'
        +'<td style="text-align:center;white-space:nowrap"><button class="fel-ic" data-lact2="salvar" data-id="'+l.id+'" title="Salvar" style="color:#15803d">💾</button><button class="fel-ic" data-lact2="cancelar" data-id="'+l.id+'" title="Cancelar">✖</button></td></tr>';
    }
    return '<tr><td>'+(l.categoria||'—')+'</td>'
      +'<td>'+(l.grupo||'—')+'</td>'
      +'<td style="font-weight:500">'+(l.nome||'—')+'</td>'
      +'<td style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="'+(l.website||'')+'">'+(l.website||'—')+'</td>'
      +'<td style="text-align:center;white-space:nowrap"><button class="fel-ic" data-lact2="abrir" data-id="'+l.id+'" title="Abrir em nova aba" style="color:var(--primary);margin-right:26px">↗</button><button class="fel-ic" data-lact2="editar" data-id="'+l.id+'" title="Editar">✏️</button><button class="fel-ic" data-lact2="copiar" data-id="'+l.id+'" title="Copiar">📋</button><button class="fel-ic" data-lact2="del" data-id="'+l.id+'" title="Excluir" style="color:var(--danger)">🗑️</button></td></tr>';
  }).join('');
  var head='<thead><tr><th>Categoria</th><th>Grupo</th><th>Nome</th><th>Website</th><th style="text-align:center">Ações</th></tr></thead>';
  var body=novoRow+rows; if(!body) body='<tr><td colspan="5" style="text-align:center;padding:20px;color:var(--text-muted)">Nenhum link</td></tr>';
  root.innerHTML=toolbar+'<table class="tabela-contatos">'+cg+head+'<tbody>'+body+'</tbody></table>';
}
document.addEventListener('click', async function(e){
  var f=e.target.closest('#links-root [data-lf2]'); if(f){ filtrosLink.categoria=f.getAttribute('data-lf2'); window._linkEdit=null; window._linkNovo=false; carregarLinks(); return; }
  var b=e.target.closest('#links-root [data-lact2]'); if(!b) return; e.preventDefault();
  var act=b.getAttribute('data-lact2'), id=b.getAttribute('data-id');
  if(act==='novo'){ window._linkNovo=true; window._linkEdit=null; renderLinks(window._links||[]); return; }
  if(act==='cancelar-novo'){ window._linkNovo=false; renderLinks(window._links||[]); return; }
  if(act==='salvar-novo'){ var tr=b.closest('tr'); var body={}; tr.querySelectorAll('[data-le]').forEach(function(el){ body[el.getAttribute('data-le')]=el.value; }); try{ await _authFetch('POST','/links',body); window._linkNovo=false; carregarLinks(); }catch(err){toast(err.message,'error');} return; }
  if(act==='editar'){ window._linkEdit=id; renderLinks(window._links||[]); return; }
  if(act==='cancelar'){ window._linkEdit=null; renderLinks(window._links||[]); return; }
  if(act==='salvar'){ var tr=b.closest('tr'); var body={}; tr.querySelectorAll('[data-le]').forEach(function(el){ body[el.getAttribute('data-le')]=el.value; }); try{ await _authFetch('PATCH','/links/'+id,body); window._linkEdit=null; carregarLinks(); }catch(err){toast(err.message,'error');} return; }
  var l=(window._links||[]).filter(function(x){return x.id===id;})[0];
  if(act==='copiar'){ if(l){ copiarTexto(l.website||''); toast('Link copiado','success'); } }
  else if(act==='abrir'){ if(l && l.website){ window.open(_normUrl(l.website),'_blank','noopener'); } }
  else if(act==='del'){ if(confirm('Excluir este link?')){ try{ await _authFetch('DELETE','/links/'+id); carregarLinks(); }catch(err){toast(err.message,'error');} } }
});


/* ===== COFRE / ACESSOS — CRUD cifrado (Fase 1 MVP) ===== */
(function(){
  var MIN_LEN=12;
  var ENUMS={
    categoria_dono:['Pessoal','A3K (meu)','H1 (empresa)','Cliente','Família'],
    nivel:['1 (crítico)','2 (operacional)','3 (conveniência)'],
    tipo_acesso:['Login','PIN','Biometria','Referência'],
    metodo_login:['Senha própria','SSO via Google','SSO via Microsoft','SSO via Apple','Passkey'],
    metodo_2fa:['App (TOTP)','Passkey','Email','SMS','Nenhum']
  };
  function token(){ return localStorage.getItem('cardbase_token'); }
  function esc(s){ return (s==null?'':String(s)).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
  function naAbaAcessos(){ var p=document.getElementById('page-acessos'); return !!(p&&p.classList.contains('active')); }
  function pageContent(){ var p=document.getElementById('page-acessos'); return p?p.querySelector('.page-content'):null; }
  var INP='width:100%;padding:9px 11px;border:1px solid var(--border,#ccc);border-radius:8px;font-size:14px;box-sizing:border-box';
  var BTNP='padding:9px 14px;background:var(--primary);color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer';
  var BTNS='padding:7px 11px;background:#fff;color:var(--text,#333);border:1px solid var(--border,#ccc);border-radius:8px;font-size:13px;cursor:pointer';

  async function cofreApi(method, path, body){
    var headers={'Authorization':'Bearer '+token()};
    var opt={method:method, headers:headers};
    if(body){ headers['Content-Type']='application/json'; opt.body=JSON.stringify(body); }
    var r=await fetch('/api/cofre'+path, opt);
    if(r.status===401){ localStorage.removeItem('cardbase_token'); location.reload(); return null; }
    if(r.status===404) return {__notfound:true};
    if(r.status===204) return null;
    var data=null; try{ data=await r.json(); }catch(e){}
    if(!r.ok) throw new Error((data&&data.detail)||('Erro '+r.status));
    return data;
  }
  function ensureScripts(){
    return new Promise(function(resolve){
      var toLoad=[];
      if(!window.CofreCrypto) toLoad.push('/js/cofre-crypto.js');
      if(!window.CofreLock) toLoad.push('/js/cofre-lock.js');
      if(!toLoad.length){ resolve(); return; }
      var i=0;
      (function next(){
        if(i>=toLoad.length){ resolve(); return; }
        var s=document.createElement('script'); s.src=toLoad[i]+'?v='+Date.now();
        s.onload=function(){ i++; next(); }; s.onerror=function(){ i++; next(); };
        document.head.appendChild(s);
      })();
    });
  }
  async function cifrarSegredo(obj){ var k=CofreLock.getKey(); if(!k) throw new Error('Cofre travado'); return await CofreCrypto.encrypt(k, JSON.stringify(obj)); }
  async function decifrarSegredo(iv, ct){ if(!iv||!ct) return {}; var k=CofreLock.getKey(); if(!k) throw new Error('Cofre travado'); try{ return JSON.parse(await CofreCrypto.decrypt(k, iv, ct)); }catch(e){ return {}; } }
  function normSeg(o){ var ks=Object.keys(o).filter(function(x){return o[x]!=='' && o[x]!=null;}).sort(); var r={}; ks.forEach(function(x){r[x]=o[x];}); return JSON.stringify(r); }

  function haXDias(iso){ if(!iso) return ''; var d=new Date(iso); if(isNaN(d)) return ''; var n=Math.floor((Date.now()-d.getTime())/86400000); if(n<=0)return'hoje'; if(n===1)return'ontem'; if(n<30)return'há '+n+' dias'; if(n<365)return'há '+Math.floor(n/30)+' meses'; return 'há '+Math.floor(n/365)+' ano(s)'; }
  function antiga(iso){ if(!iso) return false; var d=new Date(iso); return (Date.now()-d.getTime())>365*86400000; }
  function gerarSenha(tam, sym){ tam=tam||20; var P='abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'+(sym?'!@#$%^&*()-_=+[]{}':''); var a=new Uint32Array(tam); crypto.getRandomValues(a); var o=''; for(var i=0;i<tam;i++) o+=P[a[i]%P.length]; return o; }
  async function copiar(texto, btn){
    try{ await navigator.clipboard.writeText(texto); }
    catch(e){ var ta=document.createElement('textarea'); ta.value=texto; ta.style.position='fixed'; ta.style.opacity='0'; document.body.appendChild(ta); ta.select(); try{document.execCommand('copy');}catch(_){} ta.remove(); }
    if(btn){ var o=btn.textContent; btn.textContent='✓ limpa em 20s'; setTimeout(function(){ btn.textContent=o; }, 4000); }
    setTimeout(function(){ navigator.clipboard.writeText('').catch(function(){}); }, 20000);
  }
  function fecharModais(){ document.querySelectorAll('.cofre-modal-ov').forEach(function(m){ m.remove(); }); }
  function abrirModal(html){
    fecharModais();
    var ov=document.createElement('div'); ov.className='cofre-modal-ov';
    ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:10000;display:flex;align-items:flex-start;justify-content:center;padding:24px;overflow:auto';
    ov.innerHTML='<div style="background:#fff;border-radius:12px;max-width:560px;width:100%;box-shadow:0 10px 40px rgba(0,0,0,.25)">'+html+'</div>';
    ov.addEventListener('click', function(e){ if(e.target===ov) fecharModais(); });
    document.body.appendChild(ov);
    return ov;
  }
  function badge(t){ return '<span style="display:inline-block;background:var(--bg-muted,#eef);color:var(--text,#333);border-radius:10px;padding:2px 8px;font-size:11px">'+esc(t)+'</span>'; }
  function armarWatch(){
    if(window.__cofreWatch) clearInterval(window.__cofreWatch);
    window.__cofreWatch=setInterval(function(){
      if(!window.CofreLock || !CofreLock.estaDestravado()){
        clearInterval(window.__cofreWatch); window.__cofreWatch=null; fecharModais();
        if(naAbaAcessos()) cofreRender();
      }
    }, 2000);
  }

  async function cofreRender(){
    var pc=pageContent(); if(!pc) return;
    await ensureScripts();
    if(!window.crypto || !window.crypto.subtle || !window.isSecureContext){
      fecharModais();
      pc.innerHTML='<div class="card"><div class="card-body"><h3 style="margin:0 0 8px">🔒 Acessos indisponível</h3><p class="text-sm text-muted">O cofre exige conexão segura (HTTPS). Abra o SGC por <b>https://comercial.tail9061b7.ts.net/</b> com o Tailscale ativo.</p></div></div>';
      return;
    }
    if(window.CofreLock && CofreLock.estaDestravado()){ return renderLista(pc); }
    fecharModais();
    var meta;
    try{ meta=await cofreApi('GET','/meta'); }
    catch(e){ pc.innerHTML='<div class="card"><div class="card-body"><p class="text-sm" style="color:var(--danger)">Erro ao consultar o cofre: '+esc(e.message)+'</p></div></div>'; return; }
    if(meta && meta.__notfound) renderSetup(pc); else renderUnlock(pc, meta);
  }

  function renderSetup(pc){
    pc.innerHTML=''
    +'<div class="card" style="max-width:560px;margin:0 auto"><div class="card-body">'
    +'<h3 style="margin:0 0 6px">🔐 Configurar cofre de Acessos</h3>'
    +'<div style="background:#fff4e5;border:1px solid #ffb74d;border-radius:8px;padding:12px;margin:10px 0;font-size:13px;line-height:1.5"><b>⚠️ Aviso crítico — leia com atenção</b><br>O cofre usa criptografia <b>zero-knowledge</b>. Sua senha-mestre <b>não é salva em lugar nenhum</b> e <b>não pode ser recuperada</b>. Se você esquecê-la, <b>todos os dados são perdidos permanentemente</b>. Guarde a senha-mestre em <b>DOIS lugares offline e seguros</b> antes de continuar.</div>'
    +'<label class="text-sm" style="font-weight:600">Senha-mestre (mín. '+MIN_LEN+' caracteres)</label>'
    +'<input id="cofre-sp1" type="password" autocomplete="off" style="'+INP+';margin:4px 0 10px">'
    +'<label class="text-sm" style="font-weight:600">Confirme a senha-mestre</label>'
    +'<input id="cofre-sp2" type="password" autocomplete="off" style="'+INP+';margin:4px 0 10px">'
    +'<label style="display:flex;gap:8px;align-items:flex-start;font-size:13px;margin:6px 0 12px"><input id="cofre-ack" type="checkbox" style="margin-top:3px"> <span>Confirmo que guardei a senha-mestre em dois lugares offline e entendo que <b>não há recuperação</b>.</span></label>'
    +'<div id="cofre-sp-err" style="color:var(--danger);font-size:13px;min-height:18px;margin-bottom:6px"></div>'
    +'<button id="cofre-sp-btn" style="'+BTNP+';width:100%">Criar cofre</button>'
    +'</div></div>';
    document.getElementById('cofre-sp-btn').addEventListener('click', async function(){
      var err=document.getElementById('cofre-sp-err'); err.textContent='';
      var p1=document.getElementById('cofre-sp1').value, p2=document.getElementById('cofre-sp2').value, ack=document.getElementById('cofre-ack').checked;
      if(p1.length<MIN_LEN){ err.textContent='A senha-mestre precisa ter ao menos '+MIN_LEN+' caracteres.'; return; }
      if(p1!==p2){ err.textContent='As senhas não conferem.'; return; }
      if(!ack){ err.textContent='Confirme que guardou a senha-mestre offline.'; return; }
      var btn=this; btn.disabled=true; btn.textContent='Criando...';
      try{
        var salt=CofreCrypto.gerarSaltB64(), iters=600000;
        var key=await CofreCrypto.deriveKey(p1, salt, iters);
        var v=await CofreCrypto.criarVerifier(key);
        await cofreApi('POST','/meta',{salt:salt, verifier_iv:v.iv, verifier:v.ct, kdf_iters:iters});
        CofreLock.setKey(key);
        document.getElementById('cofre-sp1').value=''; document.getElementById('cofre-sp2').value='';
        renderLista(pc);
      }catch(e){ btn.disabled=false; btn.textContent='Criar cofre'; err.textContent='Erro ao criar o cofre: '+e.message; }
    });
  }

  function renderUnlock(pc, meta){
    pc.innerHTML=''
    +'<div class="card" style="max-width:480px;margin:0 auto"><div class="card-body">'
    +'<h3 style="margin:0 0 8px">🔓 Destravar cofre</h3>'
    +'<p class="text-sm text-muted" style="margin:0 0 10px">Digite a senha-mestre para abrir os acessos. Ela não é enviada ao servidor.</p>'
    +'<input id="cofre-up" type="password" autocomplete="off" placeholder="Senha-mestre" style="'+INP+';margin-bottom:10px">'
    +'<div id="cofre-up-err" style="color:var(--danger);font-size:13px;min-height:18px;margin-bottom:6px"></div>'
    +'<button id="cofre-up-btn" style="'+BTNP+';width:100%">Destravar</button>'
    +'</div></div>';
    var inp=document.getElementById('cofre-up'); inp.focus();
    async function tentar(){
      var err=document.getElementById('cofre-up-err'); err.textContent='';
      var pw=inp.value; if(!pw) return;
      var btn=document.getElementById('cofre-up-btn'); btn.disabled=true; btn.textContent='Verificando...';
      try{
        var key=await CofreCrypto.deriveKey(pw, meta.salt, meta.kdf_iters);
        var ok=await CofreCrypto.checarVerifier(key, meta.verifier_iv, meta.verifier);
        inp.value='';
        if(ok){ CofreLock.setKey(key); renderLista(pc); }
        else{ btn.disabled=false; btn.textContent='Destravar'; err.textContent='Senha-mestre incorreta.'; inp.focus(); }
      }catch(e){ btn.disabled=false; btn.textContent='Destravar'; err.textContent='Senha-mestre incorreta.'; }
    }
    document.getElementById('cofre-up-btn').addEventListener('click', tentar);
    inp.addEventListener('keydown', function(e){ if(e.key==='Enter') tentar(); });
  }

  var _filtro='';
  var _catFiltro='';
  function _cofreCsv(itens){
    var head=['Sistema','URL','Usuário','Categoria','Nível','Tipo','Método login','2FA','Email recuperação','Tags','Senha','Notas','Atualizado em'];
    function cell(x){ x=(x==null?'':String(x)); if(/[";,\n]/.test(x)) x='"'+x.replace(/"/g,'""')+'"'; return x; }
    var linhas=[head.join(';')];
    itens.forEach(function(a){
      linhas.push([cell(a.sistema),cell(a.url),cell(a.usuario_cifrado?'(cifrado)':a.usuario),cell(a.categoria_dono),cell(a.nivel),cell(a.tipo_acesso),cell(a.metodo_login),cell(a.metodo_2fa),cell(a.email_recuperacao),cell((a.tags||[]).join(', ')),'','',cell(a.atualizado_em)].join(';'));
    });
    return '\ufeff'+linhas.join('\n');
  }
  async function renderLista(pc){
    fecharModais(); armarWatch();
    var BTNI='display:inline-flex;align-items:center;justify-content:center;width:32px;height:30px;padding:0;border:1px solid var(--border,#ccc);border-radius:8px;background:#fff;cursor:pointer;font-size:14px';
    var itens=[];
    try{ itens=await cofreApi('GET','/acessos')||[]; }
    catch(e){ pc.innerHTML='<div class="card"><div class="card-body"><p style="color:var(--danger)">Erro: '+esc(e.message)+'</p></div></div>'; return; }
    var q=_filtro.toLowerCase();
    var fl=itens.filter(function(a){
      if(_catFiltro){ var ac=a.categoria_dono||''; if(_catFiltro==='__sem'){ if(ac!=='') return false; } else if(ac!==_catFiltro) return false; }
      if(!q) return true;
      return [a.sistema,a.usuario,a.categoria_dono,a.nivel,a.metodo_2fa].concat(a.tags||[]).join(' ').toLowerCase().indexOf(q)>=0;
    });
    function nCat(c){ return itens.filter(function(a){return (a.categoria_dono||'')===c;}).length; }
    var semN=nCat('');
    var catBtns='<button class="cofre-cat" data-cat="" style="'+(_catFiltro===''?BTNP:BTNS)+';padding:6px 12px">Todos ('+itens.length+')</button>'
      + ENUMS.categoria_dono.map(function(c){ return '<button class="cofre-cat" data-cat="'+esc(c)+'" style="'+(_catFiltro===c?BTNP:BTNS)+';padding:6px 12px">'+esc(c)+' ('+nCat(c)+')</button>'; }).join('')
      + (semN>0?'<button class="cofre-cat" data-cat="__sem" style="'+(_catFiltro==='__sem'?BTNP:BTNS)+';padding:6px 12px">Sem categoria ('+semN+')</button>':'');
    var html=''
      +'<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:10px"><h3 style="margin:0">🔓 Cofre · '+itens.length+' acesso(s)</h3><div style="display:flex;gap:8px"><button id="cofre-novo" style="'+BTNP+'">+ Novo acesso</button><button id="cofre-export" style="'+BTNS+'">⬇ Exportar</button><button id="cofre-lock-btn" style="'+BTNS+'">🔒 Travar</button></div></div>'
      +'<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px">'+catBtns+'</div>'
      +'<input id="cofre-busca" placeholder="Buscar por sistema, usuário, tag..." value="'+esc(_filtro)+'" style="'+INP+';margin-bottom:12px">';
    if(!fl.length){
      html+='<div class="card"><div class="card-body"><p class="text-sm text-muted" style="margin:0">'+(itens.length?'Nenhum acesso nesse filtro.':'Nenhum acesso ainda. Clique em "+ Novo acesso".')+'</p></div></div>';
    } else {
      var cel='overflow:hidden;text-overflow:ellipsis;white-space:nowrap';
      var rows=fl.map(function(a){
        var dias=haXDias(a.atualizado_em), velho=antiga(a.atualizado_em);
        var usr=a.usuario_cifrado?'🔒 cifrado':(a.usuario?esc(a.usuario):'—');
        var acoes='<div style="display:flex;gap:4px;justify-content:flex-end">'
          +(a.url?'<button class="cofre-abrir" data-url="'+esc(a.url)+'" title="Abrir" style="'+BTNI+'">↗</button>':'')
          +(a.segredo?'<button class="cofre-ver" data-id="'+a.id+'" title="Ver" style="'+BTNI+'">👁</button>':'')
          +'<button class="cofre-edit" data-id="'+a.id+'" title="Editar" style="'+BTNI+'">✏️</button>'
          +'<button class="cofre-del" data-id="'+a.id+'" data-nome="'+esc(a.sistema)+'" title="Excluir" style="'+BTNI+';color:var(--danger)">🗑</button></div>';
        return '<tr style="border-bottom:1px solid var(--border)">'
          +'<td title="'+esc(a.sistema)+'" style="padding:7px 8px;font-weight:600;'+cel+'">'+(a.icone_biometria?'👆 ':'')+esc(a.sistema)+'</td>'
          +'<td title="'+(a.usuario_cifrado?'cifrado':esc(a.usuario||''))+'" style="padding:7px 8px;'+cel+'">'+usr+'</td>'
          +'<td style="padding:7px 8px;'+cel+'">'+esc(a.categoria_dono||'—')+'</td>'
          +'<td style="padding:7px 8px;'+cel+'">'+esc(a.nivel||'—')+'</td>'
          +'<td style="padding:7px 8px;'+cel+'">'+((a.metodo_2fa&&a.metodo_2fa!=='Nenhum')?esc(a.metodo_2fa):'—')+'</td>'
          +'<td style="padding:7px 8px;white-space:nowrap;font-size:12px;color:'+(velho?'#e53935':'var(--text-muted)')+'">'+(dias||'—')+(velho?' ⚠️':'')+'</td>'
          +'<td style="padding:7px 8px">'+acoes+'</td></tr>';
      }).join('');
      html+='<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;table-layout:fixed"><colgroup><col style="width:18%"><col style="width:17%"><col style="width:12%"><col style="width:12%"><col style="width:7%"><col style="width:10%"><col style="width:24%"></colgroup><thead><tr style="text-align:left;border-bottom:2px solid var(--border)"><th style="padding:7px 8px">Sistema</th><th style="padding:7px 8px">Usuário</th><th style="padding:7px 8px">Categoria</th><th style="padding:7px 8px">Nível</th><th style="padding:7px 8px">2FA</th><th style="padding:7px 8px">Atualizado</th><th style="padding:7px 8px;text-align:right">Ações</th></tr></thead><tbody>'+rows+'</tbody></table></div>';
    }
    pc.innerHTML=html;
    document.getElementById('cofre-lock-btn').addEventListener('click', function(){ CofreLock.travar(); cofreRender(); });
    document.getElementById('cofre-novo').addEventListener('click', function(){ abrirForm(null); });
    document.getElementById('cofre-export').addEventListener('click', function(){
      var csv=_cofreCsv(fl); var blob=new Blob([csv],{type:'text/csv;charset=utf-8'}); var url=URL.createObjectURL(blob);
      var el=document.createElement('a'); el.href=url; el.download='cofre-acessos.csv'; document.body.appendChild(el); el.click(); el.remove(); setTimeout(function(){URL.revokeObjectURL(url);},1000);
      if(typeof toast==='function') toast('Exportado (senha em branco)','success');
    });
    pc.querySelectorAll('.cofre-cat').forEach(function(b){ b.addEventListener('click', function(){ _catFiltro=b.getAttribute('data-cat'); renderLista(pc); }); });
    var busca=document.getElementById('cofre-busca');
    busca.addEventListener('input', function(){ _filtro=busca.value; });
    busca.addEventListener('keydown', function(e){ if(e.key==='Enter'){ _filtro=busca.value; renderLista(pc); } });
    pc.querySelectorAll('.cofre-abrir').forEach(function(b){ b.addEventListener('click', function(){ var u=b.getAttribute('data-url'); if(!/^https?:\/\//i.test(u)) u='https://'+u; window.open(u,'_blank','noopener'); }); });
    pc.querySelectorAll('.cofre-ver').forEach(function(b){ b.addEventListener('click', function(){ verAcesso(b.getAttribute('data-id'), itens); }); });
    pc.querySelectorAll('.cofre-edit').forEach(function(b){ b.addEventListener('click', function(){ abrirForm(itens.find(function(x){return x.id===b.getAttribute('data-id');})); }); });
    pc.querySelectorAll('.cofre-del').forEach(function(b){ b.addEventListener('click', function(){ excluir(b.getAttribute('data-id'), b.getAttribute('data-nome')); }); });
  }

  async function verAcesso(id, itens){
    var a=itens.find(function(x){return x.id===id;}); if(!a) return;
    var seg;
    try{ seg=await decifrarSegredo(a.segredo_iv, a.segredo); }
    catch(e){ alert('Não foi possível decifrar (cofre travado?).'); cofreRender(); return; }
    var campos=[['Usuário', a.usuario_cifrado?seg.usuario:null],['Senha',seg.senha],['PIN',seg.pin],['Códigos de backup (2FA)',seg.codigos_backup],['Fallback',seg.fallback],['Notas',seg.notas]].filter(function(c){ return c[1]!=null && c[1]!==''; });
    var linhas=campos.map(function(c){
      var multi=(c[0]==='Notas'||c[0].indexOf('Códigos')===0);
      return '<div style="border:1px solid var(--border,#eee);border-radius:8px;padding:10px;margin-bottom:8px"><div class="text-sm" style="font-weight:600;margin-bottom:4px">'+esc(c[0])+'</div><div style="display:flex;gap:8px;align-items:center"><div class="cofre-val" data-real="'+esc(c[1])+'" style="flex:1;font-family:monospace;word-break:break-all;white-space:'+(multi?'pre-wrap':'normal')+'">••••••••</div><button class="cofre-eye" style="'+BTNS+'">👁</button><button class="cofre-cp" data-real="'+esc(c[1])+'" style="'+BTNS+'">📋</button></div></div>';
    }).join('');
    if(!linhas) linhas='<p class="text-sm text-muted">Sem segredos cadastrados.</p>';
    var ov=abrirModal('<div style="padding:18px"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px"><h3 style="margin:0">'+esc(a.sistema)+'</h3><button class="cofre-x" style="'+BTNS+'">✕</button></div>'+linhas+'<p class="text-sm text-muted" style="margin:8px 0 0">Revela um campo por vez. Cópia limpa o clipboard em 20s.</p></div>');
    ov.querySelector('.cofre-x').addEventListener('click', fecharModais);
    var vals=ov.querySelectorAll('.cofre-val'); var eyes=ov.querySelectorAll('.cofre-eye');
    eyes.forEach(function(btn){
      btn.addEventListener('click', function(){
        var row=btn.parentElement.querySelector('.cofre-val');
        var shown=row.getAttribute('data-shown')==='1';
        vals.forEach(function(v){ v.textContent='••••••••'; v.removeAttribute('data-shown'); });
        eyes.forEach(function(e){ e.textContent='👁'; });
        if(!shown){ row.textContent=row.getAttribute('data-real'); row.setAttribute('data-shown','1'); btn.textContent='🙈'; }
      });
    });
    ov.querySelectorAll('.cofre-cp').forEach(function(btn){ btn.addEventListener('click', function(){ copiar(btn.getAttribute('data-real'), btn); }); });
  }

  function selectHtml(id, ops, val){ return '<select id="'+id+'" style="'+INP+'"><option value="">—</option>'+ops.map(function(x){return '<option'+(x===val?' selected':'')+'>'+esc(x)+'</option>';}).join('')+'</select>'; }

  async function abrirForm(a){
    var editar=!!a; var seg={};
    if(editar && a.segredo){ try{ seg=await decifrarSegredo(a.segredo_iv, a.segredo); }catch(e){ alert('Cofre travado — destrave novamente.'); cofreRender(); return; } }
    a=a||{};
    function f(id,label,val,type){ return '<label class="text-sm" style="font-weight:600;display:block;margin-top:10px">'+label+'</label><input id="'+id+'" type="'+(type||'text')+'" value="'+esc(val||'')+'" autocomplete="off" style="'+INP+'">'; }
    var html='<div style="padding:18px">'
      +'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px"><h3 style="margin:0">'+(editar?'Editar acesso':'Novo acesso')+'</h3><button class="cofre-x" style="'+BTNS+'">✕</button></div>'
      +f('f-sistema','Sistema *', a.sistema)
      +f('f-url','URL', a.url)
      +'<label style="display:flex;gap:8px;align-items:center;margin-top:10px;font-size:13px"><input id="f-usuario-cif" type="checkbox" '+(a.usuario_cifrado?'checked':'')+'> Cifrar o usuário</label>'
      +f('f-usuario','Usuário / login', a.usuario_cifrado?(seg.usuario||''):(a.usuario||''))
      +'<div style="display:flex;gap:10px;flex-wrap:wrap"><div style="flex:1;min-width:150px"><label class="text-sm" style="font-weight:600;display:block;margin-top:10px">Categoria/Dono</label>'+selectHtml('f-cat',ENUMS.categoria_dono,a.categoria_dono)+'</div><div style="flex:1;min-width:150px"><label class="text-sm" style="font-weight:600;display:block;margin-top:10px">Nível</label>'+selectHtml('f-nivel',ENUMS.nivel,a.nivel)+'</div></div>'
      +'<div style="display:flex;gap:10px;flex-wrap:wrap"><div style="flex:1;min-width:150px"><label class="text-sm" style="font-weight:600;display:block;margin-top:10px">Tipo de acesso</label>'+selectHtml('f-tipo',ENUMS.tipo_acesso,a.tipo_acesso)+'</div><div style="flex:1;min-width:150px"><label class="text-sm" style="font-weight:600;display:block;margin-top:10px">Método de login</label>'+selectHtml('f-login',ENUMS.metodo_login,a.metodo_login)+'</div></div>'
      +'<label class="text-sm" style="font-weight:600;display:block;margin-top:10px">2FA</label>'+selectHtml('f-2fa',ENUMS.metodo_2fa,a.metodo_2fa)
      +f('f-emailrec','E-mail de recuperação', a.email_recuperacao)
      +f('f-tags','Tags (separadas por vírgula)', (a.tags||[]).join(', '))
      +'<label style="display:flex;gap:8px;align-items:center;margin-top:10px;font-size:13px"><input id="f-bio" type="checkbox" '+(a.icone_biometria?'checked':'')+'> Marcar ícone de biometria 👆</label>'
      +'<hr style="margin:14px 0;border:none;border-top:1px solid var(--border,#eee)"><div class="text-sm" style="font-weight:700;margin-bottom:4px">🔒 Campos cifrados (zero-knowledge)</div>'
      +'<div style="display:flex;gap:8px;align-items:flex-end"><div style="flex:1">'+f('f-senha','Senha', seg.senha)+'</div><button id="f-gen" style="'+BTNS+'">🎲 Gerar</button></div>'
      +'<label style="display:flex;gap:6px;align-items:center;margin-top:6px;font-size:12px"><input id="f-gensym" type="checkbox" checked> símbolos · <input id="f-genlen" type="number" value="20" min="8" max="64" style="width:60px;padding:4px;border:1px solid var(--border,#ccc);border-radius:6px"> caracteres</label>'
      +f('f-pin','PIN', seg.pin)
      +'<label class="text-sm" style="font-weight:600;display:block;margin-top:10px">Códigos de backup (2FA)</label><textarea id="f-backup" rows="2" style="'+INP+'">'+esc(seg.codigos_backup||'')+'</textarea>'
      +f('f-fallback','Fallback (senha/PIN de recuperação)', seg.fallback)
      +'<label class="text-sm" style="font-weight:600;display:block;margin-top:10px">Notas</label><textarea id="f-notas" rows="3" style="'+INP+'">'+esc(seg.notas||'')+'</textarea>'
      +'<div id="f-err" style="color:var(--danger);font-size:13px;min-height:18px;margin-top:8px"></div>'
      +'<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:6px"><button class="cofre-x" style="'+BTNS+'">Cancelar</button><button id="f-salvar" style="'+BTNP+'">Salvar</button></div></div>';
    var ov=abrirModal(html);
    ov.querySelectorAll('.cofre-x').forEach(function(b){ b.addEventListener('click', fecharModais); });
    document.getElementById('f-gen').addEventListener('click', function(){ document.getElementById('f-senha').value=gerarSenha(parseInt(document.getElementById('f-genlen').value)||20, document.getElementById('f-gensym').checked); });
    document.getElementById('f-salvar').addEventListener('click', async function(){
      var err=document.getElementById('f-err'); err.textContent='';
      var sistema=document.getElementById('f-sistema').value.trim();
      if(!sistema){ err.textContent='Informe o sistema.'; return; }
      var usuarioCif=document.getElementById('f-usuario-cif').checked;
      var usuarioVal=document.getElementById('f-usuario').value.trim();
      var seg2={ senha:document.getElementById('f-senha').value, pin:document.getElementById('f-pin').value, codigos_backup:document.getElementById('f-backup').value, fallback:document.getElementById('f-fallback').value, notas:document.getElementById('f-notas').value };
      if(usuarioCif) seg2.usuario=usuarioVal;
      Object.keys(seg2).forEach(function(k){ if(seg2[k]==='' || seg2[k]==null) delete seg2[k]; });
      var btn=this; btn.disabled=true; btn.textContent='Salvando...';
      try{
        var mudou = !editar || (normSeg(seg)!==normSeg(seg2));
        var payload={ sistema:sistema, url:document.getElementById('f-url').value.trim()||null, usuario:usuarioCif?null:(usuarioVal||null), usuario_cifrado:usuarioCif, categoria_dono:document.getElementById('f-cat').value||null, nivel:document.getElementById('f-nivel').value||null, tipo_acesso:document.getElementById('f-tipo').value||null, metodo_login:document.getElementById('f-login').value||null, metodo_2fa:document.getElementById('f-2fa').value||null, email_recuperacao:document.getElementById('f-emailrec').value.trim()||null, tags:document.getElementById('f-tags').value.split(',').map(function(t){return t.trim();}).filter(Boolean), icone_biometria:document.getElementById('f-bio').checked };
        if(mudou){ var cif=await cifrarSegredo(seg2); payload.segredo_iv=cif.iv; payload.segredo=cif.ct; }
        if(editar) await cofreApi('PATCH','/acessos/'+a.id, payload); else await cofreApi('POST','/acessos', payload);
        fecharModais(); renderLista(pageContent());
      }catch(e){ btn.disabled=false; btn.textContent='Salvar'; err.textContent='Erro ao salvar: '+e.message; }
    });
  }

  async function excluir(id, nome){
    if(!confirm('Excluir o acesso "'+nome+'"? Esta ação não pode ser desfeita.')) return;
    try{ await cofreApi('DELETE','/acessos/'+id); renderLista(pageContent()); }
    catch(e){ alert('Erro ao excluir: '+e.message); }
  }

  document.addEventListener('click', function(e){ var b=e.target&&e.target.closest&&e.target.closest('[data-page="acessos"]'); if(b) setTimeout(cofreRender, 60); });
  window.cofreRender=cofreRender;
})();

/* ===== Ajustes MOBILE: conta em Config, esconder duplicados, CardBase enxuto ===== */
(function(){
  if(!document.getElementById('css-mobile-ajustes')){
    var s=document.createElement('style'); s.id='css-mobile-ajustes';
    s.textContent='@media(max-width:639px){'
      +'#user-menu{display:none!important}'
      +'#page-form-contato #btn-extrair{display:none!important}'
      +'#page-form-contato #form-contato button[type="submit"]{display:none!important}'
      +'.desktop-nav .desktop-nav-item[data-page="cadastro"],'
      +'.desktop-nav .desktop-nav-item[data-page="empresas"],'
      +'.desktop-nav .desktop-nav-item[data-page="dashboard"]{display:none!important}'
      +'}';
    document.head.appendChild(s);
  }
  function montarContaConfig(){
    var pc=document.querySelector('#page-configuracoes .page-content'); if(!pc) return;
    if(document.getElementById('cfg-conta')) return;
    var box=document.createElement('div'); box.id='cfg-conta';
    box.innerHTML='<p class="section-title">Conta</p>'
      +'<div class="card mb-4"><div class="card-body" style="display:flex;flex-direction:column;gap:8px">'
      +'<button class="btn btn-secondary" data-conta="perfil" style="justify-content:flex-start">👤 Meu Perfil</button>'
      +'<button class="btn btn-secondary" data-conta="atalhos" style="justify-content:flex-start">⭐ Meus Atalhos</button>'
      +'<button class="btn btn-secondary" data-conta="usuarios" style="justify-content:flex-start">👥 Usuários</button>'
      +'<button class="btn btn-secondary" data-conta="sair" style="justify-content:flex-start;color:var(--danger)">🚪 Sair</button>'
      +'</div></div>';
    pc.insertBefore(box, pc.firstChild);
    box.addEventListener('click', function(e){
      var b=e.target.closest('[data-conta]'); if(!b) return;
      var k=b.getAttribute('data-conta');
      if(k==='usuarios'){ if(typeof navegarPara==='function') navegarPara('usuarios'); if(typeof carregarUsuarios==='function') carregarUsuarios(); return; }
      var um=document.querySelector('#user-menu [data-um="'+k+'"]'); if(um) um.click();
    });
  }
  montarContaConfig();
  document.addEventListener('click', function(e){
    var b=e.target && e.target.closest && e.target.closest('[data-page="configuracoes"]');
    if(b) setTimeout(montarContaConfig, 80);
  });
})();

/* ===== Publicacoes v9: cores por status + modal botões fixos no topo + fix upload apaga campos ===== */
(function(){
  var EDIT='<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125"/></svg>';
  var DUP='<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 0 0-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5"/></svg>';
  var ARCH='<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0-3-3m3 3 3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z"/></svg>';
  var TRASH='<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166M18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"/></svg>';

  window.renderPublicacoes=function(lista){
    window._pubs=lista;
    var root=document.getElementById('publicacoes-root'); if(!root) return;
    var plan=[{v:'',t:'Todos'}].concat(PUB_PLANEJADOR.map(function(p){return {v:p,t:p};}));
    var botoes=plan.map(function(b){ var on=(filtrosPub.planejador||'')===b.v; return '<button class="btn btn-sm '+(on?'btn-primary':'btn-secondary')+'" data-plan="'+b.v+'">'+b.t+'</button>'; }).join(' ');
    var arqBtn='<button class="btn btn-sm '+(filtrosPub.arquivado?'btn-primary':'btn-secondary')+'" data-arq="1">📦 Arquivados</button>';
    var toolbar='<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:12px"><button class="btn btn-primary btn-sm" data-pm3="nova">＋ Nova publicação</button><div style="display:flex;gap:6px;flex-wrap:wrap">'+botoes+' '+arqBtn+'</div></div>';
    var arq=filtrosPub.arquivado;
    var cg='<colgroup><col style="width:5%"><col style="width:12%"><col style="width:25%"><col style="width:12%"><col style="width:11%"><col style="width:12%"><col style="width:17%"></colgroup>';
    var rows=(lista||[]).map(function(p){
      var st=p.planejador||'';
      var pub=st==='Publicado';
      var completo=!!(p.post && p.imagens && p.imagens.length && p.hashtags && p.data);
      var bg='';
      if(pub){ bg=''; }
      else if(st==='Planejado'){ bg='#dcfce7'; }
      else if(st==='Insight'){ bg = completo ? '#dbeafe' : '#fde68a'; }
      var trStyle = bg ? ' style="background:'+bg+'"' : '';
      var badge=st? '<span style="background:'+(pub?'#dcfce7':'var(--primary-light)')+';color:'+(pub?'#15803d':'var(--primary)')+';padding:2px 8px;border-radius:10px;font-size:12px">'+st+'</span>' : '<span style="color:var(--text-muted)">—</span>';
      return '<tr'+trStyle+'>'
        +'<td style="color:var(--text-muted);font-size:12px">#'+(p.numero||'')+'</td>'
        +'<td>'+(p.categoria||'—')+'</td>'
        +'<td><a href="#" data-pm3="view" data-id="'+p.id+'" style="color:var(--primary);font-weight:600;text-decoration:none">'+(p.tema||'(sem tema)')+'</a></td>'
        +'<td style="text-align:center">'+_pubIcons(p)+'</td>'
        +'<td>'+(p.data||'—')+'</td>'
        +'<td>'+badge+'</td>'
        +'<td style="text-align:center;white-space:nowrap"><button class="fel-ic" data-pm3="editar" data-id="'+p.id+'" title="Editar">'+EDIT+'</button><button class="fel-ic" data-pm3="dup" data-id="'+p.id+'" title="Duplicar">'+DUP+'</button><button class="fel-ic" data-pm3="arquivar" data-id="'+p.id+'" title="'+(arq?'Desarquivar':'Arquivar')+'" style="color:'+(arq?'#15803d':'#b45309')+'">'+ARCH+'</button><button class="fel-ic" data-pm3="del" data-id="'+p.id+'" title="Excluir" style="color:var(--danger)">'+TRASH+'</button></td>'
        +'</tr>';
    }).join('');
    var head='<thead><tr><th>ID</th><th>Categoria</th><th>Tema</th><th style="text-align:center">Conteúdo</th><th>Data</th><th>Planejador</th><th></th></tr></thead>';
    root.innerHTML=toolbar+'<table class="tabela-contatos">'+cg+head+'<tbody>'+(rows||'<tr><td colspan="7" style="text-align:center;padding:20px;color:var(--text-muted)">'+(arq?'Nenhuma arquivada':'Nenhuma publicação')+'</td></tr>')+'</tbody></table>';
  };

  window.abrirPubModal=function(pub, mode){
    var state={ id:(pub&&pub.id)||null, mode:mode||'view', data:Object.assign({imagens:[]}, pub||{}) };
    var ov=document.getElementById('pub-modal'); if(ov) ov.remove();
    ov=document.createElement('div'); ov.id='pub-modal';
    ov.style.cssText='position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.5);z-index:9999;display:flex;align-items:flex-start;justify-content:center;padding:20px;overflow:auto';
    document.body.appendChild(ov);
    function fechar(){ ov.remove(); carregarPublicacoes(); }
    async function salvarCampos(){
      if(!state.id) return;
      var body={};
      ['categoria','tema','post','hashtags','data','planejador'].forEach(function(k){ var el=document.getElementById('pm-'+k); if(el) body[k]=el.value; });
      try{ state.data=await _authFetch('PATCH','/publicacoes/'+state.id,body); }catch(err){}
    }
    function render(){
      var d=state.data, titulo, headerBtns, body;
      if(state.mode==='view'){
        titulo='Visualizar publicação';
        headerBtns=(d.planejador==='Publicado'?'':'<button class="btn btn-sm btn-secondary" data-x="publicado">✓ Publicado</button>')+'<button class="btn btn-sm btn-primary" data-x="editar">✏ Editar</button>';
        var imgs=(d.imagens||[]).map(function(u){ return '<div style="display:inline-block;margin:4px;text-align:center"><img src="'+u+'" style="width:90px;height:90px;object-fit:cover;border-radius:8px;border:1px solid var(--border)"><br><a href="'+u+'" download class="text-sm" style="color:var(--primary)">baixar</a></div>'; }).join('') || '<span class="text-sm text-muted">sem imagens</span>';
        body='<div class="text-sm text-muted">Categoria</div><div style="margin-bottom:8px;font-weight:600">'+(d.categoria||'—')+'</div>'
          +'<div class="text-sm text-muted">Tema</div><div style="display:flex;gap:8px;align-items:center;margin-bottom:8px"><div style="flex:1">'+(d.tema||'—')+'</div><button class="fel-ic" data-copy="tema" title="Copiar">📋</button></div>'
          +'<div class="text-sm text-muted">Post</div><div style="display:flex;gap:8px;align-items:flex-start;margin-bottom:8px"><div style="flex:1;white-space:pre-wrap;background:var(--surface-2);padding:8px;border-radius:8px">'+(_felEsc(d.post||'—'))+'</div><button class="fel-ic" data-copy="post" title="Copiar">📋</button></div>'
          +'<div class="text-sm text-muted">Hashtags</div><div style="display:flex;gap:8px;align-items:center;margin-bottom:8px"><div style="flex:1">'+(_felEsc(d.hashtags||'—'))+'</div><button class="fel-ic" data-copy="hashtags" title="Copiar">📋</button></div>'
          +'<div style="display:flex;gap:24px;margin-bottom:8px"><div><div class="text-sm text-muted">Data</div><div>'+(d.data||'—')+'</div></div><div><div class="text-sm text-muted">Planejador</div><div>'+(d.planejador||'—')+'</div></div></div>'
          +'<div class="text-sm text-muted">Imagens</div><div>'+imgs+'</div>';
      } else {
        var d2=state.data;
        titulo=state.id?'Editar publicação':'Nova publicação';
        headerBtns='<button class="btn btn-sm btn-secondary" data-x="close">Fechar</button><button class="btn btn-sm btn-primary" data-x="salvar">💾 Salvar</button>';
        var imgs=(d2.imagens||[]).map(function(u){ return '<div style="display:inline-block;margin:4px;text-align:center;position:relative"><img src="'+u+'" style="width:80px;height:80px;object-fit:cover;border-radius:8px;border:1px solid var(--border)"><button class="fel-ic" data-delimg="'+u+'" title="Remover" style="position:absolute;top:-8px;right:-8px;background:#fff;border-radius:50%;color:var(--danger)">×</button><br><a href="'+u+'" download class="text-sm" style="color:var(--primary)">baixar</a></div>'; }).join('');
        body='<div class="form-group"><label class="form-label">Categoria</label><select id="pm-categoria" class="form-control">'+_optSel(PUB_CATEGORIAS,d2.categoria||'')+'</select></div>'
          +'<div class="form-group"><label class="form-label">Tema</label><input id="pm-tema" class="form-control" value="'+(d2.tema||'').replace(/"/g,'&quot;')+'"></div>'
          +'<div class="form-group"><label class="form-label">Post</label><textarea id="pm-post" class="form-control" rows="5">'+_felEsc(d2.post||'')+'</textarea></div>'
          +'<div class="form-group"><label class="form-label">Hashtags</label><input id="pm-hashtags" class="form-control" value="'+(d2.hashtags||'').replace(/"/g,'&quot;')+'"></div>'
          +'<div style="display:flex;gap:12px"><div class="form-group" style="flex:1"><label class="form-label">Data</label><input type="date" id="pm-data" class="form-control" value="'+(d2.data||'')+'"></div><div class="form-group" style="flex:1"><label class="form-label">Planejador</label><select id="pm-planejador" class="form-control">'+_optSel(PUB_PLANEJADOR,d2.planejador||'')+'</select></div></div>'
          +'<div class="form-group"><label class="form-label">Imagens</label><div>'+(imgs||'<span class="text-sm text-muted">nenhuma</span>')+'</div>'+(state.id?'<input type="file" id="pm-img" accept="image/*" multiple style="margin-top:8px">':'<div class="text-sm text-muted" style="margin-top:6px">Salve primeiro para anexar imagens</div>')+'</div>';
      }
      ov.innerHTML='<div style="background:#fff;border-radius:12px;max-width:560px;width:100%;max-height:90vh;display:flex;flex-direction:column">'
        +'<div style="flex-shrink:0;background:#fff;border-bottom:1px solid var(--border);border-radius:12px 12px 0 0;padding:12px 18px;display:flex;justify-content:space-between;align-items:center;gap:10px">'
          +'<h3 style="margin:0;font-size:17px;white-space:nowrap">'+titulo+'</h3>'
          +'<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;justify-content:flex-end">'+headerBtns+'<button class="fel-ic" data-x="close" title="Fechar" style="font-size:20px;line-height:1">×</button></div>'
        +'</div>'
        +'<div style="overflow:auto;padding:18px;flex:1;min-height:0">'+body+'</div>'
      +'</div>';
    }
    ov.addEventListener('click', async function(e){
      if(e.target===ov){ fechar(); return; }
      var cp=e.target.closest('[data-copy]'); if(cp){ copiarTexto(state.data[cp.getAttribute('data-copy')]||''); toast('Copiado','success'); return; }
      var di=e.target.closest('[data-delimg]'); if(di){ await salvarCampos(); try{ state.data=await _authFetch('DELETE','/publicacoes/'+state.id+'/imagem',{url:di.getAttribute('data-delimg')}); render(); }catch(err){toast(err.message,'error');} return; }
      var x=e.target.closest('[data-x]'); if(!x) return;
      var act=x.getAttribute('data-x');
      if(act==='close'){ fechar(); }
      else if(act==='editar'){ state.mode='edit'; render(); }
      else if(act==='publicado'){ await salvarCampos(); try{ state.data=await _authFetch('PATCH','/publicacoes/'+state.id,{planejador:'Publicado'}); render(); }catch(err){toast(err.message,'error');} }
      else if(act==='salvar'){
        var body={categoria:_v('pm-categoria'),tema:_v('pm-tema'),post:document.getElementById('pm-post').value,hashtags:_v('pm-hashtags'),data:_v('pm-data'),planejador:_v('pm-planejador')};
        try{
          if(state.id){ state.data=await _authFetch('PATCH','/publicacoes/'+state.id,body); }
          else { var r=await _authFetch('POST','/publicacoes',body); state.data=r; state.id=r.id; }
          toast('Salvo','success'); state.mode='view'; render();
        }catch(err){ toast(err.message,'error'); }
      }
    });
    ov.addEventListener('change', async function(e){
      var f=e.target.closest('#pm-img'); if(!f||!f.files.length) return;
      await salvarCampos();
      for(var i=0;i<f.files.length;i++){
        var fd=new FormData(); fd.append('foto',f.files[i]);
        try{ var r=await fetch('/api/publicacoes/'+state.id+'/imagem',{method:'POST',headers:{'Authorization':'Bearer '+getToken()},body:fd}); var data=await r.json(); if(r.ok) state.data=data; }catch(err){}
      }
      render();
    });
    render();
  };
})();

/* ===== Publicacoes v10: filtros com contadores (maiores, uniformes, topo-direita) ===== */
(function(){
  var EDIT='<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125"/></svg>';
  var DUP='<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 0 0-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5"/></svg>';
  var ARCH='<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0-3-3m3 3 3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z"/></svg>';
  var TRASH='<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166M18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"/></svg>';

  window.carregarPublicacoes=async function(){
    var root=document.getElementById('publicacoes-root'); if(!root) return;
    if(!window._pubCounts) root.innerHTML='<div class="empty-state"><div class="spinner" style="margin:0 auto"></div></div>';
    var canal=window.PUB_CANAL||'linkedin';
    var ativos=[], arquivados=[];
    try{
      ativos=await _authFetch('GET','/publicacoes?canal='+canal+'&arquivado=false')||[];
      arquivados=await _authFetch('GET','/publicacoes?canal='+canal+'&arquivado=true')||[];
    }catch(err){ toast(err.message,'error'); }
    var C={ total:ativos.length, arquivados:arquivados.length };
    PUB_PLANEJADOR.forEach(function(s){ C[s]=ativos.filter(function(p){return p.planejador===s;}).length; });
    window._pubCounts=C;
    var lista;
    if(filtrosPub.arquivado) lista=arquivados;
    else if(filtrosPub.planejador) lista=ativos.filter(function(p){return p.planejador===filtrosPub.planejador;});
    else lista=ativos;
    renderPublicacoes(lista);
  };

  window.renderPublicacoes=function(lista){
    window._pubs=lista;
    var root=document.getElementById('publicacoes-root'); if(!root) return;
    var C=window._pubCounts||{};
    function fbtn(label,v,count,active){ return '<button class="btn '+(active?'btn-primary':'btn-secondary')+'" data-pfilter="'+v+'" style="min-width:150px;padding:11px 14px;font-size:14px;font-weight:600">'+label+' <span style="opacity:.75">('+(count||0)+')</span></button>'; }
    var filtros='<div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end">'
      + fbtn('Todos','all',C.total,(!filtrosPub.arquivado && !filtrosPub.planejador))
      + PUB_PLANEJADOR.map(function(s){ return fbtn(s,s,C[s],(!filtrosPub.arquivado && filtrosPub.planejador===s)); }).join('')
      + fbtn('📦 Arquivados','arq',C.arquivados,!!filtrosPub.arquivado)
      +'</div>';
    var toolbar='<div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:10px;margin-bottom:14px"><button class="btn btn-primary" data-pm3="nova" style="padding:11px 16px;font-size:14px">＋ Nova publicação</button>'+filtros+'</div>';
    var arq=filtrosPub.arquivado;
    var cg='<colgroup><col style="width:5%"><col style="width:12%"><col style="width:25%"><col style="width:12%"><col style="width:11%"><col style="width:12%"><col style="width:17%"></colgroup>';
    var rows=(lista||[]).map(function(p){
      var st=p.planejador||'';
      var pub=st==='Publicado';
      var completo=!!(p.post && p.imagens && p.imagens.length && p.hashtags && p.data);
      var bg='';
      if(pub){ bg=''; }
      else if(st==='Planejado'){ bg='#dcfce7'; }
      else if(st==='Insight'){ bg = completo ? '#dbeafe' : '#fde68a'; }
      var trStyle = bg ? ' style="background:'+bg+'"' : '';
      var badge=st? '<span style="background:'+(pub?'#dcfce7':'var(--primary-light)')+';color:'+(pub?'#15803d':'var(--primary)')+';padding:2px 8px;border-radius:10px;font-size:12px">'+st+'</span>' : '<span style="color:var(--text-muted)">—</span>';
      return '<tr'+trStyle+'>'
        +'<td style="color:var(--text-muted);font-size:12px">#'+(p.numero||'')+'</td>'
        +'<td>'+(p.categoria||'—')+'</td>'
        +'<td><a href="#" data-pm3="view" data-id="'+p.id+'" style="color:var(--primary);font-weight:600;text-decoration:none">'+(p.tema||'(sem tema)')+'</a></td>'
        +'<td style="text-align:center">'+_pubIcons(p)+'</td>'
        +'<td>'+(p.data||'—')+'</td>'
        +'<td>'+badge+'</td>'
        +'<td style="text-align:center;white-space:nowrap"><button class="fel-ic" data-pm3="editar" data-id="'+p.id+'" title="Editar">'+EDIT+'</button><button class="fel-ic" data-pm3="dup" data-id="'+p.id+'" title="Duplicar">'+DUP+'</button><button class="fel-ic" data-pm3="arquivar" data-id="'+p.id+'" title="'+(arq?'Desarquivar':'Arquivar')+'" style="color:'+(arq?'#15803d':'#b45309')+'">'+ARCH+'</button><button class="fel-ic" data-pm3="del" data-id="'+p.id+'" title="Excluir" style="color:var(--danger)">'+TRASH+'</button></td>'
        +'</tr>';
    }).join('');
    var head='<thead><tr><th>ID</th><th>Categoria</th><th>Tema</th><th style="text-align:center">Conteúdo</th><th>Data</th><th>Planejador</th><th></th></tr></thead>';
    root.innerHTML=toolbar+'<table class="tabela-contatos">'+cg+head+'<tbody>'+(rows||'<tr><td colspan="7" style="text-align:center;padding:20px;color:var(--text-muted)">'+(arq?'Nenhuma arquivada':'Nenhuma publicação')+'</td></tr>')+'</tbody></table>';
  };

  if(!window._pfilterBound){
    window._pfilterBound=true;
    document.addEventListener('click', function(e){
      var b=e.target.closest && e.target.closest('#publicacoes-root [data-pfilter]'); if(!b) return;
      var v=b.getAttribute('data-pfilter');
      if(v==='arq'){ filtrosPub.arquivado=true; filtrosPub.planejador=''; }
      else if(v==='all'){ filtrosPub.arquivado=false; filtrosPub.planejador=''; }
      else { filtrosPub.arquivado=false; filtrosPub.planejador=v; }
      carregarPublicacoes();
    });
  }
})();

/* ===== Publicacoes v11: video no anexo + filtro/lista Excluidos + Restaurar ===== */
(function(){
  var EDIT='<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125"/></svg>';
  var DUP='<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 0 0-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5"/></svg>';
  var ARCH='<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0-3-3m3 3 3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z"/></svg>';
  var TRASH='<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166M18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"/></svg>';
  function _isVid(u){ return /\.(mp4|mov|webm|avi|mkv|m4v)$/i.test(u||''); }

  window.carregarPublicacoes=async function(){
    var root=document.getElementById('publicacoes-root'); if(!root) return;
    if(!window._pubCounts) root.innerHTML='<div class="empty-state"><div class="spinner" style="margin:0 auto"></div></div>';
    var canal=window.PUB_CANAL||'linkedin';
    var ativos=[], arquivados=[], excluidos=[];
    try{
      ativos=await _authFetch('GET','/publicacoes?canal='+canal+'&arquivado=false&excluido=false')||[];
      arquivados=await _authFetch('GET','/publicacoes?canal='+canal+'&arquivado=true&excluido=false')||[];
      excluidos=await _authFetch('GET','/publicacoes?canal='+canal+'&excluido=true')||[];
    }catch(err){ toast(err.message,'error'); }
    var C={ total:ativos.length, arquivados:arquivados.length, excluidos:excluidos.length };
    PUB_PLANEJADOR.forEach(function(s){ C[s]=ativos.filter(function(p){return p.planejador===s;}).length; });
    window._pubCounts=C;
    var lista;
    if(filtrosPub.excluido) lista=excluidos;
    else if(filtrosPub.arquivado) lista=arquivados;
    else if(filtrosPub.planejador) lista=ativos.filter(function(p){return p.planejador===filtrosPub.planejador;});
    else lista=ativos;
    renderPublicacoes(lista);
  };

  window.renderPublicacoes=function(lista){
    window._pubs=lista;
    var root=document.getElementById('publicacoes-root'); if(!root) return;
    var C=window._pubCounts||{}, exc=filtrosPub.excluido, arq=filtrosPub.arquivado;
    function fbtn(label,v,count,active){ return '<button class="btn '+(active?'btn-primary':'btn-secondary')+'" data-pf2="'+v+'" style="min-width:150px;padding:11px 14px;font-size:14px;font-weight:600">'+label+' <span style="opacity:.75">('+(count||0)+')</span></button>'; }
    var filtros='<div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end">'
      + fbtn('Todos','all',C.total,(!arq && !exc && !filtrosPub.planejador))
      + PUB_PLANEJADOR.map(function(s){ return fbtn(s,s,C[s],(!arq && !exc && filtrosPub.planejador===s)); }).join('')
      + fbtn('📦 Arquivados','arq',C.arquivados,!!arq && !exc)
      + fbtn('🗑 Excluídos','exc',C.excluidos,!!exc)
      +'</div>';
    var toolbar='<div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:10px;margin-bottom:14px"><button class="btn btn-primary" data-pm3="nova" style="padding:11px 16px;font-size:14px">＋ Nova publicação</button>'+filtros+'</div>';
    var cg='<colgroup><col style="width:5%"><col style="width:12%"><col style="width:25%"><col style="width:12%"><col style="width:11%"><col style="width:12%"><col style="width:17%"></colgroup>';
    var rows=(lista||[]).map(function(p){
      var st=p.planejador||'';
      var pub=st==='Publicado';
      var completo=!!(p.post && p.imagens && p.imagens.length && p.hashtags && p.data);
      var bg='';
      if(exc){ bg=''; }
      else if(pub){ bg=''; }
      else if(st==='Planejado'){ bg='#dcfce7'; }
      else if(st==='Insight'){ bg = completo ? '#dbeafe' : '#fde68a'; }
      var trStyle = bg ? ' style="background:'+bg+'"' : '';
      var badge=st? '<span style="background:'+(pub?'#dcfce7':'var(--primary-light)')+';color:'+(pub?'#15803d':'var(--primary)')+';padding:2px 8px;border-radius:10px;font-size:12px">'+st+'</span>' : '<span style="color:var(--text-muted)">—</span>';
      var acoes = exc
        ? '<button class="btn btn-sm btn-secondary" data-prestore="'+p.id+'">↩ Restaurar</button>'
        : '<button class="fel-ic" data-pm3="editar" data-id="'+p.id+'" title="Editar">'+EDIT+'</button><button class="fel-ic" data-pm3="dup" data-id="'+p.id+'" title="Duplicar">'+DUP+'</button><button class="fel-ic" data-pm3="arquivar" data-id="'+p.id+'" title="'+(arq?'Desarquivar':'Arquivar')+'" style="color:'+(arq?'#15803d':'#b45309')+'">'+ARCH+'</button><button class="fel-ic" data-pm3="del" data-id="'+p.id+'" title="Excluir" style="color:var(--danger)">'+TRASH+'</button>';
      return '<tr'+trStyle+'>'
        +'<td style="color:var(--text-muted);font-size:12px">#'+(p.numero||'')+'</td>'
        +'<td>'+(p.categoria||'—')+'</td>'
        +'<td><a href="#" data-pm3="view" data-id="'+p.id+'" style="color:var(--primary);font-weight:600;text-decoration:none">'+(p.tema||'(sem tema)')+'</a></td>'
        +'<td style="text-align:center">'+_pubIcons(p)+'</td>'
        +'<td>'+(p.data||'—')+'</td>'
        +'<td>'+badge+'</td>'
        +'<td style="text-align:center;white-space:nowrap">'+acoes+'</td>'
        +'</tr>';
    }).join('');
    var head='<thead><tr><th>ID</th><th>Categoria</th><th>Tema</th><th style="text-align:center">Conteúdo</th><th>Data</th><th>Planejador</th><th></th></tr></thead>';
    var vazio = exc?'Nenhuma excluída':(arq?'Nenhuma arquivada':'Nenhuma publicação');
    root.innerHTML=toolbar+'<table class="tabela-contatos">'+cg+head+'<tbody>'+(rows||'<tr><td colspan="7" style="text-align:center;padding:20px;color:var(--text-muted)">'+vazio+'</td></tr>')+'</tbody></table>';
  };

  window.abrirPubModal=function(pub, mode){
    var state={ id:(pub&&pub.id)||null, mode:mode||'view', data:Object.assign({imagens:[]}, pub||{}) };
    var ov=document.getElementById('pub-modal'); if(ov) ov.remove();
    ov=document.createElement('div'); ov.id='pub-modal';
    ov.style.cssText='position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.5);z-index:9999;display:flex;align-items:flex-start;justify-content:center;padding:20px;overflow:auto';
    document.body.appendChild(ov);
    function fechar(){ ov.remove(); carregarPublicacoes(); }
    async function salvarCampos(){
      if(!state.id) return;
      var body={};
      ['categoria','tema','post','hashtags','data','planejador'].forEach(function(k){ var el=document.getElementById('pm-'+k); if(el) body[k]=el.value; });
      try{ state.data=await _authFetch('PATCH','/publicacoes/'+state.id,body); }catch(err){}
    }
    function mediaView(u){ return _isVid(u)
      ? '<video src="'+u+'" controls style="width:130px;height:96px;object-fit:cover;border-radius:8px;border:1px solid var(--border)"></video>'
      : '<img src="'+u+'" style="width:96px;height:96px;object-fit:cover;border-radius:8px;border:1px solid var(--border)">'; }
    function mediaEdit(u){ var m=_isVid(u)
      ? '<video src="'+u+'" style="width:100px;height:74px;object-fit:cover;border-radius:8px;border:1px solid var(--border)"></video>'
      : '<img src="'+u+'" style="width:80px;height:80px;object-fit:cover;border-radius:8px;border:1px solid var(--border)">';
      return '<div style="display:inline-block;margin:4px;text-align:center;position:relative">'+m+'<button class="fel-ic" data-delimg="'+u+'" title="Remover" style="position:absolute;top:-8px;right:-8px;background:#fff;border-radius:50%;color:var(--danger)">×</button><br><a href="'+u+'" download class="text-sm" style="color:var(--primary)">baixar</a></div>'; }
    function render(){
      var d=state.data, titulo, headerBtns, body;
      if(state.mode==='view'){
        titulo='Visualizar publicação';
        headerBtns=(d.planejador==='Publicado'?'':'<button class="btn btn-sm btn-secondary" data-x="publicado">✓ Publicado</button>')+'<button class="btn btn-sm btn-primary" data-x="editar">✏ Editar</button>';
        var imgs=(d.imagens||[]).map(function(u){ return '<div style="display:inline-block;margin:4px;text-align:center">'+mediaView(u)+'<br><a href="'+u+'" download class="text-sm" style="color:var(--primary)">baixar</a></div>'; }).join('') || '<span class="text-sm text-muted">sem mídia</span>';
        body='<div class="text-sm text-muted">Categoria</div><div style="margin-bottom:8px;font-weight:600">'+(d.categoria||'—')+'</div>'
          +'<div class="text-sm text-muted">Tema</div><div style="display:flex;gap:8px;align-items:center;margin-bottom:8px"><div style="flex:1">'+(d.tema||'—')+'</div><button class="fel-ic" data-copy="tema" title="Copiar">📋</button></div>'
          +'<div class="text-sm text-muted">Post</div><div style="display:flex;gap:8px;align-items:flex-start;margin-bottom:8px"><div style="flex:1;white-space:pre-wrap;background:var(--surface-2);padding:8px;border-radius:8px">'+(_felEsc(d.post||'—'))+'</div><button class="fel-ic" data-copy="post" title="Copiar">📋</button></div>'
          +'<div class="text-sm text-muted">Hashtags</div><div style="display:flex;gap:8px;align-items:center;margin-bottom:8px"><div style="flex:1">'+(_felEsc(d.hashtags||'—'))+'</div><button class="fel-ic" data-copy="hashtags" title="Copiar">📋</button></div>'
          +'<div style="display:flex;gap:24px;margin-bottom:8px"><div><div class="text-sm text-muted">Data</div><div>'+(d.data||'—')+'</div></div><div><div class="text-sm text-muted">Planejador</div><div>'+(d.planejador||'—')+'</div></div></div>'
          +'<div class="text-sm text-muted">Mídia</div><div>'+imgs+'</div>';
      } else {
        var d2=state.data;
        titulo=state.id?'Editar publicação':'Nova publicação';
        headerBtns='<button class="btn btn-sm btn-secondary" data-x="close">Fechar</button><button class="btn btn-sm btn-primary" data-x="salvar">💾 Salvar</button>';
        var imgs=(d2.imagens||[]).map(mediaEdit).join('');
        body='<div class="form-group"><label class="form-label">Categoria</label><select id="pm-categoria" class="form-control">'+_optSel(PUB_CATEGORIAS,d2.categoria||'')+'</select></div>'
          +'<div class="form-group"><label class="form-label">Tema</label><input id="pm-tema" class="form-control" value="'+(d2.tema||'').replace(/"/g,'&quot;')+'"></div>'
          +'<div class="form-group"><label class="form-label">Post</label><textarea id="pm-post" class="form-control" rows="5">'+_felEsc(d2.post||'')+'</textarea></div>'
          +'<div class="form-group"><label class="form-label">Hashtags</label><input id="pm-hashtags" class="form-control" value="'+(d2.hashtags||'').replace(/"/g,'&quot;')+'"></div>'
          +'<div style="display:flex;gap:12px"><div class="form-group" style="flex:1"><label class="form-label">Data</label><input type="date" id="pm-data" class="form-control" value="'+(d2.data||'')+'"></div><div class="form-group" style="flex:1"><label class="form-label">Planejador</label><select id="pm-planejador" class="form-control">'+_optSel(PUB_PLANEJADOR,d2.planejador||'')+'</select></div></div>'
          +'<div class="form-group"><label class="form-label">Mídia (imagem ou vídeo)</label><div>'+(imgs||'<span class="text-sm text-muted">nenhuma</span>')+'</div>'+(state.id?'<input type="file" id="pm-img" accept="image/*,video/*" multiple style="margin-top:8px">':'<div class="text-sm text-muted" style="margin-top:6px">Salve primeiro para anexar mídia</div>')+'</div>';
      }
      ov.innerHTML='<div style="background:#fff;border-radius:12px;max-width:560px;width:100%;max-height:90vh;display:flex;flex-direction:column">'
        +'<div style="flex-shrink:0;background:#fff;border-bottom:1px solid var(--border);border-radius:12px 12px 0 0;padding:12px 18px;display:flex;justify-content:space-between;align-items:center;gap:10px">'
          +'<h3 style="margin:0;font-size:17px;white-space:nowrap">'+titulo+'</h3>'
          +'<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;justify-content:flex-end">'+headerBtns+'<button class="fel-ic" data-x="close" title="Fechar" style="font-size:20px;line-height:1">×</button></div>'
        +'</div>'
        +'<div style="overflow:auto;padding:18px;flex:1;min-height:0">'+body+'</div>'
      +'</div>';
    }
    ov.addEventListener('click', async function(e){
      if(e.target===ov){ fechar(); return; }
      var cp=e.target.closest('[data-copy]'); if(cp){ copiarTexto(state.data[cp.getAttribute('data-copy')]||''); toast('Copiado','success'); return; }
      var di=e.target.closest('[data-delimg]'); if(di){ await salvarCampos(); try{ state.data=await _authFetch('DELETE','/publicacoes/'+state.id+'/imagem',{url:di.getAttribute('data-delimg')}); render(); }catch(err){toast(err.message,'error');} return; }
      var x=e.target.closest('[data-x]'); if(!x) return;
      var act=x.getAttribute('data-x');
      if(act==='close'){ fechar(); }
      else if(act==='editar'){ state.mode='edit'; render(); }
      else if(act==='publicado'){ await salvarCampos(); try{ state.data=await _authFetch('PATCH','/publicacoes/'+state.id,{planejador:'Publicado'}); render(); }catch(err){toast(err.message,'error');} }
      else if(act==='salvar'){
        var body={categoria:_v('pm-categoria'),tema:_v('pm-tema'),post:document.getElementById('pm-post').value,hashtags:_v('pm-hashtags'),data:_v('pm-data'),planejador:_v('pm-planejador')};
        try{
          if(state.id){ state.data=await _authFetch('PATCH','/publicacoes/'+state.id,body); }
          else { var r=await _authFetch('POST','/publicacoes',body); state.data=r; state.id=r.id; }
          toast('Salvo','success'); state.mode='view'; render();
        }catch(err){ toast(err.message,'error'); }
      }
    });
    ov.addEventListener('change', async function(e){
      var f=e.target.closest('#pm-img'); if(!f||!f.files.length) return;
      await salvarCampos();
      for(var i=0;i<f.files.length;i++){
        var fd=new FormData(); fd.append('foto',f.files[i]);
        try{ var r=await fetch('/api/publicacoes/'+state.id+'/imagem',{method:'POST',headers:{'Authorization':'Bearer '+getToken()},body:fd}); var data=await r.json(); if(r.ok) state.data=data; }catch(err){}
      }
      render();
    });
    render();
  };

  if(!window._pf2Bound){
    window._pf2Bound=true;
    document.addEventListener('click', function(e){
      var b=e.target.closest && e.target.closest('#publicacoes-root [data-pf2]'); if(!b) return;
      var v=b.getAttribute('data-pf2');
      filtrosPub.arquivado=false; filtrosPub.excluido=false; filtrosPub.planejador='';
      if(v==='arq') filtrosPub.arquivado=true;
      else if(v==='exc') filtrosPub.excluido=true;
      else if(v!=='all') filtrosPub.planejador=v;
      carregarPublicacoes();
    });
    document.addEventListener('click', function(e){
      var r=e.target.closest && e.target.closest('#publicacoes-root [data-prestore]'); if(!r) return;
      _authFetch('PATCH','/publicacoes/'+r.getAttribute('data-prestore'),{excluido:false}).then(function(){carregarPublicacoes();}).catch(function(err){toast(err.message,'error');});
    });
  }
})();

/* ===== Publicacoes v12: cores por status + data (Agendado=verde, Planejado=azul, vencido=vermelho) ===== */
(function(){
  var EDIT='<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125"/></svg>';
  var DUP='<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 0 0-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5"/></svg>';
  var ARCH='<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0-3-3m3 3 3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z"/></svg>';
  var TRASH='<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166M18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"/></svg>';
  function _pubHoje(){ var d=new Date(); return d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2); }

  window.renderPublicacoes=function(lista){
    window._pubs=lista;
    var root=document.getElementById('publicacoes-root'); if(!root) return;
    var C=window._pubCounts||{}, exc=filtrosPub.excluido, arq=filtrosPub.arquivado, hoje=_pubHoje();
    function fbtn(label,v,count,active){ return '<button class="btn '+(active?'btn-primary':'btn-secondary')+'" data-pf2="'+v+'" style="min-width:150px;padding:11px 14px;font-size:14px;font-weight:600">'+label+' <span style="opacity:.75">('+(count||0)+')</span></button>'; }
    var filtros='<div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end">'
      + fbtn('Todos','all',C.total,(!arq && !exc && !filtrosPub.planejador))
      + PUB_PLANEJADOR.map(function(s){ return fbtn(s,s,C[s],(!arq && !exc && filtrosPub.planejador===s)); }).join('')
      + fbtn('📦 Arquivados','arq',C.arquivados,!!arq && !exc)
      + fbtn('🗑 Excluídos','exc',C.excluidos,!!exc)
      +'</div>';
    var toolbar='<div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:10px;margin-bottom:14px"><button class="btn btn-primary" data-pm3="nova" style="padding:11px 16px;font-size:14px">＋ Nova publicação</button>'+filtros+'</div>';
    var cg='<colgroup><col style="width:5%"><col style="width:12%"><col style="width:25%"><col style="width:12%"><col style="width:11%"><col style="width:12%"><col style="width:17%"></colgroup>';
    var rows=(lista||[]).map(function(p){
      var st=p.planejador||'';
      var pub=st==='Publicado';
      var completo=!!(p.post && p.imagens && p.imagens.length && p.hashtags && p.data);
      var passou = p.data && p.data < hoje;
      var bg='';
      if(exc){ bg=''; }
      else if(pub){ bg=''; }
      else if(st==='Insight'){ bg = completo ? '#dbeafe' : '#fde68a'; }
      else if(st==='Planejado'){
        if(!p.data) bg='#fee2e2';
        else if(passou) bg='#fca5a5';
        else bg='#dbeafe';
      }
      else if(st==='Agendado'){ bg = passou ? '#fca5a5' : '#dcfce7'; }
      var trStyle = bg ? ' style="background:'+bg+'"' : '';
      var badge=st? '<span style="background:'+(pub?'#dcfce7':'var(--primary-light)')+';color:'+(pub?'#15803d':'var(--primary)')+';padding:2px 8px;border-radius:10px;font-size:12px">'+st+'</span>' : '<span style="color:var(--text-muted)">—</span>';
      var acoes = exc
        ? '<button class="btn btn-sm btn-secondary" data-prestore="'+p.id+'">↩ Restaurar</button>'
        : '<button class="fel-ic" data-pm3="editar" data-id="'+p.id+'" title="Editar">'+EDIT+'</button><button class="fel-ic" data-pm3="dup" data-id="'+p.id+'" title="Duplicar">'+DUP+'</button><button class="fel-ic" data-pm3="arquivar" data-id="'+p.id+'" title="'+(arq?'Desarquivar':'Arquivar')+'" style="color:'+(arq?'#15803d':'#b45309')+'">'+ARCH+'</button><button class="fel-ic" data-pm3="del" data-id="'+p.id+'" title="Excluir" style="color:var(--danger)">'+TRASH+'</button>';
      return '<tr'+trStyle+'>'
        +'<td style="color:var(--text-muted);font-size:12px">#'+(p.numero||'')+'</td>'
        +'<td>'+(p.categoria||'—')+'</td>'
        +'<td><a href="#" data-pm3="view" data-id="'+p.id+'" style="color:var(--primary);font-weight:600;text-decoration:none">'+(p.tema||'(sem tema)')+'</a></td>'
        +'<td style="text-align:center">'+_pubIcons(p)+'</td>'
        +'<td>'+(p.data||'—')+'</td>'
        +'<td>'+badge+'</td>'
        +'<td style="text-align:center;white-space:nowrap">'+acoes+'</td>'
        +'</tr>';
    }).join('');
    var head='<thead><tr><th>ID</th><th>Categoria</th><th>Tema</th><th style="text-align:center">Conteúdo</th><th>Data</th><th>Planejador</th><th></th></tr></thead>';
    var vazio = exc?'Nenhuma excluída':(arq?'Nenhuma arquivada':'Nenhuma publicação');
    root.innerHTML=toolbar+'<table class="tabela-contatos">'+cg+head+'<tbody>'+(rows||'<tr><td colspan="7" style="text-align:center;padding:20px;color:var(--text-muted)">'+vazio+'</td></tr>')+'</tbody></table>';
  };
})();

/* ===== SOCIAL Fase 1b: gerenciar Redes Sociais dentro de Configurações ===== */
(function(){
  function redeBadge(ic){
    var m={linkedin:['in','#0a66c2'], instagram:['IG','#e1306c'], whatsapp:['WA','#25d366']};
    var x=m[ic]||['?','#888'];
    return '<span style="display:inline-flex;width:28px;height:28px;border-radius:50%;background:'+x[1]+';color:#fff;align-items:center;justify-content:center;font-size:11px;font-weight:800">'+x[0]+'</span>';
  }
  function slug(s){ return (s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,24)||'rede'; }
  function esc(s){ return (s==null?'':String(s)).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); }

  async function carregarRedes(box){
    var lista=[];
    try{ lista=await _authFetch('GET','/redes?todas=true')||[]; }catch(err){ box.innerHTML='<p style="color:var(--danger)">Erro: '+esc(err.message)+'</p>'; return; }
    box._lista=lista;
    var rows=lista.map(function(r){
      return '<div style="display:flex;align-items:center;gap:10px;padding:8px 4px;border-bottom:1px solid var(--border)">'
        +redeBadge(r.icone)
        +'<div style="flex:1;min-width:0"><div style="font-weight:600">'+esc(r.nome)+(r.ativo?'':' <span class="text-sm" style="color:var(--danger)">(inativa)</span>')+'</div><div class="text-sm text-muted">'+esc(r.modulo)+' · '+esc(r.canal)+' · ordem '+r.ordem+'</div></div>'
        +'<button class="btn btn-sm btn-secondary" data-rede-edit="'+r.id+'">✏️</button>'
        +'<button class="btn btn-sm btn-secondary" data-rede-del="'+r.id+'" style="color:var(--danger)">🗑️</button>'
        +'</div>';
    }).join('');
    box.innerHTML='<p class="section-title">Redes Sociais (Social Media)</p>'
      +'<div class="card mb-4"><div class="card-body">'
      +'<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:8px;flex-wrap:wrap"><span class="text-sm text-muted">Redes que aparecem no menu Social e nas Publicações.</span><button class="btn btn-sm btn-primary" data-rede-nova="1">＋ Nova rede</button></div>'
      +(rows||'<p class="text-sm text-muted">Nenhuma rede cadastrada.</p>')
      +'</div></div>';
  }

  function redeModal(box, rede){
    var editar=!!rede; rede=rede||{icone:'linkedin',modulo:'publicacoes',ordem:0,nome:''};
    var ov=document.createElement('div'); ov.className='rede-modal-ov';
    ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:10001;display:flex;align-items:flex-start;justify-content:center;padding:24px;overflow:auto';
    var INP='width:100%;padding:9px 11px;border:1px solid var(--border,#ccc);border-radius:8px;font-size:14px;box-sizing:border-box';
    function opt(v,l,sel){ return '<option value="'+v+'"'+(sel===v?' selected':'')+'>'+l+'</option>'; }
    ov.innerHTML='<div style="background:#fff;border-radius:12px;max-width:440px;width:100%;padding:20px">'
      +'<h3 style="margin:0 0 12px">'+(editar?'Editar rede':'Nova rede')+'</h3>'
      +'<label class="text-sm" style="font-weight:600">Nome</label><input id="rede-nome" value="'+esc(rede.nome)+'" style="'+INP+';margin:4px 0 10px" placeholder="Ex.: Instagram 3 (Cliente X)">'
      +'<label class="text-sm" style="font-weight:600">Ícone / rede</label><select id="rede-icone" style="'+INP+';margin:4px 0 10px">'+opt('linkedin','💼 LinkedIn',rede.icone)+opt('instagram','📷 Instagram',rede.icone)+opt('whatsapp','🟢 WhatsApp',rede.icone)+'</select>'
      +'<label class="text-sm" style="font-weight:600">Ordem no menu</label><input id="rede-ordem" type="number" value="'+(rede.ordem||0)+'" style="'+INP+';margin:4px 0 10px">'
      +(editar?'':'<label class="text-sm" style="font-weight:600">Tipo</label><select id="rede-modulo" style="'+INP+';margin:4px 0 10px">'+opt('publicacoes','Publicações',rede.modulo)+opt('bebidas','Cervejas (módulo Instagram 2)',rede.modulo)+'</select>')
      +'<div id="rede-err" style="color:var(--danger);font-size:13px;min-height:18px"></div>'
      +'<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:8px"><button class="btn btn-secondary" data-rx="close">Cancelar</button><button class="btn btn-primary" data-rx="salvar">Salvar</button></div>'
      +'</div>';
    document.body.appendChild(ov);
    ov.addEventListener('click', async function(e){
      if(e.target===ov || e.target.closest('[data-rx="close"]')){ ov.remove(); return; }
      if(e.target.closest('[data-rx="salvar"]')){
        var nome=document.getElementById('rede-nome').value.trim();
        var icone=document.getElementById('rede-icone').value;
        var ordem=parseInt(document.getElementById('rede-ordem').value)||0;
        if(!nome){ document.getElementById('rede-err').textContent='Informe o nome.'; return; }
        try{
          if(editar){ await _authFetch('PATCH','/redes/'+rede.id,{nome:nome,icone:icone,ordem:ordem}); }
          else{ var modulo=document.getElementById('rede-modulo').value; var canal=(modulo==='bebidas')?'bebidas':(slug(nome)+'-'+Math.random().toString(36).slice(2,6)); await _authFetch('POST','/redes',{nome:nome,icone:icone,ordem:ordem,modulo:modulo,canal:canal}); }
          ov.remove(); carregarRedes(box); if(typeof recarregarMenuSocial==='function') recarregarMenuSocial();
        }catch(err){ document.getElementById('rede-err').textContent='Erro: '+err.message; }
      }
    });
  }

  document.addEventListener('click', function(e){
    var box=document.getElementById('cfg-redes'); if(!box) return;
    var nv=e.target.closest('[data-rede-nova]'); if(nv){ redeModal(box,null); return; }
    var ed=e.target.closest('[data-rede-edit]'); if(ed){ var r=(box._lista||[]).filter(function(x){return x.id===ed.getAttribute('data-rede-edit');})[0]; if(r) redeModal(box,r); return; }
    var dl=e.target.closest('[data-rede-del]'); if(dl){ if(confirm('Excluir esta rede? (as publicações dela continuam no banco)')){ _authFetch('DELETE','/redes/'+dl.getAttribute('data-rede-del')).then(function(){carregarRedes(box); if(typeof recarregarMenuSocial==='function') recarregarMenuSocial();}).catch(function(err){toast(err.message,'error');}); } return; }
  });

  function montarRedesConfig(){
    var pc=document.querySelector('#page-configuracoes .page-content'); if(!pc) return;
    var box=document.getElementById('cfg-redes');
    if(!box){ box=document.createElement('div'); box.id='cfg-redes';
      var conta=document.getElementById('cfg-conta');
      if(conta && conta.nextSibling) pc.insertBefore(box, conta.nextSibling); else pc.insertBefore(box, pc.firstChild);
    }
    carregarRedes(box);
  }
  window.montarRedesConfig=montarRedesConfig;
  montarRedesConfig();
  document.addEventListener('click', function(e){ var b=e.target && e.target.closest && e.target.closest('[data-page="configuracoes"]'); if(b) setTimeout(montarRedesConfig,90); });
})();

/* ===== SOCIAL Fase 1c: menu SOCIAL MEDIA (redes) + Cervejas no ANDERSON ===== */
(function(){
  function redeBadge(ic){
    var m={linkedin:['in','#0a66c2'], instagram:['IG','#e1306c'], whatsapp:['WA','#25d366']};
    var x=m[ic]||['?','#888'];
    return '<span style="display:inline-flex;width:20px;height:20px;border-radius:50%;background:'+x[1]+';color:#fff;align-items:center;justify-content:center;font-size:9px;font-weight:800;flex:0 0 auto">'+x[0]+'</span>';
  }
  var GRUPOS_FIXOS=[
    {g:'ADMIN', it:[['configuracoes','Configurações','⚙️'],['usuarios','Usuários','👤']]},
    {g:'CardBase', it:[['cadastro','Cadastro','➕'],['empresas','Empresas','🏢'],['contatos','Contatos','👥'],['dashboard','Dashboard','📊']]}
  ];
  var GRUPOS_POS=[
    {g:'ANDERSON', it:[['qrcode','Meu QR Code','🔳'],['acessos','Acessos','🔑'],['links','Links','🔗'],['fotos','Fotos','🖼️'],['bebidas','Catálogo de Cervejas','🍺']]},
    {g:'LINKEDIN', it:[['felicitacoes','Felicitações','💬'],['lembretes','Lembretes','⏰']]},
    {g:'PROSPECÇÃO', it:[['pitch','Pitch','🎯'],['saudacao','Saudação','👋'],['cadencia','Cadência','📅']]}
  ];

  async function construirMenu(){
    var nav=document.querySelector('.desktop-nav'); if(!nav) return;
    var redes=window._redesCache||[];
    try{ redes=await _authFetch('GET','/redes')||[]; window._redesCache=redes; }
    catch(e){ console.warn('[SOCIAL MEDIA] Falha ao buscar /redes, mantendo cache anterior:', e); redes=window._redesCache||[]; if(!redes.length){ setTimeout(function(){ if(typeof recarregarMenuSocial==='function') recarregarMenuSocial(); }, 2000); } }
    var social={g:'SOCIAL MEDIA', it: redes.map(function(r){ return ['rede:'+r.canal, r.nome, redeBadge(r.icone)]; }) };
    var GRUPOS=GRUPOS_FIXOS.concat([social]).concat(GRUPOS_POS);
    var html='<div class="desktop-nav-logo">📇 SGC</div><div style="font-size:10px;color:var(--text-muted);padding:0 12px 8px;margin-top:-4px">Sistema de Gestão Comercial</div>';
    html+='<button id="nav-collapse-btn" class="desktop-nav-item" title="Recolher menu" style="display:flex;justify-content:space-between;align-items:center;width:100%"><span>Menu</span><span style="font-size:18px;line-height:1">≡</span></button>';
    html+='<div class="nav-scroll" style="flex:1;overflow-y:auto;min-height:0">';
    GRUPOS.forEach(function(gr,gi){
      html+='<button class="nav-grp-head" data-grp="'+gi+'"><span>'+gr.g+'</span><span class="nav-caret">▸</span></button>';
      html+='<div class="nav-grp-items" data-items="'+gi+'" style="display:none">';
      gr.it.forEach(function(it){
        var ic = (it[2]&&it[2].charAt(0)==='<') ? it[2] : '<span style="width:20px;text-align:center;display:inline-block">'+(it[2]||'')+'</span>';
        html+='<button class="desktop-nav-item nav-sub" data-page="'+it[0]+'" style="display:flex;align-items:center;gap:8px">'+ic+' <span>'+it[1]+'</span></button>';
      });
      html+='</div>';
    });
    html+='</div>';
    nav.innerHTML=html;
    function setOpen(gi){ gi=String(gi); nav.querySelectorAll('.nav-grp-items').forEach(function(d){ d.style.display=(d.getAttribute('data-items')===gi)?'block':'none'; }); nav.querySelectorAll('.nav-grp-head').forEach(function(h){ h.querySelector('.nav-caret').textContent=(h.getAttribute('data-grp')===gi)?'▾':'▸'; }); }
    nav.querySelectorAll('.nav-grp-head').forEach(function(h){ h.addEventListener('click', function(){ setOpen(h.getAttribute('data-grp')); }); });
    nav.querySelectorAll('.desktop-nav-item[data-page]').forEach(function(b){ b.addEventListener('click', function(){ menuClick(b.getAttribute('data-page'), b); }); });
    var col=document.getElementById('nav-collapse-btn'); if(col) col.addEventListener('click', function(){ document.body.classList.add('nav-off'); });
    setOpen(2);
    if(typeof aplicarPermissoes==='function') setTimeout(aplicarPermissoes,200);
  }

  function menuClick(id, b){
    if(id.indexOf('rede:')===0){
      var canal=id.slice(5);
      window.PUB_CANAL=canal;
      if(window.filtrosPub){ filtrosPub.arquivado=false; filtrosPub.excluido=false; filtrosPub.planejador=''; }
      window._pubCounts=null;
      var cur=document.querySelector('.page.active'); if(cur) cur.classList.remove('active');
      var pg=document.getElementById('page-publicacoes'); if(pg) pg.classList.add('active');
      document.querySelectorAll('.desktop-nav-item').forEach(function(x){x.classList.remove('active');});
      if(b) b.classList.add('active');
      var rede=null; (window._redesCache||[]).forEach(function(r){ if(r.canal===canal) rede=r; });
      var h=document.querySelector('#page-publicacoes .app-header h2'); if(h && rede) h.textContent=rede.nome;
      window.scrollTo(0,0);
      if(typeof carregarPublicacoes==='function') carregarPublicacoes();
      return;
    }
    if(id==='cadastro'){ if(typeof abrirNovoContato==='function') abrirNovoContato('foto'); return; }
    if(id==='bebidas'){ if(typeof navegarPara==='function') navegarPara('bebidas'); if(typeof carregarBebidas==='function') carregarBebidas(); return; }
    navegarPara(id);
    if(id==='felicitacoes' && typeof carregarFelicitacoes==='function') carregarFelicitacoes();
    if(id==='felicitacoes-ig' && typeof carregarFelicitacoesIG==='function') carregarFelicitacoesIG();
    if(id==='lembretes' && typeof carregarLembretes==='function') carregarLembretes();
    if(id==='lembretes-ig' && typeof carregarLembretesIG==='function') carregarLembretesIG();
    if(id==='usuarios' && typeof carregarUsuarios==='function') carregarUsuarios();
    if(id==='pitch' && typeof carregarPitch==='function') carregarPitch();
    if(id==='configuracoes'){ setTimeout(function(){ if(typeof cfgInit==='function') cfgInit(); if(typeof montarRedesConfig==='function') montarRedesConfig(); },100); }
  }

  window.recarregarMenuSocial=function(){ construirMenu(); };
})();

/* ===== SOCIAL Fase 1c-v2: acordeão toggle + Felicitações→Prospecção + Lembretes fixo no topo ===== */
(function(){
  function redeBadge(ic){
    var m={linkedin:['in','#0a66c2'], instagram:['IG','#e1306c'], whatsapp:['WA','#25d366']};
    var x=m[ic]||['?','#888'];
    return '<span style="display:inline-flex;width:20px;height:20px;border-radius:50%;background:'+x[1]+';color:#fff;align-items:center;justify-content:center;font-size:9px;font-weight:800;flex:0 0 auto">'+x[0]+'</span>';
  }
  var GRUPOS_FIXOS=[
    {g:'ADMIN', it:[['configuracoes','Configurações','⚙️'],['usuarios','Usuários','👤']]},
    {g:'CardBase', it:[['cadastro','Cadastro','➕'],['empresas','Empresas','🏢'],['contatos','Contatos','👥'],['dashboard','Dashboard','📊']]}
  ];
  var GRUPOS_POS=[
    {g:'ANDERSON', it:[['qrcode','Meu QR Code','🔳'],['acessos','Acessos','🔑'],['links','Links','🔗'],['fotos','Fotos','🖼️'],['bebidas','Catálogo de Cervejas','🍺']]},
    {g:'PROSPECÇÃO', it:[['pitch','Pitch','🎯'],['saudacao','Saudação','👋'],['cadencia','Cadência','📅'],['felicitacoes','Felicitações','💬']]}
  ];

  async function construirMenu(){
    var nav=document.querySelector('.desktop-nav'); if(!nav) return;
    var redes=window._redesCache||[];
    try{ redes=await _authFetch('GET','/redes')||[]; window._redesCache=redes; }
    catch(e){ console.warn('[SOCIAL MEDIA] Falha ao buscar /redes, mantendo cache anterior:', e); redes=window._redesCache||[]; if(!redes.length){ setTimeout(function(){ if(typeof recarregarMenuSocial==='function') recarregarMenuSocial(); }, 2000); } }
    var social={g:'SOCIAL MEDIA', it: redes.map(function(r){ return ['rede:'+r.canal, r.nome, redeBadge(r.icone)]; }) };
    var GRUPOS=GRUPOS_FIXOS.concat([social]).concat(GRUPOS_POS);
    var html='<div class="desktop-nav-logo">📇 SGC</div><div style="font-size:10px;color:var(--text-muted);padding:0 12px 8px;margin-top:-4px">Sistema de Gestão Comercial</div>';
    html+='<button id="nav-collapse-btn" class="desktop-nav-item" title="Recolher menu" style="display:flex;justify-content:space-between;align-items:center;width:100%"><span>Menu</span><span style="font-size:18px;line-height:1">≡</span></button>';
    html+='<button class="desktop-nav-item nav-sub" data-page="lembretes" style="display:flex;align-items:center;gap:8px"><span style="width:20px;text-align:center;display:inline-block">⏰</span> <span>Lembretes</span></button>';
    html+='<div class="nav-scroll" style="flex:1;overflow-y:auto;min-height:0">';
    GRUPOS.forEach(function(gr,gi){
      html+='<button class="nav-grp-head" data-grp="'+gi+'"><span>'+gr.g+'</span><span class="nav-caret">▸</span></button>';
      html+='<div class="nav-grp-items" data-items="'+gi+'" style="display:none">';
      gr.it.forEach(function(it){
        var ic=(it[2]&&it[2].charAt(0)==='<')?it[2]:'<span style="width:20px;text-align:center;display:inline-block">'+(it[2]||'')+'</span>';
        html+='<button class="desktop-nav-item nav-sub" data-page="'+it[0]+'" style="display:flex;align-items:center;gap:8px">'+ic+' <span>'+it[1]+'</span></button>';
      });
      html+='</div>';
    });
    html+='</div>';
    nav.innerHTML=html;
    var _open=null;
    function setOpen(gi){
      gi=(gi==null)?null:String(gi);
      nav.querySelectorAll('.nav-grp-items').forEach(function(d){ d.style.display=(gi!=null && d.getAttribute('data-items')===gi)?'block':'none'; });
      nav.querySelectorAll('.nav-grp-head').forEach(function(h){ h.querySelector('.nav-caret').textContent=(gi!=null && h.getAttribute('data-grp')===gi)?'▾':'▸'; });
      _open=gi;
    }
    nav.querySelectorAll('.nav-grp-head').forEach(function(h){ h.addEventListener('click', function(){ var g=h.getAttribute('data-grp'); setOpen(g===_open?null:g); }); });
    nav.querySelectorAll('.desktop-nav-item[data-page]').forEach(function(b){ b.addEventListener('click', function(){ menuClick(b.getAttribute('data-page'), b); }); });
    var col=document.getElementById('nav-collapse-btn'); if(col) col.addEventListener('click', function(){ document.body.classList.add('nav-off'); });
    setOpen('2');
    if(typeof aplicarPermissoes==='function') setTimeout(aplicarPermissoes,200);
  }

  function menuClick(id,b){
    if(id.indexOf('rede:')===0){
      var canal=id.slice(5);
      window.PUB_CANAL=canal;
      if(window.filtrosPub){ filtrosPub.arquivado=false; filtrosPub.excluido=false; filtrosPub.planejador=''; }
      window._pubCounts=null;
      var cur=document.querySelector('.page.active'); if(cur) cur.classList.remove('active');
      var pg=document.getElementById('page-publicacoes'); if(pg) pg.classList.add('active');
      document.querySelectorAll('.desktop-nav-item').forEach(function(x){x.classList.remove('active');});
      if(b) b.classList.add('active');
      var rede=null; (window._redesCache||[]).forEach(function(r){ if(r.canal===canal) rede=r; });
      var h=document.querySelector('#page-publicacoes .app-header h2'); if(h && rede) h.textContent=rede.nome;
      window.scrollTo(0,0);
      if(typeof carregarPublicacoes==='function') carregarPublicacoes();
      return;
    }
    if(id==='cadastro'){ if(typeof abrirNovoContato==='function') abrirNovoContato('foto'); return; }
    if(id==='bebidas'){ if(typeof navegarPara==='function') navegarPara('bebidas'); if(typeof carregarBebidas==='function') carregarBebidas(); return; }
    navegarPara(id);
    if(id==='felicitacoes' && typeof carregarFelicitacoes==='function') carregarFelicitacoes();
    if(id==='felicitacoes-ig' && typeof carregarFelicitacoesIG==='function') carregarFelicitacoesIG();
    if(id==='lembretes' && typeof carregarLembretes==='function') carregarLembretes();
    if(id==='lembretes-ig' && typeof carregarLembretesIG==='function') carregarLembretesIG();
    if(id==='usuarios' && typeof carregarUsuarios==='function') carregarUsuarios();
    if(id==='pitch' && typeof carregarPitch==='function') carregarPitch();
    if(id==='configuracoes'){ setTimeout(function(){ if(typeof cfgInit==='function') cfgInit(); if(typeof montarRedesConfig==='function') montarRedesConfig(); },100); }
  }

  window.recarregarMenuSocial=function(){ construirMenu(); };
})();

/* ===== SOCIAL Fase 1c-v3: Lembretes dentro do grupo SOCIAL MEDIA ===== */
(function(){
  function redeBadge(ic){
    var m={linkedin:['in','#0a66c2'], instagram:['IG','#e1306c'], whatsapp:['WA','#25d366']};
    var x=m[ic]||['?','#888'];
    return '<span style="display:inline-flex;width:20px;height:20px;border-radius:50%;background:'+x[1]+';color:#fff;align-items:center;justify-content:center;font-size:9px;font-weight:800;flex:0 0 auto">'+x[0]+'</span>';
  }
  var GRUPOS_FIXOS=[
    {g:'ADMIN', it:[['configuracoes','Configurações','⚙️'],['usuarios','Usuários','👤']]},
    {g:'CardBase', it:[['cadastro','Cadastro','➕'],['empresas','Empresas','🏢'],['contatos','Contatos','👥'],['dashboard','Dashboard','📊']]}
  ];
  var GRUPOS_POS=[
    {g:'ANDERSON', it:[['qrcode','Meu QR Code','🔳'],['acessos','Acessos','🔑'],['links','Links','🔗'],['fotos','Fotos','🖼️'],['bebidas','Catálogo de Cervejas','🍺']]},
    {g:'PROSPECÇÃO', it:[['pitch','Pitch','🎯'],['saudacao','Saudação','👋'],['cadencia','Cadência','📅'],['felicitacoes','Felicitações','💬']]}
  ];

  async function construirMenu(){
    var nav=document.querySelector('.desktop-nav'); if(!nav) return;
    var redes=window._redesCache||[];
    try{ redes=await _authFetch('GET','/redes')||[]; window._redesCache=redes; }
    catch(e){ console.warn('[SOCIAL MEDIA] Falha ao buscar /redes, mantendo cache anterior:', e); redes=window._redesCache||[]; if(!redes.length){ setTimeout(function(){ if(typeof recarregarMenuSocial==='function') recarregarMenuSocial(); }, 2000); } }
    var social={g:'SOCIAL MEDIA', it: redes.map(function(r){ return ['rede:'+r.canal, r.nome, redeBadge(r.icone)]; }) };
    social.it.push(['lembretes','Lembretes','⏰']);
    var GRUPOS=GRUPOS_FIXOS.concat([social]).concat(GRUPOS_POS);
    var html='<div class="desktop-nav-logo">📇 SGC</div><div style="font-size:10px;color:var(--text-muted);padding:0 12px 8px;margin-top:-4px">Sistema de Gestão Comercial</div>';
    html+='<button id="nav-collapse-btn" class="desktop-nav-item" title="Recolher menu" style="display:flex;justify-content:space-between;align-items:center;width:100%"><span>Menu</span><span style="font-size:18px;line-height:1">≡</span></button>';
    html+='<div class="nav-scroll" style="flex:1;overflow-y:auto;min-height:0">';
    GRUPOS.forEach(function(gr,gi){
      html+='<button class="nav-grp-head" data-grp="'+gi+'"><span>'+gr.g+'</span><span class="nav-caret">▸</span></button>';
      html+='<div class="nav-grp-items" data-items="'+gi+'" style="display:none">';
      gr.it.forEach(function(it){
        var ic=(it[2]&&it[2].charAt(0)==='<')?it[2]:'<span style="width:20px;text-align:center;display:inline-block">'+(it[2]||'')+'</span>';
        html+='<button class="desktop-nav-item nav-sub" data-page="'+it[0]+'" style="display:flex;align-items:center;gap:8px">'+ic+' <span>'+it[1]+'</span></button>';
      });
      html+='</div>';
    });
    html+='</div>';
    nav.innerHTML=html;
    var _open=null;
    function setOpen(gi){
      gi=(gi==null)?null:String(gi);
      nav.querySelectorAll('.nav-grp-items').forEach(function(d){ d.style.display=(gi!=null && d.getAttribute('data-items')===gi)?'block':'none'; });
      nav.querySelectorAll('.nav-grp-head').forEach(function(h){ h.querySelector('.nav-caret').textContent=(gi!=null && h.getAttribute('data-grp')===gi)?'▾':'▸'; });
      _open=gi;
    }
    nav.querySelectorAll('.nav-grp-head').forEach(function(h){ h.addEventListener('click', function(){ var g=h.getAttribute('data-grp'); setOpen(g===_open?null:g); }); });
    nav.querySelectorAll('.desktop-nav-item[data-page]').forEach(function(b){ b.addEventListener('click', function(){ menuClick(b.getAttribute('data-page'), b); }); });
    var col=document.getElementById('nav-collapse-btn'); if(col) col.addEventListener('click', function(){ document.body.classList.add('nav-off'); });
    setOpen('2');
    if(typeof aplicarPermissoes==='function') setTimeout(aplicarPermissoes,200);
  }

  function menuClick(id,b){
    if(id.indexOf('rede:')===0){
      var canal=id.slice(5);
      window.PUB_CANAL=canal;
      if(window.filtrosPub){ filtrosPub.arquivado=false; filtrosPub.excluido=false; filtrosPub.planejador=''; }
      window._pubCounts=null;
      var cur=document.querySelector('.page.active'); if(cur) cur.classList.remove('active');
      var pg=document.getElementById('page-publicacoes'); if(pg) pg.classList.add('active');
      document.querySelectorAll('.desktop-nav-item').forEach(function(x){x.classList.remove('active');});
      if(b) b.classList.add('active');
      var rede=null; (window._redesCache||[]).forEach(function(r){ if(r.canal===canal) rede=r; });
      var h=document.querySelector('#page-publicacoes .app-header h2'); if(h && rede) h.textContent=rede.nome;
      window.scrollTo(0,0);
      if(typeof carregarPublicacoes==='function') carregarPublicacoes();
      return;
    }
    if(id==='cadastro'){ if(typeof abrirNovoContato==='function') abrirNovoContato('foto'); return; }
    if(id==='bebidas'){ if(typeof navegarPara==='function') navegarPara('bebidas'); if(typeof carregarBebidas==='function') carregarBebidas(); return; }
    navegarPara(id);
    if(id==='felicitacoes' && typeof carregarFelicitacoes==='function') carregarFelicitacoes();
    if(id==='felicitacoes-ig' && typeof carregarFelicitacoesIG==='function') carregarFelicitacoesIG();
    if(id==='lembretes' && typeof carregarLembretes==='function') carregarLembretes();
    if(id==='lembretes-ig' && typeof carregarLembretesIG==='function') carregarLembretesIG();
    if(id==='usuarios' && typeof carregarUsuarios==='function') carregarUsuarios();
    if(id==='pitch' && typeof carregarPitch==='function') carregarPitch();
    if(id==='configuracoes'){ setTimeout(function(){ if(typeof cfgInit==='function') cfgInit(); if(typeof montarRedesConfig==='function') montarRedesConfig(); },100); }
  }

  window.recarregarMenuSocial=function(){ construirMenu(); };
})();

/* ===== Cervejas → Planejar publicação (item 2): config no Admin + botão no modal ===== */
(function(){
  async function montarCervejasConfig(){
    var pc=document.querySelector('#page-configuracoes .page-content'); if(!pc) return;
    var box=document.getElementById('cfg-cervejas-rede');
    if(!box){ box=document.createElement('div'); box.id='cfg-cervejas-rede';
      var redes=document.getElementById('cfg-redes');
      if(redes && redes.nextSibling) pc.insertBefore(box, redes.nextSibling); else pc.insertBefore(box, pc.firstChild);
    }
    var lista=[], atual='';
    try{ lista=await _authFetch('GET','/redes')||[]; }catch(e){}
    try{ var cfg=await _authFetch('GET','/configuracoes/rede_cervejas'); atual=(cfg&&(cfg.valor&&(cfg.valor.canal||cfg.valor)))||''; }catch(e){}
    var opts='<option value="">— escolher —</option>'+lista.map(function(r){ return '<option value="'+r.canal+'"'+(r.canal===atual?' selected':'')+'>'+r.nome+'</option>'; }).join('');
    box.innerHTML='<p class="section-title">Publicação do Catálogo de Cervejas</p><div class="card mb-4"><div class="card-body"><label class="text-sm" style="font-weight:600;display:block;margin-bottom:6px">Rede onde o botão "Planejar publicação" cria as publicações das cervejas</label><select id="cfg-cerv-rede" class="form-control" style="max-width:380px">'+opts+'</select></div></div>';
    document.getElementById('cfg-cerv-rede').addEventListener('change', async function(){
      try{ await _authFetch('PUT','/configuracoes/rede_cervejas',{chave:'rede_cervejas',valor:this.value}); toast('Rede das cervejas salva','success'); }
      catch(err){ toast('Erro: '+err.message,'error'); }
    });
  }
  window.montarCervejasConfig=montarCervejasConfig;
  montarCervejasConfig();
  document.addEventListener('click', function(e){ var b=e.target&&e.target.closest&&e.target.closest('[data-page="configuracoes"]'); if(b) setTimeout(montarCervejasConfig,110); });

  window.abrirBebidaModal=function(beb, mode){
    var state={ id:(beb&&beb.id)||null, mode:mode||'view', data:Object.assign({imagens:[]}, beb||{}) };
    var ov=document.getElementById('beb-modal'); if(ov) ov.remove();
    ov=document.createElement('div'); ov.id='beb-modal';
    ov.style.cssText='position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.5);z-index:9999;display:flex;align-items:flex-start;justify-content:center;padding:20px;overflow:auto';
    document.body.appendChild(ov);
    function fechar(){ ov.remove(); carregarBebidas(); }
    function stars(n){ n=parseInt(n)||0; var s=''; for(var i=1;i<=5;i++) s+=(i<=n?'★':'☆'); return s; }
    function rowv(l,v){ return '<div style="margin-bottom:4px"><div class="text-sm text-muted">'+l+'</div><div>'+(v||'—')+'</div></div>'; }
    function V(id){ var el=document.getElementById(id); return el?el.value:''; }
    function inp(id,val,ph){ return '<input id="'+id+'" class="form-control" value="'+(''+(val||'')).replace(/"/g,'&quot;')+'" placeholder="'+(ph||'')+'">'; }
    async function planejar(){
      var nome=(document.getElementById('bm-cerveja')) ? document.getElementById('bm-cerveja').value.trim() : (state.data.cerveja||'');
      nome=nome||state.data.cerveja||'(sem título)';
      var imgs=state.data.imagens||[];
      var canal=null;
      try{ var cfg=await _authFetch('GET','/configuracoes/rede_cervejas'); canal=(cfg&&(cfg.valor&&(cfg.valor.canal||cfg.valor)))||null; }catch(e){}
      if(!canal){ toast('Defina a rede em Configurações › "Publicação do Catálogo de Cervejas".','error'); return; }
      try{
        await _authFetch('POST','/publicacoes',{canal:canal, tema:nome, imagens:imgs, planejador:'Planejado'});
        toast('Publicação planejada! Complete os dados em Publicações.','success');
      }catch(err){ toast('Erro ao planejar: '+err.message,'error'); }
    }
    function render(){
      var d=state.data;
      if(state.mode==='view'){
        var imgs=(d.imagens||[]).map(function(u){return '<div style="display:inline-block;margin:4px;text-align:center"><img src="'+u+'" style="width:90px;height:90px;object-fit:cover;border-radius:8px;border:1px solid var(--border)"><br><a href="'+u+'" download class="text-sm" style="color:var(--primary)">baixar</a></div>';}).join('')||'<span class="text-sm text-muted">sem imagens</span>';
        var tags=''; if(d.story) tags+='<span style="background:var(--primary-light);color:var(--primary);padding:2px 8px;border-radius:10px;font-size:12px;margin-right:6px">📱 Story</span>'; if(d.whatsapp) tags+='<span style="background:#dcfce7;color:#15803d;padding:2px 8px;border-radius:10px;font-size:12px">🟢 WhatsApp</span>';
        ov.innerHTML='<div style="background:#fff;border-radius:12px;max-width:600px;width:100%;padding:20px">'
          +'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px"><h3 style="margin:0">#'+(d.numero||'')+' · '+(d.cerveja||'')+'</h3><button class="fel-ic" data-x="close" style="font-size:20px">×</button></div>'
          +(tags?'<div style="margin-bottom:10px">'+tags+'</div>':'')
          +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:4px 16px">'+rowv('Classe',d.classe)+rowv('Estilo',d.estilo)+rowv('Embalagem',d.embalagem)+rowv('Fabricação',d.fabricacao)+rowv('Fabricante',d.fabricante)+rowv('País',_flag(d.pais)+(d.pais||''))+rowv('Cidade',d.cidade)+rowv('Estado',d.estado)+rowv('Onde Bebi',d.onde_bebi)+rowv('Nota',stars(d.nota)+' ('+(d.nota||0)+'/5)')+rowv('Status',d.status)+'</div>'
          +'<div class="text-sm text-muted" style="margin-top:8px">Legenda</div><div style="display:flex;gap:8px;align-items:flex-start"><div style="flex:1;white-space:pre-wrap;background:var(--surface-2);padding:8px;border-radius:8px">'+_felEsc(d.legenda||'—')+'</div><button class="fel-ic" data-copy="legenda" title="Copiar">📋</button></div>'
          +(d.observacao?'<div class="text-sm text-muted" style="margin-top:8px">Observação</div><div>'+_felEsc(d.observacao)+'</div>':'')
          +(d.comentario_interno?'<div class="text-sm text-muted" style="margin-top:8px">Comentário interno</div><div style="color:var(--text-muted)">'+_felEsc(d.comentario_interno)+'</div>':'')
          +'<div class="text-sm text-muted" style="margin-top:8px">Imagens</div><div style="margin-bottom:12px">'+imgs+'</div>'
          +'<div style="display:flex;gap:8px;justify-content:flex-end"><button class="btn btn-secondary" data-x="planejar">📅 Planejar publicação</button><button class="btn btn-primary" data-x="editar">✏ Editar</button></div></div>';
      } else {
        var d2=state.data;
        var notaOpts=''; for(var i=0;i<=5;i++){ notaOpts+='<option value="'+i+'"'+((parseInt(d2.nota)||0)===i?' selected':'')+'>'+(i===0?'—':i+' ★')+'</option>'; }
        var imgs=(d2.imagens||[]).map(function(u){return '<div style="display:inline-block;margin:4px;text-align:center;position:relative"><img src="'+u+'" style="width:80px;height:80px;object-fit:cover;border-radius:8px;border:1px solid var(--border)"><button class="fel-ic" data-delimg="'+u+'" style="position:absolute;top:-8px;right:-8px;background:#fff;border-radius:50%;color:var(--danger)">×</button><br><a href="'+u+'" download class="text-sm" style="color:var(--primary)">baixar</a></div>';}).join('');
        ov.innerHTML='<div style="background:#fff;border-radius:12px;max-width:600px;width:100%;padding:20px">'
          +'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px"><h3 style="margin:0">Editar #'+(d2.numero||'')+'</h3><button class="fel-ic" data-x="close" style="font-size:20px">×</button></div>'
          +'<div style="display:flex;gap:16px;margin-bottom:10px"><label style="display:flex;align-items:center;gap:6px;cursor:pointer"><input type="checkbox" id="bm-story"'+(d2.story?' checked':'')+'> 📱 Story</label><label style="display:flex;align-items:center;gap:6px;cursor:pointer"><input type="checkbox" id="bm-whatsapp"'+(d2.whatsapp?' checked':'')+'> 🟢 WhatsApp</label></div>'
          +'<div class="form-group"><label class="form-label">Nome</label>'+inp('bm-cerveja',d2.cerveja)+'</div>'
          +'<div style="display:flex;gap:12px"><div class="form-group" style="flex:1"><label class="form-label">Classe</label>'+inp('bm-classe',d2.classe)+'</div><div class="form-group" style="flex:1"><label class="form-label">Estilo</label>'+inp('bm-estilo',d2.estilo)+'</div></div>'
          +'<div style="display:flex;gap:12px"><div class="form-group" style="flex:1"><label class="form-label">Embalagem</label>'+inp('bm-embalagem',d2.embalagem)+'</div><div class="form-group" style="flex:1"><label class="form-label">Fabricação</label>'+inp('bm-fabricacao',d2.fabricacao)+'</div></div>'
          +'<div class="form-group"><label class="form-label">Fabricante</label>'+inp('bm-fabricante',d2.fabricante)+'</div>'
          +'<div style="display:flex;gap:12px"><div class="form-group" style="flex:1"><label class="form-label">Cidade</label>'+inp('bm-cidade',d2.cidade)+'</div><div class="form-group" style="flex:1"><label class="form-label">Estado</label>'+inp('bm-estado',d2.estado)+'</div><div class="form-group" style="flex:1"><label class="form-label">País</label>'+inp('bm-pais',d2.pais)+'</div></div>'
          +'<div style="display:flex;gap:12px"><div class="form-group" style="flex:2"><label class="form-label">Onde Bebi</label>'+inp('bm-onde_bebi',d2.onde_bebi)+'</div><div class="form-group" style="flex:1"><label class="form-label">Nota</label><select id="bm-nota" class="form-control">'+notaOpts+'</select></div></div>'
          +'<div class="form-group"><label class="form-label">Status</label>'+inp('bm-status',d2.status)+'</div>'
          +'<div class="form-group"><label class="form-label">Legenda (caption)</label><textarea id="bm-legenda" class="form-control" rows="4">'+_felEsc(d2.legenda||'')+'</textarea></div>'
          +'<div class="form-group"><label class="form-label">Observação</label><textarea id="bm-observacao" class="form-control" rows="2">'+_felEsc(d2.observacao||'')+'</textarea></div>'
          +'<div class="form-group"><label class="form-label">Comentário interno</label><textarea id="bm-comentario_interno" class="form-control" rows="2">'+_felEsc(d2.comentario_interno||'')+'</textarea></div>'
          +'<div class="form-group"><label class="form-label">Imagens</label><div>'+(imgs||'<span class="text-sm text-muted">nenhuma</span>')+'</div><input type="file" id="bm-img" accept="image/*" multiple style="margin-top:8px"></div>'
          +'<div style="display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap"><button class="btn btn-secondary" data-x="planejar">📅 Planejar publicação</button><button class="btn btn-secondary" data-x="close">Fechar</button><button class="btn btn-primary" data-x="salvar">Salvar</button></div></div>';
      }
    }
    ov.addEventListener('click', async function(e){
      if(e.target===ov){ fechar(); return; }
      var cp=e.target.closest('[data-copy]'); if(cp){ copiarTexto(state.data[cp.getAttribute('data-copy')]||''); toast('Copiado','success'); return; }
      var di=e.target.closest('[data-delimg]'); if(di){ try{ state.data=await _authFetch('DELETE','/cervejas/'+state.id+'/imagem',{url:di.getAttribute('data-delimg')}); render(); }catch(err){toast(err.message,'error');} return; }
      var x=e.target.closest('[data-x]'); if(!x) return;
      var act=x.getAttribute('data-x');
      if(act==='close') fechar();
      else if(act==='editar'){ state.mode='edit'; render(); }
      else if(act==='planejar'){ planejar(); }
      else if(act==='salvar'){
        var body={cerveja:V('bm-cerveja'),classe:V('bm-classe'),estilo:V('bm-estilo'),embalagem:V('bm-embalagem'),fabricacao:V('bm-fabricacao'),fabricante:V('bm-fabricante'),cidade:V('bm-cidade'),estado:V('bm-estado'),pais:V('bm-pais'),onde_bebi:V('bm-onde_bebi'),nota:(parseInt(V('bm-nota'))||null),status:V('bm-status'),legenda:V('bm-legenda'),observacao:V('bm-observacao'),comentario_interno:V('bm-comentario_interno'),story:document.getElementById('bm-story').checked,whatsapp:document.getElementById('bm-whatsapp').checked};
        try{ state.data=await _authFetch('PATCH','/cervejas/'+state.id,body); toast('Salvo','success'); state.mode='view'; render(); }catch(err){ toast(err.message,'error'); }
      }
    });
    ov.addEventListener('change', async function(e){
      var f=e.target.closest('#bm-img'); if(!f||!f.files.length) return;
      for(var i=0;i<f.files.length;i++){ var fd=new FormData(); fd.append('foto',f.files[i]); try{ var r=await fetch('/api/cervejas/'+state.id+'/imagem',{method:'POST',headers:{'Authorization':'Bearer '+getToken()},body:fd}); var data=await r.json(); if(r.ok) state.data=data; }catch(err){} }
      render();
    });
    render();
  };
})();

/* ===== Cervejas → Planejar v2: trava (1x) + vincula origem + leva foto ===== */
window.abrirBebidaModal=function(beb, mode){
  var state={ id:(beb&&beb.id)||null, mode:mode||'view', data:Object.assign({imagens:[]}, beb||{}) };
  var ov=document.getElementById('beb-modal'); if(ov) ov.remove();
  ov=document.createElement('div'); ov.id='beb-modal';
  ov.style.cssText='position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.5);z-index:9999;display:flex;align-items:flex-start;justify-content:center;padding:20px;overflow:auto';
  document.body.appendChild(ov);
  function fechar(){ ov.remove(); carregarBebidas(); }
  function stars(n){ n=parseInt(n)||0; var s=''; for(var i=1;i<=5;i++) s+=(i<=n?'★':'☆'); return s; }
  function rowv(l,v){ return '<div style="margin-bottom:4px"><div class="text-sm text-muted">'+l+'</div><div>'+(v||'—')+'</div></div>'; }
  function V(id){ var el=document.getElementById(id); return el?el.value:''; }
  function inp(id,val,ph){ return '<input id="'+id+'" class="form-control" value="'+(''+(val||'')).replace(/"/g,'&quot;')+'" placeholder="'+(ph||'')+'">'; }
  async function atualizarPlanejado(){
    if(!state.id) return;
    var qtd=0;
    try{ var arr=await _authFetch('GET','/publicacoes?origem_cerveja='+state.id)||[]; qtd=arr.length; }catch(e){}
    ov.querySelectorAll('[data-x="planejar"]').forEach(function(btn){
      if(qtd>0){ btn.disabled=true; btn.textContent='✓ Já planejado'+(qtd>1?' ('+qtd+'x)':''); btn.style.opacity='.7'; }
    });
  }
  async function planejar(btn){
    if(btn){ btn.disabled=true; btn.textContent='Planejando...'; }
    var nome=(document.getElementById('bm-cerveja')) ? document.getElementById('bm-cerveja').value.trim() : (state.data.cerveja||'');
    nome=nome||state.data.cerveja||'(sem título)';
    var imgs=state.data.imagens||[];
    var canal=null;
    try{ var cfg=await _authFetch('GET','/configuracoes/rede_cervejas'); canal=(cfg&&(cfg.valor&&(cfg.valor.canal||cfg.valor)))||null; }catch(e){}
    if(!canal){ if(btn){btn.disabled=false;btn.textContent='📅 Planejar publicação';} toast('Defina a rede em Configurações › "Publicação do Catálogo de Cervejas".','error'); return; }
    try{
      await _authFetch('POST','/publicacoes',{canal:canal, tema:nome, imagens:imgs, planejador:'Planejado', origem_cerveja_id:state.id});
      toast('Publicação planejada com a foto! Complete o resto em Publicações.','success');
      ov.querySelectorAll('[data-x="planejar"]').forEach(function(b){ b.disabled=true; b.textContent='✓ Já planejado'; b.style.opacity='.7'; });
    }catch(err){ if(btn){btn.disabled=false;btn.textContent='📅 Planejar publicação';} toast('Erro ao planejar: '+err.message,'error'); }
  }
  function render(){
    var d=state.data;
    if(state.mode==='view'){
      var imgs=(d.imagens||[]).map(function(u){return '<div style="display:inline-block;margin:4px;text-align:center"><img src="'+u+'" style="width:90px;height:90px;object-fit:cover;border-radius:8px;border:1px solid var(--border)"><br><a href="'+u+'" download class="text-sm" style="color:var(--primary)">baixar</a></div>';}).join('')||'<span class="text-sm text-muted">sem imagens</span>';
      var tags=''; if(d.story) tags+='<span style="background:var(--primary-light);color:var(--primary);padding:2px 8px;border-radius:10px;font-size:12px;margin-right:6px">📱 Story</span>'; if(d.whatsapp) tags+='<span style="background:#dcfce7;color:#15803d;padding:2px 8px;border-radius:10px;font-size:12px">🟢 WhatsApp</span>';
      ov.innerHTML='<div style="background:#fff;border-radius:12px;max-width:600px;width:100%;padding:20px">'
        +'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px"><h3 style="margin:0">#'+(d.numero||'')+' · '+(d.cerveja||'')+'</h3><button class="fel-ic" data-x="close" style="font-size:20px">×</button></div>'
        +(tags?'<div style="margin-bottom:10px">'+tags+'</div>':'')
        +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:4px 16px">'+rowv('Classe',d.classe)+rowv('Estilo',d.estilo)+rowv('Embalagem',d.embalagem)+rowv('Fabricação',d.fabricacao)+rowv('Fabricante',d.fabricante)+rowv('País',_flag(d.pais)+(d.pais||''))+rowv('Cidade',d.cidade)+rowv('Estado',d.estado)+rowv('Onde Bebi',d.onde_bebi)+rowv('Nota',stars(d.nota)+' ('+(d.nota||0)+'/5)')+rowv('Status',d.status)+'</div>'
        +'<div class="text-sm text-muted" style="margin-top:8px">Legenda</div><div style="display:flex;gap:8px;align-items:flex-start"><div style="flex:1;white-space:pre-wrap;background:var(--surface-2);padding:8px;border-radius:8px">'+_felEsc(d.legenda||'—')+'</div><button class="fel-ic" data-copy="legenda" title="Copiar">📋</button></div>'
        +(d.observacao?'<div class="text-sm text-muted" style="margin-top:8px">Observação</div><div>'+_felEsc(d.observacao)+'</div>':'')
        +(d.comentario_interno?'<div class="text-sm text-muted" style="margin-top:8px">Comentário interno</div><div style="color:var(--text-muted)">'+_felEsc(d.comentario_interno)+'</div>':'')
        +'<div class="text-sm text-muted" style="margin-top:8px">Imagens</div><div style="margin-bottom:12px">'+imgs+'</div>'
        +'<div style="display:flex;gap:8px;justify-content:flex-end"><button class="btn btn-secondary" data-x="planejar">📅 Planejar publicação</button><button class="btn btn-primary" data-x="editar">✏ Editar</button></div></div>';
    } else {
      var d2=state.data;
      var notaOpts=''; for(var i=0;i<=5;i++){ notaOpts+='<option value="'+i+'"'+((parseInt(d2.nota)||0)===i?' selected':'')+'>'+(i===0?'—':i+' ★')+'</option>'; }
      var imgs=(d2.imagens||[]).map(function(u){return '<div style="display:inline-block;margin:4px;text-align:center;position:relative"><img src="'+u+'" style="width:80px;height:80px;object-fit:cover;border-radius:8px;border:1px solid var(--border)"><button class="fel-ic" data-delimg="'+u+'" style="position:absolute;top:-8px;right:-8px;background:#fff;border-radius:50%;color:var(--danger)">×</button><br><a href="'+u+'" download class="text-sm" style="color:var(--primary)">baixar</a></div>';}).join('');
      ov.innerHTML='<div style="background:#fff;border-radius:12px;max-width:600px;width:100%;padding:20px">'
        +'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px"><h3 style="margin:0">Editar #'+(d2.numero||'')+'</h3><button class="fel-ic" data-x="close" style="font-size:20px">×</button></div>'
        +'<div style="display:flex;gap:16px;margin-bottom:10px"><label style="display:flex;align-items:center;gap:6px;cursor:pointer"><input type="checkbox" id="bm-story"'+(d2.story?' checked':'')+'> 📱 Story</label><label style="display:flex;align-items:center;gap:6px;cursor:pointer"><input type="checkbox" id="bm-whatsapp"'+(d2.whatsapp?' checked':'')+'> 🟢 WhatsApp</label></div>'
        +'<div class="form-group"><label class="form-label">Nome</label>'+inp('bm-cerveja',d2.cerveja)+'</div>'
        +'<div style="display:flex;gap:12px"><div class="form-group" style="flex:1"><label class="form-label">Classe</label>'+inp('bm-classe',d2.classe)+'</div><div class="form-group" style="flex:1"><label class="form-label">Estilo</label>'+inp('bm-estilo',d2.estilo)+'</div></div>'
        +'<div style="display:flex;gap:12px"><div class="form-group" style="flex:1"><label class="form-label">Embalagem</label>'+inp('bm-embalagem',d2.embalagem)+'</div><div class="form-group" style="flex:1"><label class="form-label">Fabricação</label>'+inp('bm-fabricacao',d2.fabricacao)+'</div></div>'
        +'<div class="form-group"><label class="form-label">Fabricante</label>'+inp('bm-fabricante',d2.fabricante)+'</div>'
        +'<div style="display:flex;gap:12px"><div class="form-group" style="flex:1"><label class="form-label">Cidade</label>'+inp('bm-cidade',d2.cidade)+'</div><div class="form-group" style="flex:1"><label class="form-label">Estado</label>'+inp('bm-estado',d2.estado)+'</div><div class="form-group" style="flex:1"><label class="form-label">País</label>'+inp('bm-pais',d2.pais)+'</div></div>'
        +'<div style="display:flex;gap:12px"><div class="form-group" style="flex:2"><label class="form-label">Onde Bebi</label>'+inp('bm-onde_bebi',d2.onde_bebi)+'</div><div class="form-group" style="flex:1"><label class="form-label">Nota</label><select id="bm-nota" class="form-control">'+notaOpts+'</select></div></div>'
        +'<div class="form-group"><label class="form-label">Status</label>'+inp('bm-status',d2.status)+'</div>'
        +'<div class="form-group"><label class="form-label">Legenda (caption)</label><textarea id="bm-legenda" class="form-control" rows="4">'+_felEsc(d2.legenda||'')+'</textarea></div>'
        +'<div class="form-group"><label class="form-label">Observação</label><textarea id="bm-observacao" class="form-control" rows="2">'+_felEsc(d2.observacao||'')+'</textarea></div>'
        +'<div class="form-group"><label class="form-label">Comentário interno</label><textarea id="bm-comentario_interno" class="form-control" rows="2">'+_felEsc(d2.comentario_interno||'')+'</textarea></div>'
        +'<div class="form-group"><label class="form-label">Imagens</label><div>'+(imgs||'<span class="text-sm text-muted">nenhuma</span>')+'</div><input type="file" id="bm-img" accept="image/*" multiple style="margin-top:8px"></div>'
        +'<div style="display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap"><button class="btn btn-secondary" data-x="planejar">📅 Planejar publicação</button><button class="btn btn-secondary" data-x="close">Fechar</button><button class="btn btn-primary" data-x="salvar">Salvar</button></div></div>';
    }
    atualizarPlanejado();
  }
  ov.addEventListener('click', async function(e){
    if(e.target===ov){ fechar(); return; }
    var cp=e.target.closest('[data-copy]'); if(cp){ copiarTexto(state.data[cp.getAttribute('data-copy')]||''); toast('Copiado','success'); return; }
    var di=e.target.closest('[data-delimg]'); if(di){ try{ state.data=await _authFetch('DELETE','/cervejas/'+state.id+'/imagem',{url:di.getAttribute('data-delimg')}); render(); }catch(err){toast(err.message,'error');} return; }
    var x=e.target.closest('[data-x]'); if(!x) return;
    var act=x.getAttribute('data-x');
    if(act==='close') fechar();
    else if(act==='editar'){ state.mode='edit'; render(); }
    else if(act==='planejar'){ planejar(x); }
    else if(act==='salvar'){
      var body={cerveja:V('bm-cerveja'),classe:V('bm-classe'),estilo:V('bm-estilo'),embalagem:V('bm-embalagem'),fabricacao:V('bm-fabricacao'),fabricante:V('bm-fabricante'),cidade:V('bm-cidade'),estado:V('bm-estado'),pais:V('bm-pais'),onde_bebi:V('bm-onde_bebi'),nota:(parseInt(V('bm-nota'))||null),status:V('bm-status'),legenda:V('bm-legenda'),observacao:V('bm-observacao'),comentario_interno:V('bm-comentario_interno'),story:document.getElementById('bm-story').checked,whatsapp:document.getElementById('bm-whatsapp').checked};
      try{ state.data=await _authFetch('PATCH','/cervejas/'+state.id,body); toast('Salvo','success'); state.mode='view'; render(); }catch(err){ toast(err.message,'error'); }
    }
  });
  ov.addEventListener('change', async function(e){
    var f=e.target.closest('#bm-img'); if(!f||!f.files.length) return;
    for(var i=0;i<f.files.length;i++){ var fd=new FormData(); fd.append('foto',f.files[i]); try{ var r=await fetch('/api/cervejas/'+state.id+'/imagem',{method:'POST',headers:{'Authorization':'Bearer '+getToken()},body:fd}); var data=await r.json(); if(r.ok) state.data=data; }catch(err){} }
    render();
  });
  render();
};

/* ===== SOCIAL v4: menu em ordem alfabética (ADMIN, ANDERSON, CardBase, PROSPECÇÃO, SOCIAL MEDIA) + título Catálogo de Cervejas ===== */
(function(){
  var h=document.querySelector('#page-bebidas .app-header h2'); if(h) h.textContent='🍺 Catálogo de Cervejas';

  function redeBadge(ic){
    var m={linkedin:['in','#0a66c2'], instagram:['IG','#e1306c'], whatsapp:['WA','#25d366']};
    var x=m[ic]||['?','#888'];
    return '<span style="display:inline-flex;width:20px;height:20px;border-radius:50%;background:'+x[1]+';color:#fff;align-items:center;justify-content:center;font-size:9px;font-weight:800;flex:0 0 auto">'+x[0]+'</span>';
  }

  async function construirMenu(){
    var nav=document.querySelector('.desktop-nav'); if(!nav) return;
    var redes=window._redesCache||[];
    try{ redes=await _authFetch('GET','/redes')||[]; window._redesCache=redes; }
    catch(e){ console.warn('[SOCIAL MEDIA] Falha ao buscar /redes, mantendo cache anterior:', e); redes=window._redesCache||[]; if(!redes.length){ setTimeout(function(){ if(typeof recarregarMenuSocial==='function') recarregarMenuSocial(); }, 2000); } }
    var social={g:'SOCIAL MEDIA', it: redes.map(function(r){ return ['rede:'+r.canal, r.nome, redeBadge(r.icone)]; }) };
    social.it.push(['lembretes','Lembretes','⏰']);
    var GRUPOS=[
      {g:'ADMIN', it:[['configuracoes','Configurações','⚙️'],['usuarios','Usuários','👤']]},
      {g:'ANDERSON', it:[['qrcode','Meu QR Code','🔳'],['acessos','Acessos','🔑'],['links','Links','🔗'],['fotos','Fotos','🖼️'],['bebidas','Catálogo de Cervejas','🍺']]},
      {g:'CardBase', it:[['cadastro','Cadastro','➕'],['empresas','Empresas','🏢'],['contatos','Contatos','👥'],['dashboard','Dashboard','📊']]},
      {g:'PROSPECÇÃO', it:[['pitch','Pitch','🎯'],['saudacao','Saudação','👋'],['cadencia','Cadência','📅'],['felicitacoes','Felicitações','💬']]},
      {g:'COMERCIAL', it:[['funil','Funil','🔻'],['propostas','Propostas','📄'],['prop-modelos','Modelos','🧩'],['prop-produtos','Produtos','📦'],['prop-config','Configurações','⚙️']]},
      social
    ];
    var socialIdx=GRUPOS.length-1;
    var html='<div class="desktop-nav-logo">📇 SGC</div><div style="font-size:10px;color:var(--text-muted);padding:0 12px 8px;margin-top:-4px">Sistema de Gestão Comercial</div>';
    html+='<button id="nav-collapse-btn" class="desktop-nav-item" title="Recolher menu" style="display:flex;justify-content:space-between;align-items:center;width:100%"><span>Menu</span><span style="font-size:18px;line-height:1">≡</span></button>';
    html+='<div class="nav-scroll" style="flex:1;overflow-y:auto;min-height:0">';
    GRUPOS.forEach(function(gr,gi){
      html+='<button class="nav-grp-head" data-grp="'+gi+'"><span>'+gr.g+'</span><span class="nav-caret">▸</span></button>';
      html+='<div class="nav-grp-items" data-items="'+gi+'" style="display:none">';
      gr.it.forEach(function(it){
        var ic=(it[2]&&it[2].charAt(0)==='<')?it[2]:'<span style="width:20px;text-align:center;display:inline-block">'+(it[2]||'')+'</span>';
        html+='<button class="desktop-nav-item nav-sub" data-page="'+it[0]+'" style="display:flex;align-items:center;gap:8px">'+ic+' <span>'+it[1]+'</span></button>';
      });
      html+='</div>';
    });
    html+='</div>';
    nav.innerHTML=html;
    var _open=null;
    function setOpen(gi){
      gi=(gi==null)?null:String(gi);
      nav.querySelectorAll('.nav-grp-items').forEach(function(d){ d.style.display=(gi!=null && d.getAttribute('data-items')===gi)?'block':'none'; });
      nav.querySelectorAll('.nav-grp-head').forEach(function(hd){ hd.querySelector('.nav-caret').textContent=(gi!=null && hd.getAttribute('data-grp')===gi)?'▾':'▸'; });
      _open=gi;
    }
    nav.querySelectorAll('.nav-grp-head').forEach(function(hd){ hd.addEventListener('click', function(){ var g=hd.getAttribute('data-grp'); setOpen(g===_open?null:g); }); });
    nav.querySelectorAll('.desktop-nav-item[data-page]').forEach(function(b){ b.addEventListener('click', function(){ menuClick(b.getAttribute('data-page'), b); }); });
    var col=document.getElementById('nav-collapse-btn'); if(col) col.addEventListener('click', function(){ document.body.classList.add('nav-off'); });
    setOpen(String(socialIdx));
    if(typeof aplicarPermissoes==='function') setTimeout(aplicarPermissoes,200);
  }

  function menuClick(id,b){
    if(id.indexOf('rede:')===0){
      var canal=id.slice(5);
      window.PUB_CANAL=canal;
      if(window.filtrosPub){ filtrosPub.arquivado=false; filtrosPub.excluido=false; filtrosPub.planejador=''; }
      window._pubCounts=null;
      var cur=document.querySelector('.page.active'); if(cur) cur.classList.remove('active');
      var pg=document.getElementById('page-publicacoes'); if(pg) pg.classList.add('active');
      document.querySelectorAll('.desktop-nav-item').forEach(function(x){x.classList.remove('active');});
      if(b) b.classList.add('active');
      var rede=null; (window._redesCache||[]).forEach(function(r){ if(r.canal===canal) rede=r; });
      var hh=document.querySelector('#page-publicacoes .app-header h2'); if(hh && rede) hh.textContent=rede.nome;
      window.scrollTo(0,0);
      if(typeof carregarPublicacoes==='function') carregarPublicacoes();
      return;
    }
    if(id==='cadastro'){ if(typeof abrirNovoContato==='function') abrirNovoContato('foto'); return; }
    if(id==='bebidas'){ if(typeof navegarPara==='function') navegarPara('bebidas'); if(typeof carregarBebidas==='function') carregarBebidas(); return; }
    navegarPara(id);
    if(id==='felicitacoes' && typeof carregarFelicitacoes==='function') carregarFelicitacoes();
    if(id==='lembretes' && typeof carregarLembretes==='function') carregarLembretes();
    if(id==='usuarios' && typeof carregarUsuarios==='function') carregarUsuarios();
    if(id==='pitch' && typeof carregarPitch==='function') carregarPitch();
    if(id==='configuracoes'){ setTimeout(function(){ if(typeof cfgInit==='function') cfgInit(); if(typeof montarRedesConfig==='function') montarRedesConfig(); if(typeof montarCervejasConfig==='function') montarCervejasConfig(); },100); }
  }

  window.recarregarMenuSocial=function(){ construirMenu(); };
})();

/* ===== Calendário (planejador) ===== */
(function(){ var main=document.querySelector('.app-main'); if(main && !document.getElementById('page-calendario')){ var p=document.createElement('div'); p.id='page-calendario'; p.className='page'; p.innerHTML='<div class="app-header"><h2>📅 Calendário</h2></div><div class="page-content"><div id="calendario-root"></div></div>'; main.appendChild(p); var s=document.createElement('style'); s.textContent='#page-calendario .page-content{max-width:none;margin:0;padding:12px 16px}'; document.head.appendChild(s); } })();

(function(){
  var calView='month', calRef=new Date();
  function ymd(d){ return d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2); }
  function fmtBR(d){ return ('0'+d.getDate()).slice(-2)+'/'+('0'+(d.getMonth()+1)).slice(-2)+'/'+d.getFullYear(); }
  function esc(s){ return (s==null?'':String(s)).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); }
  function redeBadge(ic,sz){ sz=sz||16; var m={linkedin:['in','#0a66c2'], instagram:['IG','#e1306c'], whatsapp:['WA','#25d366']}; var x=m[ic]||['?','#888']; return '<span style="display:inline-flex;width:'+sz+'px;height:'+sz+'px;border-radius:50%;background:'+x[1]+';color:#fff;align-items:center;justify-content:center;font-size:8px;font-weight:800;flex:0 0 auto">'+x[0]+'</span>'; }

  async function carregarCalendario(){
    var root=document.getElementById('calendario-root'); if(!root) return;
    root.innerHTML='<div class="empty-state"><div class="spinner" style="margin:0 auto"></div></div>';
    var redes=window._redesCache; if(!redes){ try{ redes=await _authFetch('GET','/redes')||[]; window._redesCache=redes; }catch(e){ redes=[]; } }
    var redeMap={}; redes.forEach(function(r){ redeMap[r.canal]=r; });
    var inicio, fim;
    if(calView==='week'){ var ws=new Date(calRef); ws.setDate(ws.getDate()-ws.getDay()); inicio=new Date(ws); fim=new Date(ws); fim.setDate(fim.getDate()+6); }
    else { var first=new Date(calRef.getFullYear(), calRef.getMonth(), 1); inicio=new Date(first); inicio.setDate(1-first.getDay()); fim=new Date(inicio); fim.setDate(inicio.getDate()+41); }
    var pubs=[];
    try{ pubs=await _authFetch('GET','/publicacoes/calendario?inicio='+ymd(inicio)+'&fim='+ymd(fim))||[]; }
    catch(e){ root.innerHTML='<p style="color:var(--danger)">Erro: '+(e.message||'')+'</p>'; return; }
    window._calPubs=pubs;
    var byDay={}; pubs.forEach(function(p){ (byDay[p.data]=byDay[p.data]||[]).push(p); });
    render(root, redeMap, byDay, inicio, fim);
  }

  function render(root, redeMap, byDay, inicio, fim){
    var hoje=ymd(new Date());
    var MES=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
    var titulo = calView==='week' ? ('Semana '+fmtBR(inicio)+' – '+fmtBR(fim)) : (MES[calRef.getMonth()]+' '+calRef.getFullYear());
    var toolbar='<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:12px">'
      +'<div style="display:flex;gap:6px;align-items:center"><button class="btn btn-sm btn-secondary" data-cal="prev">←</button><button class="btn btn-sm btn-secondary" data-cal="hoje">Hoje</button><button class="btn btn-sm btn-secondary" data-cal="next">→</button><b style="margin-left:8px;font-size:16px">'+titulo+'</b></div>'
      +'<div style="display:flex;gap:6px"><button class="btn btn-sm '+(calView==='month'?'btn-primary':'btn-secondary')+'" data-cal="mes">Mês</button><button class="btn btn-sm '+(calView==='week'?'btn-primary':'btn-secondary')+'" data-cal="semana">Semana</button><button class="btn btn-sm btn-secondary" data-cal="refresh">🔄</button></div></div>';
    var dias=['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
    var headHtml='<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:6px;margin-bottom:6px">'+dias.map(function(d){return '<div style="text-align:center;font-weight:600;font-size:12px;color:var(--text-muted)">'+d+'</div>';}).join('')+'</div>';
    var nDias = calView==='week'?7:42;
    var cellMin = calView==='week'?'260px':'100px';
    var cur=new Date(inicio), cells='';
    for(var i=0;i<nDias;i++){
      var ds=ymd(cur);
      var outMonth = (calView==='month' && cur.getMonth()!==calRef.getMonth());
      var isHoje = ds===hoje;
      var chips=(byDay[ds]||[]).map(function(p){
        var r=redeMap[p.canal]||{};
        var ag=p.planejador==='Agendado';
        var bg=(p.planejador==='Publicado')?'#86efac':(p.planejador==='Agendado')?'#dcfce7':'#dbeafe', bd=(p.planejador==='Publicado')?'#22c55e':(p.planejador==='Agendado')?'#86efac':'#93c5fd';
        return '<div class="cal-chip" data-pid="'+p.id+'" data-canal="'+p.canal+'" title="'+esc((r.nome||p.canal)+' — '+(p.tema||''))+'" style="background:'+bg+';border:1px solid '+bd+';border-radius:6px;padding:2px 5px;margin-bottom:3px;font-size:11px;cursor:pointer;display:flex;align-items:center;gap:4px;max-width:100%;overflow:hidden">'+redeBadge(r.icone,14)+'<span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+esc(p.tema||'(sem título)')+'</span></div>';
      }).join('');
      cells+='<div style="border:1px solid var(--border);border-radius:8px;padding:5px;min-height:'+cellMin+';background:'+(outMonth?'#fafafa':'#fff')+';'+(isHoje?'box-shadow:inset 0 0 0 2px var(--primary);':'')+'overflow:hidden">'
        +'<div style="font-size:12px;font-weight:600;color:'+(outMonth?'var(--text-muted)':(isHoje?'var(--primary)':'var(--text)'))+';margin-bottom:3px">'+cur.getDate()+'</div>'+chips+'</div>';
      cur.setDate(cur.getDate()+1);
    }
    var grid='<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:6px">'+cells+'</div>';
    var legenda='<div style="display:flex;gap:16px;margin-top:12px;font-size:12px"><span><span style="display:inline-block;width:12px;height:12px;background:#86efac;border:1px solid #22c55e;border-radius:3px;vertical-align:middle"></span> Publicado</span><span><span style="display:inline-block;width:12px;height:12px;background:#dcfce7;border:1px solid #86efac;border-radius:3px;vertical-align:middle"></span> Agendado</span><span><span style="display:inline-block;width:12px;height:12px;background:#dbeafe;border:1px solid #93c5fd;border-radius:3px;vertical-align:middle"></span> Planejado</span></div>';
    root.innerHTML=toolbar+headHtml+grid+legenda;
  }

  if(!window._calBound){
    window._calBound=true;
    document.addEventListener('click', function(e){
      var c=e.target.closest && e.target.closest('#calendario-root [data-cal]');
      if(c){
        var a=c.getAttribute('data-cal');
        if(a==='prev'){ if(calView==='week') calRef.setDate(calRef.getDate()-7); else calRef.setMonth(calRef.getMonth()-1); }
        else if(a==='next'){ if(calView==='week') calRef.setDate(calRef.getDate()+7); else calRef.setMonth(calRef.getMonth()+1); }
        else if(a==='hoje'){ calRef=new Date(); }
        else if(a==='mes'){ calView='month'; }
        else if(a==='semana'){ calView='week'; }
        carregarCalendario(); return;
      }
      var chip=e.target.closest && e.target.closest('#calendario-root .cal-chip');
      if(chip){ var pid=chip.getAttribute('data-pid'); window.PUB_CANAL=chip.getAttribute('data-canal'); var pub=(window._calPubs||[]).filter(function(x){return x.id===pid;})[0]; if(pub && typeof abrirPubModal==='function') abrirPubModal(pub,'view'); return; }
    });
  }
  window.carregarCalendario=carregarCalendario;
})();

/* ===== SOCIAL v5: + Calendário no grupo SOCIAL MEDIA ===== */
(function(){
  function redeBadge(ic){ var m={linkedin:['in','#0a66c2'], instagram:['IG','#e1306c'], whatsapp:['WA','#25d366']}; var x=m[ic]||['?','#888']; return '<span style="display:inline-flex;width:20px;height:20px;border-radius:50%;background:'+x[1]+';color:#fff;align-items:center;justify-content:center;font-size:9px;font-weight:800;flex:0 0 auto">'+x[0]+'</span>'; }
  async function construirMenu(){
    var nav=document.querySelector('.desktop-nav'); if(!nav) return;
    var redes=window._redesCache||[];
    try{ redes=await _authFetch('GET','/redes')||[]; window._redesCache=redes; }
    catch(e){ console.warn('[SOCIAL MEDIA] Falha ao buscar /redes, mantendo cache anterior:', e); redes=window._redesCache||[]; if(!redes.length){ setTimeout(function(){ if(typeof recarregarMenuSocial==='function') recarregarMenuSocial(); }, 2000); } }
    var social={g:'SOCIAL MEDIA', it: redes.map(function(r){ return ['rede:'+r.canal, r.nome, redeBadge(r.icone)]; }) };
    social.it.push(['lembretes','Lembretes','⏰']);
    social.it.unshift(['calendario','Calendário','📅']);
    var GRUPOS=[
      {g:'ADMIN', it:[['configuracoes','Configurações','⚙️'],['usuarios','Usuários','👤']]},
      {g:'ANDERSON', it:[['qrcode','Meu QR Code','🔳'],['acessos','Acessos','🔑'],['links','Links','🔗'],['fotos','Fotos','🖼️'],['bebidas','Catálogo de Cervejas','🍺']]},
      {g:'CardBase', it:[['cadastro','Cadastro','➕'],['empresas','Empresas','🏢'],['contatos','Contatos','👥'],['dashboard','Dashboard','📊']]},
      {g:'PROSPECÇÃO', it:[['pitch','Pitch','🎯'],['saudacao','Saudação','👋'],['cadencia','Cadência','📅'],['felicitacoes','Felicitações','💬']]},
      {g:'COMERCIAL', it:[['funil','Funil','🔻'],['propostas','Propostas','📄'],['prop-modelos','Modelos','🧩'],['prop-produtos','Produtos','📦'],['prop-config','Configurações','⚙️']]},
      social
    ];
    var socialIdx=GRUPOS.length-1;
    var html='<div class="desktop-nav-logo">📇 SGC</div><div style="font-size:10px;color:var(--text-muted);padding:0 12px 8px;margin-top:-4px">Sistema de Gestão Comercial</div>';
    html+='<button id="nav-collapse-btn" class="desktop-nav-item" title="Recolher menu" style="display:flex;justify-content:space-between;align-items:center;width:100%"><span>Menu</span><span style="font-size:18px;line-height:1">≡</span></button>';
    html+='<div class="nav-scroll" style="flex:1;overflow-y:auto;min-height:0">';
    GRUPOS.forEach(function(gr,gi){
      html+='<button class="nav-grp-head" data-grp="'+gi+'"><span>'+gr.g+'</span><span class="nav-caret">▸</span></button>';
      html+='<div class="nav-grp-items" data-items="'+gi+'" style="display:none">';
      gr.it.forEach(function(it){ var ic=(it[2]&&it[2].charAt(0)==='<')?it[2]:'<span style="width:20px;text-align:center;display:inline-block">'+(it[2]||'')+'</span>'; html+='<button class="desktop-nav-item nav-sub" data-page="'+it[0]+'" style="display:flex;align-items:center;gap:8px">'+ic+' <span>'+it[1]+'</span></button>'; });
      html+='</div>';
    });
    html+='</div>';
    nav.innerHTML=html;
    var _open=null;
    function setOpen(gi){ gi=(gi==null)?null:String(gi); nav.querySelectorAll('.nav-grp-items').forEach(function(d){ d.style.display=(gi!=null && d.getAttribute('data-items')===gi)?'block':'none'; }); nav.querySelectorAll('.nav-grp-head').forEach(function(hd){ hd.querySelector('.nav-caret').textContent=(gi!=null && hd.getAttribute('data-grp')===gi)?'▾':'▸'; }); _open=gi; }
    nav.querySelectorAll('.nav-grp-head').forEach(function(hd){ hd.addEventListener('click', function(){ var g=hd.getAttribute('data-grp'); setOpen(g===_open?null:g); }); });
    nav.querySelectorAll('.desktop-nav-item[data-page]').forEach(function(b){ b.addEventListener('click', function(){ menuClick(b.getAttribute('data-page'), b); }); });
    var col=document.getElementById('nav-collapse-btn'); if(col) col.addEventListener('click', function(){ document.body.classList.add('nav-off'); });
    setOpen(String(socialIdx));
    if(typeof aplicarPermissoes==='function') setTimeout(aplicarPermissoes,200);
  }
  function menuClick(id,b){
    if(id==='calendario'){ if(typeof navegarPara==='function') navegarPara('calendario'); if(typeof carregarCalendario==='function') carregarCalendario(); return; }
    if(id.indexOf('rede:')===0){
      var canal=id.slice(5); window.PUB_CANAL=canal;
      if(window.filtrosPub){ filtrosPub.arquivado=false; filtrosPub.excluido=false; filtrosPub.planejador=''; }
      window._pubCounts=null;
      var cur=document.querySelector('.page.active'); if(cur) cur.classList.remove('active');
      var pg=document.getElementById('page-publicacoes'); if(pg) pg.classList.add('active');
      document.querySelectorAll('.desktop-nav-item').forEach(function(x){x.classList.remove('active');});
      if(b) b.classList.add('active');
      var rede=null; (window._redesCache||[]).forEach(function(r){ if(r.canal===canal) rede=r; });
      var hh=document.querySelector('#page-publicacoes .app-header h2'); if(hh && rede) hh.textContent=rede.nome;
      window.scrollTo(0,0);
      if(typeof carregarPublicacoes==='function') carregarPublicacoes();
      return;
    }
    if(id==='cadastro'){ if(typeof abrirNovoContato==='function') abrirNovoContato('foto'); return; }
    if(id==='bebidas'){ if(typeof navegarPara==='function') navegarPara('bebidas'); if(typeof carregarBebidas==='function') carregarBebidas(); return; }
    navegarPara(id);
    if(id==='felicitacoes' && typeof carregarFelicitacoes==='function') carregarFelicitacoes();
    if(id==='lembretes' && typeof carregarLembretes==='function') carregarLembretes();
    if(id==='usuarios' && typeof carregarUsuarios==='function') carregarUsuarios();
    if(id==='pitch' && typeof carregarPitch==='function') carregarPitch();
    if(id==='configuracoes'){ setTimeout(function(){ if(typeof cfgInit==='function') cfgInit(); if(typeof montarRedesConfig==='function') montarRedesConfig(); if(typeof montarCervejasConfig==='function') montarCervejasConfig(); },100); }
  }
  window.recarregarMenuSocial=function(){ construirMenu(); };
})();

/* ===== FINANCEIRO Fase 1b: páginas ===== */
(function(){ var main=document.querySelector('.app-main'); if(!main) return;
  [['vendas','💰 Vendas','vendas-root'],['comissao','🧮 Comissão','comissao-root'],['financas-empresa','🏦 Controle financeiro','financas-empresa-root'],['financas-pessoais','💳 Compras','financas-pessoais-root'],['analise-financeira','📊 Análise financeira','analise-financeira-root'],
   ['operacoes-link','🔗 Link','operacoes-link-root'],['operacoes-calculadora','🧮 Calculadora','operacoes-calculadora-root'],['operacoes-bom','📋 BOM','operacoes-bom-root'],['operacoes-precificacao','💲 Precificação','operacoes-precificacao-root'],['operacoes-produtos','📦 Produtos','operacoes-produtos-root'],
   ['prospeccao-empresas','🏢 Empresas','prospeccao-empresas-root'],['prospeccao-contatos','👤 Contatos','prospeccao-contatos-root'],['prospeccao-listas','📋 Listas','prospeccao-listas-root'],['prospeccao-kanban','🗂️ Kanban','prospeccao-kanban-root']].forEach(function(x){
    if(!document.getElementById('page-'+x[0])){
      var p=document.createElement('div'); p.id='page-'+x[0]; p.className='page';
      p.innerHTML='<div class="app-header"><h2>'+x[1]+'</h2></div><div class="page-content"><div id="'+x[2]+'"><div class="card"><div class="card-body"><p class="text-sm text-muted">Em construção.</p></div></div></div></div>';
      main.appendChild(p);
    }
  });
  var s=document.createElement('style'); s.id='css-fin'; s.textContent='#page-vendas .page-content,#page-comissao .page-content{max-width:none;margin:0;padding:12px 16px}'; document.head.appendChild(s);
})();

/* ===== SOCIAL v6: + grupo FINANCEIRO ===== */
(function(){
  function redeBadge(ic){ var m={linkedin:['in','#0a66c2'], instagram:['IG','#e1306c'], whatsapp:['WA','#25d366']}; var x=m[ic]||['?','#888']; return '<span style="display:inline-flex;width:20px;height:20px;border-radius:50%;background:'+x[1]+';color:#fff;align-items:center;justify-content:center;font-size:9px;font-weight:800;flex:0 0 auto">'+x[0]+'</span>'; }
  async function construirMenu(){
    var nav=document.querySelector('.desktop-nav'); if(!nav) return;
    var redes=window._redesCache||[];
    try{ redes=await _authFetch('GET','/redes')||[]; window._redesCache=redes; }
    catch(e){ console.warn('[SOCIAL MEDIA] Falha ao buscar /redes, mantendo cache anterior:', e); redes=window._redesCache||[]; if(!redes.length){ setTimeout(function(){ if(typeof recarregarMenuSocial==='function') recarregarMenuSocial(); }, 2000); } }
    var social={g:'SOCIAL MEDIA', it: redes.map(function(r){ return ['rede:'+r.canal, r.nome, redeBadge(r.icone)]; }) };
    social.it.push(['lembretes','Lembretes','⏰']); social.it.unshift(['calendario','Calendário','📅']);
    var GRUPOS=[
      {g:'ADMIN', it:[['configuracoes','Configurações','⚙️'],['usuarios','Usuários','👤']]},
      {g:'ANDERSON', it:[['qrcode','Meu QR Code','🔳'],['acessos','Acessos','🔑'],['links','Links','🔗'],['fotos','Fotos','🖼️'],['bebidas','Catálogo de Cervejas','🍺']]},
      {g:'CardBase', it:[['cadastro','Cadastro','➕'],['empresas','Empresas','🏢'],['contatos','Contatos','👥'],['dashboard','Dashboard','📊']]},
      {g:'FINANCEIRO', it:[['vendas','Vendas','💰'],['forecast','Forcast','📈'],['comissao','Comissão','🧮'],['financas-empresa','Controle financeiro','🏦'],['financas-pessoais','Compras','💳'],['analise-financeira','Análise financeira','📊']]},
      {g:'OPERAÇÕES', it:[['operacoes-link','Link','🔗'],['operacoes-calculadora','Calculadora','🧮'],['operacoes-bom','BOM','📋'],['operacoes-precificacao','Precificação','💲'],['operacoes-produtos','Produtos','📦']]},
      {g:'PROSPECÇÃO', it:[['felicitacoes','Mensagem','💬'],['prospeccao-empresas','Empresas','🏢'],['prospeccao-contatos','Contatos','👤'],['prospeccao-listas','Listas','📋'],['prospeccao-kanban','Kanban','🗂️']]},
      {g:'COMERCIAL', it:[['funil','Funil','🔻'],['propostas','Propostas','📄'],['prop-modelos','Modelos','🧩'],['prop-produtos','Produtos','📦'],['prop-config','Configurações','⚙️']]},
      social
    ];
    var html='<div class="desktop-nav-logo">📇 SGC</div><div style="font-size:10px;color:var(--text-muted);padding:0 12px 8px;margin-top:-4px">Sistema de Gestão Comercial</div>';
    html+='<button id="nav-collapse-btn" class="desktop-nav-item" title="Recolher menu" style="display:flex;justify-content:space-between;align-items:center;width:100%"><span>Menu</span><span style="font-size:18px;line-height:1">≡</span></button>';
    html+='<div class="nav-scroll" style="flex:1;overflow-y:auto;min-height:0">';
    GRUPOS.forEach(function(gr,gi){
      html+='<button class="nav-grp-head" data-grp="'+gi+'"><span>'+gr.g+'</span><span class="nav-caret">▸</span></button>';
      html+='<div class="nav-grp-items" data-items="'+gi+'" style="display:none">';
      gr.it.forEach(function(it){ var ic=(it[2]&&it[2].charAt(0)==='<')?it[2]:'<span style="width:20px;text-align:center;display:inline-block">'+(it[2]||'')+'</span>'; html+='<button class="desktop-nav-item nav-sub" data-page="'+it[0]+'" style="display:flex;align-items:center;gap:8px">'+ic+' <span>'+it[1]+'</span></button>'; });
      html+='</div>';
    });
    html+='</div>';
    nav.innerHTML=html;
    var _open=null;
    function setOpen(gi){ gi=(gi==null)?null:String(gi); nav.querySelectorAll('.nav-grp-items').forEach(function(d){ d.style.display=(gi!=null && d.getAttribute('data-items')===gi)?'block':'none'; }); nav.querySelectorAll('.nav-grp-head').forEach(function(hd){ hd.querySelector('.nav-caret').textContent=(gi!=null && hd.getAttribute('data-grp')===gi)?'▾':'▸'; }); _open=gi; }
    nav.querySelectorAll('.nav-grp-head').forEach(function(hd){ hd.addEventListener('click', function(){ var g=hd.getAttribute('data-grp'); setOpen(g===_open?null:g); }); });
    nav.querySelectorAll('.desktop-nav-item[data-page]').forEach(function(b){ b.addEventListener('click', function(){ menuClick(b.getAttribute('data-page'), b); }); });
    var col=document.getElementById('nav-collapse-btn'); if(col) col.addEventListener('click', function(){ document.body.classList.add('nav-off'); });
    setOpen('3');
    if(typeof aplicarPermissoes==='function') setTimeout(aplicarPermissoes,200);
  }
  function menuClick(id,b){
    if(id==='calendario'){ if(typeof navegarPara==='function') navegarPara('calendario'); if(typeof carregarCalendario==='function') carregarCalendario(); return; }
    if(id==='vendas'){ navegarPara('vendas'); if(typeof carregarVendas==='function') carregarVendas(); return; }
    if(id==='forecast'){ navegarPara('forecast'); if(typeof carregarForecast==='function') carregarForecast(); return; }
    if(id==='propostas'){ navegarPara('propostas'); if(typeof carregarPropostas==='function') carregarPropostas(); return; }
    if(id==='prop-modelos'){ navegarPara('prop-modelos'); if(typeof carregarPropModelos==='function') carregarPropModelos(); return; }
    if(id==='prop-produtos'){ navegarPara('prop-produtos'); if(typeof carregarPropProdutos==='function') carregarPropProdutos(); return; }
    if(id==='prop-config'){ navegarPara('prop-config'); if(typeof carregarPropConfig==='function') carregarPropConfig(); return; }
    if(id==='funil'){ navegarPara('funil'); if(typeof carregarFunil==='function') carregarFunil(); return; }
    if(id==='comissao'){ navegarPara('comissao'); if(typeof carregarComissao==='function') carregarComissao(); return; }
    if(id.indexOf('rede:')===0){
      var canal=id.slice(5); window.PUB_CANAL=canal;
      if(window.filtrosPub){ filtrosPub.arquivado=false; filtrosPub.excluido=false; filtrosPub.planejador=''; }
      window._pubCounts=null;
      var cur=document.querySelector('.page.active'); if(cur) cur.classList.remove('active');
      var pg=document.getElementById('page-publicacoes'); if(pg) pg.classList.add('active');
      document.querySelectorAll('.desktop-nav-item').forEach(function(x){x.classList.remove('active');});
      if(b) b.classList.add('active');
      var rede=null; (window._redesCache||[]).forEach(function(r){ if(r.canal===canal) rede=r; });
      var hh=document.querySelector('#page-publicacoes .app-header h2'); if(hh && rede) hh.textContent=rede.nome;
      window.scrollTo(0,0);
      if(typeof carregarPublicacoes==='function') carregarPublicacoes();
      return;
    }
    if(id==='cadastro'){ if(typeof abrirNovoContato==='function') abrirNovoContato('foto'); return; }
    if(id==='bebidas'){ if(typeof navegarPara==='function') navegarPara('bebidas'); if(typeof carregarBebidas==='function') carregarBebidas(); return; }
    navegarPara(id);
    if(id==='felicitacoes' && typeof carregarFelicitacoes==='function') carregarFelicitacoes();
    if(id==='lembretes' && typeof carregarLembretes==='function') carregarLembretes();
    if(id==='usuarios' && typeof carregarUsuarios==='function') carregarUsuarios();
    if(id==='pitch' && typeof carregarPitch==='function') carregarPitch();
    if(id==='configuracoes'){ setTimeout(function(){ if(typeof cfgInit==='function') cfgInit(); if(typeof montarRedesConfig==='function') montarRedesConfig(); if(typeof montarCervejasConfig==='function') montarCervejasConfig(); if(typeof montarFinConfig==='function') montarFinConfig(); },100); }
  }
  window.recarregarMenuSocial=function(){ construirMenu(); };
})();

/* ===== FINANCEIRO Fase 1c: configs no Admin (grupos, comissão, regra, campos, produtos) ===== */
(function(){
  function esc(s){ return (s==null?'':String(s)).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); }
  var INP='padding:7px 9px;border:1px solid var(--border,#ccc);border-radius:8px;font-size:13px;box-sizing:border-box';
  async function finGet(k){ try{ var r=await _authFetch('GET','/fin/config/'+k); return r&&r.valor; }catch(e){ return null; } }
  async function finSet(k,v){ try{ await _authFetch('PUT','/fin/config/'+k,{valor:v}); }catch(e){ toast('Erro ao salvar','error'); } }

  async function renderFin(box){
    var grupos=(await finGet('fin_grupos'))||[];
    var comissao=(await finGet('fin_comissao'))||[];
    var regra=(await finGet('fin_regra_pagto'))||{dia_corte:15};
    var campos=(await finGet('fin_campos_venda'))||[];
    var produtos=[]; try{ produtos=await _authFetch('GET','/fin/produtos')||[]; }catch(e){}
    box._grupos=grupos; box._comissao=comissao; box._campos=campos;
    function chip(txt, attr){ return '<span style="display:inline-flex;align-items:center;gap:6px;background:var(--surface-2,#eef);border-radius:14px;padding:3px 10px;margin:3px;font-size:13px">'+esc(txt)+'<button '+attr+' style="border:none;background:none;color:var(--danger);cursor:pointer;font-weight:700">×</button></span>'; }
    var gruposHtml=grupos.map(function(g){ return chip(g,'data-fin="del-grupo" data-v="'+esc(g)+'"'); }).join('');
    var comHtml=comissao.map(function(c){ return '<div style="display:flex;gap:8px;align-items:center;margin-bottom:4px"><span style="flex:1">'+esc(c.nome)+'</span><input type="number" step="0.1" value="'+(c.pct||0)+'" data-com-nome="'+esc(c.nome)+'" style="'+INP+';width:80px"> %<button data-fin="del-com" data-v="'+esc(c.nome)+'" style="border:none;background:none;color:var(--danger);cursor:pointer">🗑</button></div>'; }).join('');
    var camposHtml=campos.map(function(f){ return chip(f.nome+' ('+(f.tipo||'texto')+')','data-fin="del-campo" data-v="'+esc(f.nome)+'"'); }).join('');
    var gopts=grupos.map(function(g){return '<option>'+esc(g)+'</option>';}).join('');
    var prodHtml=produtos.map(function(p){ return '<div style="display:flex;gap:8px;align-items:center;margin-bottom:4px"><span style="flex:1">'+esc(p.nome)+'</span><span class="text-sm text-muted">'+esc(p.grupo||'')+(p.mensal?' · 🔁 mensal':'')+'</span><button data-fin="del-prod" data-id="'+p.id+'" style="border:none;background:none;color:var(--danger);cursor:pointer">🗑</button></div>'; }).join('')||'<span class="text-sm text-muted">nenhum produto</span>';
    box.innerHTML='<p class="section-title">Financeiro</p><div class="card mb-4"><div class="card-body">'
      +'<div style="font-weight:600;margin-bottom:4px">Grupos de produto</div><div style="margin-bottom:6px">'+gruposHtml+'</div><div style="display:flex;gap:6px;margin-bottom:16px"><input id="fin-grupo-novo" placeholder="Novo grupo" style="'+INP+';flex:1"><button class="btn btn-sm btn-primary" data-fin="add-grupo">Adicionar</button></div>'
      +'<div style="font-weight:600;margin-bottom:4px">Comissão (%)</div>'+comHtml+'<div style="display:flex;gap:6px;margin:6px 0 16px"><input id="fin-com-nome" placeholder="Grupo (ex.: geral)" style="'+INP+';flex:1"><input id="fin-com-pct" type="number" step="0.1" placeholder="%" style="'+INP+';width:80px"><button class="btn btn-sm btn-primary" data-fin="add-com">Adicionar</button></div>'
      +'<div style="font-weight:600;margin-bottom:4px">Regra de pagamento da comissão</div><div style="display:flex;gap:8px;align-items:center;margin-bottom:16px;font-size:13px">Pago até o dia <input id="fin-corte" type="number" min="1" max="28" value="'+(regra.dia_corte||15)+'" style="'+INP+';width:70px"> → mês atual; depois → mês seguinte.</div>'
      +'<div style="font-weight:600;margin-bottom:4px">Campos personalizados (Vendas)</div><div style="margin-bottom:6px">'+camposHtml+'</div><div style="display:flex;gap:6px;margin-bottom:16px"><input id="fin-campo-nome" placeholder="Nome do campo" style="'+INP+';flex:1"><select id="fin-campo-tipo" style="'+INP+'"><option value="texto">Texto</option><option value="numero">Número</option><option value="data">Data</option></select><button class="btn btn-sm btn-primary" data-fin="add-campo">Adicionar</button></div>'
      +'<div style="font-weight:600;margin-bottom:4px">Produtos</div>'+prodHtml+'<div style="display:flex;gap:6px;margin-top:6px"><input id="fin-prod-nome" placeholder="Nome do produto" style="'+INP+';flex:1"><select id="fin-prod-grupo" style="'+INP+'"><option value="">— grupo —</option>'+gopts+'</select><label style="display:flex;align-items:center;gap:4px;font-size:13px;white-space:nowrap"><input type="checkbox" id="fin-prod-mensal"> 🔁 Mensal</label><button class="btn btn-sm btn-primary" data-fin="add-prod">Adicionar</button></div>'
      +'</div></div>';
  }

  document.addEventListener('click', async function(e){
    var box=document.getElementById('cfg-fin'); if(!box) return;
    var b=e.target.closest('[data-fin]'); if(!b) return;
    var a=b.getAttribute('data-fin');
    try{
      if(a==='add-grupo'){ var nv=document.getElementById('fin-grupo-novo').value.trim(); if(!nv) return; var g=(box._grupos||[]).slice(); if(g.indexOf(nv)<0) g.push(nv); await finSet('fin_grupos',g); }
      else if(a==='del-grupo'){ await finSet('fin_grupos',(box._grupos||[]).filter(function(x){return x!==b.getAttribute('data-v');})); }
      else if(a==='add-com'){ var nome=document.getElementById('fin-com-nome').value.trim(); var pct=parseFloat(document.getElementById('fin-com-pct').value)||0; if(!nome) return; var c=(box._comissao||[]).filter(function(x){return x.nome!==nome;}); c.push({nome:nome,pct:pct}); await finSet('fin_comissao',c); }
      else if(a==='del-com'){ await finSet('fin_comissao',(box._comissao||[]).filter(function(x){return x.nome!==b.getAttribute('data-v');})); }
      else if(a==='add-campo'){ var cn=document.getElementById('fin-campo-nome').value.trim(); var ct=document.getElementById('fin-campo-tipo').value; if(!cn) return; var cp=(box._campos||[]).filter(function(x){return x.nome!==cn;}); cp.push({nome:cn,tipo:ct}); await finSet('fin_campos_venda',cp); }
      else if(a==='del-campo'){ await finSet('fin_campos_venda',(box._campos||[]).filter(function(x){return x.nome!==b.getAttribute('data-v');})); }
      else if(a==='add-prod'){ var pn=document.getElementById('fin-prod-nome').value.trim(); var pg=document.getElementById('fin-prod-grupo').value; if(!pn) return; await _authFetch('POST','/fin/produtos',{nome:pn,grupo:pg||null,mensal:(document.getElementById('fin-prod-mensal')||{}).checked||false}); }
      else if(a==='del-prod'){ await _authFetch('DELETE','/fin/produtos/'+b.getAttribute('data-id')); }
      renderFin(box);
    }catch(err){ toast(err.message,'error'); }
  });
  document.addEventListener('change', async function(e){
    var box=document.getElementById('cfg-fin'); if(!box) return;
    var pct=e.target.closest('[data-com-nome]');
    if(pct){ var nome=pct.getAttribute('data-com-nome'); var val=parseFloat(pct.value)||0; await finSet('fin_comissao',(box._comissao||[]).map(function(x){ return x.nome===nome?{nome:x.nome,pct:val}:x; })); return; }
    var corte=e.target.closest('#fin-corte'); if(corte){ await finSet('fin_regra_pagto',{dia_corte:parseInt(corte.value)||15}); toast('Regra salva','success'); return; }
  });

  async function montarFinConfig(){
    var pc=document.querySelector('#page-configuracoes .page-content'); if(!pc) return;
    var box=document.getElementById('cfg-fin');
    if(!box){ box=document.createElement('div'); box.id='cfg-fin'; var cerv=document.getElementById('cfg-cervejas-rede'); if(cerv && cerv.nextSibling) pc.insertBefore(box, cerv.nextSibling); else pc.insertBefore(box, pc.firstChild); }
    renderFin(box);
  }
  window.montarFinConfig=montarFinConfig;
  montarFinConfig();
  document.addEventListener('click', function(e){ var b=e.target&&e.target.closest&&e.target.closest('[data-page="configuracoes"]'); if(b) setTimeout(montarFinConfig,120); });
})();

/* ===== FINANCEIRO Fase 2: cadastro de Vendas ===== */
(function(){
  function esc(s){ return (s==null?'':String(s)).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); }
  function money(n){ return 'R$ '+(Number(n)||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}); }
  function addDays(ymd,n){ if(!ymd) return ''; var p=(''+ymd).split('-'); if(p.length<3) return ''; var d=new Date(+p[0],(+p[1]||1)-1,+p[2]||1); d.setDate(d.getDate()+(parseInt(n)||0)); return d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2); }

  async function carregarVendas(){
    var root=document.getElementById('vendas-root'); if(!root) return;
    root.innerHTML='<div class="empty-state"><div class="spinner" style="margin:0 auto"></div></div>';
    var lista=[]; try{ lista=await _authFetch('GET','/fin/vendas')||[]; }catch(e){ root.innerHTML='<p style="color:var(--danger)">Erro: '+esc(e.message)+'</p>'; return; }
    window._vendas=lista;
    var toolbar='<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:12px"><button class="btn btn-primary btn-sm" data-vact="nova">＋ Nova venda</button></div>';
    var rows=lista.map(function(v){
      var total=(v.itens||[]).reduce(function(s,i){return s+(parseFloat(i.valor)||0);},0);
      var grupos=Array.from(new Set((v.itens||[]).map(function(i){return i.grupo;}).filter(Boolean))).join(', ');
      return '<tr><td>'+esc(v.id_lead||'—')+'</td><td><a href="#" data-vact="ver" data-id="'+v.id+'" style="color:var(--primary);font-weight:600;text-decoration:none">'+esc(v.cliente||'(sem cliente)')+'</a></td><td>'+esc(v.vendedor||'—')+'</td><td>'+(v.data_venda||'—')+'</td><td>'+esc(v.estagio||'—')+'</td><td>'+esc(grupos||'—')+(v.mensal?' <span style="background:#dbeafe;color:#1d4ed8;border-radius:8px;padding:1px 6px;font-size:11px">Mensal</span>':'')+'</td><td style="text-align:right;font-weight:600">'+money(total)+'</td><td style="text-align:center;white-space:nowrap"><button class="fel-ic" data-vact="editar" data-id="'+v.id+'" title="Editar">✏️</button><button class="fel-ic" data-vact="del" data-id="'+v.id+'" title="Excluir" style="color:var(--danger)">🗑️</button></td></tr>';
    }).join('');
    var head='<thead><tr><th>ID Lead</th><th>Cliente</th><th>Vendedor</th><th>Data</th><th>Estágio</th><th>Grupos</th><th style="text-align:right">Total</th><th></th></tr></thead>';
    root.innerHTML=toolbar+'<table class="tabela-contatos">'+head+'<tbody>'+(rows||'<tr><td colspan="8" style="text-align:center;padding:20px;color:var(--text-muted)">Nenhuma venda</td></tr>')+'</tbody></table>';
  }
  window.carregarVendas=carregarVendas;

  async function abrirVendaModal(venda){
    var grupos=[], produtos=[], campos=[];
    try{ var g=await _authFetch('GET','/fin/config/fin_grupos'); grupos=(g&&g.valor)||[]; }catch(e){}
    try{ produtos=await _authFetch('GET','/fin/produtos')||[]; }catch(e){}
    try{ var cc=await _authFetch('GET','/fin/config/fin_campos_venda'); campos=(cc&&cc.valor)||[]; }catch(e){}
    var state={ id:(venda&&venda.id)||null, data:JSON.parse(JSON.stringify(Object.assign({itens:[],anexos:[]}, venda||{}))) };
    if(!state.data.itens || !state.data.itens.length) state.data.itens=[{}];
    var ov=document.getElementById('venda-modal'); if(ov) ov.remove();
    ov=document.createElement('div'); ov.id='venda-modal';
    ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;display:flex;align-items:flex-start;justify-content:center;padding:16px;overflow:auto';
    document.body.appendChild(ov);
    function fechar(){ ov.remove(); carregarVendas(); }
    function v(id){ var el=document.getElementById(id); return el?el.value:''; }
    function renderItem(it, idx){
      var gopts='<option value="">— grupo —</option>'+grupos.map(function(g){return '<option'+(it.grupo===g?' selected':'')+'>'+esc(g)+'</option>';}).join('');
      var camposHtml=campos.map(function(f){ var val=(it.campos_extras&&it.campos_extras[f.nome])||''; var t=f.tipo==='numero'?'number':(f.tipo==='data'?'date':'text'); return '<div class="form-group" style="flex:1;min-width:140px"><label class="form-label">'+esc(f.nome)+'</label><input class="form-control vi-extra" data-campo="'+esc(f.nome)+'" type="'+t+'" value="'+esc(val)+'"></div>'; }).join('');
      var prev=addDays(it.nf_data, it.dias_pagamento);
      var vparc=(it.parcelas>1 && it.valor)? (parseFloat(it.valor)/parseInt(it.parcelas)):null;
      return '<div class="venda-item" data-idx="'+idx+'" style="border:1px solid var(--border);border-radius:10px;padding:12px;margin-bottom:10px">'
        +'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px"><b>Item '+(idx+1)+(it.grupo?' · '+esc(it.grupo):'')+'</b><button class="btn btn-sm btn-secondary vi-del" style="color:var(--danger)">Remover</button></div>'
        +'<div style="display:flex;gap:10px;flex-wrap:wrap"><div class="form-group" style="flex:1;min-width:140px"><label class="form-label">Grupo</label><select class="form-control vi-grupo">'+gopts+'</select></div><div class="form-group" style="flex:1;min-width:150px"><label class="form-label">Produto</label><input class="form-control vi-produto" list="venda-prod-list" value="'+esc(it.produto||'')+'"></div><div class="form-group" style="flex:2;min-width:200px"><label class="form-label">Detalhes</label><input class="form-control vi-detalhes" value="'+esc(it.detalhes||'')+'"></div></div>'
        +'<div style="display:flex;gap:10px;flex-wrap:wrap"><div class="form-group" style="flex:1;min-width:120px"><label class="form-label">Valor (R$)</label><input class="form-control vi-valor" type="number" step="0.01" value="'+(it.valor!=null?it.valor:'')+'"></div><div class="form-group" style="flex:1;min-width:90px"><label class="form-label">Parcelas</label><input class="form-control vi-parcelas" type="number" min="1" value="'+(it.parcelas||1)+'"></div><div class="form-group" style="flex:1;min-width:110px"><label class="form-label">Dias Pgto</label><input class="form-control vi-dias" type="number" value="'+(it.dias_pagamento||0)+'"></div><div class="form-group" style="flex:1;min-width:140px"><label class="form-label">Quem Fatura</label><input class="form-control vi-quem" value="'+esc(it.quem_fatura||'')+'"></div></div>'
        +'<div style="display:flex;gap:10px;flex-wrap:wrap"><div class="form-group" style="flex:1;min-width:120px"><label class="form-label">Nº NF</label><input class="form-control vi-nfnum" value="'+esc(it.nf_numero||'')+'"></div><div class="form-group" style="flex:1;min-width:140px"><label class="form-label">Data NF</label><input class="form-control vi-nfdata" type="date" value="'+(it.nf_data||'')+'"></div><div class="form-group" style="flex:1;min-width:120px"><label class="form-label">Valor NF</label><input class="form-control vi-nfvalor" type="number" step="0.01" value="'+(it.nf_valor!=null?it.nf_valor:'')+'"></div></div>'
        +(camposHtml?'<div style="display:flex;gap:10px;flex-wrap:wrap">'+camposHtml+'</div>':'')
        +'<div class="text-sm text-muted" style="margin-top:2px">Previsão pagto: <b>'+(prev||'—')+'</b>'+(vparc?(' · Valor parcela: <b>'+money(vparc)+'</b> (1ª na previsão, +20 dias cada)'):'')+'</div></div>';
    }
    function renderItens(){ var c=document.getElementById('venda-itens'); if(c) c.innerHTML=(state.data.itens||[]).map(renderItem).join(''); }
    function syncItens(){
      var arr=[]; ov.querySelectorAll('.venda-item').forEach(function(el){
        var extras={}; el.querySelectorAll('.vi-extra').forEach(function(x){ extras[x.getAttribute('data-campo')]=x.value; });
        arr.push({ grupo:el.querySelector('.vi-grupo').value||null, produto:el.querySelector('.vi-produto').value||null, detalhes:el.querySelector('.vi-detalhes').value||null, valor:parseFloat(el.querySelector('.vi-valor').value)||0, parcelas:parseInt(el.querySelector('.vi-parcelas').value)||1, dias_pagamento:parseInt(el.querySelector('.vi-dias').value)||0, quem_fatura:el.querySelector('.vi-quem').value||null, nf_numero:el.querySelector('.vi-nfnum').value||null, nf_data:el.querySelector('.vi-nfdata').value||null, nf_valor:parseFloat(el.querySelector('.vi-nfvalor').value)||null, contrato:parseInt((el.querySelector(".vi-contrato")||{}).value)||null, campos_extras:extras });
      });
      state.data.itens=arr;
    }
    function atualizarTotal(){ var t=(state.data.itens||[]).reduce(function(s,i){return s+(parseFloat(i.valor)||0);},0); var el=document.getElementById('venda-total'); if(el) el.innerHTML='Total da venda: '+money(t); }
    function render(){
      var d=state.data;
      var estOpts=['Vendas','Faturado','Standby','Perdido'].map(function(x){return '<option'+(d.estagio===x?' selected':'')+'>'+x+'</option>';}).join('');
      var anexosHtml=(d.anexos||[]).map(function(u){ return '<div style="display:flex;align-items:center;gap:6px;margin-bottom:3px"><a href="'+u+'" target="_blank" style="color:var(--primary);font-size:13px">📎 '+esc(u.split('/').pop())+'</a><button class="btn btn-sm btn-secondary vd-delanexo" data-url="'+esc(u)+'" style="color:var(--danger);padding:2px 6px">×</button></div>'; }).join('')||'<span class="text-sm text-muted">nenhum</span>';
      var total=(d.itens||[]).reduce(function(s,i){return s+(parseFloat(i.valor)||0);},0);
      ov.innerHTML='<datalist id="venda-prod-list">'+produtos.map(function(p){return '<option value="'+esc(p.nome)+'">';}).join('')+'</datalist>'
        +'<div style="background:#fff;border-radius:12px;max-width:840px;width:100%;max-height:92vh;display:flex;flex-direction:column">'
        +'<div style="flex-shrink:0;background:#fff;border-bottom:1px solid var(--border);border-radius:12px 12px 0 0;padding:12px 18px;display:flex;justify-content:space-between;align-items:center;gap:10px"><h3 style="margin:0">'+(state.id?'Editar venda':'Nova venda')+'</h3><div style="display:flex;gap:8px"><button class="btn btn-sm btn-secondary" data-x="close">Fechar</button><button class="btn btn-sm btn-primary" data-x="salvar">💾 Salvar</button></div></div>'
        +'<div style="overflow:auto;padding:18px;flex:1;min-height:0">'
        +'<div style="display:flex;gap:10px;flex-wrap:wrap"><div class="form-group" style="flex:1;min-width:120px"><label class="form-label">ID Lead</label><input id="vh-idlead" class="form-control" value="'+esc(d.id_lead||'')+'"></div><div class="form-group" style="flex:1;min-width:140px"><label class="form-label">Estágio</label><select id="vh-estagio" class="form-control"><option value="">—</option>'+estOpts+'</select></div><div class="form-group" style="flex:1;min-width:140px"><label class="form-label">Data Venda</label><input id="vh-data" type="date" class="form-control" value="'+(d.data_venda||'')+'"></div></div>'
        +'<div style="display:flex;gap:10px;flex-wrap:wrap"><div class="form-group" style="flex:1;min-width:160px"><label class="form-label">Vendedor</label><input id="vh-vendedor" class="form-control" value="'+esc(d.vendedor||'')+'"></div><div class="form-group" style="flex:1;min-width:160px"><label class="form-label">Cliente</label><input id="vh-cliente" class="form-control" value="'+esc(d.cliente||'')+'"></div><div class="form-group" style="flex:0 0 auto"><label style="display:flex;align-items:center;gap:6px;cursor:pointer;padding-top:28px"><input type="checkbox" id="vh-mensal"'+(d.mensal?' checked':'')+'> Mensal</label></div></div>'
        +'<hr style="margin:12px 0;border:none;border-top:1px solid var(--border)"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><b>Itens / grupos</b><button class="btn btn-sm btn-secondary" data-x="add-item">＋ Adicionar grupo</button></div><div id="venda-itens"></div>'
        +'<div id="venda-total" style="text-align:right;font-weight:700;font-size:16px;margin:8px 0">Total da venda: '+money(total)+'</div>'
        +'<hr style="margin:12px 0;border:none;border-top:1px solid var(--border)"><b>Anexos (PDF/foto/ZIP)</b><div style="margin:6px 0">'+anexosHtml+'</div>'+(state.id?'<input type="file" id="vh-anexo" accept=".pdf,.zip,image/*" multiple>':'<div class="text-sm text-muted">Salve a venda para anexar arquivos.</div>')
        +'</div></div>';
      renderItens();
    }
    async function salvar(){
      syncItens();
      var payload={ id_lead:v('vh-idlead')||null, estagio:v('vh-estagio')||null, data_venda:v('vh-data')||null, vendedor:v('vh-vendedor')||null, cliente:v('vh-cliente')||null, mensal:document.getElementById('vh-mensal').checked, itens:state.data.itens };
      try{
        if(state.id){ payload.anexos=state.data.anexos||[]; state.data=await _authFetch('PATCH','/fin/vendas/'+state.id,payload); }
        else { var r=await _authFetch('POST','/fin/vendas',payload); state.data=r; state.id=r.id; }
        toast('Venda salva','success'); render();
      }catch(err){ toast('Erro: '+err.message,'error'); }
    }
    ov.addEventListener('click', async function(e){
      if(e.target===ov){ fechar(); return; }
      var del=e.target.closest('.vi-del'); if(del){ syncItens(); var idx=parseInt(del.closest('.venda-item').getAttribute('data-idx')); state.data.itens.splice(idx,1); if(!state.data.itens.length) state.data.itens=[{}]; renderItens(); atualizarTotal(); return; }
      var da=e.target.closest('.vd-delanexo'); if(da){ try{ state.data=await _authFetch('DELETE','/fin/vendas/'+state.id+'/anexo',{url:da.getAttribute('data-url')}); render(); }catch(err){toast(err.message,'error');} return; }
      var x=e.target.closest('[data-x]'); if(!x) return;
      var act=x.getAttribute('data-x');
      if(act==='close') fechar();
      else if(act==='add-item'){ syncItens(); state.data.itens.push({}); renderItens(); return; }
      else if(act==='salvar'){ await salvar(); }
    });
    ov.addEventListener('change', async function(e){
      if(e.target.closest('.venda-item')){ syncItens(); renderItens(); atualizarTotal(); return; }
      var f=e.target.closest('#vh-anexo'); if(f && f.files && f.files.length){
        for(var i=0;i<f.files.length;i++){ var fd=new FormData(); fd.append('arquivo',f.files[i]); try{ var r=await fetch('/api/fin/vendas/'+state.id+'/anexo',{method:'POST',headers:{'Authorization':'Bearer '+getToken()},body:fd}); var data=await r.json(); if(r.ok) state.data=data; }catch(err){} }
        render();
      }
    });
    render();
  }
  window.abrirVendaModal=abrirVendaModal;

  if(!window._vendasBound){
    window._vendasBound=true;
    document.addEventListener('click', function(e){
      var b=e.target.closest && e.target.closest('#vendas-root [data-vact]'); if(!b) return; e.preventDefault();
      var act=b.getAttribute('data-vact'), id=b.getAttribute('data-id');
      if(act==='nova'){ abrirVendaModal(null); return; }
      var v=(window._vendas||[]).filter(function(x){return x.id===id;})[0];
      if(act==='ver'||act==='editar'){ if(v) abrirVendaModal(v); return; }
      if(act==='del'){ if(confirm('Excluir esta venda?')){ _authFetch('DELETE','/fin/vendas/'+id).then(carregarVendas).catch(function(err){toast(err.message,'error');}); } }
    });
  }
})();

/* ===== FINANCEIRO: Admin Vendedores + Quem Fatura ===== */
(function(){
  function esc(s){ return (s==null?'':String(s)).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
  var INP='padding:7px 9px;border:1px solid var(--border,#ccc);border-radius:8px;font-size:13px;box-sizing:border-box';
  async function finGet(k){ try{ var r=await _authFetch('GET','/fin/config/'+k); return r&&r.valor; }catch(e){ return null; } }
  async function finSet(k,v){ try{ await _authFetch('PUT','/fin/config/'+k,{valor:v}); }catch(e){ toast('Erro ao salvar','error'); } }
  async function renderListas(box){
    var vend=(await finGet('fin_vendedores'))||[], qf=(await finGet('fin_quem_fatura'))||[];
    box._vend=vend; box._qf=qf;
    function chips(arr,t){ return arr.map(function(x){ return '<span style="display:inline-flex;align-items:center;gap:6px;background:var(--surface-2,#eef);border-radius:14px;padding:3px 10px;margin:3px;font-size:13px">'+esc(x)+'<button data-finl="del-'+t+'" data-v="'+esc(x)+'" style="border:none;background:none;color:var(--danger);cursor:pointer;font-weight:700">×</button></span>'; }).join(''); }
    box.innerHTML='<p class="section-title">Financeiro — Vendedores e Faturamento</p><div class="card mb-4"><div class="card-body">'
      +'<div style="font-weight:600;margin-bottom:4px">Vendedores</div><div style="margin-bottom:6px">'+chips(vend,'vend')+'</div><div style="display:flex;gap:6px;margin-bottom:16px"><input id="finl-vend" placeholder="Nome do vendedor" style="'+INP+';flex:1"><button class="btn btn-sm btn-primary" data-finl="add-vend">Adicionar</button></div>'
      +'<div style="font-weight:600;margin-bottom:4px">Quem Fatura</div><div style="margin-bottom:6px">'+chips(qf,'qf')+'</div><div style="display:flex;gap:6px"><input id="finl-qf" placeholder="Empresa que fatura" style="'+INP+';flex:1"><button class="btn btn-sm btn-primary" data-finl="add-qf">Adicionar</button></div>'
      +'</div></div>';
  }
  document.addEventListener('click', async function(e){
    var box=document.getElementById('cfg-fin-listas'); if(!box) return;
    var b=e.target.closest('[data-finl]'); if(!b) return; var a=b.getAttribute('data-finl');
    try{
      if(a==='add-vend'){ var nv=document.getElementById('finl-vend').value.trim(); if(!nv)return; var l=(box._vend||[]).slice(); if(l.indexOf(nv)<0) l.push(nv); await finSet('fin_vendedores',l); }
      else if(a==='del-vend'){ await finSet('fin_vendedores',(box._vend||[]).filter(function(x){return x!==b.getAttribute('data-v');})); }
      else if(a==='add-qf'){ var nq=document.getElementById('finl-qf').value.trim(); if(!nq)return; var l2=(box._qf||[]).slice(); if(l2.indexOf(nq)<0) l2.push(nq); await finSet('fin_quem_fatura',l2); }
      else if(a==='del-qf'){ await finSet('fin_quem_fatura',(box._qf||[]).filter(function(x){return x!==b.getAttribute('data-v');})); }
      renderListas(box);
    }catch(err){ toast(err.message,'error'); }
  });
  async function montarFinListas(){ var pc=document.querySelector('#page-configuracoes .page-content'); if(!pc) return; var box=document.getElementById('cfg-fin-listas'); if(!box){ box=document.createElement('div'); box.id='cfg-fin-listas'; var fin=document.getElementById('cfg-fin'); if(fin&&fin.nextSibling) pc.insertBefore(box,fin.nextSibling); else pc.insertBefore(box,pc.firstChild); } renderListas(box); }
  window.montarFinListas=montarFinListas; montarFinListas();
  document.addEventListener('click', function(e){ var b=e.target&&e.target.closest&&e.target.closest('[data-page="configuracoes"]'); if(b) setTimeout(montarFinListas,130); });
})();

/* ===== FINANCEIRO Vendas v2: estágio/vendedor/quem-fatura/moeda/NF-edição/anexos ===== */
(function(){
  function esc(s){ return (s==null?'':String(s)).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
  function money(n,cur){ return ((cur==='USD')?'US$ ':'R$ ')+(Number(n)||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}); }
  function totais(itens){ var m={}; (itens||[]).forEach(function(i){ var c=i.moeda||'BRL'; m[c]=(m[c]||0)+(parseFloat(i.valor)||0); }); var ks=Object.keys(m); return ks.length?ks.map(function(c){return money(m[c],c);}).join(' · '):money(0,'BRL'); }
  function addDays(ymd,n){ if(!ymd) return ''; var p=(''+ymd).split('-'); if(p.length<3) return ''; var d=new Date(+p[0],(+p[1]||1)-1,+p[2]||1); d.setDate(d.getDate()+(parseInt(n)||0)); return d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2); }

  async function carregarVendas(){
    var root=document.getElementById('vendas-root'); if(!root) return;
    root.innerHTML='<div class="empty-state"><div class="spinner" style="margin:0 auto"></div></div>';
    var lista=[]; try{ lista=await _authFetch('GET','/fin/vendas')||[]; }catch(e){ root.innerHTML='<p style="color:var(--danger)">Erro: '+esc(e.message)+'</p>'; return; }
    window._vendas=lista;
    var toolbar='<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:12px"><button class="btn btn-primary btn-sm" data-vact2="nova">＋ Nova venda</button></div>';
    var rows=lista.map(function(v){ var grupos=Array.from(new Set((v.itens||[]).map(function(i){return i.grupo;}).filter(Boolean))).join(', ');
      return '<tr><td>'+esc(v.id_lead||'—')+'</td><td><a href="#" data-vact2="ver" data-id="'+v.id+'" style="color:var(--primary);font-weight:600;text-decoration:none">'+esc(v.cliente||'(sem cliente)')+'</a></td><td>'+esc(v.vendedor||'—')+'</td><td>'+(v.data_venda||'—')+'</td><td>'+esc(v.estagio||'—')+'</td><td>'+esc(grupos||'—')+'</td><td style="text-align:right;font-weight:600">'+totais(v.itens)+'</td><td style="text-align:center;white-space:nowrap"><button class="fel-ic" data-vact2="editar" data-id="'+v.id+'" title="Editar">✏️</button><button class="fel-ic" data-vact2="del" data-id="'+v.id+'" title="Excluir" style="color:var(--danger)">🗑️</button></td></tr>';
    }).join('');
    var head='<thead><tr><th>ID Lead</th><th>Cliente</th><th>Vendedor</th><th>Data</th><th>Estágio</th><th>Grupos</th><th style="text-align:right">Total</th><th></th></tr></thead>';
    root.innerHTML=toolbar+'<table class="tabela-contatos">'+head+'<tbody>'+(rows||'<tr><td colspan="8" style="text-align:center;padding:20px;color:var(--text-muted)">Nenhuma venda</td></tr>')+'</tbody></table>';
  }
  window.carregarVendas=carregarVendas;

  async function abrirVendaModal(venda){
    var grupos=[],produtos=[],campos=[],vendedores=[],quemFatura=[];
    try{ var g=await _authFetch('GET','/fin/config/fin_grupos'); grupos=(g&&g.valor)||[]; }catch(e){}
    try{ produtos=await _authFetch('GET','/fin/produtos')||[]; }catch(e){}
    try{ var cc=await _authFetch('GET','/fin/config/fin_campos_venda'); campos=(cc&&cc.valor)||[]; }catch(e){}
    try{ var vv=await _authFetch('GET','/fin/config/fin_vendedores'); vendedores=(vv&&vv.valor)||[]; }catch(e){}
    try{ var qq=await _authFetch('GET','/fin/config/fin_quem_fatura'); quemFatura=(qq&&qq.valor)||[]; }catch(e){}
    var state={ id:(venda&&venda.id)||null, data:JSON.parse(JSON.stringify(Object.assign({itens:[],anexos:[]}, venda||{}))) };
    if(!state.data.itens || !state.data.itens.length) state.data.itens=[{}];
    var ov=document.getElementById('venda-modal'); if(ov) ov.remove();
    ov=document.createElement('div'); ov.id='venda-modal';
    ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;display:flex;align-items:flex-start;justify-content:center;padding:16px;overflow:auto';
    document.body.appendChild(ov);
    function fechar(){ ov.remove(); carregarVendas(); }
    function v(id){ var el=document.getElementById(id); return el?el.value:''; }
    function selOf(arr,val,ph){ var o='<option value="">'+ph+'</option>'; var has=false; arr.forEach(function(x){ if(x===val) has=true; o+='<option'+(x===val?' selected':'')+'>'+esc(x)+'</option>'; }); if(val && !has) o+='<option selected>'+esc(val)+'</option>'; return o; }
    function renderItem(it, idx, edit){
      var gopts='<option value="">— grupo —</option>'+grupos.map(function(g){return '<option'+(it.grupo===g?' selected':'')+'>'+esc(g)+'</option>';}).join('');
      var moeda=it.moeda||'BRL';
      var mopts='<option value="BRL"'+(moeda==='BRL'?' selected':'')+'>R$ (BRL)</option><option value="USD"'+(moeda==='USD'?' selected':'')+'>US$ (USD)</option>';
      var vparc=(it.parcelas>1 && it.valor)? (parseFloat(it.valor)/parseInt(it.parcelas)):null;
      var camposHtml=campos.map(function(f){ var val=(it.campos_extras&&it.campos_extras[f.nome])||''; var t=f.tipo==='numero'?'number':(f.tipo==='data'?'date':'text'); return '<div class="form-group" style="flex:1;min-width:140px"><label class="form-label">'+esc(f.nome)+'</label><input class="form-control vi-extra" data-campo="'+esc(f.nome)+'" type="'+t+'" value="'+esc(val)+'"></div>'; }).join('');
      var h='<div class="venda-item" data-idx="'+idx+'" style="border:1px solid var(--border);border-radius:10px;padding:12px;margin-bottom:10px">'
        +'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px"><b>Item '+(idx+1)+(it.grupo?' · '+esc(it.grupo):'')+'</b><button class="btn btn-sm btn-secondary vi-del" style="color:var(--danger)">Remover</button></div>'
        +'<div style="display:flex;gap:10px;flex-wrap:wrap"><div class="form-group" style="flex:1;min-width:150px"><label class="form-label">Grupo</label><select class="form-control vi-grupo">'+gopts+'</select></div><div class="form-group" style="flex:1;min-width:160px"><label class="form-label">Produto</label><input class="form-control vi-produto" list="venda-prod-list" value="'+esc(it.produto||'')+'"></div></div>'
        +'<div style="display:flex;gap:10px;flex-wrap:wrap"><div class="form-group" style="flex:1;min-width:110px"><label class="form-label">Valor</label><input class="form-control vi-valor" type="number" step="0.01" value="'+(it.valor!=null?it.valor:'')+'"></div><div class="form-group" style="flex:0 0 130px"><label class="form-label">Moeda</label><select class="form-control vi-moeda">'+mopts+'</select></div><div class="form-group" style="flex:1;min-width:90px"><label class="form-label">Parcelas</label><input class="form-control vi-parcelas" type="number" min="1" value="'+(it.parcelas||1)+'"></div><div class="form-group" style="flex:1;min-width:110px"><label class="form-label">Dias Pgto</label><input class="form-control vi-dias" type="number" value="'+(it.dias_pagamento||0)+'"></div><div class="form-group" style="flex:1;min-width:120px"><label class="form-label">Contrato (meses)</label><input class="form-control vi-contrato" type="number" min="0" value="'+(it.contrato||'')+'"></div><div class="form-group" style="flex:1;min-width:150px"><label class="form-label">Quem Fatura</label><select class="form-control vi-quem">'+selOf(quemFatura,it.quem_fatura||'','— quem fatura —')+'</select></div></div>';
      if(edit){ h+='<div class="form-group"><label class="form-label">Detalhes</label><input class="form-control vi-detalhes" value="'+esc(it.detalhes||'')+'"></div>'
        +'<div style="display:flex;gap:10px;flex-wrap:wrap"><div class="form-group" style="flex:1;min-width:120px"><label class="form-label">Nº NF</label><input class="form-control vi-nfnum" value="'+esc(it.nf_numero||'')+'"></div><div class="form-group" style="flex:1;min-width:140px"><label class="form-label">Data NF</label><input class="form-control vi-nfdata" type="date" value="'+(it.nf_data||'')+'"></div><div class="form-group" style="flex:1;min-width:120px"><label class="form-label">Valor NF</label><input class="form-control vi-nfvalor" type="number" step="0.01" value="'+(it.nf_valor!=null?it.nf_valor:'')+'"></div></div>'; }
      if(camposHtml) h+='<div style="display:flex;gap:10px;flex-wrap:wrap">'+camposHtml+'</div>';
      var prev=edit?addDays(it.nf_data,it.dias_pagamento):'';
      h+='<div class="text-sm text-muted" style="margin-top:2px">'+(prev?('Previsão pagto: <b>'+prev+'</b> · '):'')+(vparc?('Valor parcela: <b>'+money(vparc,moeda)+'</b> (1ª na previsão, +20 dias)'):'')+'</div></div>';
      return h;
    }
    function renderItens(){ var c=document.getElementById('venda-itens'); if(c) c.innerHTML=(state.data.itens||[]).map(function(it,idx){return renderItem(it,idx,!!state.id);}).join(''); }
    function syncItens(){
      var arr=[]; ov.querySelectorAll('.venda-item').forEach(function(el){
        function g(sel){ var x=el.querySelector(sel); return x?x.value:null; }
        var extras={}; el.querySelectorAll('.vi-extra').forEach(function(x){ extras[x.getAttribute('data-campo')]=x.value; });
        arr.push({ grupo:g('.vi-grupo')||null, produto:g('.vi-produto')||null, detalhes:g('.vi-detalhes'), valor:parseFloat(g('.vi-valor'))||0, moeda:g('.vi-moeda')||'BRL', parcelas:parseInt(g('.vi-parcelas'))||1, dias_pagamento:parseInt(g('.vi-dias'))||0, quem_fatura:g('.vi-quem')||null, nf_numero:g('.vi-nfnum'), nf_data:g('.vi-nfdata'), nf_valor:parseFloat(g('.vi-nfvalor'))||null, contrato:parseInt((el.querySelector(".vi-contrato")||{}).value)||null, campos_extras:extras });
      });
      state.data.itens=arr;
    }
    function atualizarTotal(){ var el=document.getElementById('venda-total'); if(el) el.innerHTML='Total da venda: '+totais(state.data.itens); }
    function render(){
      var d=state.data;
      var estagioField = state.id ? '<select id="vh-estagio" class="form-control"><option'+(d.estagio==='Vendas'?' selected':'')+'>Vendas</option><option'+(d.estagio==='Faturado'?' selected':'')+'>Faturado</option></select>' : '<input id="vh-estagio" class="form-control" value="Vendas" readonly style="background:#f3f4f6;color:var(--text-muted)">';
      var anexosHtml=(d.anexos||[]).map(function(u){ return '<div style="display:flex;align-items:center;gap:6px;margin-bottom:3px"><a href="'+u+'" target="_blank" style="color:var(--primary);font-size:13px">📎 '+esc(u.split('/').pop())+'</a><button class="btn btn-sm btn-secondary vd-delanexo" data-url="'+esc(u)+'" style="color:var(--danger);padding:2px 6px">×</button></div>'; }).join('')||'<span class="text-sm text-muted">nenhum</span>';
      ov.innerHTML='<datalist id="venda-prod-list">'+produtos.map(function(p){return '<option value="'+esc(p.nome)+'">';}).join('')+'</datalist>'
        +'<div style="background:#fff;border-radius:12px;max-width:860px;width:100%;max-height:92vh;display:flex;flex-direction:column">'
        +'<div style="flex-shrink:0;background:#fff;border-bottom:1px solid var(--border);border-radius:12px 12px 0 0;padding:12px 18px;display:flex;justify-content:space-between;align-items:center;gap:10px"><h3 style="margin:0">'+(state.id?'Editar venda':'Nova venda')+'</h3><div style="display:flex;gap:8px"><button class="btn btn-sm btn-secondary" data-x="close">Fechar</button><button class="btn btn-sm btn-primary" data-x="salvar">💾 Salvar</button></div></div>'
        +'<div style="overflow:auto;padding:18px;flex:1;min-height:0">'
        +'<div style="display:flex;gap:10px;flex-wrap:wrap"><div class="form-group" style="flex:1;min-width:120px"><label class="form-label">ID Lead</label><input id="vh-idlead" class="form-control" value="'+esc(d.id_lead||'')+'"></div><div class="form-group" style="flex:1;min-width:140px"><label class="form-label">Estágio</label>'+estagioField+'</div><div class="form-group" style="flex:1;min-width:140px"><label class="form-label">Data Venda</label><input id="vh-data" type="date" class="form-control" value="'+(d.data_venda||'')+'"></div></div>'
        +'<div style="display:flex;gap:10px;flex-wrap:wrap"><div class="form-group" style="flex:1;min-width:160px"><label class="form-label">Vendedor</label><select id="vh-vendedor" class="form-control">'+selOf(vendedores,d.vendedor||'','— vendedor —')+'</select></div><div class="form-group" style="flex:1;min-width:160px"><label class="form-label">Cliente</label><input id="vh-cliente" class="form-control" value="'+esc(d.cliente||'')+'"></div></div>'
        +'<hr style="margin:12px 0;border:none;border-top:1px solid var(--border)"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><b>Itens / grupos</b><button class="btn btn-sm btn-secondary" data-x="add-item">＋ Adicionar grupo</button></div><div id="venda-itens"></div>'
        +'<div id="venda-total" style="text-align:right;font-weight:700;font-size:16px;margin:8px 0">Total da venda: '+totais(d.itens)+'</div>'
        +'<hr style="margin:12px 0;border:none;border-top:1px solid var(--border)"><b>Anexos (PDF/foto/ZIP)</b><div style="margin:6px 0">'+anexosHtml+'</div>'+(state.id?'<input type="file" id="vh-anexo" accept=".pdf,.zip,image/*" multiple>':'<div class="text-sm text-muted">Salve a venda para anexar arquivos.</div>')
        +'</div></div>';
      renderItens();
    }
    async function salvar(){
      syncItens();
      var payload={ id_lead:v('vh-idlead')||null, estagio:(state.id?(v('vh-estagio')||'Vendas'):'Vendas'), data_venda:v('vh-data')||null, vendedor:v('vh-vendedor')||null, cliente:v('vh-cliente')||null, itens:state.data.itens };
      try{
        if(state.id){ payload.anexos=state.data.anexos||[]; state.data=await _authFetch('PATCH','/fin/vendas/'+state.id,payload); }
        else { var r=await _authFetch('POST','/fin/vendas',payload); state.data=r; state.id=r.id; }
        toast('Venda salva','success'); render();
      }catch(err){ toast('Erro: '+err.message,'error'); }
    }
    ov.addEventListener('click', async function(e){
      if(e.target===ov){ fechar(); return; }
      var del=e.target.closest('.vi-del'); if(del){ syncItens(); var idx=parseInt(del.closest('.venda-item').getAttribute('data-idx')); state.data.itens.splice(idx,1); if(!state.data.itens.length) state.data.itens=[{}]; renderItens(); atualizarTotal(); return; }
      var da=e.target.closest('.vd-delanexo'); if(da){ try{ state.data=await _authFetch('DELETE','/fin/vendas/'+state.id+'/anexo',{url:da.getAttribute('data-url')}); render(); }catch(err){toast(err.message,'error');} return; }
      var x=e.target.closest('[data-x]'); if(!x) return; var act=x.getAttribute('data-x');
      if(act==='close') fechar();
      else if(act==='add-item'){ syncItens(); state.data.itens.push({}); renderItens(); return; }
      else if(act==='salvar'){ await salvar(); }
    });
    ov.addEventListener('change', async function(e){
      if(e.target.closest('.venda-item')){ syncItens(); renderItens(); atualizarTotal(); return; }
      var f=e.target.closest('#vh-anexo'); if(f && f.files && f.files.length){
        for(var i=0;i<f.files.length;i++){ var fd=new FormData(); fd.append('arquivo',f.files[i]);
          try{ var r=await fetch('/api/fin/vendas/'+state.id+'/anexo',{method:'POST',headers:{'Authorization':'Bearer '+getToken()},body:fd}); var data=await r.json(); if(r.ok){ state.data=data; } else { toast('Erro anexo: '+(data.detail||r.status),'error'); } }catch(err){ toast('Falha no anexo: '+err.message,'error'); } }
        render();
      }
    });
    render();
  }
  window.abrirVendaModal=abrirVendaModal;

  if(!window._vendasBound2){
    window._vendasBound2=true;
    document.addEventListener('click', function(e){
      var b=e.target.closest && e.target.closest('#vendas-root [data-vact2]'); if(!b) return; e.preventDefault();
      var act=b.getAttribute('data-vact2'), id=b.getAttribute('data-id');
      if(act==='nova'){ abrirVendaModal(null); return; }
      var v=(window._vendas||[]).filter(function(x){return x.id===id;})[0];
      if(act==='ver'||act==='editar'){ if(v) abrirVendaModal(v); return; }
      if(act==='del'){ if(confirm('Excluir esta venda?')){ _authFetch('DELETE','/fin/vendas/'+id).then(carregarVendas).catch(function(err){toast(err.message,'error');}); } }
    });
  }
})();

/* ===== FINANCEIRO Fase 3: Comissão ===== */
(function(){
  function esc(s){ return (s==null?'':String(s)).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
  function money(n,cur){ return ((cur==='USD')?'US$ ':'R$ ')+(Number(n)||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}); }
  function moneyMap(m){ var ks=Object.keys(m); return ks.length?ks.map(function(c){return money(m[c],c);}).join(' · '):money(0,'BRL'); }
  function addDays(ymd,n){ if(!ymd) return ''; var p=(''+ymd).split('-'); if(p.length<3) return ''; var d=new Date(+p[0],(+p[1]||1)-1,+p[2]||1); d.setDate(d.getDate()+(parseInt(n)||0)); return d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2); }
  var MES=['','jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
  function mesComissao(ymd,corte){ if(!ymd) return {ym:'',label:'—'}; var p=ymd.split('-'); var y=+p[0],m=+p[1],dia=+p[2]; if(dia>corte){ m++; if(m>12){m=1;y++;} } return {ym:y+'-'+('0'+m).slice(-2), label:MES[m]+'/'+y}; }
  var _comMes='';

  async function carregarComissao(){
    var root=document.getElementById('comissao-root'); if(!root) return;
    root.innerHTML='<div class="empty-state"><div class="spinner" style="margin:0 auto"></div></div>';
    var vendas=[], comCfg=[], regra={dia_corte:15};
    try{ vendas=await _authFetch('GET','/fin/vendas')||[]; }catch(e){ root.innerHTML='<p style="color:var(--danger)">Erro: '+esc(e.message)+'</p>'; return; }
    try{ var c=await _authFetch('GET','/fin/config/fin_comissao'); comCfg=(c&&c.valor)||[]; }catch(e){}
    try{ var r=await _authFetch('GET','/fin/config/fin_regra_pagto'); regra=(r&&r.valor)||{dia_corte:15}; }catch(e){}
    var pct=((comCfg.filter(function(x){return x.nome==='geral';})[0])||comCfg[0]||{pct:0}).pct||0;
    window._comData={vendas:vendas, pct:pct, corte:(regra.dia_corte||15)};
    renderComissao();
  }
  function renderComissao(){
    var root=document.getElementById('comissao-root'); if(!root||!window._comData) return;
    var D=window._comData, pct=D.pct, corte=D.corte;
    var linhas=D.vendas.map(function(v){
      var totM={}; (v.itens||[]).forEach(function(i){ var cur=i.moeda||'BRL'; totM[cur]=(totM[cur]||0)+(parseFloat(i.valor)||0); });
      var comM={}; Object.keys(totM).forEach(function(cur){ comM[cur]=totM[cur]*pct/100; });
      var ds=(v.itens||[]).map(function(i){ return addDays(i.nf_data,i.dias_pagamento); }).filter(Boolean); ds.sort();
      var prev=ds.length?ds[ds.length-1]:'';
      return {v:v, totM:totM, comM:comM, prev:prev, mc:mesComissao(prev,corte), grupos:Array.from(new Set((v.itens||[]).map(function(i){return i.grupo;}).filter(Boolean))).join(', ')};
    });
    var filtr=_comMes?linhas.filter(function(l){return l.mc.ym===_comMes;}):linhas;
    var rows=filtr.map(function(l){ var v=l.v;
      return '<tr><td>'+esc(v.id_lead||'—')+'</td><td>'+esc(v.cliente||'—')+'</td><td>'+esc(v.vendedor||'—')+'</td><td>'+esc(l.grupos||'—')+'</td><td>'+esc(v.estagio||'—')+'</td><td style="text-align:right">'+moneyMap(l.totM)+'</td><td style="text-align:right;font-weight:600;color:#15803d">'+moneyMap(l.comM)+'</td><td>'+(l.prev||'—')+'</td><td>'+l.mc.label+'</td><td><input type="date" class="com-pago" data-id="'+v.id+'" value="'+(v.comissao_pago_em||'')+'" style="padding:4px 6px;border:1px solid var(--border);border-radius:6px;font-size:12px"></td></tr>';
    }).join('');
    var totCom={}; filtr.forEach(function(l){ Object.keys(l.comM).forEach(function(cur){ totCom[cur]=(totCom[cur]||0)+l.comM[cur]; }); });
    var toolbar='<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:12px"><div style="display:flex;gap:8px;align-items:center"><label class="text-sm">Mês da comissão:</label><input type="month" id="com-mes" value="'+esc(_comMes)+'" style="padding:6px 8px;border:1px solid var(--border);border-radius:8px"><button class="btn btn-sm btn-secondary" data-com="limpar">Todos</button><span class="text-sm text-muted">('+pct+'% sobre o total · corte dia '+corte+')</span></div><div style="font-weight:700">Comissão no filtro: <span style="color:#15803d">'+moneyMap(totCom)+'</span></div></div>';
    var head='<thead><tr><th>ID Lead</th><th>Cliente</th><th>Vendedor</th><th>Grupos</th><th>Estágio</th><th style="text-align:right">Valor</th><th style="text-align:right">Comissão</th><th>Previsão</th><th>Mês</th><th>Pago em</th></tr></thead>';
    root.innerHTML=toolbar+'<table class="tabela-contatos">'+head+'<tbody>'+(rows||'<tr><td colspan="10" style="text-align:center;padding:20px;color:var(--text-muted)">Nenhuma venda</td></tr>')+'</tbody></table>';
  }
  window.carregarComissao=carregarComissao;

  if(!window._comBound){
    window._comBound=true;
    document.addEventListener('change', function(e){
      var m=e.target.closest && e.target.closest('#com-mes'); if(m){ _comMes=m.value; renderComissao(); return; }
      var p=e.target.closest && e.target.closest('#comissao-root .com-pago'); if(p){ var id=p.getAttribute('data-id'), val=p.value||null; if(window._comData) (window._comData.vendas||[]).forEach(function(v){ if(v.id===id) v.comissao_pago_em=val; }); _authFetch('PATCH','/fin/vendas/'+id,{comissao_pago_em:val}).then(function(){ toast('Pagamento salvo','success'); }).catch(function(err){toast(err.message,'error');}); return; }
    });
    document.addEventListener('click', function(e){ var b=e.target.closest && e.target.closest('#comissao-root [data-com="limpar"]'); if(b){ _comMes=''; renderComissao(); } });
  }
})();

/* ===== FINANCEIRO Comissão v2: status (A pagar / Pago / Pendente) + filtros ===== */
(function(){
  function esc(s){ return (s==null?'':String(s)).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
  function money(n,cur){ return ((cur==='USD')?'US$ ':'R$ ')+(Number(n)||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}); }
  function moneyMap(m){ var ks=Object.keys(m); return ks.length?ks.map(function(c){return money(m[c],c);}).join(' · '):money(0,'BRL'); }
  function addDays(ymd,n){ if(!ymd) return ''; var p=(''+ymd).split('-'); if(p.length<3) return ''; var d=new Date(+p[0],(+p[1]||1)-1,+p[2]||1); d.setDate(d.getDate()+(parseInt(n)||0)); return d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2); }
  var MES=['','jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
  function mesComissao(ymd,corte){ if(!ymd) return {ym:'',label:'—'}; var p=ymd.split('-'); var y=+p[0],m=+p[1],dia=+p[2]; if(dia>corte){ m++; if(m>12){m=1;y++;} } return {ym:y+'-'+('0'+m).slice(-2), label:MES[m]+'/'+y}; }
  function stBg(st){ return st==='Pago'?'#dcfce7':(st==='Pendente'?'#fecaca':'#fef3c7'); }
  var _mes='', _stf='';

  async function carregarComissao(){
    var root=document.getElementById('comissao-root'); if(!root) return;
    root.innerHTML='<div class="empty-state"><div class="spinner" style="margin:0 auto"></div></div>';
    var vendas=[], comCfg=[], regra={dia_corte:15};
    try{ vendas=await _authFetch('GET','/fin/vendas')||[]; }catch(e){ root.innerHTML='<p style="color:var(--danger)">Erro: '+esc(e.message)+'</p>'; return; }
    try{ var c=await _authFetch('GET','/fin/config/fin_comissao'); comCfg=(c&&c.valor)||[]; }catch(e){}
    try{ var r=await _authFetch('GET','/fin/config/fin_regra_pagto'); regra=(r&&r.valor)||{dia_corte:15}; }catch(e){}
    var pct=((comCfg.filter(function(x){return x.nome==='geral';})[0])||comCfg[0]||{pct:0}).pct||0;
    window._comData={vendas:vendas, pct:pct, corte:(regra.dia_corte||15)};
    renderComissao();
  }
  function renderComissao(){
    var root=document.getElementById('comissao-root'); if(!root||!window._comData) return;
    var D=window._comData, pct=D.pct, corte=D.corte;
    var linhas=D.vendas.map(function(v){
      var totM={}; (v.itens||[]).forEach(function(i){ var cur=i.moeda||'BRL'; totM[cur]=(totM[cur]||0)+(parseFloat(i.valor)||0); });
      var comM={}; Object.keys(totM).forEach(function(cur){ comM[cur]=totM[cur]*pct/100; });
      var ds=(v.itens||[]).map(function(i){ return addDays(i.nf_data,i.dias_pagamento); }).filter(Boolean); ds.sort();
      var prev=ds.length?ds[ds.length-1]:'';
      return {v:v, totM:totM, comM:comM, prev:prev, mc:mesComissao(prev,corte), st:(v.comissao_status||'A pagar'), grupos:Array.from(new Set((v.itens||[]).map(function(i){return i.grupo;}).filter(Boolean))).join(', ')};
    });
    var filtr=linhas.filter(function(l){ return (!_mes||l.mc.ym===_mes) && (!_stf||l.st===_stf); });
    var rows=filtr.map(function(l){ var v=l.v; var opts=['A pagar','Pago','Pendente'].map(function(x){return '<option'+(l.st===x?' selected':'')+'>'+x+'</option>';}).join('');
      return '<tr><td>'+esc(v.id_lead||'—')+'</td><td>'+esc(v.cliente||'—')+'</td><td>'+esc(v.vendedor||'—')+'</td><td>'+esc(l.grupos||'—')+'</td><td style="text-align:right">'+moneyMap(l.totM)+'</td><td style="text-align:right;font-weight:600;color:#15803d">'+moneyMap(l.comM)+'</td><td>'+(l.prev||'—')+'</td><td>'+l.mc.label+'</td><td><select class="com-status2" data-id="'+v.id+'" style="padding:4px 6px;border:1px solid var(--border);border-radius:6px;font-size:12px;background:'+stBg(l.st)+'">'+opts+'</select></td><td><input type="date" class="com-pago2" data-id="'+v.id+'" value="'+(v.comissao_pago_em||'')+'" style="padding:4px 6px;border:1px solid var(--border);border-radius:6px;font-size:12px"></td></tr>';
    }).join('');
    var totCom={}; filtr.forEach(function(l){ Object.keys(l.comM).forEach(function(cur){ totCom[cur]=(totCom[cur]||0)+l.comM[cur]; }); });
    var stfOpts=['','A pagar','Pago','Pendente'].map(function(x){return '<option value="'+x+'"'+(_stf===x?' selected':'')+'>'+(x||'Todos status')+'</option>';}).join('');
    var toolbar='<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:12px"><div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><label class="text-sm">Mês:</label><input type="month" id="com-mes2" value="'+esc(_mes)+'" style="padding:6px 8px;border:1px solid var(--border);border-radius:8px"><select id="com-stf" style="padding:6px 8px;border:1px solid var(--border);border-radius:8px">'+stfOpts+'</select><button class="btn btn-sm btn-secondary" data-com2="limpar">Limpar</button><span class="text-sm text-muted">('+pct+'% · corte dia '+corte+')</span></div><div style="font-weight:700">Comissão no filtro: <span style="color:#15803d">'+moneyMap(totCom)+'</span></div></div>';
    var head='<thead><tr><th>ID Lead</th><th>Cliente</th><th>Vendedor</th><th>Grupos</th><th style="text-align:right">Valor</th><th style="text-align:right">Comissão</th><th>Previsão</th><th>Mês</th><th>Status</th><th>Pago em</th></tr></thead>';
    root.innerHTML=toolbar+'<table class="tabela-contatos">'+head+'<tbody>'+(rows||'<tr><td colspan="10" style="text-align:center;padding:20px;color:var(--text-muted)">Nenhuma venda</td></tr>')+'</tbody></table>';
  }
  window.carregarComissao=carregarComissao;

  if(!window._comBound2){
    window._comBound2=true;
    document.addEventListener('change', function(e){
      var m=e.target.closest && e.target.closest('#com-mes2'); if(m){ _mes=m.value; renderComissao(); return; }
      var sf=e.target.closest && e.target.closest('#com-stf'); if(sf){ _stf=sf.value; renderComissao(); return; }
      var st=e.target.closest && e.target.closest('#comissao-root .com-status2'); if(st){ var id=st.getAttribute('data-id'), val=st.value; if(window._comData)(window._comData.vendas||[]).forEach(function(v){if(v.id===id)v.comissao_status=val;}); st.style.background=stBg(val); _authFetch('PATCH','/fin/vendas/'+id,{comissao_status:val}).then(function(){toast('Status salvo','success');}).catch(function(err){toast(err.message,'error');}); return; }
      var p=e.target.closest && e.target.closest('#comissao-root .com-pago2'); if(p){ var pid=p.getAttribute('data-id'), pv=p.value||null; if(window._comData)(window._comData.vendas||[]).forEach(function(v){if(v.id===pid)v.comissao_pago_em=pv;}); _authFetch('PATCH','/fin/vendas/'+pid,{comissao_pago_em:pv}).then(function(){toast('Pagamento salvo','success');}).catch(function(err){toast(err.message,'error');}); return; }
    });
    document.addEventListener('click', function(e){ var b=e.target.closest && e.target.closest('#comissao-root [data-com2="limpar"]'); if(b){ _mes=''; _stf=''; renderComissao(); } });
  }
})();

/* ===== FINANCEIRO Comissão v3: expansão mensal (contrato) + status por linha ===== */
(function(){
  function esc(s){ return (s==null?'':String(s)).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
  function money(n,cur){ return ((cur==='USD')?'US$ ':'R$ ')+(Number(n)||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}); }
  function moneyMap(m){ var ks=Object.keys(m); return ks.length?ks.map(function(c){return money(m[c],c);}).join(' · '):money(0,'BRL'); }
  function ymdFmt(d){ return d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2); }
  function addDays(ys,n){ if(!ys) return ''; var p=(''+ys).split('-'); if(p.length<3) return ''; var d=new Date(+p[0],(+p[1]||1)-1,+p[2]||1); d.setDate(d.getDate()+(parseInt(n)||0)); return ymdFmt(d); }
  function addMonths(ys,m){ if(!ys) return ''; var p=(''+ys).split('-'); if(p.length<3) return ''; var d=new Date(+p[0],(+p[1]||1)-1+m,+p[2]||1); return ymdFmt(d); }
  var MES=['','jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
  function mesComissao(ys,corte){ if(!ys) return {ym:'',label:'—'}; var p=ys.split('-'); var y=+p[0],m=+p[1],dia=+p[2]; if(dia>corte){ m++; if(m>12){m=1;y++;} } return {ym:y+'-'+('0'+m).slice(-2), label:MES[m]+'/'+y}; }
  function stBg(st){ return st==='Pago'?'#dcfce7':(st==='Pendente'?'#fecaca':'#fef3c7'); }
  var _m3='', _s3='';

  async function carregarComissao(){
    var root=document.getElementById('comissao-root'); if(!root) return;
    root.innerHTML='<div class="empty-state"><div class="spinner" style="margin:0 auto"></div></div>';
    var vendas=[], comCfg=[], regra={dia_corte:15};
    try{ vendas=await _authFetch('GET','/fin/vendas')||[]; }catch(e){ root.innerHTML='<p style="color:var(--danger)">Erro: '+esc(e.message)+'</p>'; return; }
    try{ var c=await _authFetch('GET','/fin/config/fin_comissao'); comCfg=(c&&c.valor)||[]; }catch(e){}
    try{ var r=await _authFetch('GET','/fin/config/fin_regra_pagto'); regra=(r&&r.valor)||{dia_corte:15}; }catch(e){}
    var pct=((comCfg.filter(function(x){return x.nome==='geral';})[0])||comCfg[0]||{pct:0}).pct||0;
    window._comData={vendas:vendas, pct:pct, corte:(regra.dia_corte||15)};
    renderComissao();
  }
  function gerarLinhas(){
    var D=window._comData, pct=D.pct, corte=D.corte, out=[];
    D.vendas.forEach(function(v){
      var meses=v.comissao_meses||{};
      function stOf(k){ return (meses[k]&&meses[k].status)||'A pagar'; }
      function pgOf(k){ return (meses[k]&&meses[k].pago_em)||''; }
      var normais=(v.itens||[]).filter(function(i){ return !(i.contrato&&i.contrato>0); });
      var mensais=(v.itens||[]).filter(function(i){ return i.contrato&&i.contrato>0; });
      if(normais.length){
        var totM={}; normais.forEach(function(i){ var c=i.moeda||'BRL'; totM[c]=(totM[c]||0)+(parseFloat(i.valor)||0); });
        var ds=normais.map(function(i){ return addDays(i.nf_data,i.dias_pagamento); }).filter(Boolean); ds.sort();
        var prev=ds.length?ds[ds.length-1]:'';
        var st=meses['unica']?stOf('unica'):(v.comissao_status||'A pagar');
        var pg=meses['unica']?pgOf('unica'):(v.comissao_pago_em||'');
        out.push({v:v,key:'unica',tipo:'À vista',grupos:Array.from(new Set(normais.map(function(i){return i.grupo;}).filter(Boolean))).join(', '),totM:totM,prev:prev,mc:mesComissao(prev,corte),st:st,pg:pg});
      }
      mensais.forEach(function(i){
        var start=addDays(i.nf_data,i.dias_pagamento), n=parseInt(i.contrato)||0, cur=i.moeda||'BRL', val=parseFloat(i.valor)||0;
        if(!start){ var k0=i.id+':pend'; var tm0={}; tm0[cur]=val; out.push({v:v,key:k0,tipo:'Mensal (aguard. NF)',grupos:i.grupo||'',totM:tm0,prev:'',mc:{ym:'',label:'—'},st:stOf(k0),pg:pgOf(k0)}); }
        else { for(var m=0;m<n;m++){ var d=addMonths(start,m), k=i.id+':'+m, tm={}; tm[cur]=val; out.push({v:v,key:k,tipo:'Mensal '+(m+1)+'/'+n,grupos:i.grupo||'',totM:tm,prev:d,mc:mesComissao(d,corte),st:stOf(k),pg:pgOf(k)}); } }
      });
    });
    return out;
  }
  function renderComissao(){
    var root=document.getElementById('comissao-root'); if(!root||!window._comData) return;
    var pct=window._comData.pct, corte=window._comData.corte;
    var linhas=gerarLinhas().map(function(l){ var comM={}; Object.keys(l.totM).forEach(function(c){ comM[c]=l.totM[c]*pct/100; }); l.comM=comM; return l; });
    var filtr=linhas.filter(function(l){ return (!_m3||l.mc.ym===_m3) && (!_s3||l.st===_s3); });
    var rows=filtr.map(function(l){ var v=l.v; var opts=['A pagar','Pago','Pendente'].map(function(x){return '<option'+(l.st===x?' selected':'')+'>'+x+'</option>';}).join('');
      return '<tr><td>'+esc(v.id_lead||'—')+'</td><td>'+esc(v.cliente||'—')+'</td><td>'+esc(v.vendedor||'—')+'</td><td class="text-sm">'+esc(l.tipo)+'</td><td>'+esc(l.grupos||'—')+'</td><td style="text-align:right">'+moneyMap(l.totM)+'</td><td style="text-align:right;font-weight:600;color:#15803d">'+moneyMap(l.comM)+'</td><td>'+(l.prev||'—')+'</td><td>'+l.mc.label+'</td><td><select class="com-status3" data-vid="'+v.id+'" data-key="'+esc(l.key)+'" style="padding:4px 6px;border:1px solid var(--border);border-radius:6px;font-size:12px;background:'+stBg(l.st)+'">'+opts+'</select></td><td><input type="date" class="com-pago3" data-vid="'+v.id+'" data-key="'+esc(l.key)+'" value="'+(l.pg||'')+'" style="padding:4px 6px;border:1px solid var(--border);border-radius:6px;font-size:12px"></td></tr>';
    }).join('');
    var totCom={}; filtr.forEach(function(l){ Object.keys(l.comM).forEach(function(c){ totCom[c]=(totCom[c]||0)+l.comM[c]; }); });
    var sopts=['','A pagar','Pago','Pendente'].map(function(x){return '<option value="'+x+'"'+(_s3===x?' selected':'')+'>'+(x||'Todos status')+'</option>';}).join('');
    var toolbar='<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:12px"><div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><label class="text-sm">Mês:</label><input type="month" id="com-mes3" value="'+esc(_m3)+'" style="padding:6px 8px;border:1px solid var(--border);border-radius:8px"><select id="com-stf3" style="padding:6px 8px;border:1px solid var(--border);border-radius:8px">'+sopts+'</select><button class="btn btn-sm btn-secondary" data-com3="limpar">Limpar</button><span class="text-sm text-muted">('+pct+'% · corte dia '+corte+')</span></div><div style="font-weight:700">Comissão no filtro: <span style="color:#15803d">'+moneyMap(totCom)+'</span></div></div>';
    var head='<thead><tr><th>ID</th><th>Cliente</th><th>Vendedor</th><th>Tipo</th><th>Grupos</th><th style="text-align:right">Valor</th><th style="text-align:right">Comissão</th><th>Previsão</th><th>Mês</th><th>Status</th><th>Pago em</th></tr></thead>';
    root.innerHTML=toolbar+'<table class="tabela-contatos">'+head+'<tbody>'+(rows||'<tr><td colspan="11" style="text-align:center;padding:20px;color:var(--text-muted)">Nenhuma linha</td></tr>')+'</tbody></table>';
  }
  window.carregarComissao=carregarComissao;

  async function salvarMes(vid, key, patch){
    var v=(window._comData.vendas||[]).filter(function(x){return x.id===vid;})[0]; if(!v) return;
    v.comissao_meses=v.comissao_meses||{}; v.comissao_meses[key]=Object.assign({}, v.comissao_meses[key], patch);
    try{ await _authFetch('PATCH','/fin/vendas/'+vid,{comissao_meses:v.comissao_meses}); toast('Salvo','success'); }catch(err){ toast(err.message,'error'); }
  }
  if(!window._comBound3){
    window._comBound3=true;
    document.addEventListener('change', function(e){
      var m=e.target.closest && e.target.closest('#com-mes3'); if(m){ _m3=m.value; renderComissao(); return; }
      var sf=e.target.closest && e.target.closest('#com-stf3'); if(sf){ _s3=sf.value; renderComissao(); return; }
      var st=e.target.closest && e.target.closest('#comissao-root .com-status3'); if(st){ st.style.background=stBg(st.value); salvarMes(st.getAttribute('data-vid'), st.getAttribute('data-key'), {status:st.value}); return; }
      var pg=e.target.closest && e.target.closest('#comissao-root .com-pago3'); if(pg){ salvarMes(pg.getAttribute('data-vid'), pg.getAttribute('data-key'), {pago_em:pg.value||null}); return; }
    });
    document.addEventListener('click', function(e){ var b=e.target.closest && e.target.closest('#comissao-root [data-com3="limpar"]'); if(b){ _m3=''; _s3=''; renderComissao(); } });
  }
})();

/* ===== FINANCEIRO: Finanças Empresa ===== */
(function(){
  if(!document.getElementById('css-fin-empresa')){
    var sfe=document.createElement('style'); sfe.id='css-fin-empresa';
    sfe.textContent='#page-financas-empresa .page-content{max-width:none;margin:0;padding:12px 16px}';
    document.head.appendChild(sfe);
  }
  function esc(s){ return (s==null?'':String(s)).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
  function money(n){ return 'R$ '+(Number(n)||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}); }
  function fmtData(iso){ if(!iso) return '—'; var p=(''+iso).split('-'); return p.length===3?(p[2]+'/'+p[1]+'/'+p[0]):iso; }
  var MET_LABEL={mensal:'Mensal',financiamento:'Financiamento',pontual:'Pontual'};
  var MODO_LABEL={dinheiro:'Dinheiro',pix:'Pix',credito:'Cartão Crédito',debito_automatico:'Débito automático',outro:'Outro'};
  var CAT_LABEL={despesa:'Despesa',divida:'Dívida',receita:'Receita',investimento:'Investimento',consumo:'Consumo',assinatura:'Assinatura'};
  var GRUPO_LABEL={pessoal:'Pessoal',empresa:'Empresa',familia:'Família'};
  var STATUS_LABEL={pago:'Pago',atrasado:'Atrasado',vencendo:'A vencer',planejado:'Planejado'};
  function stColor(st){ return {pago:'#dcfce7',atrasado:'#fecaca',vencendo:'#fef3c7'}[st]||''; }
  function stTextColor(st){ return {pago:'#15803d',atrasado:'#b91c1c',vencendo:'#92400e'}[st]||'var(--text-muted)'; }
  var _feGrupo='', _feCat='', _feConta='', _feCredor='', _feDescricao='', _feStatus='', _feMesModo='atual', _feMesEscolha='';
  var STATUS_COR={pago:{bg:'#dcfce7',text:'#15803d'},atrasado:{bg:'#fecaca',text:'#b91c1c'},planejado:{bg:'#f1f5f9',text:'#475569'}};
  function _feMesAtivo(){
    if(_feMesModo==='todos') return null;
    if(_feMesModo==='escolha') return _feMesEscolha||null;
    var d=new Date(); return d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2);
  }

  async function carregarFinancasEmpresa(){
    var root=document.getElementById('financas-empresa-root'); if(!root) return;
    root.innerHTML='<div class="empty-state"><div class="spinner" style="margin:0 auto"></div></div>';
    var lista=[];
    try{ lista=await _authFetch('GET','/fin/financas-empresa')||[]; }
    catch(e){ root.innerHTML='<p style="color:var(--danger)">Erro: '+esc(e.message)+'</p>'; return; }
    window._finEmpresa=lista;
    renderFinancasEmpresa();
  }
  window.carregarFinancasEmpresa=carregarFinancasEmpresa;

  function renderFinancasEmpresa(){
    var root=document.getElementById('financas-empresa-root'); if(!root||!window._finEmpresa) return;
    var lista=window._finEmpresa;
    var porGrupo=_feGrupo?lista.filter(function(x){return x.grupo===_feGrupo;}):lista;
    function chipGrupo(v,label){
      var n=v?lista.filter(function(x){return x.grupo===v;}).length:lista.length;
      var ativo=_feGrupo===v;
      return '<button class="btn btn-sm '+(ativo?'btn-primary':'btn-secondary')+'" data-fegrupo="'+v+'">'+label+' ('+n+')</button>';
    }
    function chipCat(v,label){
      var n=v?porGrupo.filter(function(x){return x.categoria===v;}).length:porGrupo.length;
      var ativo=_feCat===v;
      return '<button class="btn btn-sm '+(ativo?'btn-primary':'btn-secondary')+'" data-fecat="'+v+'">'+label+' ('+n+')</button>';
    }
    function chipMes(v,label){
      var ativo=_feMesModo===v;
      return '<button class="btn btn-sm '+(ativo?'btn-primary':'btn-secondary')+'" data-femes="'+v+'">'+label+'</button>';
    }
    var mesEscolhido=_feMesModo==='escolha' && _feMesEscolha;
    var mesInputStyle='padding:6px 10px;border-radius:8px;font-size:13px;border:1px solid '+(mesEscolhido?'var(--primary)':'var(--border)')+';background:'+(mesEscolhido?'var(--primary)':'#fff')+';color:'+(mesEscolhido?'#fff':'var(--text)');
    var preConta=_feCat?porGrupo.filter(function(x){return x.categoria===_feCat;}):porGrupo;
    var mesAtivo=_feMesAtivo();
    if(mesAtivo) preConta=preConta.filter(function(x){return (x.vencimento||'').slice(0,7)===mesAtivo;});
    var preCredor=_feConta?preConta.filter(function(x){return x.conta===_feConta;}):preConta;
    var preDescricao=_feCredor?preCredor.filter(function(x){return x.credor_pagador===_feCredor;}):preCredor;
    var toolbar='<div style="margin-bottom:12px">'
      +'<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:8px">'
        +'<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center"><b class="text-sm" style="display:inline-block;min-width:80px">Tipo conta:</b>'+chipGrupo('','Todos')+chipGrupo('pessoal','Pessoal')+chipGrupo('empresa','Empresa')+chipGrupo('familia','Família')+'</div>'
        +'<button class="btn btn-primary btn-sm" data-feact="novo">＋ Novo lançamento</button>'
      +'</div>'
      +'<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:8px"><b class="text-sm" style="display:inline-block;min-width:80px">Categoria:</b>'+chipCat('','Todos')+chipCat('despesa','Despesas')+chipCat('divida','Dívidas')+chipCat('receita','Receitas')+chipCat('investimento','Investimentos')+chipCat('consumo','Consumo')+chipCat('assinatura','Assinatura')+'</div>'
      +'<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:8px"><b class="text-sm" style="display:inline-block;min-width:80px">Período:</b>'+chipMes('todos','Todos')+chipMes('atual','Mês atual')
        +'<span class="text-sm" style="'+(mesEscolhido?'color:var(--primary);font-weight:600':'')+'">Selecionar o mês</span><input type="month" id="fe-mes-escolha" value="'+esc(_feMesEscolha)+'" style="'+mesInputStyle+'">'
      +'</div>'
      +'<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">'
        +'<select id="fe-conta-filtro" style="padding:6px 10px;border:1px solid var(--border);border-radius:8px;font-size:13px">'
          +'<option value="">Todas as contas</option>'
          +Array.from(new Set(preConta.map(function(x){return x.conta;}).filter(Boolean))).sort().map(function(c){return '<option value="'+esc(c)+'"'+(_feConta===c?' selected':'')+'>'+esc(c)+'</option>';}).join('')
        +'</select>'
        +'<select id="fe-credor-filtro" style="padding:6px 10px;border:1px solid var(--border);border-radius:8px;font-size:13px">'
          +'<option value="">Todos os credores/pagadores</option>'
          +Array.from(new Set(preCredor.map(function(x){return x.credor_pagador;}).filter(Boolean))).sort().map(function(c){return '<option value="'+esc(c)+'"'+(_feCredor===c?' selected':'')+'>'+esc(c)+'</option>';}).join('')
        +'</select>'
        +'<select id="fe-descricao-filtro" style="padding:6px 10px;border:1px solid var(--border);border-radius:8px;font-size:13px">'
          +'<option value="">Todas as descrições</option>'
          +Array.from(new Set(preDescricao.map(function(x){return x.descricao;}).filter(Boolean))).sort().map(function(c){return '<option value="'+esc(c)+'"'+(_feDescricao===c?' selected':'')+'>'+esc(c)+'</option>';}).join('')
        +'</select>'
        +'<button class="btn btn-sm btn-secondary" data-feact="limpar-filtros">Limpar filtros</button>'
      +'</div>'
    +'</div>';
    var filtr=preDescricao;
    if(_feDescricao) filtr=filtr.filter(function(x){return x.descricao===_feDescricao;});
    var preStatus=filtr;
    function cardStatus(v,label){
      var col=STATUS_COR[v]||{bg:'#e2e8f0',text:'var(--text)'};
      var base=v?preStatus.filter(function(x){return v==='planejado'?(x.status==='planejado'||x.status==='vencendo'):x.status===v;}):preStatus;
      var total=base.reduce(function(s,x){var vf=(x.valor_final!=null?x.valor_final:x.valor);return s+(vf||0);},0);
      var ativo=_feStatus===v;
      return '<button data-festatus="'+v+'" style="flex:1;min-width:150px;text-align:left;border:2px solid '+(ativo?col.text:'transparent')+';background:'+col.bg+';color:'+col.text+';padding:10px 14px;border-radius:10px;cursor:pointer">'
        +'<div style="font-size:12px;font-weight:600;opacity:.85">'+label+' ('+base.length+')</div>'
        +'<div style="font-weight:700;font-size:16px">'+money(total)+'</div>'
      +'</button>';
    }
    var farol='<div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:12px">'+cardStatus('','Todos')+cardStatus('planejado','Planejado')+cardStatus('atrasado','Atrasado')+cardStatus('pago','Pago')+'</div>';
    if(_feStatus) filtr=filtr.filter(function(x){return _feStatus==='planejado'?(x.status==='planejado'||x.status==='vencendo'):x.status===_feStatus;});
    filtr=filtr.slice().sort(function(a,b){return (a.vencimento||'').localeCompare(b.vencimento||'');});
    var rows=filtr.map(function(p){
      var parc=(p.total_parcelas&&p.total_parcelas>1)?(p.numero+'/'+p.total_parcelas):'—';
      var bg=stColor(p.status);
      var vf=(p.valor_final!=null?p.valor_final:p.valor);
      var vfCor=vf===p.valor?'inherit':(vf<p.valor?'#15803d':'#b91c1c');
      return '<tr style="background:'+(bg||'transparent')+'">'
        +'<td>'+(p.grupo?(GRUPO_LABEL[p.grupo]||p.grupo):'—')+'</td>'
        +'<td>'+(p.categoria?(CAT_LABEL[p.categoria]||p.categoria):'—')+'</td>'
        +'<td>'+esc(p.conta||'—')+'</td>'
        +'<td>'+esc(p.descricao||'—')+'</td>'
        +'<td>'+esc(p.credor_pagador||'—')+'</td>'
        +'<td>'+(MET_LABEL[p.metodo]||p.metodo)+'</td>'
        +'<td>'+(p.modo_pagamento?(MODO_LABEL[p.modo_pagamento]||p.modo_pagamento):'—')+'</td>'
        +'<td style="text-align:center">'+parc+'</td>'
        +'<td>'+fmtData(p.vencimento)+'</td>'
        +'<td style="text-align:right;font-weight:600">'+money(p.valor)+'</td>'
        +'<td style="text-align:right;font-weight:600;color:'+vfCor+'">'+money(vf)+'</td>'
        +'<td><span style="font-weight:600;color:'+stTextColor(p.status)+'">'+(STATUS_LABEL[p.status]||p.status)+'</span></td>'
        +'<td style="text-align:center;white-space:nowrap"><span style="display:inline-flex;align-items:center;gap:16px">'
          +'<button class="fel-ic" data-feact="detalhe" data-id="'+p.id+'" title="Detalhes, observação e anexos">👁'+((p.anexos&&p.anexos.length)?'<sup>'+p.anexos.length+'</sup>':'')+'</button>'
          +'<button class="fel-ic" data-feact="editar" data-id="'+p.id+'" title="Editar">✏️</button>'
          +'<button class="fel-ic" data-feact="excluir-parcela" data-id="'+p.id+'" title="Excluir esta parcela" style="color:var(--danger)">🗑️</button>'
        +'</span></td></tr>';
    }).join('');
    var head='<thead><tr><th>Grupo</th><th>Categoria</th><th>Conta</th><th>Descrição</th><th>Credor/Pagador</th><th>Pagamento</th><th>Modo Pagamento</th><th>Parcela</th><th>Vencimento</th><th style="text-align:right">Valor</th><th style="text-align:right">Valor Final</th><th>Status</th><th></th></tr></thead>';
    root.innerHTML=toolbar+farol+'<table class="tabela-contatos">'+head+'<tbody>'+(rows||'<tr><td colspan="13" style="text-align:center;padding:20px;color:var(--text-muted)">Nenhum registro</td></tr>')+'</tbody></table>';
  }

  function labelData(metodo){ return metodo==='financiamento'?'Data de início':'Data de pagamento'; }

  function abrirFinNovoModal(){
    var ov=document.getElementById('fe-modal'); if(ov) ov.remove();
    ov=document.createElement('div'); ov.id='fe-modal';
    ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;display:flex;align-items:flex-start;justify-content:center;padding:16px;overflow:auto';
    document.body.appendChild(ov);
    function fechar(){ ov.remove(); }
    function lerCampos(){
      return {
        grupo: document.getElementById('fe-grupo').value,
        categoria: document.getElementById('fe-categoria').value,
        metodo: document.getElementById('fe-metodo').value,
        conta: document.getElementById('fe-conta').value,
        descricao: document.getElementById('fe-descricao').value,
        credor: document.getElementById('fe-credor').value,
        valor: document.getElementById('fe-valor').value,
        data: document.getElementById('fe-data').value,
        parcelas: document.getElementById('fe-parcelas') ? document.getElementById('fe-parcelas').value : '',
        modo: document.getElementById('fe-modo').value
      };
    }
    function render(v){
      v=v||{};
      var metodo=v.metodo||'pontual', categoria=v.categoria||(_feCat||'despesa'), grupoAtual=v.grupo||(_feGrupo||'empresa');
      var catOpts=['despesa','divida','receita','investimento','consumo','assinatura'].map(function(c){return '<option value="'+c+'"'+(c===categoria?' selected':'')+'>'+CAT_LABEL[c]+'</option>';}).join('');
      var grupoOpts=['pessoal','empresa','familia'].map(function(g){return '<option value="'+g+'"'+(g===grupoAtual?' selected':'')+'>'+GRUPO_LABEL[g]+'</option>';}).join('');
      var modoOpts=['','dinheiro','pix','credito','debito_automatico','outro'].map(function(m){return '<option value="'+m+'"'+((v.modo||'')===m?' selected':'')+'>'+(m?MODO_LABEL[m]:'— definir depois —')+'</option>';}).join('');
      ov.innerHTML='<div style="background:#fff;border-radius:12px;max-width:560px;width:100%;max-height:92vh;display:flex;flex-direction:column">'
        +'<div style="flex-shrink:0;border-bottom:1px solid var(--border);padding:12px 18px;display:flex;justify-content:space-between;align-items:center"><h3 style="margin:0">Novo lançamento</h3><div style="display:flex;align-items:center;gap:8px">'
          +'<button class="btn btn-sm btn-secondary" data-x="salvar" title="Salvar" style="padding:6px 10px">💾</button>'
          +'<button class="btn btn-sm" data-x="close" title="Fechar" style="background:transparent;border:none;color:var(--danger);font-weight:700;font-size:16px;line-height:1;padding:6px 8px">✕</button>'
        +'</div></div>'
        +'<div style="overflow:auto;padding:18px">'
        +'<div style="display:flex;gap:10px;flex-wrap:wrap">'
          +'<div class="form-group" style="flex:1;min-width:130px"><label class="form-label">Grupo</label><select id="fe-grupo" class="form-control">'+grupoOpts+'</select></div>'
          +'<div class="form-group" style="flex:1;min-width:150px"><label class="form-label">Categoria</label><select id="fe-categoria" class="form-control">'+catOpts+'</select></div>'
          +'<div class="form-group" style="flex:1;min-width:150px"><label class="form-label">Pagamento</label><select id="fe-metodo" class="form-control"><option value="pontual"'+(metodo==='pontual'?' selected':'')+'>Pontual</option><option value="mensal"'+(metodo==='mensal'?' selected':'')+'>Mensal</option><option value="financiamento"'+(metodo==='financiamento'?' selected':'')+'>Financiamento</option></select></div>'
        +'</div>'
        +'<div class="form-group"><label class="form-label">Conta</label><input id="fe-conta" class="form-control" value="'+esc(v.conta||'')+'"></div>'
        +'<div class="form-group"><label class="form-label">Descrição</label><input id="fe-descricao" class="form-control" value="'+esc(v.descricao||'')+'"></div>'
        +'<div style="display:flex;gap:10px;flex-wrap:wrap">'
          +'<div class="form-group" style="flex:1;min-width:160px"><label class="form-label">Credor/Pagador</label><input id="fe-credor" class="form-control" value="'+esc(v.credor||'')+'"></div>'
          +'<div class="form-group" style="flex:1;min-width:120px"><label class="form-label">Valor</label><input id="fe-valor" type="number" step="0.01" class="form-control" value="'+esc(v.valor||'')+'"></div>'
        +'</div>'
        +'<div style="display:flex;gap:10px;flex-wrap:wrap">'
          +'<div class="form-group" style="flex:1;min-width:160px"><label class="form-label">'+labelData(metodo)+'</label><input id="fe-data" type="date" class="form-control" value="'+esc(v.data||'')+'"></div>'
          +(metodo==='financiamento'?'<div class="form-group" style="flex:1;min-width:140px"><label class="form-label">Nº de parcelas</label><input id="fe-parcelas" type="number" min="1" class="form-control" value="'+esc(v.parcelas||'')+'"></div>':'')
        +'</div>'
        +'<div class="form-group"><label class="form-label">Modo de pagamento</label><select id="fe-modo" class="form-control">'+modoOpts+'</select></div>'
        +(metodo==='mensal'?'<p class="text-sm text-muted">Serão geradas 12 parcelas mensais a partir da data informada, mesmo dia dos meses seguintes.</p>':'')
        +(metodo==='financiamento'?'<p class="text-sm text-muted">As datas de vencimento de cada parcela podem ser ajustadas depois, individualmente.</p>':'')
        +'</div></div>';
    }
    ov.addEventListener('click', async function(e){
      if(e.target===ov){ fechar(); return; }
      var x=e.target.closest('[data-x]'); if(!x) return; var act=x.getAttribute('data-x');
      if(act==='close') fechar();
      else if(act==='salvar'){
        var metodo=document.getElementById('fe-metodo').value;
        var numParcelas=metodo==='financiamento'?(parseInt(document.getElementById('fe-parcelas').value)||0):null;
        if(metodo==='financiamento' && !numParcelas){ toast('Informe o número de parcelas','error'); return; }
        var dataInicio=document.getElementById('fe-data').value;
        if(!dataInicio){ toast('Informe a data','error'); return; }
        var payload={
          grupo: document.getElementById('fe-grupo').value,
          categoria: document.getElementById('fe-categoria').value,
          metodo: metodo,
          conta: document.getElementById('fe-conta').value||null,
          descricao: document.getElementById('fe-descricao').value||null,
          credor_pagador: document.getElementById('fe-credor').value||null,
          valor: parseFloat(document.getElementById('fe-valor').value)||0,
          data_inicio: dataInicio,
          numero_parcelas: numParcelas,
          modo_pagamento: document.getElementById('fe-modo').value||null
        };
        try{ await _authFetch('POST','/fin/financas-empresa',payload); toast('Lançamento criado','success'); fechar(); carregarFinancasEmpresa(); }
        catch(err){ toast('Erro: '+err.message,'error'); }
      }
    });
    ov.addEventListener('change', function(e){
      if(e.target.id==='fe-metodo'){ render(lerCampos()); }
    });
    render();
  }

  function abrirFinEditModal(parcela){
    var ov=document.getElementById('fe-edit-modal'); if(ov) ov.remove();
    ov=document.createElement('div'); ov.id='fe-edit-modal';
    ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;display:flex;align-items:flex-start;justify-content:center;padding:16px;overflow:auto';
    document.body.appendChild(ov);
    var state=JSON.parse(JSON.stringify(parcela));
    function fechar(){ ov.remove(); carregarFinancasEmpresa(); }
    function jurosDescontoHtml(){
      if(!state.pago_em) return '';
      var jr=state.juros!=null?state.juros:0, ds=state.desconto!=null?state.desconto:0;
      var base=parseFloat(state.valor)||0;
      var totalFinal=base+(parseFloat(jr)||0)-(parseFloat(ds)||0);
      return '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:8px">'
        +'<div class="form-group" style="flex:1;min-width:110px"><label class="form-label">Juros (+)</label><input id="fee-juros" type="number" step="0.01" min="0" class="form-control" value="'+jr+'"></div>'
        +'<div class="form-group" style="flex:1;min-width:110px"><label class="form-label">Desconto (−)</label><input id="fee-desconto" type="number" step="0.01" min="0" class="form-control" value="'+ds+'"></div>'
        +'</div><div id="fee-total-final" class="text-sm" style="font-weight:600;margin-top:2px">Novo valor total: '+money(totalFinal)+'</div>';
    }
    function render(){
      var pagoInfo=state.pago_em?('<div class="text-sm" style="color:#15803d;margin-top:4px">Pago em '+fmtData(state.pago_em)+'</div>'):'';
      var anexos=(state.anexos||[]);
      var anexosHtml=anexos.length
        ? anexos.map(function(u){ return '<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px"><a href="'+esc(u)+'" target="_blank" style="color:var(--primary);font-size:13px">📎 '+esc(u.split('/').pop())+'</a><button class="btn btn-sm btn-secondary fee-del-anexo" data-url="'+esc(u)+'" style="color:var(--danger);padding:2px 6px">×</button></div>'; }).join('')
        : '<div class="text-sm text-muted" style="margin-bottom:6px">Nenhum arquivo anexado</div>';
      ov.innerHTML='<div style="background:#fff;border-radius:12px;max-width:560px;width:100%;max-height:92vh;display:flex;flex-direction:column">'
        +'<div style="flex-shrink:0;border-bottom:1px solid var(--border);padding:12px 18px;display:flex;justify-content:space-between;align-items:center"><h3 style="margin:0">Editar lançamento</h3><div style="display:flex;align-items:center;gap:8px">'
          +'<button class="btn btn-sm btn-success" data-x="toggle-pago">'+(state.pago_em?'✓ Pago':'Pago')+'</button>'
          +'<button class="btn btn-sm btn-secondary" data-x="salvar" title="Salvar" style="padding:6px 10px">💾</button>'
          +'<button class="btn btn-sm" data-x="close" title="Fechar" style="background:transparent;border:none;color:var(--danger);font-weight:700;font-size:16px;line-height:1;padding:6px 8px">✕</button>'
        +'</div></div>'
        +'<div style="overflow:auto;padding:18px">'
        +'<div style="display:flex;gap:10px;flex-wrap:wrap">'
          +'<div class="form-group" style="flex:1;min-width:130px"><label class="form-label">Grupo</label><select id="fee-grupo" class="form-control">'
            +['','pessoal','empresa','familia'].map(function(g){ return '<option value="'+g+'"'+(state.grupo===g?' selected':'')+'>'+(g?GRUPO_LABEL[g]:'— não definido —')+'</option>'; }).join('')
          +'</select></div>'
          +'<div class="form-group" style="flex:1;min-width:150px"><label class="form-label">Categoria</label><select id="fee-categoria" class="form-control">'
            +['despesa','divida','receita','investimento','consumo','assinatura'].map(function(c){ return '<option value="'+c+'"'+(state.categoria===c?' selected':'')+'>'+CAT_LABEL[c]+'</option>'; }).join('')
          +'</select></div>'
        +'</div>'
        +'<div class="form-group"><label class="form-label">Conta</label><input id="fee-conta" class="form-control" value="'+esc(state.conta||'')+'"></div>'
        +'<div class="form-group"><label class="form-label">Descrição</label><input id="fee-descricao" class="form-control" value="'+esc(state.descricao||'')+'"></div>'
        +'<div class="form-group"><label class="form-label">Credor/Pagador</label><input id="fee-credor" class="form-control" value="'+esc(state.credor_pagador||'')+'"></div>'
        +'<div style="display:flex;gap:10px;flex-wrap:wrap">'
          +'<div class="form-group" style="flex:1;min-width:150px"><label class="form-label">Vencimento'+(state.total_parcelas>1?' (parcela '+state.numero+'/'+state.total_parcelas+')':'')+'</label><input id="fee-vencimento" type="date" class="form-control" value="'+esc(state.vencimento||'')+'"></div>'
          +'<div class="form-group" style="flex:1;min-width:120px"><label class="form-label">Valor</label><input id="fee-valor" type="number" step="0.01" class="form-control" value="'+(state.valor!=null?state.valor:'')+'"></div>'
        +'</div>'
        +'<div class="form-group"><label class="form-label">Modo de pagamento</label><select id="fee-modo" class="form-control">'
          +['','dinheiro','pix','credito','debito_automatico','outro'].map(function(m){ return '<option value="'+m+'"'+(state.modo_pagamento===m?' selected':'')+'>'+(m?MODO_LABEL[m]:'— não definido —')+'</option>'; }).join('')
        +'</select></div>'
        +(state.pago_em?('<div class="form-group" id="fee-pago-box">'+pagoInfo+jurosDescontoHtml()+'</div>'):'')
        +'<div class="form-group"><label class="form-label">Observação</label><textarea id="fee-obs" class="form-control" rows="3">'+esc(state.observacao||'')+'</textarea></div>'
        +'<hr style="margin:12px 0;border:none;border-top:1px solid var(--border)">'
        +'<label class="form-label">Arquivos (fatura, comprovante, etc — foto ou PDF)</label>'+anexosHtml+'<input type="file" id="fee-anexo" accept="image/*,.pdf" multiple>'
        +'</div></div>';
    }
    ov.addEventListener('click', async function(e){
      if(e.target===ov){ fechar(); return; }
      var da=e.target.closest('.fee-del-anexo'); if(da){
        try{ var r=await _authFetch('DELETE','/fin/financas-empresa/parcelas/'+state.id+'/anexo',{url:da.getAttribute('data-url')}); state.anexos=r.anexos; render(); }
        catch(err){ toast(err.message,'error'); }
        return;
      }
      var x=e.target.closest('[data-x]'); if(!x) return; var act=x.getAttribute('data-x');
      if(act==='close') fechar();
      else if(act==='toggle-pago'){
        if(state.pago_em){ state.pago_em=null; }
        else { state.pago_em=new Date().toISOString().slice(0,10); if(state.juros==null) state.juros=0; if(state.desconto==null) state.desconto=0; }
        render();
      }
      else if(act==='salvar'){
        try{
          var grupoSel=document.getElementById('fee-grupo').value;
          if(!grupoSel){ toast('Selecione o Grupo (Pessoal, Empresa ou Família)','error'); return; }
          await _authFetch('PATCH','/fin/financas-empresa/lancamentos/'+state.lancamento_id,{
            grupo: grupoSel,
            categoria: document.getElementById('fee-categoria').value,
            conta: document.getElementById('fee-conta').value||null,
            descricao: document.getElementById('fee-descricao').value||null,
            credor_pagador: document.getElementById('fee-credor').value||null
          });
          var patchParcela={
            vencimento: document.getElementById('fee-vencimento').value,
            valor: parseFloat(document.getElementById('fee-valor').value)||0,
            pago_em: state.pago_em||null,
            modo_pagamento: document.getElementById('fee-modo').value||null,
            observacao: document.getElementById('fee-obs').value||null
          };
          if(state.pago_em){
            var jEl=document.getElementById('fee-juros'), dEl=document.getElementById('fee-desconto');
            patchParcela.juros=jEl?Math.max(0,parseFloat(jEl.value)||0):0;
            patchParcela.desconto=dEl?Math.max(0,parseFloat(dEl.value)||0):0;
          }
          await _authFetch('PATCH','/fin/financas-empresa/parcelas/'+state.id,patchParcela);
          toast('Salvo','success'); fechar();
        }catch(err){ toast('Erro: '+err.message,'error'); }
      }
    });
    ov.addEventListener('input', function(e){
      if(e.target.id==='fee-juros'||e.target.id==='fee-desconto'){
        if(parseFloat(e.target.value)<0) e.target.value='0';
      }
      if(e.target.id==='fee-juros'||e.target.id==='fee-desconto'||e.target.id==='fee-valor'){
        var jr=Math.max(0,parseFloat((document.getElementById('fee-juros')||{}).value)||0);
        var ds=Math.max(0,parseFloat((document.getElementById('fee-desconto')||{}).value)||0);
        var base=parseFloat(document.getElementById('fee-valor').value)||0;
        var tot=document.getElementById('fee-total-final'); if(tot) tot.textContent='Novo valor total: '+money(base+jr-ds);
      }
    });
    ov.addEventListener('change', async function(e){
      var f=e.target.closest('#fee-anexo'); if(f && f.files && f.files.length){
        for(var i=0;i<f.files.length;i++){
          var fd=new FormData(); fd.append('arquivo',f.files[i]);
          try{
            var r=await fetch('/api/fin/financas-empresa/parcelas/'+state.id+'/anexo',{method:'POST',headers:{'Authorization':'Bearer '+getToken()},body:fd});
            var data=await r.json();
            if(r.ok){ state.anexos=data.anexos; } else { toast('Erro anexo: '+(data.detail||r.status),'error'); }
          }catch(err){ toast('Falha no anexo: '+err.message,'error'); }
        }
        toast('Arquivo(s) anexado(s)','success'); render();
      }
    });
    render();
  }

  function abrirFinDetalheModal(parcela){
    var ov=document.getElementById('fe-detalhe-modal'); if(ov) ov.remove();
    ov=document.createElement('div'); ov.id='fe-detalhe-modal';
    ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;display:flex;align-items:flex-start;justify-content:center;padding:16px;overflow:auto';
    document.body.appendChild(ov);
    var state=parcela;
    function fechar(){ ov.remove(); }
    function linha(label,val){ return '<div style="display:flex;justify-content:space-between;padding:3px 0;border-bottom:1px solid var(--border)"><span class="text-sm text-muted">'+label+'</span><span style="font-weight:600">'+val+'</span></div>'; }
    var resumo=linha('Valor original',money(state.valor))
      +(state.juros?linha('Juros',money(state.juros)):'')
      +(state.desconto?linha('Desconto','−'+money(state.desconto)):'')
      +linha('Valor final',money((parseFloat(state.valor)||0)+(parseFloat(state.juros)||0)-(parseFloat(state.desconto)||0)))
      +linha('Status',STATUS_LABEL[state.status]||state.status)
      +(state.pago_em?linha('Pago em',fmtData(state.pago_em)):'')
      +(state.modo_pagamento?linha('Modo de pagamento',MODO_LABEL[state.modo_pagamento]||state.modo_pagamento):'');
    var anexos=(state.anexos||[]);
    var anexosHtml=anexos.length
      ? anexos.map(function(u){ return '<div style="margin-bottom:4px"><a href="'+esc(u)+'" target="_blank" style="color:var(--primary);font-size:13px">📎 '+esc(u.split('/').pop())+' (visualizar/baixar)</a></div>'; }).join('')
      : '<div class="text-sm text-muted">Nenhum arquivo anexado</div>';
    ov.innerHTML='<div style="background:#fff;border-radius:12px;max-width:560px;width:100%;max-height:92vh;display:flex;flex-direction:column">'
      +'<div style="flex-shrink:0;border-bottom:1px solid var(--border);padding:12px 18px;display:flex;justify-content:space-between;align-items:center"><h3 style="margin:0">Detalhes — '+esc(state.conta||'lançamento')+'</h3><button class="btn btn-sm" data-x="close" title="Fechar" style="background:transparent;border:none;color:var(--danger);font-weight:700;font-size:16px;line-height:1;padding:6px 8px">✕</button></div>'
      +'<div style="overflow:auto;padding:18px">'
      +'<div class="card mb-4" style="border:1px solid var(--border);border-radius:8px;padding:10px 12px">'+resumo+'</div>'
      +'<div class="form-group"><label class="form-label">Observação</label><div class="text-sm" style="white-space:pre-wrap">'+(state.observacao?esc(state.observacao):'<span class="text-muted">Nenhuma observação</span>')+'</div></div>'
      +'<hr style="margin:12px 0;border:none;border-top:1px solid var(--border)">'
      +'<label class="form-label">Arquivos</label>'+anexosHtml
      +'</div></div>';
    ov.addEventListener('click', function(e){
      if(e.target===ov){ fechar(); return; }
      var x=e.target.closest('[data-x]'); if(x && x.getAttribute('data-x')==='close') fechar();
    });
  }

  if(!window._feBound){
    window._feBound=true;
    document.addEventListener('click', function(e){
      var chipGrupoBtn=e.target.closest && e.target.closest('#financas-empresa-root [data-fegrupo]'); if(chipGrupoBtn){ _feGrupo=chipGrupoBtn.getAttribute('data-fegrupo'); renderFinancasEmpresa(); return; }
      var chipBtn=e.target.closest && e.target.closest('#financas-empresa-root [data-fecat]'); if(chipBtn){ _feCat=chipBtn.getAttribute('data-fecat'); renderFinancasEmpresa(); return; }
      var chipMesBtn=e.target.closest && e.target.closest('#financas-empresa-root [data-femes]'); if(chipMesBtn){ _feMesModo=chipMesBtn.getAttribute('data-femes'); renderFinancasEmpresa(); return; }
      var cardStatusBtn=e.target.closest && e.target.closest('#financas-empresa-root [data-festatus]'); if(cardStatusBtn){ var vv=cardStatusBtn.getAttribute('data-festatus'); _feStatus=(_feStatus===vv)?'':vv; renderFinancasEmpresa(); return; }
      var b=e.target.closest && e.target.closest('#financas-empresa-root [data-feact]'); if(b){
        var act=b.getAttribute('data-feact'), id=b.getAttribute('data-id');
        if(act==='novo'){ abrirFinNovoModal(); return; }
        if(act==='editar'){ var p=(window._finEmpresa||[]).filter(function(x){return x.id===id;})[0]; if(p) abrirFinEditModal(p); return; }
        if(act==='detalhe'){ var pd=(window._finEmpresa||[]).filter(function(x){return x.id===id;})[0]; if(pd) abrirFinDetalheModal(pd); return; }
        if(act==='excluir-parcela'){ if(confirm('Excluir esta parcela?')){ _authFetch('DELETE','/fin/financas-empresa/parcelas/'+id).then(carregarFinancasEmpresa).catch(function(err){toast(err.message,'error');}); } return; }
        if(act==='limpar-filtros'){ _feGrupo=''; _feCat=''; _feConta=''; _feCredor=''; _feDescricao=''; _feStatus=''; _feMesModo='todos'; _feMesEscolha=''; renderFinancasEmpresa(); return; }
      }
    });
    document.addEventListener('change', function(e){
      var me=e.target.closest && e.target.closest('#fe-mes-escolha'); if(me){ _feMesEscolha=me.value; _feMesModo='escolha'; renderFinancasEmpresa(); }
      var cf=e.target.closest && e.target.closest('#fe-conta-filtro'); if(cf){ _feConta=cf.value; renderFinancasEmpresa(); }
      var crf=e.target.closest && e.target.closest('#fe-credor-filtro'); if(crf){ _feCredor=crf.value; renderFinancasEmpresa(); }
      var dsf=e.target.closest && e.target.closest('#fe-descricao-filtro'); if(dsf){ _feDescricao=dsf.value; renderFinancasEmpresa(); }
    });
    document.addEventListener('click', function(e){
      var b=e.target.closest && e.target.closest('[data-page="financas-empresa"]');
      if(b){ setTimeout(function(){ if(typeof carregarFinancasEmpresa==='function') carregarFinancasEmpresa(); }, 50); }
    });
  }
})();

/* ===== FINANCEIRO: Cartão de Crédito ===== */
(function(){
  if(!document.getElementById('css-fin-cartao')){
    var sfc=document.createElement('style'); sfc.id='css-fin-cartao';
    sfc.textContent='#page-financas-pessoais .page-content{max-width:none;margin:0;padding:12px 16px}';
    document.head.appendChild(sfc);
  }
  function esc(s){ return (s==null?'':String(s)).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
  function money(n){ return 'R$ '+(Number(n)||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}); }
  function fmtData(iso){ if(!iso) return '—'; var p=(''+iso).split('-'); return p.length===3?(p[2]+'/'+p[1]+'/'+p[0]):iso; }
  var CARTOES=[['pix','Pix'],['dinheiro','Dinheiro'],['debito','Débito'],['nubank_gesser','Nubank Gesser'],['santander','Santander'],['mercado_pago','Mercado Pago'],['nubank_sil','Nubank Sil'],['caixa','Caixa']];
  var CARTOES_REAIS=[['nubank_gesser','Nubank Gesser'],['santander','Santander'],['mercado_pago','Mercado Pago'],['nubank_sil','Nubank Sil'],['caixa','Caixa']];
  var CARTAO_LABEL={}; CARTOES.forEach(function(c){ CARTAO_LABEL[c[0]]=c[1]; });
  var METODO_PG_LABEL={cartao:'Cartão',dinheiro:'Dinheiro',pix:'Pix',debito:'Débito'};
  var MET_LABEL={avista:'À vista',parcelado:'Parcelado',recorrente:'Recorrente'};
  var CAT_LABEL={despesa:'Despesa',divida:'Dívida',receita:'Receita',investimento:'Investimento',consumo:'Consumo',assinatura:'Assinatura'};
  var GRUPO_LABEL={pessoal:'Pessoal',empresa:'Empresa'};
  var _ccGrupo='', _ccCat='', _ccConta='', _ccMesModo='atual', _ccMesEscolha='', _ccMetodoPg='', _ccFormaPg='';
  function _ccMesAtivo(){
    if(_ccMesModo==='todos') return null;
    if(_ccMesModo==='escolha') return _ccMesEscolha||null;
    var d=new Date(); return d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2);
  }

  async function carregarFinancasCartao(){
    var root=document.getElementById('financas-pessoais-root'); if(!root) return;
    root.innerHTML='<div class="empty-state"><div class="spinner" style="margin:0 auto"></div></div>';
    var resumo=[], lista=[];
    try{
      resumo=await _authFetch('GET','/fin/financas-cartao/resumo')||[];
      lista=await _authFetch('GET','/fin/financas-cartao')||[];
    }catch(e){ root.innerHTML='<p style="color:var(--danger)">Erro: '+esc(e.message)+'</p>'; return; }
    window._ccResumo=resumo; window._ccLista=lista;
    renderFinancasCartao();
  }
  window.carregarFinancasCartao=carregarFinancasCartao;

  function renderResumo(){
    var resumo=window._ccResumo||[];
    return '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px">'+resumo.map(function(r){
      return '<div class="card" style="flex:1;min-width:160px;border:1px solid var(--border);border-radius:10px;padding:12px">'
        +'<div style="font-weight:700;margin-bottom:2px">'+esc(r.nome)+'</div>'
        +'<div class="text-sm text-muted" style="margin-bottom:6px">Fatura '+fmtData(r.vencimento_fatura)+'</div>'
        +'<div style="font-weight:700">Total: '+money(r.total)+'</div>'
      +'</div>';
    }).join('')+'</div>';
  }

  function renderFinancasCartao(){
    var root=document.getElementById('financas-pessoais-root'); if(!root||!window._ccLista) return;
    var lista=window._ccLista;
    var porMetPg=_ccMetodoPg?lista.filter(function(x){return x.metodo_pg===_ccMetodoPg;}):lista;
    var porFormaPg=_ccFormaPg?porMetPg.filter(function(x){return x.metodo===_ccFormaPg;}):porMetPg;
    var porGrupo=_ccGrupo?porFormaPg.filter(function(x){return x.grupo===_ccGrupo;}):porFormaPg;
    function chipMetodoPg(v,label){
      var n=v?lista.filter(function(x){return x.metodo_pg===v;}).length:lista.length;
      var ativo=_ccMetodoPg===v;
      return '<button class="btn btn-sm '+(ativo?'btn-primary':'btn-secondary')+'" data-ccmetpg="'+v+'">'+label+' ('+n+')</button>';
    }
    function chipFormaPg(v,label){
      var n=v?porMetPg.filter(function(x){return x.metodo===v;}).length:porMetPg.length;
      var ativo=_ccFormaPg===v;
      return '<button class="btn btn-sm '+(ativo?'btn-primary':'btn-secondary')+'" data-ccformapg="'+v+'">'+label+' ('+n+')</button>';
    }
    function chipGrupo(v,label){
      var n=v?porFormaPg.filter(function(x){return x.grupo===v;}).length:porFormaPg.length;
      var ativo=_ccGrupo===v;
      return '<button class="btn btn-sm '+(ativo?'btn-primary':'btn-secondary')+'" data-ccgrupo="'+v+'">'+label+' ('+n+')</button>';
    }
    function chipCat(v,label){
      var n=v?porGrupo.filter(function(x){return x.categoria===v;}).length:porGrupo.length;
      var ativo=_ccCat===v;
      return '<button class="btn btn-sm '+(ativo?'btn-primary':'btn-secondary')+'" data-cccat="'+v+'">'+label+' ('+n+')</button>';
    }
    function chipMes(v,label){
      var ativo=_ccMesModo===v;
      return '<button class="btn btn-sm '+(ativo?'btn-primary':'btn-secondary')+'" data-ccmes="'+v+'">'+label+'</button>';
    }
    var toolbar='<div style="margin-bottom:12px">'
      +'<div style="display:flex;gap:18px;flex-wrap:wrap;align-items:center;margin-bottom:8px">'
        +'<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center"><b class="text-sm" style="display:inline-block;min-width:90px">Método PG:</b>'+chipMetodoPg('','Todos')+chipMetodoPg('cartao','Cartão')+chipMetodoPg('dinheiro','Dinheiro')+chipMetodoPg('pix','Pix')+chipMetodoPg('debito','Débito')+'</div>'
        +'<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center"><b class="text-sm" style="display:inline-block;min-width:80px">Forma PG:</b>'+chipFormaPg('','Todos')+chipFormaPg('avista','À vista')+chipFormaPg('parcelado','Parcelado')+chipFormaPg('recorrente','Recorrente')+'</div>'
      +'</div>'
      +'<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:8px">'
        +'<div style="display:flex;gap:6px;flex-wrap:wrap">'+chipGrupo('','Todos')+chipGrupo('pessoal','Pessoal')+chipGrupo('empresa','Empresa')+'</div>'
        +'<button class="btn btn-primary btn-sm" data-ccact="novo">＋ Nova compra</button>'
      +'</div>'
      +'<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px">'+chipCat('','Todos')+chipCat('despesa','Despesas')+chipCat('divida','Dívidas')+chipCat('receita','Receitas')+chipCat('investimento','Investimentos')+chipCat('consumo','Consumo')+chipCat('assinatura','Assinatura')+'</div>'
      +'<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center">'+chipMes('atual','Fatura do mês atual')+chipMes('todos','Todas as faturas')+'<input type="month" id="cc-mes-escolha" value="'+esc(_ccMesEscolha)+'" style="padding:4px 6px;border:1px solid var(--border);border-radius:8px;font-size:13px">'
        +'<select id="cc-conta-filtro" style="padding:4px 6px;border:1px solid var(--border);border-radius:8px;font-size:13px">'
          +'<option value="">Todas as contas</option>'
          +Array.from(new Set(lista.map(function(x){return x.conta;}).filter(Boolean))).sort().map(function(c){return '<option value="'+esc(c)+'"'+(_ccConta===c?' selected':'')+'>'+esc(c)+'</option>';}).join('')
        +'</select>'
      +'</div>'
    +'</div>';
    var filtr=_ccCat?porGrupo.filter(function(x){return x.categoria===_ccCat;}):porGrupo;
    var mesAtivo=_ccMesAtivo();
    if(mesAtivo) filtr=filtr.filter(function(x){return (x.vencimento_fatura||'').slice(0,7)===mesAtivo;});
    if(_ccConta) filtr=filtr.filter(function(x){return x.conta===_ccConta;});
    filtr=filtr.slice().sort(function(a,b){return (a.data_compra||'').localeCompare(b.data_compra||'');});
    var rows=filtr.map(function(p){
      var parc=(p.total_parcelas&&p.total_parcelas>1)?(p.numero+'/'+p.total_parcelas):'—';
      return '<tr>'
        +'<td>'+(p.grupo?(GRUPO_LABEL[p.grupo]||p.grupo):'—')+'</td>'
        +'<td>'+(p.categoria?(CAT_LABEL[p.categoria]||p.categoria):'—')+'</td>'
        +'<td>'+(CARTAO_LABEL[p.cartao]||p.cartao||'—')+'</td>'
        +'<td>'+esc(p.conta||'—')+'</td>'
        +'<td>'+esc(p.sub_conta||'—')+'</td>'
        +'<td>'+esc(p.descricao||'—')+'</td>'
        +'<td>'+esc(p.credor_pagador||'—')+'</td>'
        +'<td>'+(MET_LABEL[p.metodo]||p.metodo)+'</td>'
        +'<td style="text-align:center">'+parc+'</td>'
        +'<td>'+fmtData(p.data_compra)+'</td>'
        +'<td style="text-align:right;font-weight:600">'+money(p.valor)+'</td>'
        +'<td>'+fmtData(p.vencimento_fatura)+'</td>'
        +'<td style="text-align:center;white-space:nowrap"><span style="display:inline-flex;align-items:center;gap:16px">'
          +'<button class="fel-ic" data-ccact="detalhe" data-id="'+p.id+'" title="Detalhes, observação e anexos">👁'+((p.anexos&&p.anexos.length)?'<sup>'+p.anexos.length+'</sup>':'')+'</button>'
          +'<button class="fel-ic" data-ccact="editar" data-id="'+p.id+'" title="Editar">✏️</button>'
          +'<button class="fel-ic" data-ccact="excluir-parcela" data-id="'+p.id+'" title="Excluir esta parcela" style="color:var(--danger)">🗑️</button>'
        +'</span></td></tr>';
    }).join('');
    var head='<thead><tr><th>Grupo</th><th>Categoria</th><th>Cartão</th><th>Conta</th><th>Sub Conta</th><th>Descrição</th><th>Credor/Pagador</th><th>Forma PG</th><th>Parcela</th><th>Compra</th><th style="text-align:right">Valor</th><th>Vencimento Fatura</th><th></th></tr></thead>';
    root.innerHTML=renderResumo()+toolbar+'<table class="tabela-contatos">'+head+'<tbody>'+(rows||'<tr><td colspan="13" style="text-align:center;padding:20px;color:var(--text-muted)">Nenhuma compra</td></tr>')+'</tbody></table>';
  }

  function labelCartaoOpts(sel){
    return CARTOES_REAIS.map(function(c){return '<option value="'+c[0]+'"'+(c[0]===sel?' selected':'')+'>'+c[1]+'</option>';}).join('');
  }

  function abrirCcNovoModal(){
    var ov=document.getElementById('cc-modal'); if(ov) ov.remove();
    ov=document.createElement('div'); ov.id='cc-modal';
    ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;display:flex;align-items:flex-start;justify-content:center;padding:16px;overflow:auto';
    document.body.appendChild(ov);
    function fechar(){ ov.remove(); }
    function lerParcelasAtuais(){
      var arr=[], i=0, el;
      while((el=document.getElementById('cc-parc-'+i))){ arr.push(el.value); i++; }
      return arr;
    }
    function splitParcelas(total,n){
      total=parseFloat(total)||0; n=parseInt(n)||1;
      var base=Math.floor((total/n)*100)/100;
      var arr=[]; for(var i=0;i<n;i++) arr.push(base);
      var soma=Math.round(base*n*100)/100;
      var resto=Math.round((total-soma)*100)/100;
      arr[n-1]=Math.round((arr[n-1]+resto)*100)/100;
      return arr;
    }
    function atualizarSomaParcelas(){
      var el=document.getElementById('cc-parc-soma'); if(!el) return;
      var vals=lerParcelasAtuais().map(function(v){return parseFloat(v)||0;});
      var soma=vals.reduce(function(a,b){return a+b;},0);
      var compra=parseFloat(document.getElementById('cc-valor').value)||0;
      var dif=Math.round((compra-soma)*100)/100;
      el.innerHTML='Soma das parcelas: '+money(soma)+(dif!==0?(' · <span style="color:#b91c1c">diferença de '+money(Math.abs(dif))+' em relação à compra</span>'):' · confere com a compra ✓');
    }
    function renderLinhasParcelas(qtd, valoresExistentes){
      var box=document.getElementById('cc-parcelas-rows'); if(!box) return;
      if(!qtd){ box.innerHTML=''; return; }
      var vals=(valoresExistentes && valoresExistentes.length===qtd) ? valoresExistentes : splitParcelas(document.getElementById('cc-valor').value, qtd);
      var html='<label class="form-label">Valor de cada parcela</label><div style="display:flex;flex-wrap:wrap;gap:8px">';
      for(var i=0;i<qtd;i++){
        html+='<div style="flex:1;min-width:90px"><label class="text-sm text-muted">Parc. '+(i+1)+'/'+qtd+'</label><input id="cc-parc-'+i+'" type="number" step="0.01" class="form-control cc-parc-input" value="'+(vals[i]!=null?vals[i]:'')+'"></div>';
      }
      html+='</div><div id="cc-parc-soma" class="text-sm text-muted" style="margin-top:4px"></div>';
      box.innerHTML=html;
      atualizarSomaParcelas();
    }
    function lerCampos(){
      var cartaoEl=document.getElementById('cc-cartao');
      return {
        grupo: document.getElementById('cc-grupo').value,
        metodoPg: document.getElementById('cc-metodopg').value,
        cartao: cartaoEl?cartaoEl.value:'',
        categoria: document.getElementById('cc-categoria').value,
        metodo: document.getElementById('cc-metodo').value,
        conta: document.getElementById('cc-conta').value,
        subConta: document.getElementById('cc-sub-conta').value,
        descricao: document.getElementById('cc-descricao').value,
        credor: document.getElementById('cc-credor').value,
        valor: document.getElementById('cc-valor').value,
        data: document.getElementById('cc-data').value,
        parcelas: document.getElementById('cc-parcelas') ? document.getElementById('cc-parcelas').value : '',
        parcelasValores: lerParcelasAtuais()
      };
    }
    function render(v){
      v=v||{};
      var metodo=v.metodo||'avista', categoria=v.categoria||(_ccCat||'despesa'), grupoAtual=v.grupo||(_ccGrupo||'empresa');
      var metodoPg=v.metodoPg||'cartao';
      var qtd=metodo==='parcelado'?(parseInt(v.parcelas)||0):0;
      var catOpts=['despesa','divida','receita','investimento','consumo','assinatura'].map(function(c){return '<option value="'+c+'"'+(c===categoria?' selected':'')+'>'+CAT_LABEL[c]+'</option>';}).join('');
      var grupoOpts=['pessoal','empresa'].map(function(g){return '<option value="'+g+'"'+(g===grupoAtual?' selected':'')+'>'+GRUPO_LABEL[g]+'</option>';}).join('');
      var metodoPgOpts=['cartao','dinheiro','pix','debito'].map(function(m){return '<option value="'+m+'"'+(m===metodoPg?' selected':'')+'>'+METODO_PG_LABEL[m]+'</option>';}).join('');
      ov.innerHTML='<div style="background:#fff;border-radius:12px;max-width:560px;width:100%;max-height:92vh;display:flex;flex-direction:column">'
        +'<div style="flex-shrink:0;border-bottom:1px solid var(--border);padding:12px 18px;display:flex;justify-content:space-between;align-items:center"><h3 style="margin:0">Nova compra</h3><div style="display:flex;align-items:center;gap:8px">'
          +'<button class="btn btn-sm btn-secondary" data-x="salvar" title="Salvar" style="padding:6px 10px">💾</button>'
          +'<button class="btn btn-sm" data-x="close" title="Fechar" style="background:transparent;border:none;color:var(--danger);font-weight:700;font-size:16px;line-height:1;padding:6px 8px">✕</button>'
        +'</div></div>'
        +'<div style="overflow:auto;padding:18px">'
        +'<div style="display:flex;gap:10px;flex-wrap:wrap">'
          +'<div class="form-group" style="flex:1;min-width:130px"><label class="form-label">Grupo</label><select id="cc-grupo" class="form-control">'+grupoOpts+'</select></div>'
          +'<div class="form-group" style="flex:1;min-width:150px"><label class="form-label">Método PG</label><select id="cc-metodopg" class="form-control">'+metodoPgOpts+'</select></div>'
        +'</div>'
        +(metodoPg==='cartao'?'<div class="form-group"><label class="form-label">Cartão</label><select id="cc-cartao" class="form-control">'+labelCartaoOpts(v.cartao)+'</select></div>':'')
        +'<div style="display:flex;gap:10px;flex-wrap:wrap">'
          +'<div class="form-group" style="flex:1;min-width:150px"><label class="form-label">Categoria</label><select id="cc-categoria" class="form-control">'+catOpts+'</select></div>'
          +'<div class="form-group" style="flex:1;min-width:150px"><label class="form-label">Forma PG</label><select id="cc-metodo" class="form-control"><option value="avista"'+(metodo==='avista'?' selected':'')+'>À vista</option><option value="parcelado"'+(metodo==='parcelado'?' selected':'')+'>Parcelado</option><option value="recorrente"'+(metodo==='recorrente'?' selected':'')+'>Recorrente</option></select></div>'
        +'</div>'
        +'<div style="display:flex;gap:10px;flex-wrap:wrap">'
          +'<div class="form-group" style="flex:1;min-width:160px"><label class="form-label">Conta</label><input id="cc-conta" class="form-control" value="'+esc(v.conta||'')+'"></div>'
          +'<div class="form-group" style="flex:1;min-width:160px"><label class="form-label">Sub Conta</label><input id="cc-sub-conta" class="form-control" value="'+esc(v.subConta||'')+'"></div>'
        +'</div>'
        +'<div class="form-group"><label class="form-label">Descrição</label><input id="cc-descricao" class="form-control" value="'+esc(v.descricao||'')+'"></div>'
        +'<div style="display:flex;gap:10px;flex-wrap:wrap">'
          +'<div class="form-group" style="flex:1;min-width:160px"><label class="form-label">Credor/Pagador</label><input id="cc-credor" class="form-control" value="'+esc(v.credor||'')+'"></div>'
          +'<div class="form-group" style="flex:1;min-width:120px"><label class="form-label">Valor da compra</label><input id="cc-valor" type="number" step="0.01" class="form-control" value="'+esc(v.valor||'')+'"></div>'
        +'</div>'
        +'<div style="display:flex;gap:10px;flex-wrap:wrap">'
          +'<div class="form-group" style="flex:1;min-width:160px"><label class="form-label">Data da compra</label><input id="cc-data" type="date" class="form-control" value="'+esc(v.data||'')+'"></div>'
          +(metodo==='parcelado'?'<div class="form-group" style="flex:1;min-width:140px"><label class="form-label">Nº de parcelas</label><input id="cc-parcelas" type="number" min="1" class="form-control" value="'+esc(v.parcelas||'')+'"></div>':'')
        +'</div>'
        +(metodo==='parcelado'?'<div id="cc-parcelas-rows" class="form-group"></div>':'')
        +'</div></div>';
      if(metodo==='parcelado' && qtd) renderLinhasParcelas(qtd, v.parcelasValores);
    }
    ov.addEventListener('click', async function(e){
      if(e.target===ov){ fechar(); return; }
      var x=e.target.closest('[data-x]'); if(!x) return; var act=x.getAttribute('data-x');
      if(act==='close') fechar();
      else if(act==='salvar'){
        var metodo=document.getElementById('cc-metodo').value;
        var metodoPg=document.getElementById('cc-metodopg').value;
        var numParcelas=metodo==='parcelado'?(parseInt(document.getElementById('cc-parcelas').value)||0):null;
        if(metodo==='parcelado' && !numParcelas){ toast('Informe o número de parcelas','error'); return; }
        var dataCompra=document.getElementById('cc-data').value;
        if(!dataCompra){ toast('Informe a data da compra','error'); return; }
        var cartaoEl=document.getElementById('cc-cartao');
        var payload={
          grupo: document.getElementById('cc-grupo').value,
          categoria: document.getElementById('cc-categoria').value,
          metodo_pg: metodoPg,
          cartao: metodoPg==='cartao'?(cartaoEl?cartaoEl.value:''):metodoPg,
          metodo: metodo,
          conta: document.getElementById('cc-conta').value||null,
          sub_conta: document.getElementById('cc-sub-conta').value||null,
          descricao: document.getElementById('cc-descricao').value||null,
          credor_pagador: document.getElementById('cc-credor').value||null,
          valor: parseFloat(document.getElementById('cc-valor').value)||0,
          data_compra: dataCompra,
          numero_parcelas: numParcelas
        };
        if(metodo==='parcelado'){
          payload.valores_parcelas=lerParcelasAtuais().map(function(v){return parseFloat(v)||0;});
        }
        try{ await _authFetch('POST','/fin/financas-cartao',payload); toast('Compra registrada','success'); fechar(); carregarFinancasCartao(); }
        catch(err){ toast('Erro: '+err.message,'error'); }
      }
    });
    ov.addEventListener('change', function(e){
      if(e.target.id==='cc-metodo' || e.target.id==='cc-parcelas' || e.target.id==='cc-metodopg'){ render(lerCampos()); }
      else if(e.target.id==='cc-valor'){ var c=lerCampos(); c.parcelasValores=null; render(c); }
    });
    ov.addEventListener('input', function(e){
      if(e.target.classList && e.target.classList.contains('cc-parc-input')){ atualizarSomaParcelas(); }
    });
    render();
  }

  function abrirCcEditModal(parcela){
    var ov=document.getElementById('cc-edit-modal'); if(ov) ov.remove();
    ov=document.createElement('div'); ov.id='cc-edit-modal';
    ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;display:flex;align-items:flex-start;justify-content:center;padding:16px;overflow:auto';
    document.body.appendChild(ov);
    var state=JSON.parse(JSON.stringify(parcela));
    function fechar(){ ov.remove(); carregarFinancasCartao(); }
    function render(){
      var anexos=(state.anexos||[]);
      var metodoPg=state.metodo_pg||'cartao';
      var anexosHtml=anexos.length
        ? anexos.map(function(u){ return '<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px"><a href="'+esc(u)+'" target="_blank" style="color:var(--primary);font-size:13px">📎 '+esc(u.split('/').pop())+'</a><button class="btn btn-sm btn-secondary cce-del-anexo" data-url="'+esc(u)+'" style="color:var(--danger);padding:2px 6px">×</button></div>'; }).join('')
        : '<div class="text-sm text-muted" style="margin-bottom:6px">Nenhum arquivo anexado</div>';
      ov.innerHTML='<div style="background:#fff;border-radius:12px;max-width:560px;width:100%;max-height:92vh;display:flex;flex-direction:column">'
        +'<div style="flex-shrink:0;border-bottom:1px solid var(--border);padding:12px 18px;display:flex;justify-content:space-between;align-items:center"><h3 style="margin:0">Editar compra</h3><div style="display:flex;align-items:center;gap:8px">'
          +'<button class="btn btn-sm btn-secondary" data-x="salvar" title="Salvar" style="padding:6px 10px">💾</button>'
          +'<button class="btn btn-sm" data-x="close" title="Fechar" style="background:transparent;border:none;color:var(--danger);font-weight:700;font-size:16px;line-height:1;padding:6px 8px">✕</button>'
        +'</div></div>'
        +'<div style="overflow:auto;padding:18px">'
        +'<div style="display:flex;gap:10px;flex-wrap:wrap">'
          +'<div class="form-group" style="flex:1;min-width:130px"><label class="form-label">Grupo</label><select id="cce-grupo" class="form-control">'
            +['pessoal','empresa'].map(function(g){ return '<option value="'+g+'"'+(state.grupo===g?' selected':'')+'>'+GRUPO_LABEL[g]+'</option>'; }).join('')
          +'</select></div>'
          +'<div class="form-group" style="flex:1;min-width:150px"><label class="form-label">Método PG</label><select id="cce-metodopg" class="form-control">'
            +['cartao','dinheiro','pix','debito'].map(function(m){ return '<option value="'+m+'"'+(metodoPg===m?' selected':'')+'>'+METODO_PG_LABEL[m]+'</option>'; }).join('')
          +'</select></div>'
        +'</div>'
        +(metodoPg==='cartao'?'<div class="form-group"><label class="form-label">Cartão</label><select id="cce-cartao" class="form-control">'+labelCartaoOpts(state.cartao)+'</select></div>':'')
        +'<div class="form-group"><label class="form-label">Categoria</label><select id="cce-categoria" class="form-control">'
          +['despesa','divida','receita','investimento','consumo','assinatura'].map(function(c){ return '<option value="'+c+'"'+(state.categoria===c?' selected':'')+'>'+CAT_LABEL[c]+'</option>'; }).join('')
        +'</select></div>'
        +'<div style="display:flex;gap:10px;flex-wrap:wrap">'
          +'<div class="form-group" style="flex:1;min-width:160px"><label class="form-label">Conta</label><input id="cce-conta" class="form-control" value="'+esc(state.conta||'')+'"></div>'
          +'<div class="form-group" style="flex:1;min-width:160px"><label class="form-label">Sub Conta</label><input id="cce-sub-conta" class="form-control" value="'+esc(state.sub_conta||'')+'"></div>'
        +'</div>'
        +'<div class="form-group"><label class="form-label">Descrição</label><input id="cce-descricao" class="form-control" value="'+esc(state.descricao||'')+'"></div>'
        +'<div class="form-group"><label class="form-label">Credor/Pagador</label><input id="cce-credor" class="form-control" value="'+esc(state.credor_pagador||'')+'"></div>'
        +'<div style="display:flex;gap:10px;flex-wrap:wrap">'
          +'<div class="form-group" style="flex:1;min-width:150px"><label class="form-label">Data da compra</label><input id="cce-data" type="date" class="form-control" value="'+esc(state.data_compra||'')+'"></div>'
          +'<div class="form-group" style="flex:1;min-width:120px"><label class="form-label">Valor'+(state.total_parcelas>1?' (parcela '+state.numero+'/'+state.total_parcelas+')':'')+'</label><input id="cce-valor" type="number" step="0.01" class="form-control" value="'+(state.valor!=null?state.valor:'')+'"></div>'
        +'</div>'
        +'<div class="text-sm text-muted" style="margin:-4px 0 10px">Vencimento da fatura calculado: <b>'+fmtData(state.vencimento_fatura)+'</b></div>'
        +'<div class="form-group"><label class="form-label">Observação</label><textarea id="cce-obs" class="form-control" rows="3">'+esc(state.observacao||'')+'</textarea></div>'
        +'<hr style="margin:12px 0;border:none;border-top:1px solid var(--border)">'
        +'<label class="form-label">Arquivos (nota fiscal, comprovante, etc — foto ou PDF)</label>'+anexosHtml+'<input type="file" id="cce-anexo" accept="image/*,.pdf" multiple>'
        +'</div></div>';
    }
    ov.addEventListener('click', async function(e){
      if(e.target===ov){ fechar(); return; }
      var da=e.target.closest('.cce-del-anexo'); if(da){
        try{ var r=await _authFetch('DELETE','/fin/financas-cartao/parcelas/'+state.id+'/anexo',{url:da.getAttribute('data-url')}); state.anexos=r.anexos; render(); }
        catch(err){ toast(err.message,'error'); }
        return;
      }
      var x=e.target.closest('[data-x]'); if(!x) return; var act=x.getAttribute('data-x');
      if(act==='close') fechar();
      else if(act==='salvar'){
        try{
          var metodoPgSel=document.getElementById('cce-metodopg').value;
          var cartaoEl=document.getElementById('cce-cartao');
          await _authFetch('PATCH','/fin/financas-cartao/lancamentos/'+state.lancamento_id,{
            grupo: document.getElementById('cce-grupo').value,
            categoria: document.getElementById('cce-categoria').value,
            metodo_pg: metodoPgSel,
            cartao: metodoPgSel==='cartao'?(cartaoEl?cartaoEl.value:''):metodoPgSel,
            conta: document.getElementById('cce-conta').value||null,
            sub_conta: document.getElementById('cce-sub-conta').value||null,
            descricao: document.getElementById('cce-descricao').value||null,
            credor_pagador: document.getElementById('cce-credor').value||null,
            data_compra: document.getElementById('cce-data').value
          });
          await _authFetch('PATCH','/fin/financas-cartao/parcelas/'+state.id,{
            valor: parseFloat(document.getElementById('cce-valor').value)||0,
            observacao: document.getElementById('cce-obs').value||null
          });
          toast('Salvo','success'); fechar();
        }catch(err){ toast('Erro: '+err.message,'error'); }
      }
    });
    ov.addEventListener('change', async function(e){
      if(e.target.id==='cce-metodopg'){ state.metodo_pg=e.target.value; render(); return; }
      var f=e.target.closest('#cce-anexo'); if(f && f.files && f.files.length){
        for(var i=0;i<f.files.length;i++){
          var fd=new FormData(); fd.append('arquivo',f.files[i]);
          try{
            var r=await fetch('/api/fin/financas-cartao/parcelas/'+state.id+'/anexo',{method:'POST',headers:{'Authorization':'Bearer '+getToken()},body:fd});
            var data=await r.json();
            if(r.ok){ state.anexos=data.anexos; } else { toast('Erro anexo: '+(data.detail||r.status),'error'); }
          }catch(err){ toast('Falha no anexo: '+err.message,'error'); }
        }
        toast('Arquivo(s) anexado(s)','success'); render();
      }
    });
    render();
  }

  function abrirCcDetalheModal(parcela){
    var ov=document.getElementById('cc-detalhe-modal'); if(ov) ov.remove();
    ov=document.createElement('div'); ov.id='cc-detalhe-modal';
    ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;display:flex;align-items:flex-start;justify-content:center;padding:16px;overflow:auto';
    document.body.appendChild(ov);
    var state=parcela;
    function fechar(){ ov.remove(); }
    function linha(label,val){ return '<div style="display:flex;justify-content:space-between;padding:3px 0;border-bottom:1px solid var(--border)"><span class="text-sm text-muted">'+label+'</span><span style="font-weight:600">'+val+'</span></div>'; }
    var resumo=linha('Cartão',CARTAO_LABEL[state.cartao]||state.cartao)
      +linha('Valor',money(state.valor))
      +linha('Compra',fmtData(state.data_compra))
      +linha('Vencimento da fatura',fmtData(state.vencimento_fatura))
      +(state.total_parcelas>1?linha('Parcela',state.numero+'/'+state.total_parcelas):'');
    var anexos=(state.anexos||[]);
    var anexosHtml=anexos.length
      ? anexos.map(function(u){ return '<div style="margin-bottom:4px"><a href="'+esc(u)+'" target="_blank" style="color:var(--primary);font-size:13px">📎 '+esc(u.split('/').pop())+' (visualizar/baixar)</a></div>'; }).join('')
      : '<div class="text-sm text-muted">Nenhum arquivo anexado</div>';
    ov.innerHTML='<div style="background:#fff;border-radius:12px;max-width:560px;width:100%;max-height:92vh;display:flex;flex-direction:column">'
      +'<div style="flex-shrink:0;border-bottom:1px solid var(--border);padding:12px 18px;display:flex;justify-content:space-between;align-items:center"><h3 style="margin:0">Detalhes — '+esc(state.conta||'compra')+'</h3><button class="btn btn-sm" data-x="close" title="Fechar" style="background:transparent;border:none;color:var(--danger);font-weight:700;font-size:16px;line-height:1;padding:6px 8px">✕</button></div>'
      +'<div style="overflow:auto;padding:18px">'
      +'<div class="card mb-4" style="border:1px solid var(--border);border-radius:8px;padding:10px 12px">'+resumo+'</div>'
      +'<div class="form-group"><label class="form-label">Observação</label><div class="text-sm" style="white-space:pre-wrap">'+(state.observacao?esc(state.observacao):'<span class="text-muted">Nenhuma observação</span>')+'</div></div>'
      +'<hr style="margin:12px 0;border:none;border-top:1px solid var(--border)">'
      +'<label class="form-label">Arquivos</label>'+anexosHtml
      +'</div></div>';
    ov.addEventListener('click', function(e){
      if(e.target===ov){ fechar(); return; }
      var x=e.target.closest('[data-x]'); if(x && x.getAttribute('data-x')==='close') fechar();
    });
  }

  if(!window._ccBound){
    window._ccBound=true;
    document.addEventListener('click', function(e){
      var chipMetPgBtn=e.target.closest && e.target.closest('#financas-pessoais-root [data-ccmetpg]'); if(chipMetPgBtn){ _ccMetodoPg=chipMetPgBtn.getAttribute('data-ccmetpg'); renderFinancasCartao(); return; }
      var chipFormaPgBtn=e.target.closest && e.target.closest('#financas-pessoais-root [data-ccformapg]'); if(chipFormaPgBtn){ _ccFormaPg=chipFormaPgBtn.getAttribute('data-ccformapg'); renderFinancasCartao(); return; }
      var chipGrupoBtn=e.target.closest && e.target.closest('#financas-pessoais-root [data-ccgrupo]'); if(chipGrupoBtn){ _ccGrupo=chipGrupoBtn.getAttribute('data-ccgrupo'); renderFinancasCartao(); return; }
      var chipCatBtn=e.target.closest && e.target.closest('#financas-pessoais-root [data-cccat]'); if(chipCatBtn){ _ccCat=chipCatBtn.getAttribute('data-cccat'); renderFinancasCartao(); return; }
      var chipMesBtn=e.target.closest && e.target.closest('#financas-pessoais-root [data-ccmes]'); if(chipMesBtn){ _ccMesModo=chipMesBtn.getAttribute('data-ccmes'); renderFinancasCartao(); return; }
      var b=e.target.closest && e.target.closest('#financas-pessoais-root [data-ccact]'); if(b){
        var act=b.getAttribute('data-ccact'), id=b.getAttribute('data-id');
        if(act==='novo'){ abrirCcNovoModal(); return; }
        if(act==='editar'){ var p=(window._ccLista||[]).filter(function(x){return x.id===id;})[0]; if(p) abrirCcEditModal(p); return; }
        if(act==='detalhe'){ var pd=(window._ccLista||[]).filter(function(x){return x.id===id;})[0]; if(pd) abrirCcDetalheModal(pd); return; }
        if(act==='excluir-parcela'){ if(confirm('Excluir esta parcela?')){ _authFetch('DELETE','/fin/financas-cartao/parcelas/'+id).then(carregarFinancasCartao).catch(function(err){toast(err.message,'error');}); } return; }
      }
    });
    document.addEventListener('change', function(e){
      var me=e.target.closest && e.target.closest('#cc-mes-escolha'); if(me){ _ccMesEscolha=me.value; _ccMesModo='escolha'; renderFinancasCartao(); }
      var cf=e.target.closest && e.target.closest('#cc-conta-filtro'); if(cf){ _ccConta=cf.value; renderFinancasCartao(); }
    });
    document.addEventListener('click', function(e){
      var b=e.target.closest && e.target.closest('[data-page="financas-pessoais"]');
      if(b){ setTimeout(function(){ if(typeof carregarFinancasCartao==='function') carregarFinancasCartao(); }, 50); }
    });
  }
})();


/* ===== OPERAÇÕES: Precificação ===== */
(function(){
  if(!document.getElementById('css-op-precificacao')){
    var sp=document.createElement('style'); sp.id='css-op-precificacao';
    sp.textContent='#page-operacoes-precificacao .page-content{max-width:none;margin:0;padding:12px 16px}';
    document.head.appendChild(sp);
  }
  function esc(s){ return (s==null?'':String(s)).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
  function moneyFmt(n,moeda){ return (moeda==='brl'?'R$ ':'US$ ')+(Number(n)||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}); }
  function moneyBrl(n){ return 'R$ '+(Number(n)||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}); }
  function fmtData(iso){ if(!iso) return '—'; var p=(''+iso).split('-'); return p.length===3?(p[2]+'/'+p[1]+'/'+p[0]):iso; }
  function calcVenda(custo,margem){ return (parseFloat(custo)||0)*(1+((parseFloat(margem)||0)/100)); }

  async function carregarPrecificacao(){
    var root=document.getElementById('operacoes-precificacao-root'); if(!root) return;
    root.innerHTML='<div class="empty-state"><div class="spinner" style="margin:0 auto"></div></div>';
    var lista=[];
    try{ lista=await _authFetch('GET','/operacoes/precificacao')||[]; }
    catch(e){ root.innerHTML='<p style="color:var(--danger)">Erro: '+esc(e.message)+'</p>'; return; }
    window._pfLista=lista;
    renderPrecificacao();
  }
  window.carregarPrecificacao=carregarPrecificacao;

  function renderPrecificacao(){
    var root=document.getElementById('operacoes-precificacao-root'); if(!root||!window._pfLista) return;
    var lista=window._pfLista;
    var toolbar='<div style="display:flex;justify-content:flex-end;margin-bottom:12px"><button class="btn btn-primary btn-sm" data-pfact="novo">＋ Novo</button></div>';
    var rows=lista.map(function(e){
      return '<tr>'
        +'<td>'+fmtData(e.data)+'</td>'
        +'<td>'+esc(e.cliente||'—')+'</td>'
        +'<td>'+esc(e.oportunidade||'—')+'</td>'
        +'<td>'+esc(e.dr||'—')+'</td>'
        +'<td>'+esc(e.pc||'—')+'</td>'
        +'<td>'+esc(e.goevo||'—')+'</td>'
        +'<td>'+esc(e.descricao||'—')+'</td>'
        +'<td style="text-align:center;white-space:nowrap"><span style="display:inline-flex;align-items:center;gap:16px">'
          +'<button class="fel-ic" data-pfact="editar" data-id="'+e.id+'" title="Editar">✏️</button>'
          +'<button class="fel-ic" data-pfact="excluir" data-id="'+e.id+'" title="Excluir" style="color:var(--danger)">🗑️</button>'
        +'</span></td></tr>';
    }).join('');
    var head='<thead><tr><th>Data</th><th>Cliente</th><th>Oportunidade</th><th>DR</th><th>PC</th><th>Goevo</th><th>Descrição</th><th></th></tr></thead>';
    root.innerHTML=toolbar+'<table class="tabela-contatos">'+head+'<tbody>'+(rows||'<tr><td colspan="8" style="text-align:center;padding:20px;color:var(--text-muted)">Nenhum evento de precificação</td></tr>')+'</tbody></table>';
  }

  function abrirPrecificacaoModal(evento){
    var ov=document.getElementById('pf-modal'); if(ov) ov.remove();
    ov=document.createElement('div'); ov.id='pf-modal';
    ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;display:flex;align-items:flex-start;justify-content:center;padding:16px;overflow:auto';
    document.body.appendChild(ov);
    var state={
      id: evento?evento.id:null,
      data: evento?evento.data:'', cliente: evento?evento.cliente:'', oportunidade: evento?evento.oportunidade:'',
      dr: evento?evento.dr:'', pc: evento?evento.pc:'', goevo: evento?evento.goevo:'', descricao: evento?evento.descricao:'',
      ptax_valor: evento?evento.ptax_valor:null, ptax_data: evento?evento.ptax_data:'',
      transformar_reais: evento?!!evento.transformar_reais:false,
      margem_padrao: evento&&evento.margem_padrao!=null?evento.margem_padrao:20,
      moeda: evento&&evento.moeda?evento.moeda:'usd',
      produtos: evento&&evento.produtos&&evento.produtos.length
        ? evento.produtos.map(function(p){return {id:p.id,pn:p.pn,descricao:p.descricao,custo:p.custo,margem_pct:p.margem_pct,foto_url:p.foto_url};})
        : [{id:null,pn:'',descricao:'',custo:0,margem_pct:null,foto_url:null}]
    };
    function fechar(){ ov.remove(); }
    function margemPadraoAtual(){ return parseFloat(document.getElementById('pf-margem-padrao').value)||20; }
    function moedaAtual(){ return document.getElementById('pf-moeda').value; }
    function syncProdutos(){
      var arr=[];
      ov.querySelectorAll('.pf-produto-row').forEach(function(tr){
        var idx=parseInt(tr.getAttribute('data-idx'));
        var base=state.produtos[idx]||{};
        arr.push({
          id: base.id||null,
          pn: tr.querySelector('.pf-pn').value,
          descricao: tr.querySelector('.pf-desc').value,
          custo: parseFloat(tr.querySelector('.pf-custo').value)||0,
          margem_pct: base.margem_pct,
          foto_url: base.foto_url
        });
      });
      state.produtos=arr;
    }
    function renderProdutosTables(){
      var box=document.getElementById('pf-produtos-box'); if(!box) return;
      var margemPadrao=margemPadraoAtual(), moeda=moedaAtual();
      var ptaxEl=document.getElementById('pf-ptax-valor');
      var ptax=parseFloat(ptaxEl?ptaxEl.value:state.ptax_valor)||0;
      var mostrarBrl=state.transformar_reais;
      var linhas=state.produtos.map(function(p,idx){
        var margemEfetiva=(p.margem_pct!=null)?p.margem_pct:margemPadrao;
        var venda=calcVenda(p.custo,margemEfetiva);
        var extraCols='';
        if(mostrarBrl){
          var custoBrl=(parseFloat(p.custo)||0)*ptax, vendaBrl=venda*ptax;
          extraCols='<td style="width:110px;text-align:right;border-left:1px solid var(--border)">'+moneyBrl(custoBrl)+'</td>'
            +'<td style="width:110px;text-align:right;font-weight:600">'+moneyBrl(vendaBrl)+'</td>';
        }
        return '<tr class="pf-produto-row" data-idx="'+idx+'" style="background:var(--surface-2,#f8fafc)">'
          +'<td style="width:180px"><input class="pf-pn form-control" style="width:100%;box-sizing:border-box;font-size:14px" value="'+esc(p.pn||'')+'"></td>'
          +'<td style="width:460px"><textarea class="pf-desc form-control" rows="2" style="width:100%;box-sizing:border-box;font-size:14px;resize:none">'+esc(p.descricao||'')+'</textarea></td>'
          +'<td style="width:100px"><input class="pf-custo form-control" type="number" step="0.01" style="width:100%;box-sizing:border-box" value="'+(p.custo!=null?p.custo:0)+'"></td>'
          +'<td style="width:280px;white-space:nowrap">'
            +'<span class="pf-venda-cel" style="font-weight:600">'+moneyFmt(venda,moeda)+'</span> '
            +'<span class="text-sm text-muted">('+margemEfetiva+'%'+(p.margem_pct!=null?'*':'')+')</span> '
            +(p.foto_url?'<a href="'+esc(p.foto_url)+'" target="_blank" title="Ver foto">📷</a> ':'')
            +'<button class="fel-ic pf-edit-produto" title="Editar margem/foto">✏️</button>'
            +'<button class="fel-ic pf-del-produto" title="Remover" style="color:var(--danger)">🗑️</button>'
          +'</td>'
          +extraCols
        +'</tr>';
      }).join('');
      var headExtra=mostrarBrl?'<th style="width:110px;text-align:right;border-left:1px solid var(--border)">Custo R$</th><th style="width:110px;text-align:right">Venda R$</th>':'';
      var table='<table class="tabela-contatos" style="table-layout:fixed;width:auto"><thead><tr><th style="width:180px">PN</th><th style="width:460px">Descrição</th><th style="width:100px">Custo</th><th style="width:280px">Venda</th>'+headExtra+'</tr></thead><tbody>'+linhas+'</tbody></table>';
      box.innerHTML='<div style="overflow-x:auto">'+table+'</div>';
    }
    function render(){
      ov.innerHTML='<div class="tema-form" style="background:#fff;border-radius:12px;max-width:1320px;width:100%;max-height:92vh;display:flex;flex-direction:column">'
        +'<div style="flex-shrink:0;border-bottom:1px solid var(--border);padding:12px 18px;display:flex;justify-content:space-between;align-items:center"><h3 style="margin:0">'+(state.id?'Editar':'Novo')+' evento de precificação</h3><div style="display:flex;align-items:center;gap:8px">'
          +'<button class="btn btn-sm btn-secondary" data-x="salvar" title="Salvar" style="padding:6px 10px">💾</button>'
          +'<button class="btn btn-sm" data-x="close" title="Fechar" style="background:transparent;border:none;color:var(--danger);font-weight:700;font-size:16px;line-height:1;padding:6px 8px">✕</button>'
        +'</div></div>'
        +'<div style="overflow:auto;padding:18px">'
        +'<div style="display:flex;gap:10px;flex-wrap:wrap">'
          +'<div class="form-group" style="flex:1;min-width:140px"><label class="form-label">Data</label><input id="pf-data" type="date" class="form-control" value="'+esc(state.data||'')+'"></div>'
          +'<div class="form-group" style="flex:1;min-width:160px"><label class="form-label">Cliente</label><input id="pf-cliente" class="form-control" value="'+esc(state.cliente||'')+'"></div>'
          +'<div class="form-group" style="flex:1;min-width:160px"><label class="form-label">Oportunidade</label><input id="pf-oportunidade" class="form-control" value="'+esc(state.oportunidade||'')+'"></div>'
        +'</div>'
        +'<div style="display:flex;gap:10px;flex-wrap:wrap">'
          +'<div class="form-group" style="flex:1;min-width:100px"><label class="form-label">DR</label><input id="pf-dr" class="form-control" value="'+esc(state.dr||'')+'"></div>'
          +'<div class="form-group" style="flex:1;min-width:100px"><label class="form-label">PC</label><input id="pf-pc" class="form-control" value="'+esc(state.pc||'')+'"></div>'
          +'<div class="form-group" style="flex:1;min-width:100px"><label class="form-label">Goevo</label><input id="pf-goevo" class="form-control" value="'+esc(state.goevo||'')+'"></div>'
        +'</div>'
        +'<div class="form-group"><label class="form-label">Descrição</label><input id="pf-descricao" class="form-control" value="'+esc(state.descricao||'')+'"></div>'
        +'<hr style="margin:12px 0;border:none;border-top:1px solid var(--border)">'
        +'<div style="display:flex;gap:10px;align-items:flex-end;flex-wrap:wrap;margin-bottom:10px">'
          +'<div class="form-group" style="margin:0"><label class="form-label">% Margem padrão</label><input id="pf-margem-padrao" type="number" step="0.01" class="form-control" style="width:100px" value="'+state.margem_padrao+'"></div>'
          +'<div class="form-group" style="margin:0"><label class="form-label">Moeda</label><select id="pf-moeda" class="form-control" style="width:100px"><option value="usd"'+(state.moeda==='usd'?' selected':'')+'>USD</option><option value="brl"'+(state.moeda==='brl'?' selected':'')+'>R$</option></select></div>'
          +'<div class="form-group" style="margin:0"><label class="form-label">PTAX (R$)</label><input id="pf-ptax-valor" type="number" step="0.0001" class="form-control" style="width:110px" value="'+(state.ptax_valor!=null?state.ptax_valor:'')+'"></div>'
          +'<div class="form-group" style="margin:0"><label class="form-label">Data PTAX</label><input id="pf-ptax-data" type="date" class="form-control" style="width:150px" value="'+esc(state.ptax_data||'')+'"></div>'
          +'<div class="form-group" style="margin:0;padding-bottom:8px"><label style="display:flex;align-items:center;gap:6px;cursor:pointer;white-space:nowrap"><input type="checkbox" id="pf-transformar" '+(state.transformar_reais?'checked':'')+'> Transformar em Reais</label></div>'
        +'</div>'
        +'<div style="background:#000;color:#fff;padding:8px 14px;border-radius:8px 8px 0 0;display:flex;justify-content:space-between;align-items:center">'
          +'<b>Produtos</b><button class="btn btn-sm" style="background:#fff;color:#000" data-x="add-produto">＋ Produto</button>'
        +'</div>'
        +'<div id="pf-produtos-box" style="border:1px solid var(--border);border-top:none;padding:6px"></div>'
        +'<div class="text-sm text-muted" style="margin-top:6px">* margem customizada nessa linha (lápis) — sem asterisco usa a margem padrão acima</div>'
        +'</div></div>';
      renderProdutosTables();
    }
    function abrirProdutoEditPopover(idx){
      syncProdutos();
      var p=state.produtos[idx];
      var pop=document.getElementById('pf-produto-pop'); if(pop) pop.remove();
      pop=document.createElement('div'); pop.id='pf-produto-pop';
      pop.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:10000;display:flex;align-items:center;justify-content:center;padding:16px';
      document.body.appendChild(pop);
      function fecharPop(){ pop.remove(); renderProdutosTables(); }
      function renderPop(){
        var fotoHtml=p.foto_url
          ? '<div style="display:flex;align-items:center;gap:6px;margin-bottom:6px"><a href="'+esc(p.foto_url)+'" target="_blank" style="color:var(--primary)">📷 Ver foto</a><button class="btn btn-sm btn-secondary" data-pop="del-foto" style="color:var(--danger);padding:2px 6px">×</button></div>'
          : '<div class="text-sm text-muted" style="margin-bottom:6px">Nenhuma foto</div>';
        pop.innerHTML='<div class="tema-form" style="background:#fff;border-radius:12px;max-width:380px;width:100%;padding:18px">'
          +'<h4 style="margin:0 0 10px">Editar produto'+(p.pn?(' — '+esc(p.pn)):'')+'</h4>'
          +'<div class="form-group"><label class="form-label">% Margem (em branco = usar padrão de '+margemPadraoAtual()+'%)</label><input id="pf-pop-margem" type="number" step="0.01" class="form-control" value="'+(p.margem_pct!=null?p.margem_pct:'')+'" placeholder="'+margemPadraoAtual()+'"></div>'
          +'<label class="form-label">Foto</label>'+fotoHtml
          +(p.id?'<input type="file" id="pf-pop-foto" accept="image/*">':'<div class="text-sm text-muted">Salve o evento primeiro para anexar foto.</div>')
          +'<div style="display:flex;justify-content:flex-end;gap:8px;margin-top:14px"><button class="btn btn-sm btn-secondary" data-pop="close">Fechar</button><button class="btn btn-sm btn-primary" data-pop="salvar">Salvar</button></div>'
        +'</div>';
      }
      pop.addEventListener('click', async function(e){
        if(e.target===pop){ fecharPop(); return; }
        var df=e.target.closest('[data-pop="del-foto"]'); if(df){
          try{ var r=await _authFetch('DELETE','/operacoes/precificacao/produtos/'+p.id+'/foto'); p.foto_url=r.foto_url; renderPop(); }
          catch(err){ toast(err.message,'error'); }
          return;
        }
        var x=e.target.closest('[data-pop]'); if(!x) return; var act=x.getAttribute('data-pop');
        if(act==='close') fecharPop();
        else if(act==='salvar'){
          var mv=document.getElementById('pf-pop-margem').value;
          p.margem_pct=(mv===''?null:(parseFloat(mv)||0));
          state.produtos[idx]=p;
          fecharPop();
        }
      });
      pop.addEventListener('change', async function(e){
        var f=e.target.closest('#pf-pop-foto'); if(f && f.files && f.files.length){
          var fd=new FormData(); fd.append('arquivo',f.files[0]);
          try{
            var r=await fetch('/api/operacoes/precificacao/produtos/'+p.id+'/foto',{method:'POST',headers:{'Authorization':'Bearer '+getToken()},body:fd});
            var data=await r.json();
            if(r.ok){ p.foto_url=data.foto_url; toast('Foto anexada','success'); renderPop(); } else { toast('Erro: '+(data.detail||r.status),'error'); }
          }catch(err){ toast('Falha no upload: '+err.message,'error'); }
        }
      });
      renderPop();
    }
    ov.addEventListener('click', async function(e){
      if(e.target===ov){ fechar(); return; }
      var editBtn=e.target.closest('.pf-edit-produto'); if(editBtn){
        var idx1=parseInt(editBtn.closest('.pf-produto-row').getAttribute('data-idx'));
        abrirProdutoEditPopover(idx1);
        return;
      }
      var delBtn=e.target.closest('.pf-del-produto'); if(delBtn){
        syncProdutos();
        var idx=parseInt(delBtn.closest('.pf-produto-row').getAttribute('data-idx'));
        state.produtos.splice(idx,1);
        if(!state.produtos.length) state.produtos=[{id:null,pn:'',descricao:'',custo:0,margem_pct:null,foto_url:null}];
        renderProdutosTables();
        return;
      }
      var x=e.target.closest('[data-x]'); if(!x) return; var act=x.getAttribute('data-x');
      if(act==='close') fechar();
      else if(act==='add-produto'){ syncProdutos(); state.produtos.push({id:null,pn:'',descricao:'',custo:0,margem_pct:null,foto_url:null}); renderProdutosTables(); }
      else if(act==='salvar'){
        syncProdutos();
        var payload={
          data: document.getElementById('pf-data').value||null,
          cliente: document.getElementById('pf-cliente').value||null,
          oportunidade: document.getElementById('pf-oportunidade').value||null,
          dr: document.getElementById('pf-dr').value||null,
          pc: document.getElementById('pf-pc').value||null,
          goevo: document.getElementById('pf-goevo').value||null,
          descricao: document.getElementById('pf-descricao').value||null,
          ptax_valor: parseFloat(document.getElementById('pf-ptax-valor').value)||null,
          ptax_data: document.getElementById('pf-ptax-data').value||null,
          transformar_reais: document.getElementById('pf-transformar').checked,
          margem_padrao: margemPadraoAtual(),
          moeda: moedaAtual(),
          produtos: state.produtos.map(function(p){return {id:p.id,pn:p.pn,descricao:p.descricao,custo:p.custo,margem_pct:p.margem_pct};})
        };
        try{
          if(state.id) await _authFetch('PATCH','/operacoes/precificacao/'+state.id,payload);
          else await _authFetch('POST','/operacoes/precificacao',payload);
          toast('Salvo','success'); fechar(); carregarPrecificacao();
        }catch(err){ toast('Erro: '+err.message,'error'); }
      }
    });
    ov.addEventListener('input', function(e){
      if(e.target.classList && e.target.classList.contains('pf-custo')){
        var tr=e.target.closest('.pf-produto-row');
        var idx=parseInt(tr.getAttribute('data-idx'));
        var p=state.produtos[idx]||{};
        var margemEfetiva=(p.margem_pct!=null)?p.margem_pct:margemPadraoAtual();
        var custo=parseFloat(tr.querySelector('.pf-custo').value)||0;
        tr.querySelector('.pf-venda-cel').textContent=moneyFmt(calcVenda(custo,margemEfetiva),moedaAtual());
        if(state.transformar_reais){ syncProdutos(); renderProdutosTables(); }
      }
    });
    ov.addEventListener('change', function(e){
      if(e.target.id==='pf-transformar'){ syncProdutos(); state.transformar_reais=e.target.checked; renderProdutosTables(); }
      if(e.target.id==='pf-ptax-valor'){ if(state.transformar_reais){ syncProdutos(); renderProdutosTables(); } }
      if(e.target.id==='pf-margem-padrao' || e.target.id==='pf-moeda'){ syncProdutos(); renderProdutosTables(); }
    });
    render();
  }

  if(!window._pfBound){
    window._pfBound=true;
    document.addEventListener('click', function(e){
      var b=e.target.closest && e.target.closest('#operacoes-precificacao-root [data-pfact]'); if(b){
        var act=b.getAttribute('data-pfact'), id=b.getAttribute('data-id');
        if(act==='novo'){ abrirPrecificacaoModal(null); return; }
        if(act==='editar'){ (async function(){ try{ var e2=await _authFetch('GET','/operacoes/precificacao/'+id); abrirPrecificacaoModal(e2); }catch(err){ toast(err.message,'error'); } })(); return; }
        if(act==='excluir'){ if(confirm('Excluir este evento de precificação?')){ _authFetch('DELETE','/operacoes/precificacao/'+id).then(carregarPrecificacao).catch(function(err){toast(err.message,'error');}); } return; }
      }
    });
    document.addEventListener('click', function(e){
      var b=e.target.closest && e.target.closest('[data-page="operacoes-precificacao"]');
      if(b){ setTimeout(function(){ if(typeof carregarPrecificacao==='function') carregarPrecificacao(); }, 50); }
    });
  }
})();


/* ===== PROSPECÇÃO: Empresas / Contatos / Listas ===== */
(function(){
  if(!document.getElementById('css-prospeccao')){
    var spp=document.createElement('style'); spp.id='css-prospeccao';
    spp.textContent='#page-prospeccao-empresas .page-content,#page-prospeccao-contatos .page-content,#page-prospeccao-listas .page-content{max-width:none;margin:0;padding:12px 16px}';
    document.head.appendChild(spp);
  }
  function esc(s){ return (s==null?'':String(s)).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
  function fmtData(iso){ if(!iso) return '—'; return (''+iso).slice(0,10).split('-').reverse().join('/'); }
  var TIPO_LISTA={mapeamento:'Mapeamento',social:'Social Selling',direto:'Contato Direto',reativacao:'Reativação'};
  function tipoOpts(sel){
    return '<option value="">—</option>'+Object.keys(TIPO_LISTA).map(function(k){return '<option value="'+k+'"'+(sel===k?' selected':'')+'>'+TIPO_LISTA[k]+'</option>';}).join('');
  }
  var PRODUTOS={
    h1:{label:'H1 - Prospecção Geral'}, rfid:{label:'RFID'}, voice:{label:'Voice Picking'},
    ds:{label:'Digital Signage'}, hw:{label:'Hardware'}, fs:{label:'Fábrica de Software'}
  };
  function linhaOpts(sel){
    return '<option value="">—</option>'+Object.keys(PRODUTOS).map(function(k){return '<option value="'+k+'"'+(sel===k?' selected':'')+'>'+PRODUTOS[k].label+'</option>';}).join('');
  }
  function parseTelefone(tel){
    var m=(tel||'').match(/^\+(\d+)\s*\((\d*)\)\s*(.*)$/);
    if(m) return {ddi:'+'+m[1], ddd:m[2], numero:m[3].trim()};
    return {ddi:'+55', ddd:'', numero:tel||''};
  }
  function formatTelefone(ddi,ddd,numero){
    ddi=(ddi||'+55').trim(); ddd=(ddd||'').trim(); numero=(numero||'').trim();
    if(!ddd && !numero) return null;
    return ddi+' ('+ddd+') '+numero;
  }
  function linkedinBadgeHtml(p){
    if(p.linkedin_status==='1') return '<span style="display:inline-flex;align-items:center;justify-content:center;width:20px;height:16px;border-radius:4px;font-size:9px;font-weight:800;background:#22c55e;color:#fff" title="1º grau">in</span>';
    if(p.linkedin_status==='nao_contato') return '<span style="display:inline-flex;align-items:center;justify-content:center;width:20px;height:16px;border-radius:4px;font-size:9px;font-weight:800;background:#e5e7eb;color:#9ca3af" title="Não contato">in</span>';
    return '<span style="display:inline-flex;align-items:center;justify-content:center;width:20px;height:16px;border-radius:4px;font-size:9px;font-weight:800;background:#e5e7eb;color:#9ca3af" title="Sem status">in</span>';
  }

  /* ---------- EMPRESAS ---------- */
  var _peSegmento='', _peEstado='', _peCidade='', _peSemLista=false, _peStatus='';
  var STATUS_LABEL={novo:'Novo',lead_perdido:'Lead Perdido',base_cliente:'Base Cliente',ativar:'Ativar',bloqueado:'Bloqueado',arquivo_morto:'Arquivo Morto'};
  var STATUS_COR={novo:'#3b82f6',lead_perdido:'#ef4444',base_cliente:'#22c55e',ativar:'#f59e0b',bloqueado:'#6b7280',arquivo_morto:'#111827'};
  function statusBadgeHtml(s){ s=s||'novo'; return '<span style="display:inline-block;font-size:10px;font-weight:800;color:#fff;padding:2px 8px;border-radius:10px;background:'+(STATUS_COR[s]||'#6b7280')+'">'+esc(STATUS_LABEL[s]||s)+'</span>'; }

  async function carregarProspEmpresas(){
    var root=document.getElementById('prospeccao-empresas-root'); if(!root) return;
    root.innerHTML='<div class="empty-state"><div class="spinner" style="margin:0 auto"></div></div>';
    var params=['limit=500'];
    if(_peSegmento) params.push('segmento='+encodeURIComponent(_peSegmento));
    if(_peEstado) params.push('estado='+encodeURIComponent(_peEstado));
    if(_peCidade) params.push('cidade='+encodeURIComponent(_peCidade));
    if(_peSemLista) params.push('sem_lista=true');
    if(_peStatus) params.push('status='+encodeURIComponent(_peStatus));
    var lista=[];
    try{ lista=await _authFetch('GET','/prospeccao/empresas?'+params.join('&'))||[]; }
    catch(e){ root.innerHTML='<p style="color:var(--danger)">Erro: '+esc(e.message)+'</p>'; return; }
    window._peLista=lista;
    renderProspEmpresas();
  }
  window.carregarProspEmpresas=carregarProspEmpresas;

  function renderProspEmpresas(){
    var root=document.getElementById('prospeccao-empresas-root'); if(!root||!window._peLista) return;
    var lista=window._peLista;
    var statusOptions='<option value="">Status (todos)</option>'+Object.keys(STATUS_LABEL).map(function(k){return '<option value="'+k+'" '+(_peStatus===k?'selected':'')+'>'+STATUS_LABEL[k]+'</option>';}).join('');
    var toolbar='<div style="margin-bottom:12px">'
      +'<div style="display:flex;justify-content:space-between;align-items:flex-end;flex-wrap:wrap;gap:10px;margin-bottom:8px">'
        +'<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:flex-end">'
          +'<div class="form-group" style="margin:0"><label class="form-label">Segmento</label><input id="pe-f-segmento" class="form-control" style="width:130px" value="'+esc(_peSegmento)+'"></div>'
          +'<div class="form-group" style="margin:0"><label class="form-label">Estado</label><input id="pe-f-estado" class="form-control" style="width:70px" value="'+esc(_peEstado)+'"></div>'
          +'<div class="form-group" style="margin:0"><label class="form-label">Cidade</label><input id="pe-f-cidade" class="form-control" style="width:130px" value="'+esc(_peCidade)+'"></div>'
          +'<div class="form-group" style="margin:0"><label class="form-label">Status</label><select id="pe-f-status" class="form-control" style="width:150px">'+statusOptions+'</select></div>'
          +'<label class="text-sm" style="display:flex;align-items:center;gap:4px;padding-bottom:8px;cursor:pointer"><input type="checkbox" id="pe-f-semlista" '+(_peSemLista?'checked':'')+'> Sem lista</label>'
          +'<button class="btn btn-sm btn-secondary" data-peact="filtrar">🔍 Filtrar</button>'
          +'<button class="btn btn-sm btn-secondary" data-peact="limpar">Limpar</button>'
        +'</div>'
        +'<div style="display:flex;gap:6px;flex-wrap:wrap">'
          +'<button class="btn btn-sm btn-secondary" data-peact="exportar-csv" title="Exportar CSV">⬇️ CSV</button>'
          +'<button class="btn btn-sm btn-secondary" data-peact="exportar-xlsx" title="Exportar XLSX">⬇️ XLSX</button>'
          +'<button class="btn btn-sm btn-secondary" data-peact="modelo" title="Baixar modelo em branco">📄 Modelo</button>'
          +'<button class="btn btn-sm btn-secondary" data-peact="importar" title="Importar planilha">⬆️ Importar</button>'
          +'<input type="file" id="pe-import-input" accept=".csv,.xlsx" style="display:none">'
          +'<button class="btn btn-primary btn-sm" data-peact="novo">＋ Nova empresa</button>'
        +'</div>'
      +'</div>'
    +'</div>';
    var rows=lista.map(function(e){
      return '<tr>'
        +'<td>'+esc(e.nome)+'</td>'
        +'<td>'+esc(e.cnpj||'—')+'</td>'
        +'<td>'+esc(e.segmento||'—')+'</td>'
        +'<td>'+esc(e.estado||'—')+'</td>'
        +'<td>'+esc(e.cidade||'—')+'</td>'
        +'<td>'+esc(e.origem||'—')+'</td>'
        +'<td style="text-align:center">'+statusBadgeHtml(e.status)+'</td>'
        +'<td style="text-align:center">'+e.total_pessoas+'</td>'
        +'<td style="text-align:center">'+(e.tem_lista?'✅':'—')+'</td>'
        +'<td style="text-align:center;white-space:nowrap"><span style="display:inline-flex;align-items:center;gap:16px">'
          +'<button class="fel-ic" data-peact="editar" data-id="'+e.id+'" title="Editar / contatos">✏️</button>'
          +'<button class="fel-ic" data-peact="excluir" data-id="'+e.id+'" title="Excluir" style="color:var(--danger)">🗑️</button>'
        +'</span></td></tr>';
    }).join('');
    var head='<thead><tr><th>Nome</th><th>CNPJ</th><th>Segmento</th><th>Estado</th><th>Cidade</th><th>Origem</th><th>Status</th><th>Contatos</th><th>Em lista</th><th></th></tr></thead>';
    root.innerHTML=toolbar+'<table class="tabela-contatos">'+head+'<tbody>'+(rows||'<tr><td colspan="10" style="text-align:center;padding:20px;color:var(--text-muted)">Nenhuma empresa</td></tr>')+'</tbody></table>';
  }

  function abrirProspEmpresaModal(empresa){
    var ov=document.getElementById('pe-modal'); if(ov) ov.remove();
    ov=document.createElement('div'); ov.id='pe-modal';
    ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;display:flex;align-items:flex-start;justify-content:center;padding:16px;overflow:auto';
    document.body.appendChild(ov);
    var state={
      id: empresa?empresa.id:null,
      nome: empresa?empresa.nome:'', cnpj: empresa?empresa.cnpj:'', segmento: empresa?empresa.segmento:'',
      estado: empresa?empresa.estado:'', cidade: empresa?empresa.cidade:'',
      website: empresa?empresa.website:'', instagram: empresa?empresa.instagram:'', linkedin_url: empresa?empresa.linkedin_url:'',
      origem: empresa?empresa.origem:'', status: empresa?(empresa.status||'novo'):'novo',
      pessoas: empresa?(empresa.pessoas||[]):[]
    };
    var editandoContato=null;
    function fechar(){ ov.remove(); carregarProspEmpresas(); }
    function contatosHtml(){
      if(!state.pessoas.length) return '<div class="text-sm text-muted">Nenhum contato cadastrado ainda.</div>';
      return state.pessoas.map(function(p){
        if(editandoContato===p.id){
          return '<div style="display:flex;gap:6px;align-items:center;padding:6px 0;border-bottom:1px solid var(--border);flex-wrap:wrap">'
            +'<input class="form-control pc-nome" style="width:120px" value="'+esc(p.nome)+'" placeholder="Nome">'
            +'<input class="form-control pc-tel" style="width:150px" value="'+esc(p.telefone||'')+'" placeholder="Telefone">'
            +'<input class="form-control pc-email" style="width:150px" value="'+esc(p.email||'')+'" placeholder="Email">'
            +'<button class="fel-ic" data-pcact="salvar-contato" data-id="'+p.id+'" title="Salvar">✔️</button>'
          +'</div>';
        }
        return '<div style="display:flex;gap:8px;align-items:center;padding:6px 0;border-bottom:1px solid var(--border);flex-wrap:wrap;font-size:13px">'
          +linkedinBadgeHtml(p)
          +'<b style="min-width:110px">'+esc(p.nome)+'</b>'
          +'<span class="text-muted">'+esc(p.cargo||'—')+'</span>'
          +'<span class="text-muted">'+esc(p.telefone||'sem telefone')+'</span>'
          +'<span class="text-muted">'+esc(p.email||'sem email')+'</span>'
          +'<button class="fel-ic" data-pcact="editar-contato" data-id="'+p.id+'" title="Editar">✏️</button>'
          +'<button class="fel-ic" data-pcact="excluir-contato" data-id="'+p.id+'" title="Excluir" style="color:var(--danger)">🗑️</button>'
        +'</div>';
      }).join('');
    }
    function render(){
      ov.innerHTML='<div style="background:#fff;border-radius:12px;max-width:640px;width:100%;max-height:92vh;display:flex;flex-direction:column">'
        +'<div style="flex-shrink:0;border-bottom:1px solid var(--border);padding:12px 18px;display:flex;justify-content:space-between;align-items:center"><h3 style="margin:0">'+(state.id?'Editar empresa':'Nova empresa')+'</h3><div style="display:flex;align-items:center;gap:8px">'
          +'<button class="btn btn-sm btn-secondary" data-x="salvar" title="Salvar" style="padding:6px 10px">💾</button>'
          +'<button class="btn btn-sm" data-x="close" title="Fechar" style="background:transparent;border:none;color:var(--danger);font-weight:700;font-size:16px;line-height:1;padding:6px 8px">✕</button>'
        +'</div></div>'
        +'<div style="overflow:auto;padding:18px">'
        +'<div style="display:flex;gap:10px;flex-wrap:wrap">'
          +'<div class="form-group" style="flex:1;min-width:200px"><label class="form-label">Nome</label><input id="pe-nome" class="form-control" value="'+esc(state.nome)+'"></div>'
          +'<div class="form-group" style="flex:1;min-width:150px"><label class="form-label">CNPJ</label><input id="pe-cnpj" class="form-control" value="'+esc(state.cnpj||'')+'"></div>'
        +'</div>'
        +'<div style="display:flex;gap:10px;flex-wrap:wrap">'
          +'<div class="form-group" style="flex:1;min-width:140px"><label class="form-label">Segmento</label><input id="pe-segmento" class="form-control" value="'+esc(state.segmento||'')+'"></div>'
          +'<div class="form-group" style="flex:1;min-width:80px"><label class="form-label">Estado</label><input id="pe-estado" class="form-control" value="'+esc(state.estado||'')+'"></div>'
          +'<div class="form-group" style="flex:1;min-width:140px"><label class="form-label">Cidade</label><input id="pe-cidade" class="form-control" value="'+esc(state.cidade||'')+'"></div>'
        +'</div>'
        +'<div style="display:flex;gap:10px;flex-wrap:wrap">'
          +'<div class="form-group" style="flex:1;min-width:160px"><label class="form-label">Website</label><input id="pe-website" class="form-control" placeholder="https://..." value="'+esc(state.website||'')+'"></div>'
          +'<div class="form-group" style="flex:1;min-width:160px"><label class="form-label">Instagram</label><input id="pe-instagram" class="form-control" placeholder="https://instagram.com/..." value="'+esc(state.instagram||'')+'"></div>'
          +'<div class="form-group" style="flex:1;min-width:160px"><label class="form-label">LinkedIn</label><input id="pe-linkedin" class="form-control" placeholder="https://linkedin.com/company/..." value="'+esc(state.linkedin_url||'')+'"></div>'
        +'</div>'
        +'<div style="display:flex;gap:10px;flex-wrap:wrap">'
          +'<div class="form-group" style="flex:1;min-width:140px"><label class="form-label">Origem</label><input id="pe-origem" class="form-control" value="'+esc(state.origem||'')+'"></div>'
          +'<div class="form-group" style="flex:1;min-width:140px"><label class="form-label">Status</label><select id="pe-status" class="form-control">'+Object.keys(STATUS_LABEL).map(function(k){return '<option value="'+k+'" '+(state.status===k?'selected':'')+'>'+STATUS_LABEL[k]+'</option>';}).join('')+'</select></div>'
        +'</div>'
        +'<hr style="margin:12px 0;border:none;border-top:1px solid var(--border)">'
        +'<b>Contatos</b>'
        +'<div id="pe-contatos-box" style="margin:8px 0">'+contatosHtml()+'</div>'
        +(state.id
          ? '<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-top:6px">'
            +'<input id="pe-novo-nome" class="form-control" style="flex:1;min-width:120px" placeholder="Nome do contato">'
            +'<button class="btn btn-sm btn-secondary" data-x="add-contato">＋ Adicionar contato</button>'
          +'</div>'
          : '<div class="text-sm text-muted">Salve a empresa para adicionar contatos.</div>')
        +'</div></div>';
    }
    ov.addEventListener('click', async function(e){
      if(e.target===ov){ fechar(); return; }
      var pc=e.target.closest('[data-pcact]'); if(pc){
        var act=pc.getAttribute('data-pcact'), pid=pc.getAttribute('data-id');
        if(act==='editar-contato'){ editandoContato=pid; render(); return; }
        if(act==='salvar-contato'){
          var box=document.getElementById('pe-contatos-box');
          try{
            var atualizado=await _authFetch('PATCH','/prospeccao/pessoas/'+pid,{
              nome: box.querySelector('.pc-nome').value,
              telefone: box.querySelector('.pc-tel').value||null,
              email: box.querySelector('.pc-email').value||null
            });
            state.pessoas=state.pessoas.map(function(p){return p.id===pid?atualizado:p;});
            editandoContato=null; render();
          }catch(err){ toast(err.message,'error'); }
          return;
        }
        if(act==='excluir-contato'){
          if(confirm('Excluir este contato?')){
            try{ await _authFetch('DELETE','/prospeccao/pessoas/'+pid); state.pessoas=state.pessoas.filter(function(p){return p.id!==pid;}); render(); }
            catch(err){ toast(err.message,'error'); }
          }
          return;
        }
      }
      var x=e.target.closest('[data-x]'); if(!x) return; var act2=x.getAttribute('data-x');
      if(act2==='close') fechar();
      else if(act2==='add-contato'){
        var nome=document.getElementById('pe-novo-nome').value.trim();
        if(!nome) return;
        try{
          var nova=await _authFetch('POST','/prospeccao/empresas/'+state.id+'/pessoas',{nome:nome});
          state.pessoas.push(nova); render();
        }catch(err){ toast(err.message,'error'); }
      }
      else if(act2==='salvar'){
        var payload={
          nome: document.getElementById('pe-nome').value,
          cnpj: document.getElementById('pe-cnpj').value||null,
          segmento: document.getElementById('pe-segmento').value||null,
          estado: document.getElementById('pe-estado').value||null,
          cidade: document.getElementById('pe-cidade').value||null,
          website: document.getElementById('pe-website').value||null,
          instagram: document.getElementById('pe-instagram').value||null,
          linkedin_url: document.getElementById('pe-linkedin').value||null,
          origem: document.getElementById('pe-origem').value||null,
          status: document.getElementById('pe-status').value||'novo'
        };
        if(!payload.nome){ toast('Informe o nome da empresa','error'); return; }
        try{
          if(state.id){ await _authFetch('PATCH','/prospeccao/empresas/'+state.id,payload); toast('Salvo','success'); fechar(); }
          else{ var criada=await _authFetch('POST','/prospeccao/empresas',payload); state.id=criada.id; toast('Empresa criada — agora você pode adicionar contatos','success'); render(); }
        }catch(err){ toast('Erro: '+err.message,'error'); }
      }
    });
    render();
  }

  /* ---------- CONTATOS ---------- */
  async function carregarProspContatos(){
    var root=document.getElementById('prospeccao-contatos-root'); if(!root) return;
    root.innerHTML='<div class="empty-state"><div class="spinner" style="margin:0 auto"></div></div>';
    var pessoas=[], empresas=[];
    try{
      pessoas=await _authFetch('GET','/prospeccao/pessoas')||[];
      empresas=await _authFetch('GET','/prospeccao/empresas?limit=500')||[];
    }catch(e){ root.innerHTML='<p style="color:var(--danger)">Erro: '+esc(e.message)+'</p>'; return; }
    window._pcLista=pessoas; window._pcEmpresas=empresas;
    renderProspContatos();
  }
  window.carregarProspContatos=carregarProspContatos;

  function renderProspContatos(){
    var root=document.getElementById('prospeccao-contatos-root'); if(!root||!window._pcLista) return;
    var toolbar='<div style="display:flex;justify-content:flex-end;gap:6px;flex-wrap:wrap;margin-bottom:12px">'
      +'<button class="btn btn-sm btn-secondary" data-pcact2="exportar-csv" title="Exportar CSV">⬇️ CSV</button>'
      +'<button class="btn btn-sm btn-secondary" data-pcact2="exportar-xlsx" title="Exportar XLSX">⬇️ XLSX</button>'
      +'<button class="btn btn-sm btn-secondary" data-pcact2="modelo" title="Baixar modelo em branco">📄 Modelo</button>'
      +'<button class="btn btn-sm btn-secondary" data-pcact2="importar" title="Importar planilha">⬆️ Importar</button>'
      +'<input type="file" id="pc-import-input" accept=".csv,.xlsx" style="display:none">'
      +'<button class="btn btn-primary btn-sm" data-pcact2="novo">＋ Novo contato</button>'
    +'</div>';
    var rows=window._pcLista.map(function(p){
      return '<tr>'
        +'<td>'+esc(p.nome)+'</td>'
        +'<td>'+esc(p.empresa_nome||'—')+'</td>'
        +'<td>'+esc(p.cargo||'—')+'</td>'
        +'<td>'+esc(p.setor||'—')+'</td>'
        +'<td style="text-align:center">'+linkedinBadgeHtml(p)+'</td>'
        +'<td>'+esc(p.telefone||'—')+'</td>'
        +'<td>'+esc(p.email||'—')+'</td>'
        +'<td style="text-align:center;white-space:nowrap"><span style="display:inline-flex;align-items:center;gap:16px">'
          +'<button class="fel-ic" data-pcact2="editar" data-id="'+p.id+'" title="Editar">✏️</button>'
          +'<button class="fel-ic" data-pcact2="excluir" data-id="'+p.id+'" title="Excluir" style="color:var(--danger)">🗑️</button>'
        +'</span></td></tr>';
    }).join('');
    var head='<thead><tr><th>Nome</th><th>Empresa</th><th>Cargo</th><th>Setor</th><th>LinkedIn</th><th>Telefone</th><th>Email</th><th></th></tr></thead>';
    root.innerHTML=toolbar+'<table class="tabela-contatos">'+head+'<tbody>'+(rows||'<tr><td colspan="8" style="text-align:center;padding:20px;color:var(--text-muted)">Nenhum contato</td></tr>')+'</tbody></table>';
  }

  function abrirProspContatoModal(pessoa){
    var ov=document.getElementById('pc-modal'); if(ov) ov.remove();
    ov=document.createElement('div'); ov.id='pc-modal';
    ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;display:flex;align-items:flex-start;justify-content:center;padding:16px;overflow:auto';
    document.body.appendChild(ov);
    var empresas=window._pcEmpresas||[];
    var tel=parseTelefone(pessoa?pessoa.telefone:'');
    var state={
      id: pessoa?pessoa.id:null, empresa_id: pessoa?pessoa.empresa_id:'', empresa_nome: pessoa?pessoa.empresa_nome:'',
      nome: pessoa?pessoa.nome:'', linkedin_status: pessoa?pessoa.linkedin_status:'', linkedin_url: pessoa?pessoa.linkedin_url:'',
      setor: pessoa?pessoa.setor:'', cargo: pessoa?pessoa.cargo:''
    };
    function fechar(){ ov.remove(); }
    function empresaFieldHtml(){
      if(state.id){
        return '<div class="form-group"><label class="form-label">Empresa</label><div class="text-sm" style="padding:6px 0">'+esc(state.empresa_nome||'—')+'</div></div>';
      }
      return '<div class="form-group" style="position:relative">'
        +'<label class="form-label">Empresa</label>'
        +'<input id="pc-empresa-busca" class="form-control" placeholder="Digite 3+ letras do nome...">'
        +'<input type="hidden" id="pc-empresa-id" value="">'
        +'<div id="pc-empresa-sugestoes" style="position:absolute;z-index:10;background:#fff;border:1px solid var(--border);border-radius:6px;max-height:170px;overflow:auto;width:100%;display:none;box-shadow:0 2px 8px rgba(0,0,0,.1)"></div>'
      +'</div>';
    }
    ov.innerHTML='<div style="background:#fff;border-radius:12px;max-width:480px;width:100%;max-height:92vh;display:flex;flex-direction:column">'
      +'<div style="flex-shrink:0;border-bottom:1px solid var(--border);padding:12px 18px;display:flex;justify-content:space-between;align-items:center"><h3 style="margin:0">'+(state.id?'Editar contato':'Novo contato')+'</h3><div style="display:flex;align-items:center;gap:8px">'
        +'<button class="btn btn-sm btn-secondary" data-x="salvar" title="Salvar" style="padding:6px 10px">💾</button>'
        +'<button class="btn btn-sm" data-x="close" title="Fechar" style="background:transparent;border:none;color:var(--danger);font-weight:700;font-size:16px;line-height:1;padding:6px 8px">✕</button>'
      +'</div></div>'
      +'<div style="overflow:auto;padding:18px">'
      +empresaFieldHtml()
      +'<div class="form-group"><label class="form-label">Nome</label><input id="pc-nome" class="form-control" value="'+esc(state.nome||'')+'"></div>'
      +'<div style="display:flex;gap:10px;flex-wrap:wrap">'
        +'<div class="form-group" style="flex:1;min-width:140px"><label class="form-label">Cargo</label><input id="pc-cargo" class="form-control" value="'+esc(state.cargo||'')+'"></div>'
        +'<div class="form-group" style="flex:1;min-width:140px"><label class="form-label">Setor</label><input id="pc-setor" class="form-control" value="'+esc(state.setor||'')+'"></div>'
      +'</div>'
      +'<div class="form-group"><label class="form-label">Telefone</label><div style="display:flex;gap:6px">'
        +'<input id="pc-tel-ddi" class="form-control" style="width:60px" value="'+esc(tel.ddi)+'">'
        +'<input id="pc-tel-ddd" class="form-control" style="width:60px" placeholder="DDD" value="'+esc(tel.ddd)+'">'
        +'<input id="pc-tel-num" class="form-control" style="flex:1" placeholder="99100 0202" value="'+esc(tel.numero)+'">'
      +'</div></div>'
      +'<div class="form-group"><label class="form-label">Email</label><input id="pc-email" type="email" class="form-control" value="'+esc(pessoa?pessoa.email||'':'')+'"></div>'
      +'<div class="form-group"><label class="form-label">LinkedIn</label>'
        +'<div style="display:flex;gap:14px;align-items:center;margin-bottom:6px;flex-wrap:wrap">'
          +'<label style="display:flex;align-items:center;gap:4px;cursor:pointer;font-size:13px"><input type="radio" name="pc-li-status" value="1" '+(state.linkedin_status==='1'?'checked':'')+'> 1º grau</label>'
          +'<label style="display:flex;align-items:center;gap:4px;cursor:pointer;font-size:13px"><input type="radio" name="pc-li-status" value="nao_contato" '+(state.linkedin_status==='nao_contato'?'checked':'')+'> Não contato</label>'
          +'<label style="display:flex;align-items:center;gap:4px;cursor:pointer;font-size:13px"><input type="radio" name="pc-li-status" value="" '+(!state.linkedin_status?'checked':'')+'> —</label>'
        +'</div>'
        +'<input id="pc-li-url" class="form-control" placeholder="Link do perfil (linkedin.com/in/...)" value="'+esc(state.linkedin_url||'')+'">'
      +'</div>'
      +'</div></div>';
    ov.addEventListener('input', function(e){
      if(e.target.id==='pc-empresa-busca'){
        var termo=e.target.value.trim().toLowerCase();
        var sug=document.getElementById('pc-empresa-sugestoes');
        if(termo.length<3){ sug.style.display='none'; sug.innerHTML=''; return; }
        var matches=empresas.filter(function(emp){return emp.nome.toLowerCase().indexOf(termo)>=0;}).slice(0,20);
        if(!matches.length){ sug.innerHTML='<div class="text-sm text-muted" style="padding:8px">Nenhuma empresa encontrada</div>'; sug.style.display='block'; return; }
        sug.innerHTML=matches.map(function(emp){return '<div class="pc-sug-item" data-id="'+emp.id+'" data-nome="'+esc(emp.nome)+'" style="padding:6px 10px;cursor:pointer;font-size:13px">'+esc(emp.nome)+'</div>';}).join('');
        sug.style.display='block';
      }
    });
    ov.addEventListener('click', async function(e){
      if(e.target===ov){ fechar(); return; }
      var sugItem=e.target.closest('.pc-sug-item'); if(sugItem){
        document.getElementById('pc-empresa-busca').value=sugItem.getAttribute('data-nome');
        document.getElementById('pc-empresa-id').value=sugItem.getAttribute('data-id');
        document.getElementById('pc-empresa-sugestoes').style.display='none';
        return;
      }
      var x=e.target.closest('[data-x]'); if(!x) return; var act=x.getAttribute('data-x');
      if(act==='close') fechar();
      else if(act==='salvar'){
        var liStatusEl=ov.querySelector('input[name="pc-li-status"]:checked');
        var telefone=formatTelefone(document.getElementById('pc-tel-ddi').value,document.getElementById('pc-tel-ddd').value,document.getElementById('pc-tel-num').value);
        var payload={
          nome: document.getElementById('pc-nome').value,
          cargo: document.getElementById('pc-cargo').value||null,
          setor: document.getElementById('pc-setor').value||null,
          telefone: telefone,
          email: document.getElementById('pc-email').value||null,
          linkedin_status: (liStatusEl && liStatusEl.value) || null,
          linkedin_url: document.getElementById('pc-li-url').value||null
        };
        if(!payload.nome){ toast('Informe o nome','error'); return; }
        try{
          if(state.id) await _authFetch('PATCH','/prospeccao/pessoas/'+state.id,payload);
          else{
            var empId=document.getElementById('pc-empresa-id').value;
            if(!empId){ toast('Selecione a empresa na lista de sugestões','error'); return; }
            await _authFetch('POST','/prospeccao/empresas/'+empId+'/pessoas',payload);
          }
          toast('Salvo','success'); fechar(); carregarProspContatos();
        }catch(err){ toast('Erro: '+err.message,'error'); }
      }
    });
  }

  /* ---------- LISTAS ---------- */
  async function carregarProspListas(){
    var root=document.getElementById('prospeccao-listas-root'); if(!root) return;
    root.innerHTML='<div class="empty-state"><div class="spinner" style="margin:0 auto"></div></div>';
    var listas=[];
    try{ listas=await _authFetch('GET','/prospeccao/listas')||[]; }
    catch(e){ root.innerHTML='<p style="color:var(--danger)">Erro: '+esc(e.message)+'</p>'; return; }
    window._plLista=listas;
    renderProspListas();
  }
  window.carregarProspListas=carregarProspListas;

  function renderProspListas(){
    var root=document.getElementById('prospeccao-listas-root'); if(!root||!window._plLista) return;
    var toolbar='<div style="display:flex;justify-content:flex-end;margin-bottom:12px"><button class="btn btn-primary btn-sm" data-plact="nova">＋ Nova lista</button></div>';
    var rows=(window._plLista||[]).map(function(l,idx){
      return '<tr>'
        +'<td>#'+(idx+1)+'</td>'
        +'<td>'+esc(l.nome)+' <span class="text-sm text-muted">('+l.total_empresas+' empresas)</span></td>'
        +'<td>'+(TIPO_LISTA[l.tipo]||'—')+'</td>'
        +'<td>'+(PRODUTOS[l.linha_atuacao]?PRODUTOS[l.linha_atuacao].label:'—')+'</td>'
        +'<td>'+fmtData(l.criado_em)+'</td>'
        +'<td style="text-align:center;white-space:nowrap"><span style="display:inline-flex;align-items:center;gap:16px">'
          +'<button class="fel-ic" data-plact="add-empresas" data-id="'+l.id+'" title="Adicionar empresas">✏️</button>'
          +'<button class="fel-ic" data-plact="ver" data-id="'+l.id+'" title="Ver empresas">👁</button>'
          +'<button class="fel-ic" data-plact="excluir" data-id="'+l.id+'" title="Excluir" style="color:var(--danger)">🗑️</button>'
        +'</span></td></tr>';
    }).join('');
    var head='<thead><tr><th>#</th><th>Nome</th><th>Tipo</th><th>Linha de atuação</th><th>Criada em</th><th></th></tr></thead>';
    root.innerHTML=toolbar+'<table class="tabela-contatos">'+head+'<tbody>'+(rows||'<tr><td colspan="6" style="text-align:center;padding:20px;color:var(--text-muted)">Nenhuma lista</td></tr>')+'</tbody></table>';
  }

  function abrirNovaListaModal(){
    var ov=document.getElementById('pl-novo-modal'); if(ov) ov.remove();
    ov=document.createElement('div'); ov.id='pl-novo-modal';
    ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;display:flex;align-items:flex-start;justify-content:center;padding:16px;overflow:auto';
    document.body.appendChild(ov);
    ov.innerHTML='<div style="background:#fff;border-radius:12px;max-width:420px;width:100%;padding:18px">'
      +'<h3 style="margin:0 0 12px">Nova lista</h3>'
      +'<div class="form-group"><label class="form-label">Nome da lista</label><input id="pl-novo-nome" class="form-control"></div>'
      +'<div class="form-group"><label class="form-label">Tipo</label><select id="pl-novo-tipo" class="form-control">'+tipoOpts('')+'</select></div>'
      +'<div class="form-group"><label class="form-label">Linha de atuação</label><select id="pl-novo-linha" class="form-control">'+linhaOpts('')+'</select></div>'
      +'<div style="display:flex;justify-content:flex-end;gap:8px;margin-top:14px"><button class="btn btn-sm btn-secondary" data-x="close">Fechar</button><button class="btn btn-sm btn-primary" data-x="criar">💾 Criar lista</button></div>'
    +'</div>';
    ov.addEventListener('click', async function(e){
      if(e.target===ov){ ov.remove(); return; }
      var x=e.target.closest('[data-x]'); if(!x) return; var act=x.getAttribute('data-x');
      if(act==='close') ov.remove();
      else if(act==='criar'){
        var nome=document.getElementById('pl-novo-nome').value.trim();
        if(!nome){ toast('Informe o nome da lista','error'); return; }
        try{
          await _authFetch('POST','/prospeccao/listas',{
            nome:nome, tipo:document.getElementById('pl-novo-tipo').value||null,
            linha_atuacao:document.getElementById('pl-novo-linha').value||null, filtros_json:{}, empresa_ids:[]
          });
          toast('Lista criada','success'); ov.remove(); carregarProspListas();
        }catch(err){ toast('Erro: '+err.message,'error'); }
      }
    });
  }

  function abrirVerListaModal(lista){
    var ov=document.getElementById('pl-ver-modal'); if(ov) ov.remove();
    ov=document.createElement('div'); ov.id='pl-ver-modal';
    ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;display:flex;align-items:flex-start;justify-content:center;padding:16px;overflow:auto';
    document.body.appendChild(ov);
    var rows=(lista.empresas||[]).map(function(e){return '<tr><td>'+esc(e.nome)+'</td><td>'+esc(e.segmento||'—')+'</td><td>'+esc(e.estado||'—')+'</td><td>'+esc(e.cidade||'—')+'</td></tr>';}).join('');
    ov.innerHTML='<div style="background:#fff;border-radius:12px;max-width:600px;width:100%;max-height:85vh;display:flex;flex-direction:column">'
      +'<div style="flex-shrink:0;border-bottom:1px solid var(--border);padding:12px 18px;display:flex;justify-content:space-between;align-items:center"><h3 style="margin:0">'+esc(lista.nome)+' ('+lista.total_empresas+')</h3><button class="btn btn-sm" data-x="close" style="background:transparent;border:none;color:var(--danger);font-weight:700;font-size:16px">✕</button></div>'
      +'<div style="overflow:auto;padding:18px"><table class="tabela-contatos"><thead><tr><th>Nome</th><th>Segmento</th><th>Estado</th><th>Cidade</th></tr></thead><tbody>'+(rows||'<tr><td colspan="4" style="text-align:center;color:var(--text-muted)">Nenhuma empresa ainda</td></tr>')+'</tbody></table></div>'
    +'</div>';
    ov.addEventListener('click', function(e){ if(e.target===ov || e.target.closest('[data-x="close"]')) ov.remove(); });
  }

  function abrirAddEmpresasListaModal(listaId){
    var ov=document.getElementById('pl-add-modal'); if(ov) ov.remove();
    ov=document.createElement('div'); ov.id='pl-add-modal';
    ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;display:flex;align-items:flex-start;justify-content:center;padding:16px;overflow:auto';
    document.body.appendChild(ov);
    var st={lista:null, resultados:[], selecionados:{}, pageSize:20, temMais:true, jaNaLista:{}};
    function fechar(){ ov.remove(); carregarProspListas(); }
    function selecionadosCount(){ return Object.keys(st.selecionados).filter(function(id){return st.selecionados[id];}).length; }
    function render(){
      var l=st.lista;
      ov.innerHTML='<div style="background:#fff;border-radius:12px;max-width:820px;width:100%;max-height:92vh;display:flex;flex-direction:column">'
        +'<div style="flex-shrink:0;border-bottom:1px solid var(--border);padding:12px 18px;display:flex;justify-content:space-between;align-items:center"><h3 style="margin:0">Adicionar empresas — '+esc(l.nome)+' ('+l.total_empresas+' na lista)</h3><button class="btn btn-sm" data-x="close" style="background:transparent;border:none;color:var(--danger);font-weight:700;font-size:16px">✕</button></div>'
        +'<div style="overflow:auto;padding:18px">'
        +'<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:flex-end;margin-bottom:12px">'
          +'<div class="form-group" style="margin:0"><label class="form-label">Segmento</label><input id="pla-segmento" class="form-control" style="width:130px"></div>'
          +'<div class="form-group" style="margin:0"><label class="form-label">Estado</label><input id="pla-estado" class="form-control" style="width:70px"></div>'
          +'<div class="form-group" style="margin:0"><label class="form-label">Cidade</label><input id="pla-cidade" class="form-control" style="width:130px"></div>'
          +'<div class="form-group" style="margin:0"><label class="form-label">Mostrar</label><select id="pla-pagesize" class="form-control" style="width:90px"><option value="20">20</option><option value="50">50</option><option value="100">100</option></select></div>'
          +'<button class="btn btn-sm btn-secondary" data-x="buscar">🔍 Buscar</button>'
        +'</div>'
        +'<div id="pla-resultado-box"></div>'
        +'</div>'
        +'<div style="flex-shrink:0;border-top:1px solid var(--border);padding:12px 18px;display:flex;justify-content:space-between;align-items:center">'
          +'<span class="text-sm text-muted" id="pla-count">'+selecionadosCount()+' selecionada(s)</span>'
          +'<button class="btn btn-sm btn-primary" data-x="adicionar">＋ Adicionar à lista</button>'
        +'</div>'
      +'</div>';
      renderResultado();
    }
    function renderResultado(){
      var box=document.getElementById('pla-resultado-box'); if(!box) return;
      if(!st.resultados.length){ box.innerHTML='<div class="text-sm text-muted">Use os filtros e clique em Buscar.</div>'; return; }
      var todasMarcadas=st.resultados.every(function(e){return st.selecionados[e.id];});
      var rows=st.resultados.map(function(e){
        var jaNa=st.jaNaLista[e.id];
        return '<tr'+(jaNa?' style="opacity:.5"':'')+'><td style="text-align:center"><input type="checkbox" class="pla-check" data-id="'+e.id+'" '+(st.selecionados[e.id]?'checked':'')+(jaNa?' disabled':'')+'></td>'
          +'<td>'+esc(e.nome)+(jaNa?' <span class="text-sm text-muted">(já na lista)</span>':'')+'</td><td>'+esc(e.segmento||'—')+'</td><td>'+esc(e.estado||'—')+'</td><td>'+esc(e.cidade||'—')+'</td></tr>';
      }).join('');
      box.innerHTML='<table class="tabela-contatos"><thead><tr><th style="width:30px"><input type="checkbox" id="pla-check-all" '+(todasMarcadas?'checked':'')+'></th><th>Nome</th><th>Segmento</th><th>Estado</th><th>Cidade</th></tr></thead><tbody>'+rows+'</tbody></table>'
        +(st.temMais?'<div style="text-align:center;margin-top:10px"><button class="btn btn-sm btn-secondary" data-x="carregar-mais">＋ Continuar lista (carregar mais)</button></div>':'<div class="text-sm text-muted" style="margin-top:10px;text-align:center">Fim dos resultados.</div>');
      var cnt=document.getElementById('pla-count'); if(cnt) cnt.textContent=selecionadosCount()+' selecionada(s)';
    }
    async function buscar(offsetZero){
      var pageSize=parseInt(document.getElementById('pla-pagesize').value)||20;
      st.pageSize=pageSize;
      var params=['limit='+pageSize,'offset='+(offsetZero?0:st.resultados.length)];
      var seg=document.getElementById('pla-segmento').value, est=document.getElementById('pla-estado').value, cid=document.getElementById('pla-cidade').value;
      if(seg) params.push('segmento='+encodeURIComponent(seg));
      if(est) params.push('estado='+encodeURIComponent(est));
      if(cid) params.push('cidade='+encodeURIComponent(cid));
      try{
        var pagina=await _authFetch('GET','/prospeccao/empresas?'+params.join('&'))||[];
        if(offsetZero) st.resultados=pagina; else st.resultados=st.resultados.concat(pagina);
        st.temMais=pagina.length===pageSize;
        pagina.forEach(function(e){ if(st.selecionados[e.id]===undefined && !st.jaNaLista[e.id]) st.selecionados[e.id]=true; });
        renderResultado();
      }catch(err){ toast(err.message,'error'); }
    }
    ov.addEventListener('click', async function(e){
      if(e.target===ov){ fechar(); return; }
      var x=e.target.closest('[data-x]'); if(!x) return; var act=x.getAttribute('data-x');
      if(act==='close') fechar();
      else if(act==='buscar') buscar(true);
      else if(act==='carregar-mais') buscar(false);
      else if(act==='adicionar'){
        var ids=Object.keys(st.selecionados).filter(function(id){return st.selecionados[id] && !st.jaNaLista[id];});
        if(!ids.length){ toast('Selecione ao menos uma empresa nova','error'); return; }
        try{
          st.lista=await _authFetch('POST','/prospeccao/listas/'+listaId+'/empresas',{empresa_ids:ids});
          st.lista.empresas.forEach(function(e){ st.jaNaLista[e.id]=true; });
          toast('Empresas adicionadas','success'); render();
        }catch(err){ toast('Erro: '+err.message,'error'); }
      }
    });
    ov.addEventListener('change', function(e){
      var chk=e.target.closest('.pla-check'); if(chk){ st.selecionados[chk.getAttribute('data-id')]=chk.checked; var cnt=document.getElementById('pla-count'); if(cnt) cnt.textContent=selecionadosCount()+' selecionada(s)'; return; }
      var all=e.target.closest('#pla-check-all'); if(all){ st.resultados.forEach(function(e2){ if(!st.jaNaLista[e2.id]) st.selecionados[e2.id]=all.checked; }); renderResultado(); }
    });
    (async function(){
      try{
        st.lista=await _authFetch('GET','/prospeccao/listas/'+listaId);
        (st.lista.empresas||[]).forEach(function(e){ st.jaNaLista[e.id]=true; });
        render();
      }catch(err){ toast(err.message,'error'); fechar(); }
    })();
  }

  if(!window._ppBound){
    window._ppBound=true;
    document.addEventListener('click', function(e){
      var peb=e.target.closest && e.target.closest('#prospeccao-empresas-root [data-peact]'); if(peb){
        var act=peb.getAttribute('data-peact'), id=peb.getAttribute('data-id');
        if(act==='novo'){ abrirProspEmpresaModal(null); return; }
        if(act==='editar'){ var emp=(window._peLista||[]).filter(function(x){return x.id===id;})[0]; if(emp) abrirProspEmpresaModal(emp); return; }
        if(act==='excluir'){ if(confirm('Excluir esta empresa e seus contatos?')){ _authFetch('DELETE','/prospeccao/empresas/'+id).then(carregarProspEmpresas).catch(function(err){toast(err.message,'error');}); } return; }
        if(act==='filtrar'){
          _peSegmento=document.getElementById('pe-f-segmento').value;
          _peEstado=document.getElementById('pe-f-estado').value;
          _peCidade=document.getElementById('pe-f-cidade').value;
          _peSemLista=document.getElementById('pe-f-semlista').checked;
          _peStatus=document.getElementById('pe-f-status').value;
          carregarProspEmpresas();
          return;
        }
        if(act==='limpar'){ _peSegmento=''; _peEstado=''; _peCidade=''; _peSemLista=false; _peStatus=''; carregarProspEmpresas(); return; }
        if(act==='exportar-csv'||act==='exportar-xlsx'){
          var fmt=act==='exportar-csv'?'csv':'xlsx';
          var qp=[];
          if(_peSegmento) qp.push('segmento='+encodeURIComponent(_peSegmento));
          if(_peEstado) qp.push('estado='+encodeURIComponent(_peEstado));
          if(_peCidade) qp.push('cidade='+encodeURIComponent(_peCidade));
          if(_peStatus) qp.push('status='+encodeURIComponent(_peStatus));
          _baixarArquivo('/prospeccao/empresas/exportar/'+fmt+(qp.length?'?'+qp.join('&'):''), 'empresas.'+fmt);
          return;
        }
        if(act==='modelo'){ _baixarArquivo('/prospeccao/empresas/exportar/xlsx?vazio=true', 'modelo_empresas.xlsx'); return; }
        if(act==='importar'){ document.getElementById('pe-import-input').click(); return; }
      }
      var pcb=e.target.closest && e.target.closest('#prospeccao-contatos-root [data-pcact2]'); if(pcb){
        var act2=pcb.getAttribute('data-pcact2'), id2=pcb.getAttribute('data-id');
        if(act2==='novo'){ abrirProspContatoModal(null); return; }
        if(act2==='editar'){ var pes=(window._pcLista||[]).filter(function(x){return x.id===id2;})[0]; if(pes) abrirProspContatoModal(pes); return; }
        if(act2==='excluir'){ if(confirm('Excluir este contato?')){ _authFetch('DELETE','/prospeccao/pessoas/'+id2).then(carregarProspContatos).catch(function(err){toast(err.message,'error');}); } return; }
        if(act2==='exportar-csv'){ _baixarArquivo('/prospeccao/pessoas/exportar/csv', 'contatos.csv'); return; }
        if(act2==='exportar-xlsx'){ _baixarArquivo('/prospeccao/pessoas/exportar/xlsx', 'contatos.xlsx'); return; }
        if(act2==='modelo'){ _baixarArquivo('/prospeccao/pessoas/exportar/xlsx?vazio=true', 'modelo_contatos.xlsx'); return; }
        if(act2==='importar'){ document.getElementById('pc-import-input').click(); return; }
      }
      var plb=e.target.closest && e.target.closest('#prospeccao-listas-root [data-plact]'); if(plb){
        var act3=plb.getAttribute('data-plact'), id3=plb.getAttribute('data-id');
        if(act3==='nova'){ abrirNovaListaModal(); return; }
        if(act3==='add-empresas'){ abrirAddEmpresasListaModal(id3); return; }
        if(act3==='ver'){ (async function(){ try{ var l=await _authFetch('GET','/prospeccao/listas/'+id3); abrirVerListaModal(l); }catch(err){ toast(err.message,'error'); } })(); return; }
        if(act3==='excluir'){ if(confirm('Excluir esta lista? (as empresas continuam existindo)')){ _authFetch('DELETE','/prospeccao/listas/'+id3).then(carregarProspListas).catch(function(err){toast(err.message,'error');}); } return; }
      }
    });
    document.addEventListener('change', async function(e){
      if(e.target && e.target.id==='pe-import-input'){
        var f1=e.target.files[0]; if(!f1) return;
        try{ var res1=await _importarArquivo('/prospeccao/empresas/importar', f1); toast(_resumoImportacao(res1),'success'); carregarProspEmpresas(); }
        catch(err){ toast(err.message,'error'); }
        e.target.value='';
        return;
      }
      if(e.target && e.target.id==='pc-import-input'){
        var f2=e.target.files[0]; if(!f2) return;
        try{ var res2=await _importarArquivo('/prospeccao/pessoas/importar', f2); toast(_resumoImportacao(res2),'success'); carregarProspContatos(); }
        catch(err){ toast(err.message,'error'); }
        e.target.value='';
        return;
      }
    });
    document.addEventListener('click', function(e){
      var b1=e.target.closest && e.target.closest('[data-page="prospeccao-empresas"]');
      if(b1){ setTimeout(function(){ if(typeof carregarProspEmpresas==='function') carregarProspEmpresas(); }, 50); }
      var b2=e.target.closest && e.target.closest('[data-page="prospeccao-contatos"]');
      if(b2){ setTimeout(function(){ if(typeof carregarProspContatos==='function') carregarProspContatos(); }, 50); }
      var b3=e.target.closest && e.target.closest('[data-page="prospeccao-listas"]');
      if(b3){ setTimeout(function(){ if(typeof carregarProspListas==='function') carregarProspListas(); }, 50); }
    });
    document.addEventListener('click', function(e){
      if(!e.target.closest('#pc-empresa-busca') && !e.target.closest('#pc-empresa-sugestoes')){
        var sug=document.getElementById('pc-empresa-sugestoes'); if(sug) sug.style.display='none';
      }
    });
  }
})();

/* ===== PROSPECÇÃO: Kanban ===== */
(function(){
  if(!document.getElementById('css-prosp-kanban')){
    var spk=document.createElement('style'); spk.id='css-prosp-kanban';
    spk.textContent='#page-prospeccao-kanban .page-content{max-width:none;margin:0;padding:12px 16px}';
    document.head.appendChild(spk);
  }
  function esc(s){ return (s==null?'':String(s)).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
  function fmtDataHora(iso){ if(!iso) return '—'; var d=new Date(iso); return d.toLocaleDateString('pt-BR')+' '+d.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}); }
  function kbCopiar(txt){
    if(navigator.clipboard && navigator.clipboard.writeText){ navigator.clipboard.writeText(txt||'').catch(function(){kbCopiarFallback(txt);}); }
    else kbCopiarFallback(txt);
  }
  function kbCopiarFallback(txt){
    var ta=document.createElement('textarea'); ta.value=txt||''; ta.style.position='fixed'; ta.style.left='-9999px';
    document.body.appendChild(ta); ta.select();
    try{ document.execCommand('copy'); }catch(e){}
    document.body.removeChild(ta);
  }

  var BOARDS_LABEL={mapeamento:'Mapeamento',social:'Social Selling',direto:'Contato Direto',reativacao:'Reativação',lead:'Lead'};
  var BOARDS_ETAPAS={
    mapeamento:['Lista importada','Pesquisa em andamento','Contato mapeado','Enviado p/ cadência'],
    social:['Alvo definido','Conexão enviada','Conectado','Engajamento','Gancho identificado','Icebreaker enviado','Conversa iniciada','Resposta recebida'],
    direto:['Novo','Tentativa 1','Tentativa 2','Tentativa 3','Engajado','Reunião agendada'],
    reativacao:['Identificado','Contato 1','Contato 2','Contato 3','Reengajado','Arquivo Morto'],
    lead:['Entrada','Registro no CRM','CRM OK']
  };
  var BOARD_DESTINOS={mapeamento:['social','direto','lead'],social:['direto','lead'],direto:['social','lead'],reativacao:['lead']};
  var SIGNALS={red:{label:'Prospecção Fria',color:'#ef4444'},yellow:{label:'Interação',color:'#f59e0b'},green:{label:'Comunicação',color:'#22c55e'}};
  var ACTIVITY_TYPES={
    email:{label:'E-mail',color:'#3b82f6'}, inmail:{label:'In-Mail',color:'#0ea5e9'},
    whatsapp:{label:'WhatsApp',color:'#22c55e'}, telefone:{label:'Telefone',color:'#f59e0b'},
    reuniao:{label:'Reunião',color:'#8b5cf6'}, linkedin:{label:'LinkedIn',color:'#0a66c2'}
  };
  var PRODUTOS={
    h1:{label:'H1'}, rfid:{label:'RFID'}, voice:{label:'Voice'}, ds:{label:'Digital Signage'},
    hw:{label:'Hardware'}, fs:{label:'Fábrica Sw'}
  };
  var _kbBoard='mapeamento', _kbLista='';
  var _kbProdutosOn={}; Object.keys(PRODUTOS).forEach(function(k){_kbProdutosOn[k]=true;});

  async function carregarKanban(){
    var root=document.getElementById('prospeccao-kanban-root'); if(!root) return;
    root.innerHTML='<div class="empty-state"><div class="spinner" style="margin:0 auto"></div></div>';
    try{
      window._kbListas=await _authFetch('GET','/prospeccao/listas')||[];
      window._kbTemplates=await _authFetch('GET','/prospeccao/checklist-templates')||[];
      await recarregarCards();
    }catch(e){ root.innerHTML='<p style="color:var(--danger)">Erro: '+esc(e.message)+'</p>'; return; }
    renderKanban();
  }
  window.carregarKanban=carregarKanban;

  async function recarregarCards(){
    var params=['board='+_kbBoard];
    if(_kbLista) params.push('lista_id='+_kbLista);
    window._kbCards=await _authFetch('GET','/prospeccao/cards?'+params.join('&'))||[];
  }

  function renderKanban(){
    var root=document.getElementById('prospeccao-kanban-root'); if(!root||!window._kbCards) return;
    var listas=window._kbListas||[];
    var tabsHtml=Object.keys(BOARDS_LABEL).map(function(k){
      return '<button class="btn btn-sm '+(_kbBoard===k?'btn-primary':'btn-secondary')+'" data-kbact="board" data-val="'+k+'">'+BOARDS_LABEL[k]+'</button>';
    }).join('');
    var listaOpts='<option value="">Todas as listas</option>'+listas.map(function(l){return '<option value="'+l.id+'"'+(_kbLista===l.id?' selected':'')+'>'+esc(l.nome)+'</option>';}).join('');
    var todosOn=Object.keys(PRODUTOS).every(function(k){return _kbProdutosOn[k];});
    var prodBtns='<button class="btn btn-sm '+(todosOn?'btn-primary':'btn-secondary')+'" data-kbact="prod-all">Todos</button>'
      +Object.keys(PRODUTOS).map(function(k){ return '<button class="btn btn-sm btn-secondary" data-kbact="prod" data-val="'+k+'" style="opacity:'+(_kbProdutosOn[k]?'1':'.4')+'">'+PRODUTOS[k].label+'</button>'; }).join('');
    root.innerHTML='<div style="margin-bottom:12px">'
      +'<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:8px">'
        +'<div style="display:flex;gap:6px;flex-wrap:wrap">'+tabsHtml+'</div>'
        +'<button class="btn btn-sm btn-secondary" data-kbact="config">⚙ Configurações</button>'
      +'</div>'
      +'<div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center">'
        +'<select id="kb-lista-filtro" class="form-control" style="width:220px">'+listaOpts+'</select>'
        +'<div style="display:flex;gap:6px;flex-wrap:wrap">'+prodBtns+'</div>'
      +'</div>'
    +'</div>'
    +'<div id="kb-board" style="display:flex;gap:14px;overflow-x:auto;align-items:flex-start;padding-bottom:8px"></div>';
    renderBoard();
  }

  function cardEl(c){
    var emp=c.empresa||{};
    var pessoas=emp.pessoas||[];
    var temGrau1=pessoas.some(function(p){return p.linkedin_status==='1';});
    var temTel=pessoas.some(function(p){return p.telefone;});
    var temEmail=pessoas.some(function(p){return p.email;});
    return '<div class="kb-card" draggable="true" data-id="'+c.id+'" style="background:#fff;border:1px solid var(--border);border-radius:10px;padding:10px;margin-bottom:8px;cursor:grab;box-shadow:0 1px 2px rgba(0,0,0,.04)">'
      +'<div style="font-size:13px;font-weight:700">'+esc(emp.nome||'—')+'</div>'
      +'<div style="font-size:11px;color:var(--text-muted);margin-top:1px">'+esc(emp.segmento||'')+(emp.cidade?' · '+esc(emp.cidade)+'/'+esc(emp.estado||''):'')+'</div>'
      +'<div style="display:flex;align-items:center;gap:6px;margin-top:8px">'
        +'<span style="width:9px;height:9px;border-radius:50%;background:'+SIGNALS[c.sinaleiro].color+';flex-shrink:0" title="'+SIGNALS[c.sinaleiro].label+'"></span>'
        +'<span style="display:flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:4px;font-size:9px;font-weight:800;color:#fff;background:'+(temGrau1?'#22c55e':'#d1d5db')+'" title="LinkedIn">in</span>'
        +'<span style="display:flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:4px;font-size:9px;font-weight:800;color:#fff;background:'+(temTel?'#22c55e':'#d1d5db')+'" title="Telefone">W</span>'
        +'<span style="display:flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:4px;font-size:9px;font-weight:800;color:#fff;background:'+(temEmail?'#3b82f6':'#d1d5db')+'" title="Email">@</span>'
        +'<span style="margin-left:auto;font-size:10px;color:var(--text-muted);background:#f1f2f5;padding:2px 6px;border-radius:8px">'+c.dias_na_etapa+'d</span>'
      +'</div>'
    +'</div>';
  }

  function renderBoard(){
    var box=document.getElementById('kb-board'); if(!box) return;
    var etapas=BOARDS_ETAPAS[_kbBoard]||[];
    var filtrados=(window._kbCards||[]).filter(function(c){
      return !c.lista_linha_atuacao || _kbProdutosOn[c.lista_linha_atuacao]!==false;
    });
    box.innerHTML=etapas.map(function(etapa){
      var todos=filtrados.filter(function(c){return c.etapa===etapa;});
      var visiveis=todos.filter(function(c){return !c.arquivado;});
      return '<div class="kb-column" data-etapa="'+esc(etapa)+'" style="background:#eceef2;border-radius:10px;min-width:250px;max-width:250px;padding:10px;flex-shrink:0">'
        +'<h3 style="font-size:12.5px;margin:2px 4px 10px;color:var(--text-muted);display:flex;justify-content:space-between"><span>'+esc(etapa)+'</span><span>'+todos.length+'</span></h3>'
        +visiveis.map(cardEl).join('')
      +'</div>';
    }).join('');
  }

  function copyIconBtn(val,titulo){
    return '<button class="fel-ic kb-copy-campo" data-val="'+esc(val||'')+'" title="'+esc(titulo||'Copiar')+'">⧉</button>';
  }

  function checklistAtivo(state){
    var lista=(window._kbListas||[]).filter(function(l){return l.id===state.lista_id;})[0];
    if(!lista || lista.checklist_modo==='nenhum') return null;
    var tid = lista.checklist_modo==='global' ? lista.checklist_template_id : (lista.checklist_por_etapa||{})[state.etapa];
    if(!tid) return null;
    return (window._kbTemplates||[]).filter(function(t){return t.id===tid;})[0] || null;
  }

  async function abrirCardModal(cardId){
    var c=(window._kbCards||[]).filter(function(x){return x.id===cardId;})[0];
    if(!c) return;
    var ov=document.getElementById('kb-card-modal'); if(ov) ov.remove();
    ov=document.createElement('div'); ov.id='kb-card-modal';
    ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;display:flex;align-items:flex-start;justify-content:center;padding:16px;overflow:auto';
    document.body.appendChild(ov);
    var state=JSON.parse(JSON.stringify(c));
    var cnpjEditando=false, tipoSelecionado=null;
    function fechar(){ ov.remove(); }
    function fecharERecarregar(){ ov.remove(); recarregarCards().then(renderBoard); }

    function cnpjHtml(){
      var emp=state.empresa||{};
      if(cnpjEditando) return 'CNPJ: <input id="kb-cnpj-input" class="form-control" style="display:inline-block;width:180px" value="'+esc(emp.cnpj||'')+'"> <button class="fel-ic" data-x="salvar-cnpj" title="Salvar">✔️</button>';
      if(emp.cnpj) return 'CNPJ: <b>'+esc(emp.cnpj)+'</b> '+copyIconBtn(emp.cnpj,'Copiar CNPJ')+' <button class="fel-ic" data-x="editar-cnpj" title="Editar">✏️</button>';
      return 'CNPJ: <i class="text-muted">não informado</i> <button class="fel-ic" data-x="editar-cnpj" title="Informar">✏️</button>';
    }
    function contatosHtml(){
      var pessoas=(state.empresa&&state.empresa.pessoas)||[];
      if(!pessoas.length) return '<div class="text-sm text-muted">Nenhum contato cadastrado.</div>';
      return pessoas.map(function(p){
        var bg=p.linkedin_status==='1'?'#22c55e':'#e5e7eb', fg=p.linkedin_status==='1'?'#fff':'#9ca3af';
        return '<div style="display:flex;gap:8px;align-items:center;padding:6px 0;border-bottom:1px solid var(--border);font-size:12px;flex-wrap:wrap">'
          +'<span style="display:inline-flex;align-items:center;justify-content:center;width:22px;height:16px;border-radius:4px;font-size:9px;font-weight:800;background:'+bg+';color:'+fg+'">in</span>'
          +'<b style="flex:0 0 110px">'+esc(p.nome)+'</b>'
          +'<span class="text-muted">'+esc(p.cargo||'—')+'</span>'
          +'<span>'+esc(p.telefone||'sem telefone')+'</span>'+copyIconBtn(p.telefone,'Copiar telefone')
          +'<span>'+esc(p.email||'sem email')+'</span>'+copyIconBtn(p.email,'Copiar email')
        +'</div>';
      }).join('');
    }
    function checklistHtml(tpl){
      if(!tpl) return '<div class="text-sm text-muted">Nenhum checklist configurado para essa lista.</div>';
      return (tpl.itens||[]).map(function(item){
        var checked=(state.checklist_state||{})[item];
        return '<label style="display:flex;align-items:center;gap:6px;font-size:12.5px;margin-bottom:6px;cursor:pointer"><input type="checkbox" class="kb-checklist-item" data-item="'+esc(item)+'" '+(checked?'checked':'')+'> '+esc(item)+'</label>';
      }).join('');
    }
    function tallyHtml(){
      var counts={};
      (state.atividades||[]).forEach(function(a){ if(a.tipo) counts[a.tipo]=(counts[a.tipo]||0)+1; });
      return '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px;padding-top:10px;border-top:1px solid var(--border)">'
        +Object.keys(ACTIVITY_TYPES).map(function(k){return '<span style="font-size:11px;background:#f4f5f7;padding:4px 9px;border-radius:12px;color:var(--text-muted);font-weight:600">'+ACTIVITY_TYPES[k].label+': <b style="color:var(--text)">'+(counts[k]||0)+'</b></span>';}).join('')
      +'</div>';
    }
    function atividadesHtml(){
      return (state.atividades||[]).map(function(a,i){
        var tag=a.tipo && ACTIVITY_TYPES[a.tipo] ? '<span style="display:inline-block;font-size:9.5px;font-weight:800;color:#fff;padding:1px 6px;border-radius:8px;margin-right:6px;background:'+ACTIVITY_TYPES[a.tipo].color+'">'+ACTIVITY_TYPES[a.tipo].label+'</span>' : '';
        return '<div style="display:flex;gap:6px;align-items:flex-start;margin-bottom:10px">'
          +'<button class="fel-ic kb-copy-ativ" data-idx="'+i+'" title="Copiar registro">⧉</button>'
          +'<div style="font-size:12px"><div>'+tag+esc(a.texto)+'</div><div style="color:var(--text-muted);font-size:10.5px">'+fmtDataHora(a.data_hora)+'</div></div>'
        +'</div>';
      }).join('');
    }
    function render(){
      var etapas=BOARDS_ETAPAS[state.board]||[];
      var isLast=etapas[etapas.length-1]===state.etapa;
      var destinosBtns=(BOARD_DESTINOS[state.board]||[]).map(function(b){
        var liberado=(b==='lead')?true:isLast;
        return liberado?('<button class="btn btn-sm btn-secondary" data-x="mover-board" data-val="'+b+'">Mover para '+BOARDS_LABEL[b]+' →</button>'):'';
      }).join('');
      var tpl=checklistAtivo(state);
      var pessoas=(state.empresa&&state.empresa.pessoas)||[];
      ov.innerHTML='<div style="background:#fff;border-radius:12px;max-width:640px;width:100%;max-height:92vh;display:flex;flex-direction:column">'
        +'<div style="flex-shrink:0;border-bottom:1px solid var(--border);padding:12px 18px;display:flex;justify-content:space-between;align-items:center">'
          +'<h3 style="margin:0">'+esc((state.empresa&&state.empresa.nome)||'—')+'</h3>'
          +'<div style="display:flex;align-items:center;gap:8px">'
            +(!isLast?'<button class="btn btn-sm btn-secondary" data-x="avancar">Avançar etapa →</button>':'')
            +'<button class="btn btn-sm" data-x="close" title="Fechar" style="background:transparent;border:none;color:var(--danger);font-weight:700;font-size:16px;line-height:1;padding:6px 8px">✕</button>'
          +'</div>'
        +'</div>'
        +'<div style="overflow:auto;padding:18px">'
        +'<div class="text-sm text-muted" style="margin-bottom:8px">'+esc((state.empresa&&state.empresa.segmento)||'—')+' · '+esc((state.empresa&&state.empresa.cidade)||'—')+'/'+esc((state.empresa&&state.empresa.estado)||'')+' · Lista: '+esc(state.lista_nome||'—')+(state.arquivado?' · <b style="color:#92400e">Arquivado</b>':'')+'</div>'
        +'<div style="margin-bottom:14px;font-size:13px">'+cnpjHtml()+'</div>'
        +'<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px">'
          +Object.keys(SIGNALS).map(function(k){ return '<button class="btn btn-sm" data-x="sinal" data-val="'+k+'" style="border:2px solid '+(state.sinaleiro===k?SIGNALS[k].color:'var(--border)')+';font-weight:'+(state.sinaleiro===k?'700':'400')+'"><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:'+SIGNALS[k].color+';margin-right:5px"></span>'+SIGNALS[k].label+'</button>'; }).join('')
        +'</div>'
        +'<div style="margin-bottom:16px"><b class="text-sm" style="text-transform:uppercase;color:var(--text-muted);font-size:11px">Checklist'+(tpl?(' — '+esc(tpl.nome)):'')+'</b><div style="margin-top:8px">'+checklistHtml(tpl)+'</div></div>'
        +'<hr style="margin:12px 0;border:none;border-top:1px solid var(--border)">'
        +'<b>Contatos ('+pessoas.length+')</b><div style="margin:8px 0">'+contatosHtml()+'</div>'
        +'<hr style="margin:12px 0;border:none;border-top:1px solid var(--border)">'
        +'<b>Atividades</b>'
        +'<div style="display:flex;gap:6px;flex-wrap:wrap;margin:8px 0">'+Object.keys(ACTIVITY_TYPES).map(function(k){ return '<button class="btn btn-sm" data-x="tipo-ativ" data-val="'+k+'" style="'+(tipoSelecionado===k?('background:'+ACTIVITY_TYPES[k].color+';color:#fff;border-color:'+ACTIVITY_TYPES[k].color):'background:#fff;color:var(--text-muted)')+'">'+ACTIVITY_TYPES[k].label+'</button>'; }).join('')+'</div>'
        +'<textarea id="kb-ativ-texto" class="form-control" rows="3" placeholder="Registrar atividade, gancho, retorno da conversa..."></textarea>'
        +'<button class="btn btn-sm btn-primary" data-x="registrar-ativ" style="margin-top:6px">Registrar</button>'
        +tallyHtml()
        +'<div style="margin-top:10px">'+atividadesHtml()+'</div>'
        +'<div style="display:flex;justify-content:flex-end;gap:8px;margin-top:20px;flex-wrap:wrap">'
          +destinosBtns
          +(state.board==='lead' ? '<button class="btn btn-sm" style="background:#fef3c7;color:#92400e" data-x="arquivar">'+(state.arquivado?'Desarquivar':'Arquivar')+'</button>' : '')
        +'</div>'
        +'</div></div>';
    }
    ov.addEventListener('click', async function(e){
      if(e.target===ov){ fecharERecarregar(); return; }
      var copyCampo=e.target.closest('.kb-copy-campo'); if(copyCampo){ kbCopiar(copyCampo.getAttribute('data-val')); return; }
      var copyAtiv=e.target.closest('.kb-copy-ativ'); if(copyAtiv){ var idx=parseInt(copyAtiv.getAttribute('data-idx')); kbCopiar((state.atividades[idx]||{}).texto); return; }
      var x=e.target.closest('[data-x]'); if(!x) return; var act=x.getAttribute('data-x');
      if(act==='close'){ fecharERecarregar(); return; }
      if(act==='avancar'){
        var etapas=BOARDS_ETAPAS[state.board]; var idx2=etapas.indexOf(state.etapa);
        if(idx2<etapas.length-1){
          try{ state=await _authFetch('PATCH','/prospeccao/cards/'+state.id+'/mover-etapa',{etapa:etapas[idx2+1]}); toast('Movido','success'); fecharERecarregar(); }
          catch(err){ toast(err.message,'error'); }
        }
        return;
      }
      if(act==='sinal'){
        try{ state=await _authFetch('PATCH','/prospeccao/cards/'+state.id+'/sinaleiro',{sinaleiro:x.getAttribute('data-val')}); render(); }
        catch(err){ toast(err.message,'error'); }
        return;
      }
      if(act==='editar-cnpj'){ cnpjEditando=true; render(); return; }
      if(act==='salvar-cnpj'){
        var novoCnpj=document.getElementById('kb-cnpj-input').value.trim();
        try{ var empAtual=await _authFetch('PATCH','/prospeccao/empresas/'+state.empresa.id,{cnpj:novoCnpj}); state.empresa.cnpj=empAtual.cnpj; cnpjEditando=false; render(); }
        catch(err){ toast(err.message,'error'); }
        return;
      }
      if(act==='tipo-ativ'){ var v=x.getAttribute('data-val'); tipoSelecionado=(tipoSelecionado===v)?null:v; render(); return; }
      if(act==='registrar-ativ'){
        var texto=document.getElementById('kb-ativ-texto').value.trim();
        if(!texto) return;
        if(!tipoSelecionado){ toast('Selecione o tipo de canal antes de registrar','error'); return; }
        try{ state=await _authFetch('POST','/prospeccao/cards/'+state.id+'/atividades',{tipo:tipoSelecionado,texto:texto}); tipoSelecionado=null; render(); }
        catch(err){ toast(err.message,'error'); }
        return;
      }
      if(act==='mover-board'){
        var alvoBoard=x.getAttribute('data-val');
        try{ await _authFetch('PATCH','/prospeccao/cards/'+state.id+'/mover-board',{board:alvoBoard}); toast('Movido para '+(BOARDS_LABEL[alvoBoard]||alvoBoard),'success'); _kbBoard=alvoBoard; fecharERecarregar(); renderKanban(); }
        catch(err){ toast(err.message,'error'); }
        return;
      }
      if(act==='arquivar'){
        try{ state=await _authFetch('PATCH','/prospeccao/cards/'+state.id+'/arquivar'); toast(state.arquivado?'Arquivado':'Desarquivado','success'); render(); }
        catch(err){ toast(err.message,'error'); }
        return;
      }
    });
    ov.addEventListener('change', async function(e){
      var chk=e.target.closest('.kb-checklist-item'); if(chk){
        try{ state=await _authFetch('PATCH','/prospeccao/cards/'+state.id+'/checklist',{item:chk.getAttribute('data-item'),concluido:chk.checked}); }
        catch(err){ toast(err.message,'error'); render(); }
        return;
      }
    });
    render();
  }

  function abrirKanbanConfigModal(){
    var ov=document.getElementById('kb-config-modal'); if(ov) ov.remove();
    ov=document.createElement('div'); ov.id='kb-config-modal';
    ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;display:flex;align-items:flex-start;justify-content:center;padding:16px;overflow:auto';
    document.body.appendChild(ov);
    function fechar(){ ov.remove(); renderKanban(); }
    function render(){
      var listas=window._kbListas||[], templates=window._kbTemplates||[];
      ov.innerHTML='<div style="background:#fff;border-radius:12px;max-width:640px;width:100%;max-height:88vh;display:flex;flex-direction:column">'
        +'<div style="flex-shrink:0;border-bottom:1px solid var(--border);padding:12px 18px;display:flex;justify-content:space-between;align-items:center"><h3 style="margin:0">Configurações</h3><button class="btn btn-sm" data-x="close" style="background:transparent;border:none;color:var(--danger);font-weight:700;font-size:16px;line-height:1;padding:6px 8px">✕</button></div>'
        +'<div style="overflow:auto;padding:18px">'
        +'<b class="text-sm" style="text-transform:uppercase;color:var(--text-muted);font-size:11px">Checklists cadastrados</b>'
        +'<div style="margin:8px 0">'+(templates.map(function(t){ return '<div style="background:#f8f9fb;border:1px solid var(--border);border-radius:8px;padding:10px;margin-bottom:8px"><b>'+esc(t.nome)+'</b><ul style="margin:4px 0 0;padding-left:18px;font-size:12px;color:var(--text-muted)">'+(t.itens||[]).map(function(i){return '<li>'+esc(i)+'</li>';}).join('')+'</ul></div>'; }).join('')||'<div class="text-sm text-muted">Nenhum checklist ainda.</div>')+'</div>'
        +'<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:20px">'
          +'<input id="kb-tpl-nome" class="form-control" style="flex:1;min-width:140px" placeholder="Nome do checklist">'
          +'<input id="kb-tpl-itens" class="form-control" style="flex:2;min-width:200px" placeholder="Itens separados por vírgula">'
          +'<button class="btn btn-sm btn-secondary" data-x="add-tpl">＋ Criar checklist</button>'
        +'</div>'
        +'<hr style="border:none;border-top:1px solid var(--border);margin:0 0 16px">'
        +'<b class="text-sm" style="text-transform:uppercase;color:var(--text-muted);font-size:11px">Checklist por lista</b>'
        +'<div style="margin-top:8px">'+listas.map(function(l){
          var modo=l.checklist_modo||'nenhum';
          return '<div style="border:1px solid var(--border);border-radius:8px;padding:10px;margin-bottom:8px">'
            +'<b style="font-size:13px">'+esc(l.nome)+'</b>'
            +'<div style="display:flex;gap:8px;margin-top:6px;flex-wrap:wrap;align-items:center">'
              +'<select class="form-control kb-lista-modo" data-lista="'+l.id+'" style="width:180px">'
                +'<option value="nenhum"'+(modo==='nenhum'?' selected':'')+'>Sem checklist</option>'
                +'<option value="global"'+(modo==='global'?' selected':'')+'>Um checklist pro card</option>'
                +'<option value="por_etapa"'+(modo==='por_etapa'?' selected':'')+'>Um checklist por etapa</option>'
              +'</select>'
              +(modo==='global'?('<select class="form-control kb-lista-global" data-lista="'+l.id+'" style="width:180px"><option value="">Escolher...</option>'+templates.map(function(t){return '<option value="'+t.id+'"'+(l.checklist_template_id===t.id?' selected':'')+'>'+esc(t.nome)+'</option>';}).join('')+'</select>'):'')
            +'</div>'
            +(modo==='por_etapa'?('<div style="margin-top:8px">'+(BOARDS_ETAPAS[l.tipo]||[]).map(function(et){
                var tid=(l.checklist_por_etapa||{})[et];
                return '<div style="display:flex;justify-content:space-between;align-items:center;font-size:12px;margin-bottom:4px;gap:8px"><span>'+esc(et)+'</span><select class="form-control kb-lista-etapa" data-lista="'+l.id+'" data-etapa="'+esc(et)+'" style="width:180px"><option value="">Nenhum</option>'+templates.map(function(t){return '<option value="'+t.id+'"'+(tid===t.id?' selected':'')+'>'+esc(t.nome)+'</option>';}).join('')+'</select></div>';
              }).join(''))+'</div>':'')
          +'</div>';
        }).join('')+'</div>'
        +'</div></div>';
    }
    ov.addEventListener('click', async function(e){
      if(e.target===ov){ fechar(); return; }
      var x=e.target.closest('[data-x]'); if(!x) return; var act=x.getAttribute('data-x');
      if(act==='close') fechar();
      else if(act==='add-tpl'){
        var nome=document.getElementById('kb-tpl-nome').value.trim();
        var itensRaw=document.getElementById('kb-tpl-itens').value.trim();
        if(!nome||!itensRaw) return;
        try{
          await _authFetch('POST','/prospeccao/checklist-templates',{nome:nome,itens:itensRaw.split(',').map(function(s){return s.trim();}).filter(Boolean)});
          window._kbTemplates=await _authFetch('GET','/prospeccao/checklist-templates')||[];
          render();
        }catch(err){ toast(err.message,'error'); }
      }
    });
    ov.addEventListener('change', async function(e){
      var modoSel=e.target.closest('.kb-lista-modo'); if(modoSel){
        try{ await _authFetch('PATCH','/prospeccao/listas/'+modoSel.getAttribute('data-lista')+'/checklist-config',{checklist_modo:modoSel.value}); window._kbListas=await _authFetch('GET','/prospeccao/listas')||[]; render(); }
        catch(err){ toast(err.message,'error'); }
        return;
      }
      var globalSel=e.target.closest('.kb-lista-global'); if(globalSel){
        try{ await _authFetch('PATCH','/prospeccao/listas/'+globalSel.getAttribute('data-lista')+'/checklist-config',{checklist_template_id:globalSel.value||null}); window._kbListas=await _authFetch('GET','/prospeccao/listas')||[]; }
        catch(err){ toast(err.message,'error'); }
        return;
      }
      var etapaSel=e.target.closest('.kb-lista-etapa'); if(etapaSel){
        var lid=etapaSel.getAttribute('data-lista'), etapa=etapaSel.getAttribute('data-etapa');
        var lista=(window._kbListas||[]).filter(function(l){return l.id===lid;})[0];
        var porEtapa=Object.assign({}, lista?lista.checklist_por_etapa:{});
        porEtapa[etapa]=etapaSel.value||null;
        try{ await _authFetch('PATCH','/prospeccao/listas/'+lid+'/checklist-config',{checklist_por_etapa:porEtapa}); window._kbListas=await _authFetch('GET','/prospeccao/listas')||[]; }
        catch(err){ toast(err.message,'error'); }
        return;
      }
    });
    render();
  }

  if(!window._kbBound){
    window._kbBound=true;
    document.addEventListener('click', function(e){
      var kb=e.target.closest && e.target.closest('#prospeccao-kanban-root [data-kbact]'); if(kb){
        var act=kb.getAttribute('data-kbact'), val=kb.getAttribute('data-val');
        if(act==='board'){ _kbBoard=val; recarregarCards().then(renderKanban); return; }
        if(act==='config'){ abrirKanbanConfigModal(); return; }
        if(act==='prod-all'){ Object.keys(PRODUTOS).forEach(function(k){_kbProdutosOn[k]=true;}); renderKanban(); return; }
        if(act==='prod'){ _kbProdutosOn[val]=!_kbProdutosOn[val]; renderKanban(); return; }
      }
      var card=e.target.closest && e.target.closest('#kb-board .kb-card'); if(card){ abrirCardModal(card.getAttribute('data-id')); return; }
    });
    document.addEventListener('change', function(e){
      var lf=e.target.closest && e.target.closest('#kb-lista-filtro'); if(lf){ _kbLista=lf.value; recarregarCards().then(renderKanban); return; }
    });
    document.addEventListener('dragstart', function(e){
      var card=e.target.closest && e.target.closest('#kb-board .kb-card'); if(!card) return;
      e.dataTransfer.setData('text/plain', card.getAttribute('data-id'));
    });
    document.addEventListener('dragover', function(e){
      var col=e.target.closest && e.target.closest('#kb-board .kb-column'); if(!col) return;
      e.preventDefault();
    });
    document.addEventListener('drop', async function(e){
      var col=e.target.closest && e.target.closest('#kb-board .kb-column'); if(!col) return;
      e.preventDefault();
      var cardId=e.dataTransfer.getData('text/plain');
      var novaEtapa=col.getAttribute('data-etapa');
      var card=(window._kbCards||[]).filter(function(c){return c.id===cardId;})[0];
      if(!card || card.etapa===novaEtapa) return;
      try{ await _authFetch('PATCH','/prospeccao/cards/'+cardId+'/mover-etapa',{etapa:novaEtapa}); await recarregarCards(); renderBoard(); }
      catch(err){ toast(err.message,'error'); }
    });
    document.addEventListener('click', function(e){
      var b=e.target.closest && e.target.closest('[data-page="prospeccao-kanban"]');
      if(b){ setTimeout(function(){ if(typeof carregarKanban==='function') carregarKanban(); }, 50); }
    });
  }
})();

/* ===== PROSPECÇÃO: página Dashboard ===== */
(function(){ var main=document.querySelector('.app-main'); if(main && !document.getElementById('page-prosp-dash')){ var p=document.createElement('div'); p.id='page-prosp-dash'; p.className='page'; p.innerHTML='<div class="app-header"><h2>📊 Dashboard · Prospecção</h2></div><div class="page-content"><div id="prosp-dash-root"><div class="card"><div class="card-body"><p class="text-sm text-muted">Em construção.</p></div></div></div></div>'; main.appendChild(p); var s=document.createElement('style'); s.textContent='#page-prosp-dash .page-content{max-width:none;margin:0;padding:12px 16px}'; document.head.appendChild(s); } })();

/* ===== SOCIAL v7: Dashboard no grupo PROSPECÇÃO ===== */
(function(){
  function redeBadge(ic){ var m={linkedin:['in','#0a66c2'], instagram:['IG','#e1306c'], whatsapp:['WA','#25d366']}; var x=m[ic]||['?','#888']; return '<span style="display:inline-flex;width:20px;height:20px;border-radius:50%;background:'+x[1]+';color:#fff;align-items:center;justify-content:center;font-size:9px;font-weight:800;flex:0 0 auto">'+x[0]+'</span>'; }
  async function construirMenu(){
    var nav=document.querySelector('.desktop-nav'); if(!nav) return;
    var redes=[]; try{ redes=await _authFetch('GET','/redes')||[]; }catch(e){}
    window._redesCache=redes;
    var social={g:'SOCIAL MEDIA', it: redes.map(function(r){ return ['rede:'+r.canal, r.nome, redeBadge(r.icone)]; }) };
    social.it.push(['lembretes','Lembretes','⏰']); social.it.unshift(['calendario','Calendário','📅']);
    var GRUPOS=[
      {g:'ADMIN', it:[['configuracoes','Configurações','⚙️'],['usuarios','Usuários','👤']]},
      {g:'ANDERSON', it:[['qrcode','Meu QR Code','🔳'],['acessos','Acessos','🔑'],['links','Links','🔗'],['fotos','Fotos','🖼️'],['bebidas','Catálogo de Cervejas','🍺']]},
      {g:'CardBase', it:[['cadastro','Cadastro','➕'],['empresas','Empresas','🏢'],['contatos','Contatos','👥'],['dashboard','Dashboard','📊']]},
      {g:'FINANCEIRO', it:[['vendas','Vendas','💰'],['forecast','Forcast','📈'],['comissao','Comissão','🧮'],['financas-empresa','Controle financeiro','🏦'],['financas-pessoais','Compras','💳'],['analise-financeira','Análise financeira','📊']]},
      {g:'OPERAÇÕES', it:[['operacoes-link','Link','🔗'],['operacoes-calculadora','Calculadora','🧮'],['operacoes-bom','BOM','📋'],['operacoes-precificacao','Precificação','💲'],['operacoes-produtos','Produtos','📦']]},
      {g:'PROSPECÇÃO', it:[['prosp-dash','Dashboard','📊'],['prospeccao-empresas','Empresas','🏢'],['prospeccao-contatos','Contatos','👤'],['prospeccao-listas','Listas','📋'],['prospeccao-kanban','Kanban','🗂️'],['crm-registros','CRM','📇'],['felicitacoes','Mensagem','💬']]},
      {g:'COMERCIAL', it:[['funil','Funil','🔻'],['propostas','Propostas','📄'],['prop-modelos','Modelos','🧩'],['prop-produtos','Produtos','📦'],['prop-config','Configurações','⚙️']]},
      social
    ];
    var html='<div class="desktop-nav-logo">📇 SGC</div><div style="font-size:10px;color:var(--text-muted);padding:0 12px 8px;margin-top:-4px">Sistema de Gestão Comercial</div>';
    html+='<button id="nav-collapse-btn" class="desktop-nav-item" title="Recolher menu" style="display:flex;justify-content:space-between;align-items:center;width:100%"><span>Menu</span><span style="font-size:18px;line-height:1">≡</span></button>';
    html+='<div class="nav-scroll" style="flex:1;overflow-y:auto;min-height:0">';
    GRUPOS.forEach(function(gr,gi){
      html+='<button class="nav-grp-head" data-grp="'+gi+'"><span>'+gr.g+'</span><span class="nav-caret">▸</span></button>';
      html+='<div class="nav-grp-items" data-items="'+gi+'" style="display:none">';
      gr.it.forEach(function(it){ var ic=(it[2]&&it[2].charAt(0)==='<')?it[2]:'<span style="width:20px;text-align:center;display:inline-block">'+(it[2]||'')+'</span>'; html+='<button class="desktop-nav-item nav-sub" data-page="'+it[0]+'" style="display:flex;align-items:center;gap:8px">'+ic+' <span>'+it[1]+'</span></button>'; });
      html+='</div>';
    });
    html+='</div>';
    nav.innerHTML=html;
    var _open=null;
    function setOpen(gi){ gi=(gi==null)?null:String(gi); nav.querySelectorAll('.nav-grp-items').forEach(function(d){ d.style.display=(gi!=null && d.getAttribute('data-items')===gi)?'block':'none'; }); nav.querySelectorAll('.nav-grp-head').forEach(function(hd){ hd.querySelector('.nav-caret').textContent=(gi!=null && hd.getAttribute('data-grp')===gi)?'▾':'▸'; }); _open=gi; }
    nav.querySelectorAll('.nav-grp-head').forEach(function(hd){ hd.addEventListener('click', function(){ var g=hd.getAttribute('data-grp'); setOpen(g===_open?null:g); }); });
    nav.querySelectorAll('.desktop-nav-item[data-page]').forEach(function(b){ b.addEventListener('click', function(){ menuClick(b.getAttribute('data-page'), b); }); });
    var col=document.getElementById('nav-collapse-btn'); if(col) col.addEventListener('click', function(){ document.body.classList.add('nav-off'); });
    setOpen('5');
    if(typeof aplicarPermissoes==='function') setTimeout(aplicarPermissoes,200);
  }
  function menuClick(id,b){
    if(id==='calendario'){ if(typeof navegarPara==='function') navegarPara('calendario'); if(typeof carregarCalendario==='function') carregarCalendario(); return; }
    if(id==='vendas'){ navegarPara('vendas'); if(typeof carregarVendas==='function') carregarVendas(); return; }
    if(id==='forecast'){ navegarPara('forecast'); if(typeof carregarForecast==='function') carregarForecast(); return; }
    if(id==='propostas'){ navegarPara('propostas'); if(typeof carregarPropostas==='function') carregarPropostas(); return; }
    if(id==='prop-modelos'){ navegarPara('prop-modelos'); if(typeof carregarPropModelos==='function') carregarPropModelos(); return; }
    if(id==='prop-produtos'){ navegarPara('prop-produtos'); if(typeof carregarPropProdutos==='function') carregarPropProdutos(); return; }
    if(id==='prop-config'){ navegarPara('prop-config'); if(typeof carregarPropConfig==='function') carregarPropConfig(); return; }
    if(id==='funil'){ navegarPara('funil'); if(typeof carregarFunil==='function') carregarFunil(); return; }
    if(id==='comissao'){ navegarPara('comissao'); if(typeof carregarComissao==='function') carregarComissao(); return; }
    if(id==='prosp-dash'){ navegarPara('prosp-dash'); if(typeof carregarProspDash==='function') carregarProspDash(); return; }
    if(id==='prospeccao-empresas'){ navegarPara('prospeccao-empresas'); if(typeof carregarProspEmpresas==='function') carregarProspEmpresas(); return; }
    if(id==='prospeccao-contatos'){ navegarPara('prospeccao-contatos'); if(typeof carregarProspContatos==='function') carregarProspContatos(); return; }
    if(id==='prospeccao-listas'){ navegarPara('prospeccao-listas'); if(typeof carregarProspListas==='function') carregarProspListas(); return; }
    if(id==='prospeccao-kanban'){ navegarPara('prospeccao-kanban'); if(typeof carregarKanban==='function') carregarKanban(); return; }
    if(id==='crm-registros'){ navegarPara('crm-registros'); if(typeof carregarCrm==='function') carregarCrm(); return; }
    if(id.indexOf('rede:')===0){
      var canal=id.slice(5); window.PUB_CANAL=canal;
      if(window.filtrosPub){ filtrosPub.arquivado=false; filtrosPub.excluido=false; filtrosPub.planejador=''; }
      window._pubCounts=null;
      var cur=document.querySelector('.page.active'); if(cur) cur.classList.remove('active');
      var pg=document.getElementById('page-publicacoes'); if(pg) pg.classList.add('active');
      document.querySelectorAll('.desktop-nav-item').forEach(function(x){x.classList.remove('active');});
      if(b) b.classList.add('active');
      var rede=null; (window._redesCache||[]).forEach(function(r){ if(r.canal===canal) rede=r; });
      var hh=document.querySelector('#page-publicacoes .app-header h2'); if(hh && rede) hh.textContent=rede.nome;
      window.scrollTo(0,0);
      if(typeof carregarPublicacoes==='function') carregarPublicacoes();
      return;
    }
    if(id==='cadastro'){ if(typeof abrirNovoContato==='function') abrirNovoContato('foto'); return; }
    if(id==='bebidas'){ if(typeof navegarPara==='function') navegarPara('bebidas'); if(typeof carregarBebidas==='function') carregarBebidas(); return; }
    navegarPara(id);
    if(id==='felicitacoes' && typeof carregarFelicitacoes==='function') carregarFelicitacoes();
    if(id==='lembretes' && typeof carregarLembretes==='function') carregarLembretes();
    if(id==='usuarios' && typeof carregarUsuarios==='function') carregarUsuarios();
    if(id==='pitch' && typeof carregarPitch==='function') carregarPitch();
    if(id==='configuracoes'){ setTimeout(function(){ if(typeof cfgInit==='function') cfgInit(); if(typeof montarRedesConfig==='function') montarRedesConfig(); if(typeof montarCervejasConfig==='function') montarCervejasConfig(); if(typeof montarFinConfig==='function') montarFinConfig(); if(typeof montarFinListas==='function') montarFinListas(); },100); }
  }
  window.recarregarMenuSocial=function(){ construirMenu(); };
})();

/* ===== SOCIAL v8: menu DEFINITIVO — mata a corrida entre builders antigos ===== */
(function(){
  var old=document.querySelector('.desktop-nav');
  if(old && old.parentNode){ var fresh=old.cloneNode(false); old.parentNode.replaceChild(fresh, old); }
  function redeBadge(ic){ var m={linkedin:['in','#0a66c2'], instagram:['IG','#e1306c'], whatsapp:['WA','#25d366']}; var x=m[ic]||['?','#888']; return '<span style="display:inline-flex;width:20px;height:20px;border-radius:50%;background:'+x[1]+';color:#fff;align-items:center;justify-content:center;font-size:9px;font-weight:800;flex:0 0 auto">'+x[0]+'</span>'; }
  async function construirMenu(){
    var nav=document.querySelector('.desktop-nav'); if(!nav) return;
    var redes=[]; try{ redes=await _authFetch('GET','/redes')||[]; }catch(e){}
    window._redesCache=redes;
    var social={g:'SOCIAL MEDIA', it: redes.map(function(r){ return ['rede:'+r.canal, r.nome, redeBadge(r.icone)]; }) };
    social.it.push(['lembretes','Lembretes','⏰']); social.it.unshift(['calendario','Calendário','📅']);
    var GRUPOS=[
      {g:'ADMIN', it:[['configuracoes','Configurações','⚙️'],['usuarios','Usuários','👤']]},
      {g:'ANDERSON', it:[['qrcode','Meu QR Code','🔳'],['acessos','Acessos','🔑'],['links','Links','🔗'],['fotos','Fotos','🖼️'],['bebidas','Catálogo de Cervejas','🍺']]},
      {g:'CardBase', it:[['cadastro','Cadastro','➕'],['empresas','Empresas','🏢'],['contatos','Contatos','👥'],['dashboard','Dashboard','📊']]},
      {g:'FINANCEIRO', it:[['vendas','Vendas','💰'],['forecast','Forcast','📈'],['comissao','Comissão','🧮'],['financas-empresa','Controle financeiro','🏦'],['financas-pessoais','Compras','💳'],['analise-financeira','Análise financeira','📊']]},
      {g:'OPERAÇÕES', it:[['operacoes-link','Link','🔗'],['operacoes-calculadora','Calculadora','🧮'],['operacoes-bom','BOM','📋'],['operacoes-precificacao','Precificação','💲'],['operacoes-produtos','Produtos','📦']]},
      {g:'PROSPECÇÃO', it:[['prosp-dash','Dashboard','📊'],['prospeccao-empresas','Empresas','🏢'],['prospeccao-contatos','Contatos','👤'],['prospeccao-listas','Listas','📋'],['prospeccao-kanban','Kanban','🗂️'],['crm-registros','CRM','📇'],['felicitacoes','Mensagem','💬']]},
      {g:'COMERCIAL', it:[['funil','Funil','🔻'],['propostas','Propostas','📄'],['prop-modelos','Modelos','🧩'],['prop-produtos','Produtos','📦'],['prop-config','Configurações','⚙️']]},
      social
    ];
    var html='<div class="desktop-nav-logo">📇 SGC</div><div style="font-size:10px;color:var(--text-muted);padding:0 12px 8px;margin-top:-4px">Sistema de Gestão Comercial</div>';
    html+='<button id="nav-collapse-btn" class="desktop-nav-item" title="Recolher menu" style="display:flex;justify-content:space-between;align-items:center;width:100%"><span>Menu</span><span style="font-size:18px;line-height:1">≡</span></button>';
    html+='<div class="nav-scroll" style="flex:1;overflow-y:auto;min-height:0">';
    GRUPOS.forEach(function(gr,gi){
      html+='<button class="nav-grp-head" data-grp="'+gi+'"><span>'+gr.g+'</span><span class="nav-caret">▸</span></button>';
      html+='<div class="nav-grp-items" data-items="'+gi+'" style="display:none">';
      gr.it.forEach(function(it){ var ic=(it[2]&&it[2].charAt(0)==='<')?it[2]:'<span style="width:20px;text-align:center;display:inline-block">'+(it[2]||'')+'</span>'; html+='<button class="desktop-nav-item nav-sub" data-page="'+it[0]+'" style="display:flex;align-items:center;gap:8px">'+ic+' <span>'+it[1]+'</span></button>'; });
      html+='</div>';
    });
    html+='</div>';
    nav.innerHTML=html;
    var _open=null;
    function setOpen(gi){ gi=(gi==null)?null:String(gi); nav.querySelectorAll('.nav-grp-items').forEach(function(d){ d.style.display=(gi!=null && d.getAttribute('data-items')===gi)?'block':'none'; }); nav.querySelectorAll('.nav-grp-head').forEach(function(hd){ hd.querySelector('.nav-caret').textContent=(gi!=null && hd.getAttribute('data-grp')===gi)?'▾':'▸'; }); _open=gi; }
    nav.querySelectorAll('.nav-grp-head').forEach(function(hd){ hd.addEventListener('click', function(){ var g=hd.getAttribute('data-grp'); setOpen(g===_open?null:g); }); });
    nav.querySelectorAll('.desktop-nav-item[data-page]').forEach(function(b){ b.addEventListener('click', function(){ menuClick(b.getAttribute('data-page'), b); }); });
    var col=document.getElementById('nav-collapse-btn'); if(col) col.addEventListener('click', function(){ document.body.classList.add('nav-off'); });
    setOpen('5');
    if(typeof aplicarPermissoes==='function') setTimeout(aplicarPermissoes,200);
  }
  function menuClick(id,b){
    if(id==='calendario'){ if(typeof navegarPara==='function') navegarPara('calendario'); if(typeof carregarCalendario==='function') carregarCalendario(); return; }
    if(id==='vendas'){ navegarPara('vendas'); if(typeof carregarVendas==='function') carregarVendas(); return; }
    if(id==='forecast'){ navegarPara('forecast'); if(typeof carregarForecast==='function') carregarForecast(); return; }
    if(id==='propostas'){ navegarPara('propostas'); if(typeof carregarPropostas==='function') carregarPropostas(); return; }
    if(id==='prop-modelos'){ navegarPara('prop-modelos'); if(typeof carregarPropModelos==='function') carregarPropModelos(); return; }
    if(id==='prop-produtos'){ navegarPara('prop-produtos'); if(typeof carregarPropProdutos==='function') carregarPropProdutos(); return; }
    if(id==='prop-config'){ navegarPara('prop-config'); if(typeof carregarPropConfig==='function') carregarPropConfig(); return; }
    if(id==='funil'){ navegarPara('funil'); if(typeof carregarFunil==='function') carregarFunil(); return; }
    if(id==='comissao'){ navegarPara('comissao'); if(typeof carregarComissao==='function') carregarComissao(); return; }
    if(id==='prosp-dash'){ navegarPara('prosp-dash'); if(typeof carregarProspDash==='function') carregarProspDash(); return; }
    if(id==='prospeccao-empresas'){ navegarPara('prospeccao-empresas'); if(typeof carregarProspEmpresas==='function') carregarProspEmpresas(); return; }
    if(id==='prospeccao-contatos'){ navegarPara('prospeccao-contatos'); if(typeof carregarProspContatos==='function') carregarProspContatos(); return; }
    if(id==='prospeccao-listas'){ navegarPara('prospeccao-listas'); if(typeof carregarProspListas==='function') carregarProspListas(); return; }
    if(id==='prospeccao-kanban'){ navegarPara('prospeccao-kanban'); if(typeof carregarKanban==='function') carregarKanban(); return; }
    if(id==='crm-registros'){ navegarPara('crm-registros'); if(typeof carregarCrm==='function') carregarCrm(); return; }
    if(id.indexOf('rede:')===0){
      var canal=id.slice(5); window.PUB_CANAL=canal;
      if(window.filtrosPub){ filtrosPub.arquivado=false; filtrosPub.excluido=false; filtrosPub.planejador=''; }
      window._pubCounts=null;
      var cur=document.querySelector('.page.active'); if(cur) cur.classList.remove('active');
      var pg=document.getElementById('page-publicacoes'); if(pg) pg.classList.add('active');
      document.querySelectorAll('.desktop-nav-item').forEach(function(x){x.classList.remove('active');});
      if(b) b.classList.add('active');
      var rede=null; (window._redesCache||[]).forEach(function(r){ if(r.canal===canal) rede=r; });
      var hh=document.querySelector('#page-publicacoes .app-header h2'); if(hh && rede) hh.textContent=rede.nome;
      window.scrollTo(0,0);
      if(typeof carregarPublicacoes==='function') carregarPublicacoes();
      return;
    }
    if(id==='cadastro'){ if(typeof abrirNovoContato==='function') abrirNovoContato('foto'); return; }
    if(id==='bebidas'){ if(typeof navegarPara==='function') navegarPara('bebidas'); if(typeof carregarBebidas==='function') carregarBebidas(); return; }
    navegarPara(id);
    if(id==='felicitacoes' && typeof carregarFelicitacoes==='function') carregarFelicitacoes();
    if(id==='lembretes' && typeof carregarLembretes==='function') carregarLembretes();
    if(id==='usuarios' && typeof carregarUsuarios==='function') carregarUsuarios();
    if(id==='pitch' && typeof carregarPitch==='function') carregarPitch();
    if(id==='configuracoes'){ setTimeout(function(){ if(typeof cfgInit==='function') cfgInit(); if(typeof montarRedesConfig==='function') montarRedesConfig(); if(typeof montarCervejasConfig==='function') montarCervejasConfig(); if(typeof montarFinConfig==='function') montarFinConfig(); if(typeof montarFinListas==='function') montarFinListas(); },100); }
  }
  window.recarregarMenuSocial=function(){ construirMenu(); };
})();

/* ===== SOCIAL v9: menu à prova de corrida (MutationObserver + reforço) ===== */
(function(){
  function redeBadge(ic){ var m={linkedin:['in','#0a66c2'], instagram:['IG','#e1306c'], whatsapp:['WA','#25d366']}; var x=m[ic]||['?','#888']; return '<span style="display:inline-flex;width:20px;height:20px;border-radius:50%;background:'+x[1]+';color:#fff;align-items:center;justify-content:center;font-size:9px;font-weight:800;flex:0 0 auto">'+x[0]+'</span>'; }
  function menuClick(id,b){
    if(id==='calendario'){ if(typeof navegarPara==='function') navegarPara('calendario'); if(typeof carregarCalendario==='function') carregarCalendario(); return; }
    if(id==='vendas'){ navegarPara('vendas'); if(typeof carregarVendas==='function') carregarVendas(); return; }
    if(id==='forecast'){ navegarPara('forecast'); if(typeof carregarForecast==='function') carregarForecast(); return; }
    if(id==='propostas'){ navegarPara('propostas'); if(typeof carregarPropostas==='function') carregarPropostas(); return; }
    if(id==='prop-modelos'){ navegarPara('prop-modelos'); if(typeof carregarPropModelos==='function') carregarPropModelos(); return; }
    if(id==='prop-produtos'){ navegarPara('prop-produtos'); if(typeof carregarPropProdutos==='function') carregarPropProdutos(); return; }
    if(id==='prop-config'){ navegarPara('prop-config'); if(typeof carregarPropConfig==='function') carregarPropConfig(); return; }
    if(id==='funil'){ navegarPara('funil'); if(typeof carregarFunil==='function') carregarFunil(); return; }
    if(id==='comissao'){ navegarPara('comissao'); if(typeof carregarComissao==='function') carregarComissao(); return; }
    if(id==='prosp-dash'){ navegarPara('prosp-dash'); if(typeof carregarProspDash==='function') carregarProspDash(); return; }
    if(id==='prospeccao-empresas'){ navegarPara('prospeccao-empresas'); if(typeof carregarProspEmpresas==='function') carregarProspEmpresas(); return; }
    if(id==='prospeccao-contatos'){ navegarPara('prospeccao-contatos'); if(typeof carregarProspContatos==='function') carregarProspContatos(); return; }
    if(id==='prospeccao-listas'){ navegarPara('prospeccao-listas'); if(typeof carregarProspListas==='function') carregarProspListas(); return; }
    if(id==='prospeccao-kanban'){ navegarPara('prospeccao-kanban'); if(typeof carregarKanban==='function') carregarKanban(); return; }
    if(id==='crm-registros'){ navegarPara('crm-registros'); if(typeof carregarCrm==='function') carregarCrm(); return; }
    if(id.indexOf('rede:')===0){
      var canal=id.slice(5); window.PUB_CANAL=canal;
      if(window.filtrosPub){ filtrosPub.arquivado=false; filtrosPub.excluido=false; filtrosPub.planejador=''; }
      window._pubCounts=null;
      var cur=document.querySelector('.page.active'); if(cur) cur.classList.remove('active');
      var pg=document.getElementById('page-publicacoes'); if(pg) pg.classList.add('active');
      document.querySelectorAll('.desktop-nav-item').forEach(function(x){x.classList.remove('active');});
      if(b) b.classList.add('active');
      var rede=null; (window._redesCache||[]).forEach(function(r){ if(r.canal===canal) rede=r; });
      var hh=document.querySelector('#page-publicacoes .app-header h2'); if(hh && rede) hh.textContent=rede.nome;
      window.scrollTo(0,0);
      if(typeof carregarPublicacoes==='function') carregarPublicacoes();
      return;
    }
    if(id==='cadastro'){ if(typeof abrirNovoContato==='function') abrirNovoContato('foto'); return; }
    if(id==='bebidas'){ if(typeof navegarPara==='function') navegarPara('bebidas'); if(typeof carregarBebidas==='function') carregarBebidas(); return; }
    navegarPara(id);
    if(id==='felicitacoes' && typeof carregarFelicitacoes==='function') carregarFelicitacoes();
    if(id==='lembretes' && typeof carregarLembretes==='function') carregarLembretes();
    if(id==='usuarios' && typeof carregarUsuarios==='function') carregarUsuarios();
    if(id==='pitch' && typeof carregarPitch==='function') carregarPitch();
    if(id==='configuracoes'){ setTimeout(function(){ if(typeof cfgInit==='function') cfgInit(); if(typeof montarRedesConfig==='function') montarRedesConfig(); if(typeof montarCervejasConfig==='function') montarCervejasConfig(); if(typeof montarFinConfig==='function') montarFinConfig(); if(typeof montarFinListas==='function') montarFinListas(); },100); }
  }
  function buildInto(nav){
    var redes=window._redesCache||[];
    var social={g:'SOCIAL MEDIA', it: redes.map(function(r){ return ['rede:'+r.canal, r.nome, redeBadge(r.icone)]; }) };
    social.it.push(['lembretes','Lembretes','⏰']); social.it.unshift(['calendario','Calendário','📅']);
    var GRUPOS=[
      {g:'ADMIN', it:[['configuracoes','Configurações','⚙️'],['usuarios','Usuários','👤']]},
      {g:'ANDERSON', it:[['qrcode','Meu QR Code','🔳'],['acessos','Acessos','🔑'],['links','Links','🔗'],['fotos','Fotos','🖼️'],['bebidas','Catálogo de Cervejas','🍺']]},
      {g:'CardBase', it:[['cadastro','Cadastro','➕'],['empresas','Empresas','🏢'],['contatos','Contatos','👥'],['dashboard','Dashboard','📊']]},
      {g:'FINANCEIRO', it:[['financas-empresa','Controle financeiro','🏦'],['financas-pessoais','Compras','💳'],['analise-financeira','Análise financeira','📊']]},
      {g:'OPERAÇÕES', it:[['operacoes-link','Link','🔗'],['operacoes-calculadora','Calculadora','🧮'],['operacoes-bom','BOM','📋'],['operacoes-precificacao','Precificação','💲'],['operacoes-produtos','Produtos','📦']]},
      {g:'PROSPECÇÃO', it:[['prosp-dash','Dashboard','📊'],['prospeccao-empresas','Empresas','🏢'],['prospeccao-contatos','Contatos','👤'],['prospeccao-listas','Listas','📋'],['prospeccao-kanban','Kanban','🗂️'],['crm-registros','CRM','📇'],['felicitacoes','Mensagem','💬']]},
      {g:'COMERCIAL', it:[['funil','Funil','🔻'],['vendas','Vendas','💰'],['propostas','Propostas','📄'],['prop-modelos','Modelos','🧩'],['prop-produtos','Produtos','📦'],['prop-config','Configurações','⚙️']]},
      social
    ];
    var html='<span class="nav-v9" style="display:none"></span><div class="desktop-nav-logo">📇 SGC</div><div style="font-size:10px;color:var(--text-muted);padding:0 12px 8px;margin-top:-4px">Sistema de Gestão Comercial</div>';
    html+='<button id="nav-collapse-btn" class="desktop-nav-item" title="Recolher menu" style="display:flex;justify-content:space-between;align-items:center;width:100%"><span>Menu</span><span style="font-size:18px;line-height:1">≡</span></button>';
    html+='<div class="nav-scroll" style="flex:1;overflow-y:auto;min-height:0">';
    GRUPOS.forEach(function(gr,gi){
      html+='<button class="nav-grp-head" data-grp="'+gi+'"><span>'+gr.g+'</span><span class="nav-caret">▸</span></button>';
      html+='<div class="nav-grp-items" data-items="'+gi+'" style="display:none">';
      gr.it.forEach(function(it){ var ic=(it[2]&&it[2].charAt(0)==='<')?it[2]:'<span style="width:20px;text-align:center;display:inline-block">'+(it[2]||'')+'</span>'; html+='<button class="desktop-nav-item nav-sub" data-page="'+it[0]+'" style="display:flex;align-items:center;gap:8px">'+ic+' <span>'+it[1]+'</span></button>'; });
      html+='</div>';
    });
    html+='</div>';
    nav.innerHTML=html;
    var _open=null;
    function setOpen(gi){ gi=(gi==null)?null:String(gi); nav.querySelectorAll('.nav-grp-items').forEach(function(d){ d.style.display=(gi!=null && d.getAttribute('data-items')===gi)?'block':'none'; }); nav.querySelectorAll('.nav-grp-head').forEach(function(hd){ hd.querySelector('.nav-caret').textContent=(gi!=null && hd.getAttribute('data-grp')===gi)?'▾':'▸'; }); _open=gi; }
    nav.querySelectorAll('.nav-grp-head').forEach(function(hd){ hd.addEventListener('click', function(){ var g=hd.getAttribute('data-grp'); setOpen(g===_open?null:g); }); });
    nav.querySelectorAll('.desktop-nav-item[data-page]').forEach(function(b){ b.addEventListener('click', function(){ menuClick(b.getAttribute('data-page'), b); }); });
    var col=document.getElementById('nav-collapse-btn'); if(col) col.addEventListener('click', function(){ document.body.classList.add('nav-off'); });
    setOpen('5');
    if(typeof aplicarPermissoes==='function') setTimeout(aplicarPermissoes,200);
  }
  function ensure(){ var nav=document.querySelector('.desktop-nav'); if(!nav) return; if(nav.querySelector('.nav-v9')) return; buildInto(nav); }
  async function init(){
    try{ window._redesCache=await _authFetch('GET','/redes')||[]; }catch(e){ window._redesCache=window._redesCache||[]; }
    var nav=document.querySelector('.desktop-nav'); if(nav) buildInto(nav);
    var target=document.querySelector('.desktop-nav');
    if(target && window.MutationObserver){ new MutationObserver(function(){ ensure(); }).observe(target,{childList:true}); }
    [200,600,1200,2500,4000].forEach(function(ms){ setTimeout(ensure, ms); });
  }
  window.recarregarMenuSocial=function(){ var n=document.querySelector('.desktop-nav'); if(n) buildInto(n); };
  init();
})();

/* ===== PROSPECÇÃO: CRM (registro diário de interações) ===== */
(function(){
  var main=document.querySelector('.app-main'); if(!main) return;
  if(!document.getElementById('page-crm-registros')){
    var p=document.createElement('div'); p.id='page-crm-registros'; p.className='page';
    p.innerHTML='<div class="app-header"><h2>📇 CRM</h2></div><div class="page-content"><div id="crm-registros-root"></div></div>';
    main.appendChild(p);
  }
  var CSSID='css-crm'; var old=document.getElementById(CSSID); if(old) old.remove();
  var st=document.createElement('style'); st.id=CSSID;
  st.textContent=[
    '#page-crm-registros .page-content{max-width:none;margin:0;padding:12px 16px}',
    '.crm-top{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:12px}',
    '.crm-fil{display:flex;gap:4px}',
    '.crm-fil button{padding:6px 12px;border:1px solid var(--border,#d1d5db);background:var(--surface,#fff);border-radius:8px;font-size:13px;cursor:pointer}',
    '.crm-fil button.on{background:#2563eb;color:#fff;border-color:#2563eb}',
    '.crm-cnt{display:grid;grid-template-columns:repeat(auto-fit,minmax(115px,1fr));gap:8px;margin-bottom:16px}',
    '.crm-c{background:var(--surface,#fff);border:1px solid var(--border,#e5e7eb);border-radius:10px;padding:10px 12px}',
    '.crm-c .n{font-size:22px;font-weight:800;line-height:1}',
    '.crm-c .l{font-size:11px;color:var(--text-muted,#6b7280);margin-top:3px}',
    '.crm-c.tot{background:#111827;color:#fff}.crm-c.tot .l{color:#cbd5e1}',
    '.crm-tbl{width:100%;border-collapse:collapse;font-size:14px}',
    '.crm-tbl th,.crm-tbl td{padding:8px 10px;border-bottom:1px solid var(--border,#eee);text-align:left;vertical-align:top}',
    '.crm-tbl thead th{font-size:11px;color:var(--text-muted,#6b7280);text-transform:uppercase}',
    '.crm-tbl td.obs{color:var(--text-muted,#374151);white-space:pre-wrap;max-width:420px}',
    '.crm-ov{position:fixed;inset:0;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;z-index:400;padding:16px}',
    '.crm-mod{background:var(--surface,#fff);border-radius:14px;max-width:500px;width:100%;padding:18px 20px;max-height:92vh;overflow:auto}',
    '.crm-mod label{display:block;font-size:12px;font-weight:600;margin:10px 0 4px;color:var(--text-muted,#374151)}',
    '.crm-mod > input,.crm-mod select,.crm-mod textarea{width:100%;padding:8px 10px;border:1px solid var(--border,#ccc);border-radius:8px;font-size:14px;box-sizing:border-box;font-family:inherit}',
    '.crm-sr{display:flex;align-items:center;justify-content:space-between;padding:7px 0;border-bottom:1px solid var(--border,#eee);font-size:14px}',
    '.crm-stp{display:flex;align-items:center;gap:6px}',
    '.crm-stp button{width:32px;height:32px;border:1px solid var(--border,#ccc);background:var(--surface,#fff);border-radius:8px;font-size:19px;line-height:1;cursor:pointer;padding:0}'
  ].join('');
  document.head.appendChild(st);

  var TIPOS=['FUP COM','FUP INT','FUP CLIE','Registro Zebra','Cotação Goevo','Proposta','Venda','Reunião Virtual','Reunião Presencial','Deslocamento'];
  var _per='mes';
  function esc(s){ return (s==null?'':String(s)).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); }
  function hojeISO(){ return new Date(Date.now()-3*3600*1000).toISOString().slice(0,10); }
  function inicioPeriodo(){
    var d=new Date(Date.now()-3*3600*1000); d.setUTCHours(0,0,0,0);
    if(_per==='hoje') return d.toISOString().slice(0,10);
    if(_per==='semana'){ var wd=(d.getUTCDay()+6)%7; d.setUTCDate(d.getUTCDate()-wd); return d.toISOString().slice(0,10); }
    if(_per==='mes'){ d.setUTCDate(1); return d.toISOString().slice(0,10); }
    return '0000-01-01';
  }
  function fmtData(iso){ if(!iso) return ''; var a=iso.split('-'); return a[2]+'/'+a[1]+'/'+a[0]; }
  function filtrados(){ var ini=inicioPeriodo(), fim=(_per==='hoje')?hojeISO():'9999-12-31'; return (window._crmReg||[]).filter(function(r){ return r.data>=ini && r.data<=fim; }); }

  function render(){
    var root=document.getElementById('crm-registros-root'); if(!root) return;
    var regs=filtrados(), cont={}, total=0; TIPOS.forEach(function(t){cont[t]=0;});
    regs.forEach(function(r){ var q=r.quantidade||1; if(cont[r.tipo]==null)cont[r.tipo]=0; cont[r.tipo]+=q; total+=q; });
    var PERS=[['hoje','Hoje'],['semana','Semana'],['mes','Mês'],['tudo','Tudo']];
    var fil=PERS.map(function(x){ return '<button data-crmp="'+x[0]+'" class="'+(_per===x[0]?'on':'')+'">'+x[1]+'</button>'; }).join('');
    var tiles=TIPOS.map(function(t){ return '<div class="crm-c"><div class="n">'+(cont[t]||0)+'</div><div class="l">'+esc(t)+'</div></div>'; }).join('')
      +'<div class="crm-c tot"><div class="n">'+total+'</div><div class="l">TOTAL</div></div>';
    var linhas=regs.map(function(r){
      return '<tr><td>'+fmtData(r.data)+'</td><td>'+esc(r.tipo)+'</td><td style="text-align:center">'+(r.quantidade||1)+'</td><td class="obs">'+esc(r.observacao||'')+'</td>'
        +'<td style="white-space:nowrap"><button class="btn btn-sm" data-crm-edit="'+r.id+'" title="Editar">✏️</button> <button class="btn btn-sm" data-crm-del="'+r.id+'" title="Excluir">🗑</button></td></tr>';
    }).join('')||'<tr><td colspan="5" class="text-sm text-muted" style="text-align:center;padding:18px">Nenhum registro no período.</td></tr>';
    root.innerHTML='<div class="crm-top"><div class="crm-fil">'+fil+'</div><button class="btn btn-primary btn-sm" data-crm-novo style="margin-left:auto">+ Registrar</button></div>'
      +'<div class="crm-cnt">'+tiles+'</div>'
      +'<div class="card"><div class="card-body" style="overflow-x:auto"><table class="crm-tbl"><thead><tr><th>Data</th><th>Tipo</th><th>Qtd</th><th>Observação</th><th>Ações</th></tr></thead><tbody>'+linhas+'</tbody></table></div></div>';
  }

  function abrirModalNovo(){
    var ov=document.createElement('div'); ov.className='crm-ov';
    var rows=TIPOS.map(function(t,i){ return '<div class="crm-sr"><span>'+esc(t)+'</span><div class="crm-stp"><button type="button" data-step="-1" data-i="'+i+'">−</button><input type="number" min="0" data-i="'+i+'" value="0" style="width:56px;text-align:center;padding:6px 4px;border:1px solid var(--border,#ccc);border-radius:8px;font-size:14px;box-sizing:border-box"><button type="button" data-step="1" data-i="'+i+'">+</button></div></div>'; }).join('');
    ov.innerHTML='<div class="crm-mod"><div style="font-size:16px;font-weight:700;margin-bottom:6px">Novo registro</div>'
      +'<label>Data</label><input type="date" id="crm-data" value="'+hojeISO()+'">'
      +'<div style="margin:14px 0 2px;font-size:12px;font-weight:700;color:var(--text-muted,#374151)">INTERAÇÕES</div>'
      +'<div>'+rows+'</div>'
      +'<label>Observação (texto livre)</label><textarea id="crm-obs" rows="3" placeholder="Detalhes das interações…"></textarea>'
      +'<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px"><button class="btn" data-crm-cancel>Cancelar</button><button class="btn btn-primary" data-crm-save-multi>Salvar</button></div></div>';
    document.body.appendChild(ov);
    ov.addEventListener('click', async function(e){
      var sb=e.target.closest && e.target.closest('[data-step]');
      if(sb){ var i=sb.getAttribute('data-i'); var inp=ov.querySelector('input[data-i="'+i+'"]'); var v=(parseInt(inp.value)||0)+parseInt(sb.getAttribute('data-step')); if(v<0)v=0; inp.value=v; return; }
      if(e.target===ov || e.target.hasAttribute('data-crm-cancel')){ ov.remove(); return; }
      if(e.target.hasAttribute('data-crm-save-multi')){
        var data=document.getElementById('crm-data').value, obs=document.getElementById('crm-obs').value, jobs=[];
        TIPOS.forEach(function(t,i){ var inp=ov.querySelector('input[data-i="'+i+'"]'); var q=parseInt(inp.value)||0; if(q>0) jobs.push(_authFetch('POST','/prospeccao/crm/registros',{data:data,tipo:t,quantidade:q,observacao:obs})); });
        if(!jobs.length){ if(typeof toast==='function') toast('Ajuste ao menos 1 interação','error'); return; }
        try{ await Promise.all(jobs); if(typeof toast==='function') toast('Registrado','success'); ov.remove(); await carregarCrm(); }
        catch(err){ if(typeof toast==='function') toast('Erro ao salvar','error'); }
      }
    });
  }

  function abrirModalEdit(reg){
    var ov=document.createElement('div'); ov.className='crm-ov';
    var opts=TIPOS.map(function(t){ return '<option'+(reg.tipo===t?' selected':'')+'>'+esc(t)+'</option>'; }).join('');
    ov.innerHTML='<div class="crm-mod"><div style="font-size:16px;font-weight:700;margin-bottom:6px">Editar registro</div>'
      +'<label>Data</label><input type="date" id="crm-edata" value="'+reg.data+'">'
      +'<label>Tipo</label><select id="crm-etipo">'+opts+'</select>'
      +'<label>Quantidade</label><div class="crm-stp"><button type="button" data-estep="-1">−</button><input type="number" id="crm-eqtd" min="0" value="'+(reg.quantidade||1)+'" style="width:56px;text-align:center;padding:6px 4px;border:1px solid var(--border,#ccc);border-radius:8px;font-size:14px;box-sizing:border-box"><button type="button" data-estep="1">+</button></div>'
      +'<label>Observação (texto livre)</label><textarea id="crm-eobs" rows="3">'+esc(reg.observacao||'')+'</textarea>'
      +'<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px"><button class="btn" data-crm-cancel>Cancelar</button><button class="btn btn-primary" data-crm-save-one>Salvar</button></div></div>';
    document.body.appendChild(ov);
    ov.addEventListener('click', async function(e){
      var sb=e.target.closest && e.target.closest('[data-estep]');
      if(sb){ var inp=document.getElementById('crm-eqtd'); var v=(parseInt(inp.value)||0)+parseInt(sb.getAttribute('data-estep')); if(v<0)v=0; inp.value=v; return; }
      if(e.target===ov || e.target.hasAttribute('data-crm-cancel')){ ov.remove(); return; }
      if(e.target.hasAttribute('data-crm-save-one')){
        var body={ data:document.getElementById('crm-edata').value, tipo:document.getElementById('crm-etipo').value, quantidade:parseInt(document.getElementById('crm-eqtd').value)||1, observacao:document.getElementById('crm-eobs').value };
        try{ await _authFetch('PATCH','/prospeccao/crm/registros/'+reg.id,body); if(typeof toast==='function') toast('Salvo','success'); ov.remove(); await carregarCrm(); }
        catch(err){ if(typeof toast==='function') toast('Erro ao salvar','error'); }
      }
    });
  }

  async function carregarCrm(){
    var root=document.getElementById('crm-registros-root'); if(!root) return;
    root.innerHTML='<p class="text-sm text-muted">Carregando…</p>';
    try{ window._crmReg=await _authFetch('GET','/prospeccao/crm/registros')||[]; }
    catch(e){ root.innerHTML='<div class="card"><div class="card-body"><p class="text-sm" style="color:var(--danger,#dc2626)">Erro ao carregar o CRM.</p></div></div>'; return; }
    render();
  }
  window.carregarCrm=carregarCrm;

  if(!window._crmBound){
    window._crmBound=true;
    document.addEventListener('click', function(e){
      var pg=document.getElementById('page-crm-registros'); if(!pg||!pg.classList.contains('active')) return;
      var fp=e.target.closest && e.target.closest('[data-crmp]'); if(fp){ _per=fp.getAttribute('data-crmp'); render(); return; }
      if(e.target.closest && e.target.closest('[data-crm-novo]')){ abrirModalNovo(); return; }
      var ed=e.target.closest && e.target.closest('[data-crm-edit]'); if(ed){ var r=(window._crmReg||[]).find(function(x){return x.id===ed.getAttribute('data-crm-edit');}); if(r) abrirModalEdit(r); return; }
      var dl=e.target.closest && e.target.closest('[data-crm-del]'); if(dl){ var id=dl.getAttribute('data-crm-del'); if(confirm('Excluir este registro?')){ _authFetch('DELETE','/prospeccao/crm/registros/'+id).then(function(){ if(typeof toast==='function')toast('Excluído','success'); carregarCrm(); }).catch(function(){ if(typeof toast==='function')toast('Erro ao excluir','error'); }); } return; }
    });
  }
})();

/* ===== PROSPECÇÃO: Dashboard ===== */
(function(){
  var main=document.querySelector('.app-main'); if(!main) return;
  if(!document.getElementById('page-prosp-dash')){
    var p=document.createElement('div'); p.id='page-prosp-dash'; p.className='page';
    p.innerHTML='<div class="app-header"><h2>📊 Dashboard</h2></div><div class="page-content"><div id="prosp-dash-root"></div></div>';
    main.appendChild(p);
  }
  var CSSID='css-prosp-dash'; var old=document.getElementById(CSSID); if(old) old.remove();
  var st=document.createElement('style'); st.id=CSSID;
  st.textContent=[
    '#page-prosp-dash .page-content{max-width:none;margin:0;padding:12px 16px}',
    '.pd-sec{font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--text-muted,#6b7280);margin:20px 0 8px}',
    '.pd-ecrow{display:flex;gap:14px;flex-wrap:wrap;align-items:flex-start}',
    '.pd-col{display:flex;flex-direction:column;gap:8px;width:150px}',
    '.pd-col-h{font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.03em;color:var(--text,#111);margin-bottom:2px}',
    '.pd-t{background:var(--surface,#fff);border:1px solid var(--border,#e5e7eb);border-radius:10px;padding:9px 12px}',
    '.pd-t-l{font-size:11px;font-weight:600;color:var(--text-muted,#6b7280)}',
    '.pd-t-v{display:flex;align-items:baseline;gap:6px;margin-top:3px}',
    '.pd-t-n{font-size:23px;font-weight:800;line-height:1}',
    '.pd-t-x{font-size:12px;font-weight:700}',
    '.pd-pie2{text-align:center}',
    '.pd-pie2 .t{font-size:12px;font-weight:700;margin-bottom:4px}',
    '.pd-leg2{border-collapse:collapse;font-size:13px}',
    '.pd-leg2 th,.pd-leg2 td{padding:5px 14px;text-align:center;white-space:nowrap}',
    '.pd-leg2 td:first-child,.pd-leg2 th:first-child{text-align:left}',
    '.pd-leg2 thead th{font-size:11px;color:var(--text-muted,#6b7280);text-transform:uppercase}',
    '.pd-leg2 i{width:10px;height:10px;border-radius:2px;display:inline-block;margin-right:6px;vertical-align:middle}',
    '.pd-card{background:var(--surface,#fff);border:1px solid var(--border,#e5e7eb);border-radius:14px;padding:14px 16px}',
    '.pd-wk{display:flex;gap:16px;align-items:flex-end;height:180px;padding-top:8px}',
    '.pd-wk-day{flex:1;display:flex;flex-direction:column;align-items:center}',
    '.pd-wk-bars{display:flex;gap:3px;align-items:flex-end;height:150px}',
    '.pd-wk-bars .b{width:14px;border-radius:3px 3px 0 0;min-height:1px}',
    '.pd-wk-lb{font-size:11px;color:var(--text-muted,#6b7280);margin-top:5px;font-weight:600}',
    '.pd-wk-legs{display:flex;gap:14px;flex-wrap:wrap;margin-top:12px;font-size:12px}',
    '.pd-wk-legs i{width:10px;height:10px;border-radius:2px;display:inline-block;margin-right:5px}'
  ].join('');
  document.head.appendChild(st);

  var TIPOS=[['email','E-mail','#2563eb'],['inmail','In-mail','#7c3aed'],['wt','WhatsApp / Telefone','#16a34a'],['reuniao','Reunião','#f59e0b'],['linkedin','LinkedIn','#0a66c2']];
  function pctv(n,d){ return d>0?Math.round(n/d*100):0; }
  function pieVals(o){ o=o||{}; return {email:o.email||0,inmail:o.inmail||0,wt:(o.whatsapp||0)+(o.telefone||0),reuniao:o.reuniao||0,linkedin:o.linkedin||0}; }
  function somaVals(o){ var v=pieVals(o); return v.email+v.inmail+v.wt+v.reuniao+v.linkedin; }
  function tile2(label,n,extra,color){ return '<div class="pd-t"><div class="pd-t-l">'+label+'</div><div class="pd-t-v"><span class="pd-t-n">'+n+'</span>'+(extra?'<span class="pd-t-x" style="color:'+(color||'#16a34a')+'">'+extra+'</span>':'')+'</div></div>'; }
  function col(title,inner){ return '<div class="pd-col"><div class="pd-col-h">'+title+'</div>'+inner+'</div>'; }

  function svgPie(o){
    var v=pieVals(o), tot=somaVals(o);
    if(tot===0) return '<svg viewBox="0 0 100 100" width="150" height="150"><circle cx="50" cy="50" r="48" fill="var(--surface-2,#eef1f5)"/><text x="50" y="52" text-anchor="middle" font-size="7" fill="#9ca3af">sem dados</text></svg>';
    var acc=0, out='';
    TIPOS.forEach(function(t){
      var val=v[t[0]]; if(val<=0) return;
      var a0=acc/tot*2*Math.PI, a1=(acc+val)/tot*2*Math.PI; acc+=val;
      var large=(a1-a0)>Math.PI?1:0;
      var x0=(50+48*Math.sin(a0)).toFixed(2), y0=(50-48*Math.cos(a0)).toFixed(2);
      var x1=(50+48*Math.sin(a1)).toFixed(2), y1=(50-48*Math.cos(a1)).toFixed(2);
      var mid=(a0+a1)/2, lx=(50+30*Math.sin(mid)).toFixed(2), ly=(50-30*Math.cos(mid)).toFixed(2);
      var pct=Math.round(val/tot*100);
      out+='<path d="M50,50 L'+x0+','+y0+' A48,48 0 '+large+' 1 '+x1+','+y1+' Z" fill="'+t[2]+'"><title>'+t[1]+': '+val+' ('+pct+'%)</title></path>';
      if(pct>=6) out+='<text x="'+lx+'" y="'+ly+'" fill="#fff" font-size="8.5" font-weight="700" text-anchor="middle" dominant-baseline="central" style="pointer-events:none">'+pct+'%</text>';
    });
    return '<svg viewBox="0 0 100 100" width="150" height="150">'+out+'</svg>';
  }
  function legenda(mo,se){
    var vm=pieVals(mo), vs=pieVals(se), tm=somaVals(mo), ts=somaVals(se);
    var rows=TIPOS.map(function(t){ return '<tr><td><i style="background:'+t[2]+'"></i>'+t[1]+'</td><td>'+pctv(vm[t[0]],tm)+'%</td><td>'+pctv(vs[t[0]],ts)+'%</td></tr>'; }).join('');
    return '<table class="pd-leg2"><thead><tr><th>Interação</th><th>Mês</th><th>Semana</th></tr></thead><tbody>'+rows+'</tbody></table>';
  }
  function weekBars(ps){
    ps=ps||[];
    if(!ps.length) return '<p class="text-sm text-muted">Sem interações registradas no mês.</p>';
    var WK=['#2563eb','#16a34a','#f59e0b','#dc2626','#7c3aed','#0891b2'];
    var DIAS=['Seg','Ter','Qua','Qui','Sex'];
    var max=1; ps.forEach(function(s){ (s.dias||[]).forEach(function(x){ if(x>max)max=x; }); });
    var groups=DIAS.map(function(dn,di){
      var bars=ps.map(function(s,si){ var val=(s.dias&&s.dias[di])||0; var h=Math.round(val/max*150); return '<div class="b" title="Sem. '+s.label+' — '+dn+': '+val+'" style="height:'+h+'px;background:'+WK[si%WK.length]+'"></div>'; }).join('');
      return '<div class="pd-wk-day"><div class="pd-wk-bars">'+bars+'</div><div class="pd-wk-lb">'+dn+'</div></div>';
    }).join('');
    var leg=ps.map(function(s,si){ return '<span><i style="background:'+WK[si%WK.length]+'"></i>Sem. '+s.label+'</span>'; }).join('');
    return '<div class="pd-wk">'+groups+'</div><div class="pd-wk-legs">'+leg+'</div>';
  }

  async function carregarProspDash(){
    var root=document.getElementById('prosp-dash-root'); if(!root) return;
    root.innerHTML='<p class="text-sm text-muted">Carregando…</p>';
    var d;
    try{ d=await _authFetch('GET','/prospeccao/dashboard'); }
    catch(e){ root.innerHTML='<div class="pd-card"><p class="text-sm" style="color:var(--danger,#dc2626)">Erro ao carregar o dashboard.</p></div>'; return; }
    var A=d.atividades||{}, ea=d.empresas_com_atividade||{}, vm=pieVals(A.mes), cb=d.cards_por_board||{};
    var et=d.empresas_total||0, ct=d.contatos_total||0;
    var novasEmp=d.empresas_novas_mes||0, novosCont=d.contatos_novos_mes||0;
    var totMes=somaVals(A.mes);
    var prospSum=(cb.social||0)+(cb.direto||0)+(cb.reativacao||0);
    root.innerHTML=
      '<div class="pd-sec" style="margin-top:4px">Empresas e Contatos</div>'
      +'<div class="pd-ecrow">'
        +col('Empresas',
            tile2('Total', et, novasEmp?('+'+novasEmp):'', '#16a34a')
            +tile2('Em prospecção', d.empresas_em_prospeccao||0, pctv(d.empresas_em_prospeccao||0,et)+'%', '#6b7280')
            +tile2('C/ atividade', ea.mes||0, '', ''))
        +col('Contatos',
            tile2('Total', ct, novosCont?('+'+novosCont):'', '#16a34a')
            +tile2('Com telefone', d.contatos_com_telefone||0, '', '')
            +tile2('Com e-mail', d.contatos_com_email||0, '', ''))
        +col('Prospecção',
            tile2('Sales Navigator', vm.inmail, '', '')
            +tile2('WhatsApp', vm.wt, '', '#16a34a')
            +tile2('LinkedIn', vm.linkedin, '', '#0a66c2'))
        +col('Listas e Kanban',
            tile2('Lista Total', d.lista_total||0, '', '')
            +tile2('Lista Ativa', d.lista_ativa||0, '', '#16a34a')
            +tile2('Kanban', d.cards_ativos||0, '', '#7c3aed'))
        +col('Prospecção',
            tile2('Social Selling', cb.social||0, '', '')
            +tile2('Contato Direto', cb.direto||0, '', '')
            +tile2('Reativação', cb.reativacao||0, '', ''))
        +col('Boards',
            tile2('Mapeamento', cb.mapeamento||0, '', '')
            +tile2('Prospecção', prospSum, '', '#2563eb')
            +tile2('Lead', cb.lead||0, '', '#7c3aed'))
      +'</div>'
      +'<div class="pd-sec">Interações por dia da semana — '+(d.mes_label||'mês atual')+'</div>'
      +'<div class="pd-card">'+weekBars(d.por_semana)+'</div>'
      +'<div class="pd-sec">Distribuição das interações</div>'
      +'<div class="pd-card"><div style="display:flex;gap:32px;flex-wrap:wrap;align-items:center">'
        +'<div style="overflow-x:auto">'+legenda(A.mes,A.semana)+'</div>'
        +'<div class="pd-pie2"><div class="t">Mês ('+totMes+')</div>'+svgPie(A.mes)+'</div>'
      +'</div></div>';
  }
  window.carregarProspDash=carregarProspDash;
})();

/* ===== FINANCEIRO: Forcast (forecast de vendas) ===== */
(function(){
  var main=document.querySelector('.app-main'); if(!main) return;
  if(!document.getElementById('page-forecast')){
    var p=document.createElement('div'); p.id='page-forecast'; p.className='page';
    p.innerHTML='<div class="app-header"><h2>📈 Forcast</h2></div><div class="page-content"><div id="forecast-root"></div></div>';
    main.appendChild(p);
  }
  var CSSID='css-forecast'; var old=document.getElementById(CSSID); if(old) old.remove();
  var st=document.createElement('style'); st.id=CSSID;
  st.textContent='#page-forecast .page-content{max-width:none;margin:0;padding:12px 16px}'
    +'#forecast-modal table.tabela-contatos td{padding:6px 8px}'
    +'#forecast-modal table.tabela-contatos input,#forecast-modal table.tabela-contatos select{padding:5px 6px;border:1px solid var(--border,#ccc);border-radius:6px;font-size:13px}';
  document.head.appendChild(st);

  var FC_PROD=['Hardware','Serviços Profissionais','Licença'];
  var FC_CLASSES={'Hardware':['Agenciamento','Revenda','Aluguel'],'Serviços Profissionais':['Serviço de engenharia','Desenvolvimento','Terceiros'],'Licença':['H1','Terceiro']};
  var FC_STATUS=['Forcast','Vendido','Arquivado'];
  function esc(s){ return (s==null?'':String(s)).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); }
  function money(n){ return 'R$ '+(Number(n)||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}); }
  function fmtBR(iso){ if(!iso) return '—'; var a=(''+iso).split('-'); if(a.length<3) return iso; return a[2]+'/'+a[1]+'/'+a[0]; }
  function fcCalc(it){
    var q=parseFloat(it.quantidade)||0, cu=parseFloat(it.valor_custo)||0, ve=parseFloat(it.valor_venda)||0;
    var mensal=(it.tipo_linha==='Mensal'); var m=mensal?(parseInt(it.meses)||1):1;
    return {totalProjeto:q*ve*m, totalMensal:mensal?(q*ve):0, margem:ve>0?((ve-cu)/ve*100):0, mensal:mensal};
  }
  function fcTotais(itens){ var tm=0,tp=0; (itens||[]).forEach(function(it){ var c=fcCalc(it); tm+=c.totalMensal; tp+=c.totalProjeto; }); return {mensal:tm,total:tp}; }

  async function carregarForecast(){
    var root=document.getElementById('forecast-root'); if(!root) return;
    root.innerHTML='<div class="empty-state"><div class="spinner" style="margin:0 auto"></div></div>';
    try{ window._forecast=await _authFetch('GET','/fin/forecast')||[]; }
    catch(e){ root.innerHTML='<p style="color:var(--danger)">Erro: '+esc(e.message)+'</p>'; return; }
    renderForecastList();
  }
  window.carregarForecast=carregarForecast;

  function renderForecastList(){
    var root=document.getElementById('forecast-root'); if(!root) return;
    var lista=window._forecast||[];
    var anos=Array.from(new Set(lista.map(function(f){return (f.previsao_fechamento||'').slice(0,4);}).filter(Boolean))).sort().reverse();
    var ano=window._fcAno||'';
    var filt=lista.filter(function(f){ return !ano || (f.previsao_fechamento||'').slice(0,4)===ano; });
    var anoBtns='<button class="btn btn-sm '+(!ano?'btn-primary':'btn-secondary')+'" data-fcano="">Todos</button>'+anos.map(function(a){ return '<button class="btn btn-sm '+(ano===a?'btn-primary':'btn-secondary')+'" data-fcano="'+a+'">'+a+'</button>'; }).join('');
    var toolbar='<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:12px;flex-wrap:wrap"><div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap"><span class="text-sm text-muted">Ano (previsão):</span>'+anoBtns+'</div><button class="btn btn-primary btn-sm" data-fcact="nova">＋ Novo forecast</button></div>';
    var rows=filt.map(function(f){
      var t=fcTotais(f.itens);
      var col=f.status==='Vendido'?'#16a34a':(f.status==='Arquivado'?'#9ca3af':'#2563eb');
      return '<tr'+(f.status==='Arquivado'?' style="opacity:.55"':'')+'>'
        +'<td>'+esc(f.id_lead||'—')+'</td>'
        +'<td><a href="#" data-fcact="ver" data-id="'+f.id+'" style="color:var(--primary);font-weight:600;text-decoration:none">'+esc(f.cliente||'(sem cliente)')+'</a></td>'
        +'<td><span style="background:'+col+'22;color:'+col+';padding:2px 8px;border-radius:10px;font-size:12px;font-weight:600">'+esc(f.status||'Forcast')+'</span></td>'
        +'<td>'+fmtBR(f.previsao_fechamento)+'</td>'
        +'<td style="text-align:center">'+(f.pct_fechamento||0)+'%</td>'
        +'<td>'+esc(f.tipo||'—')+'</td>'
        +'<td style="text-align:right">'+money(t.mensal)+'</td>'
        +'<td style="text-align:right;font-weight:600">'+money(t.total)+'</td>'
        +'<td style="text-align:center;white-space:nowrap"><button class="fel-ic" data-fcact="editar" data-id="'+f.id+'" title="Editar">✏️</button><button class="fel-ic" data-fcact="arquivar" data-id="'+f.id+'" title="Arquivar">📦</button><button class="fel-ic" data-fcact="del" data-id="'+f.id+'" title="Excluir" style="color:var(--danger)">🗑️</button></td>'
      +'</tr>';
    }).join('');
    var head='<thead><tr><th>ID Lead</th><th>Cliente</th><th>Status</th><th>Prev. Fechamento</th><th>% Fech.</th><th>Tipo</th><th style="text-align:right">Valor Mensal</th><th style="text-align:right">Valor Total</th><th></th></tr></thead>';
    root.innerHTML=toolbar+'<table class="tabela-contatos">'+head+'<tbody>'+(rows||'<tr><td colspan="9" style="text-align:center;padding:20px;color:var(--text-muted)">Nenhum forecast</td></tr>')+'</tbody></table>';
  }

  function abrirForecastModal(fc){
    var state={ id:(fc&&fc.id)||null, data:JSON.parse(JSON.stringify(Object.assign({itens:[]}, fc||{}))) };
    if(!state.data.itens || !state.data.itens.length){
      state.data.itens=FC_PROD.map(function(pr){ return {produto:pr,classe:'',tipo_linha:'Projeto',quantidade:1,valor_custo:0,valor_venda:0,meses:1}; });
    }
    if(!state.data.status) state.data.status='Forcast';
    var ov=document.getElementById('forecast-modal'); if(ov) ov.remove();
    ov=document.createElement('div'); ov.id='forecast-modal';
    ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;display:flex;align-items:flex-start;justify-content:center;padding:16px;overflow:auto';
    document.body.appendChild(ov);
    function fechar(){ ov.remove(); carregarForecast(); }
    function val(id){ var el=document.getElementById(id); return el?el.value:''; }
    function classeOpts(prod,v){ var arr=FC_CLASSES[prod]||[]; return '<option value="">—</option>'+arr.map(function(c){ return '<option'+(v===c?' selected':'')+'>'+esc(c)+'</option>'; }).join(''); }
    function itemRow(it,idx){
      var c=fcCalc(it), mensal=(it.tipo_linha==='Mensal'), aluguel=(it.produto==='Hardware' && it.classe==='Aluguel');
      var prodOpts=FC_PROD.map(function(pr){ return '<option'+(it.produto===pr?' selected':'')+'>'+esc(pr)+'</option>'; }).join('');
      return '<tr class="fc-item" data-idx="'+idx+'">'
        +'<td><select class="fc-prod">'+prodOpts+'</select></td>'
        +'<td><select class="fc-classe">'+classeOpts(it.produto,it.classe)+'</select></td>'
        +'<td><select class="fc-tipo"><option'+(!mensal?' selected':'')+'>Projeto</option><option'+(mensal?' selected':'')+'>Mensal</option></select></td>'
        +'<td>'+(mensal?'<input class="fc-meses" type="number" min="1" value="'+(it.meses||1)+'" style="width:46px">':'<span class="text-muted">—</span>')+'</td>'
        +'<td><input class="fc-qtd" type="number" min="0" step="1" value="'+(it.quantidade!=null?it.quantidade:1)+'" style="width:48px"></td>'
        +'<td><input class="fc-custo" type="number" min="0" step="0.01" value="'+(aluguel?((parseFloat(it.valor_venda)||0)*0.8).toFixed(2):(it.valor_custo!=null?it.valor_custo:0))+'"'+(aluguel?' disabled style="width:96px;background:#f3f4f6;color:var(--text-muted)"':' style="width:96px"')+'></td>'
        +'<td><input class="fc-venda" type="number" min="0" step="0.01" value="'+(it.valor_venda!=null?it.valor_venda:0)+'" style="width:96px"></td>'
        +'<td class="fc-margem" style="text-align:right">'+(aluguel?'':c.margem.toFixed(1)+'%')+'</td>'
        +'<td class="fc-tmensal" style="text-align:right;min-width:130px">'+money(c.totalMensal)+'</td>'
        +'<td class="fc-tprojeto" style="text-align:right;font-weight:600;min-width:130px">'+money(c.totalProjeto)+'</td>'
        +'<td style="text-align:center"><button class="fc-del" title="Remover" style="border:none;background:none;cursor:pointer;color:var(--danger)">🗑️</button></td>'
      +'</tr>';
    }
    function renderItens(){ var c=document.getElementById('fc-itens'); if(c) c.innerHTML=(state.data.itens||[]).map(function(it,idx){return itemRow(it,idx);}).join(''); }
    function syncItens(){
      var arr=[];
      ov.querySelectorAll('.fc-item').forEach(function(el){
        function g(sel){ var x=el.querySelector(sel); return x?x.value:null; }
        var tipo=g('.fc-tipo')||'Projeto';
        var prod=g('.fc-prod'), classe=g('.fc-classe'), venda=parseFloat(g('.fc-venda'))||0, aluguel=(prod==='Hardware'&&classe==='Aluguel');
        arr.push({ produto:prod||null, classe:classe||null, tipo_linha:tipo,
          quantidade:parseFloat(g('.fc-qtd'))||0, valor_custo:aluguel?(venda*0.8):(parseFloat(g('.fc-custo'))||0), valor_venda:venda,
          meses:(tipo==='Mensal')?(parseInt((el.querySelector('.fc-meses')||{}).value)||1):1 });
      });
      state.data.itens=arr;
    }
    function recompute(){
      var tm=0,tp=0;
      ov.querySelectorAll('.fc-item').forEach(function(el){
        var tipo=(el.querySelector('.fc-tipo')||{}).value||'Projeto';
        var prod=(el.querySelector('.fc-prod')||{}).value||'', classe=(el.querySelector('.fc-classe')||{}).value||'', aluguel=(prod==='Hardware'&&classe==='Aluguel');
        var q=parseFloat((el.querySelector('.fc-qtd')||{}).value)||0;
        var ve=parseFloat((el.querySelector('.fc-venda')||{}).value)||0;
        var custoEl=el.querySelector('.fc-custo'), cu;
        if(aluguel){ cu=ve*0.8; if(custoEl){ custoEl.value=cu.toFixed(2); custoEl.disabled=true; custoEl.style.background='#f3f4f6'; custoEl.style.color='var(--text-muted)'; } }
        else { if(custoEl){ custoEl.disabled=false; custoEl.style.background=''; custoEl.style.color=''; } cu=parseFloat((custoEl||{}).value)||0; }
        var m=(tipo==='Mensal')?(parseInt((el.querySelector('.fc-meses')||{}).value)||1):1;
        var tpj=q*ve*m, tmn=(tipo==='Mensal')?q*ve:0, mg=ve>0?((ve-cu)/ve*100):0;
        el.querySelector('.fc-margem').textContent=aluguel?'':(mg.toFixed(1)+'%');
        el.querySelector('.fc-tmensal').textContent=money(tmn);
        el.querySelector('.fc-tprojeto').textContent=money(tpj);
        tm+=tmn; tp+=tpj;
      });
      var fm=document.getElementById('fc-foot-mensal'), ft=document.getElementById('fc-foot-total');
      if(fm) fm.textContent=money(tm); if(ft) ft.textContent=money(tp);
    }
    async function salvar(){
      syncItens();
      var payload={ id_lead:val('fh-idlead')||null, cliente:val('fh-cliente')||null, status:val('fh-status')||'Forcast',
        previsao_fechamento:val('fh-prev')||null, pct_fechamento:parseInt(val('fh-pct'))||0, tipo:val('fh-tipo')||null, itens:state.data.itens };
      try{
        if(state.id){ state.data=await _authFetch('PATCH','/fin/forecast/'+state.id,payload); }
        else { var r=await _authFetch('POST','/fin/forecast',payload); state.data=r; state.id=r.id; }
        toast('Forecast salvo','success'); render();
      }catch(err){ toast('Erro: '+err.message,'error'); }
    }
    function render(){
      var d=state.data;
      var statusOpts=FC_STATUS.map(function(x){ return '<option'+(d.status===x?' selected':'')+'>'+esc(x)+'</option>'; }).join('');
      var tipoOpts=['Projeto','Hardware'].map(function(t){ return '<option'+(d.tipo===t?' selected':'')+'>'+esc(t)+'</option>'; }).join('');
      ov.innerHTML='<div style="background:#fff;border-radius:12px;max-width:1250px;width:100%;max-height:92vh;display:flex;flex-direction:column">'
        +'<div style="flex-shrink:0;background:#fff;border-bottom:1px solid var(--border);border-radius:12px 12px 0 0;padding:12px 18px;display:flex;justify-content:space-between;align-items:center;gap:10px"><h3 style="margin:0">'+(state.id?'Editar forecast':'Novo forecast')+'</h3><div style="display:flex;gap:8px"><button class="btn btn-sm btn-secondary" data-fx="close">Fechar</button><button class="btn btn-sm btn-primary" data-fx="salvar">💾 Salvar</button></div></div>'
        +'<div style="overflow:auto;padding:18px;flex:1;min-height:0">'
        +'<div style="display:flex;gap:10px;flex-wrap:wrap"><div class="form-group" style="flex:1;min-width:110px"><label class="form-label">ID Lead</label><input id="fh-idlead" class="form-control" value="'+esc(d.id_lead||'')+'"></div><div class="form-group" style="flex:2;min-width:180px"><label class="form-label">Cliente</label><input id="fh-cliente" class="form-control" value="'+esc(d.cliente||'')+'"></div><div class="form-group" style="flex:1;min-width:130px"><label class="form-label">Status</label><select id="fh-status" class="form-control">'+statusOpts+'</select></div></div>'
        +'<div style="display:flex;gap:10px;flex-wrap:wrap"><div class="form-group" style="flex:1;min-width:160px"><label class="form-label">Previsão de Fechamento</label><input id="fh-prev" type="date" class="form-control" value="'+(d.previsao_fechamento||'')+'"></div><div class="form-group" style="flex:1;min-width:110px"><label class="form-label">% Fechamento</label><input id="fh-pct" type="number" min="0" max="100" class="form-control" value="'+(d.pct_fechamento!=null?d.pct_fechamento:'')+'"></div><div class="form-group" style="flex:1;min-width:130px"><label class="form-label">Tipo</label><select id="fh-tipo" class="form-control"><option value="">—</option>'+tipoOpts+'</select></div></div>'
        +'<hr style="margin:12px 0;border:none;border-top:1px solid var(--border)">'
        +'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><b>Produtos</b><button class="btn btn-sm btn-secondary" data-fx="add">＋ Adicionar linha</button></div>'
        +'<div style="overflow-x:auto"><table class="tabela-contatos" style="min-width:860px"><thead><tr><th>Produto</th><th>Classe</th><th>Tipo</th><th>Meses</th><th>Qtd</th><th>Custo</th><th>Venda</th><th style="text-align:right">Margem</th><th style="text-align:right;min-width:130px">Total Mensal</th><th style="text-align:right;min-width:130px">Total Projeto</th><th></th></tr></thead><tbody id="fc-itens"></tbody><tfoot><tr><td colspan="8" style="text-align:right;font-weight:700">Totais:</td><td id="fc-foot-mensal" style="text-align:right;font-weight:700">R$ 0,00</td><td id="fc-foot-total" style="text-align:right;font-weight:700">R$ 0,00</td><td></td></tr></tfoot></table></div>'
        +'</div></div>';
      renderItens(); recompute();
    }
    ov.addEventListener('input', function(e){ if(e.target.closest('.fc-item')) recompute(); });
    ov.addEventListener('change', function(e){
      var row=e.target.closest('.fc-item');
      if(row && (e.target.classList.contains('fc-prod')||e.target.classList.contains('fc-tipo'))){ syncItens(); renderItens(); recompute(); return; }
      if(row){ recompute(); }
    });
    ov.addEventListener('click', async function(e){
      if(e.target===ov){ fechar(); return; }
      var del=e.target.closest('.fc-del'); if(del){ syncItens(); var idx=parseInt(del.closest('.fc-item').getAttribute('data-idx')); state.data.itens.splice(idx,1); if(!state.data.itens.length) state.data.itens=[{produto:'Hardware',classe:'',tipo_linha:'Projeto',quantidade:1,valor_custo:0,valor_venda:0,meses:1}]; renderItens(); recompute(); return; }
      var x=e.target.closest('[data-fx]'); if(!x) return; var act=x.getAttribute('data-fx');
      if(act==='close') fechar();
      else if(act==='add'){ syncItens(); state.data.itens.push({produto:'Hardware',classe:'',tipo_linha:'Projeto',quantidade:1,valor_custo:0,valor_venda:0,meses:1}); renderItens(); recompute(); }
      else if(act==='salvar'){ await salvar(); }
    });
    render();
  }
  window.abrirForecastModal=abrirForecastModal;

  if(!window._forecastBound){
    window._forecastBound=true;
    document.addEventListener('click', function(e){
      var an=e.target.closest && e.target.closest('#forecast-root [data-fcano]'); if(an){ window._fcAno=an.getAttribute('data-fcano'); renderForecastList(); return; }
      var b=e.target.closest && e.target.closest('#forecast-root [data-fcact]'); if(!b) return; e.preventDefault();
      var act=b.getAttribute('data-fcact'), id=b.getAttribute('data-id');
      if(act==='nova'){ abrirForecastModal(null); return; }
      var f=(window._forecast||[]).filter(function(x){return x.id===id;})[0];
      if(act==='ver'||act==='editar'){ if(f) abrirForecastModal(f); return; }
      if(act==='arquivar'){ if(f && confirm('Arquivar este forecast?')){ _authFetch('PATCH','/fin/forecast/'+id,{status:'Arquivado'}).then(carregarForecast).catch(function(err){toast(err.message,'error');}); } return; }
      if(act==='del'){ if(confirm('Excluir este forecast?')){ _authFetch('DELETE','/fin/forecast/'+id).then(carregarForecast).catch(function(err){toast(err.message,'error');}); } return; }
    });
  }
})();

/* ===== COMERCIAL: Propostas (Fatia 1b/A) ===== */
(function(){
  var main=document.querySelector('.app-main'); if(!main) return;
  [['propostas','📄 Propostas','propostas-root'],['prop-modelos','🧩 Modelos de Proposta','prop-modelos-root'],['prop-produtos','📦 Produtos (Proposta)','prop-produtos-root'],['prop-config','⚙️ Configurações (Comercial)','prop-config-root']].forEach(function(x){
    if(!document.getElementById('page-'+x[0])){
      var pg=document.createElement('div'); pg.id='page-'+x[0]; pg.className='page';
      pg.innerHTML='<div class="app-header"><h2>'+x[1]+'</h2></div><div class="page-content"><div id="'+x[2]+'"></div></div>';
      main.appendChild(pg);
    }
  });
  var CSSID='css-proposta'; var old=document.getElementById(CSSID); if(old) old.remove();
  var st=document.createElement('style'); st.id=CSSID;
  st.textContent='#page-propostas .page-content,#page-prop-modelos .page-content,#page-prop-produtos .page-content,#page-prop-config .page-content{max-width:none;margin:0;padding:12px 16px}'
    +'.prop-ov{position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;display:flex;align-items:flex-start;justify-content:center;padding:16px;overflow:auto}'
    +'.prop-mod{background:#fff;border-radius:12px;max-width:640px;width:100%;max-height:92vh;display:flex;flex-direction:column}'
    +'.prop-mod .bd{overflow:auto;padding:18px;flex:1;min-height:0}'
    +'.prop-mod .hd{flex-shrink:0;border-bottom:1px solid var(--border);padding:12px 18px;display:flex;justify-content:space-between;align-items:center;gap:10px}'
    +'.prop-card{background:var(--surface,#fff);border:1px solid var(--border,#e5e7eb);border-radius:12px;padding:14px 16px;margin-bottom:12px}'
    +'.prop-blk{display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid var(--border,#eee);font-size:14px}'
    +'.prop-chip{display:inline-flex;align-items:center;gap:6px;background:var(--surface-2,#eef1f5);border-radius:14px;padding:3px 10px;margin:3px;font-size:13px}'
    +'.prop-chip button{border:none;background:none;color:var(--danger);cursor:pointer;font-weight:700;font-size:15px;line-height:1}';
  document.head.appendChild(st);

  function esc(s){ return (s==null?'':String(s)).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); }
  function ovOpen(html){ var ov=document.createElement('div'); ov.className='prop-ov'; ov.innerHTML='<div class="prop-mod">'+html+'</div>'; document.body.appendChild(ov); return ov; }
  async function loadCfg(){
    try{ var g=await _authFetch('GET','/proposta/config/prop_grupos'); window._propGrupos=(g&&g.valor)||[]; }catch(e){ window._propGrupos=[]; }
    try{ var c=await _authFetch('GET','/proposta/config/prop_colunas'); window._propColunas=(c&&c.valor)||[]; }catch(e){ window._propColunas=[]; }
  }

  /* ---- PRODUTOS ---- */
  async function carregarPropProdutos(){
    var root=document.getElementById('prop-produtos-root'); if(!root) return;
    root.innerHTML='<div class="empty-state"><div class="spinner" style="margin:0 auto"></div></div>';
    await loadCfg();
    try{ window._propProd=await _authFetch('GET','/proposta/produtos')||[]; }catch(e){ root.innerHTML='<p style="color:var(--danger)">Erro: '+esc(e.message)+'</p>'; return; }
    var cols=window._propColunas||[];
    var extraTh=cols.map(function(c){ return '<th>'+esc(c.label)+'</th>'; }).join('');
    var rows=(window._propProd||[]).map(function(p){
      var ex=cols.map(function(c){ return '<td>'+esc((p.campos_extras||{})[c.chave]||'')+'</td>'; }).join('');
      return '<tr><td>'+esc(p.codigo||'—')+'</td><td><a href="#" data-ppact="editar" data-id="'+p.id+'" style="color:var(--primary);font-weight:600;text-decoration:none">'+esc(p.descricao||'(sem descrição)')+'</a></td><td>'+esc(p.ncm||'—')+'</td><td>'+esc(p.grupo||'—')+'</td>'+ex+'<td style="text-align:center;white-space:nowrap"><button class="fel-ic" data-ppact="editar" data-id="'+p.id+'" title="Editar">✏️</button><button class="fel-ic" data-ppact="del" data-id="'+p.id+'" title="Excluir" style="color:var(--danger)">🗑️</button></td></tr>';
    }).join('');
    root.innerHTML='<div style="display:flex;justify-content:flex-end;gap:8px;margin-bottom:12px"><button class="btn btn-secondary btn-sm" data-ppact="exportar">⬇ Exportar</button><label class="btn btn-secondary btn-sm" style="cursor:pointer">⬆ Importar<input type="file" id="pp-import" accept=".xlsx" style="display:none"></label><button class="btn btn-primary btn-sm" data-ppact="novo">＋ Novo produto</button></div>'
      +'<table class="tabela-contatos"><thead><tr><th>Código</th><th>Descrição</th><th>NCM</th><th>Grupo</th>'+extraTh+'<th></th></tr></thead><tbody>'+(rows||'<tr><td colspan="'+(5+cols.length)+'" style="text-align:center;padding:20px;color:var(--text-muted)">Nenhum produto</td></tr>')+'</tbody></table>';
  }
  window.carregarPropProdutos=carregarPropProdutos;
  function abrirProdModal(prod){
    prod=prod||{};
    var grupos=window._propGrupos||[], cols=window._propColunas||[];
    var gOpts='<option value="">— grupo —</option>'+grupos.map(function(g){ return '<option'+(prod.grupo===g?' selected':'')+'>'+esc(g)+'</option>'; }).join('');
    var extraHtml=cols.map(function(c){ var v=(prod.campos_extras||{})[c.chave]||''; return '<div class="form-group"><label class="form-label">'+esc(c.label)+'</label><input class="form-control pp-extra" data-chave="'+esc(c.chave)+'" value="'+esc(v)+'"></div>'; }).join('');
    var ov=ovOpen('<div class="hd"><h3 style="margin:0">'+(prod.id?'Editar produto':'Novo produto')+'</h3><div style="display:flex;gap:8px"><button class="btn btn-sm btn-secondary" data-px="close">Fechar</button><button class="btn btn-sm btn-primary" data-px="salvar">💾 Salvar</button></div></div>'
      +'<div class="bd">'
      +'<div style="display:flex;gap:10px;flex-wrap:wrap"><div class="form-group" style="flex:1;min-width:120px"><label class="form-label">Código</label><input id="pp-codigo" class="form-control" value="'+esc(prod.codigo||'')+'"></div><div class="form-group" style="flex:0 0 140px"><label class="form-label">NCM</label><input id="pp-ncm" class="form-control" value="'+esc(prod.ncm||'')+'"></div></div>'
      +'<div class="form-group"><label class="form-label">Descrição</label><input id="pp-desc" class="form-control" value="'+esc(prod.descricao||'')+'"></div>'
      +'<div class="form-group"><label class="form-label">Grupo</label><select id="pp-grupo" class="form-control">'+gOpts+'</select></div>'
      +extraHtml
      +'</div>');
    ov.addEventListener('click', async function(e){
      if(e.target===ov){ ov.remove(); return; }
      var x=e.target.closest('[data-px]'); if(!x) return; var act=x.getAttribute('data-px');
      if(act==='close'){ ov.remove(); return; }
      if(act==='salvar'){
        var extras={}; ov.querySelectorAll('.pp-extra').forEach(function(el){ extras[el.getAttribute('data-chave')]=el.value; });
        var body={ codigo:document.getElementById('pp-codigo').value, descricao:document.getElementById('pp-desc').value, ncm:document.getElementById('pp-ncm').value, grupo:document.getElementById('pp-grupo').value, campos_extras:extras };
        try{ if(prod.id) await _authFetch('PATCH','/proposta/produtos/'+prod.id,body); else await _authFetch('POST','/proposta/produtos',body); toast('Produto salvo','success'); ov.remove(); carregarPropProdutos(); }catch(err){ toast('Erro: '+err.message,'error'); }
      }
    });
  }
  async function exportarProdutos(){
    try{ var r=await fetch('/api/proposta/produtos/exportar',{headers:{'Authorization':'Bearer '+getToken()}}); if(!r.ok){ toast('Erro ao exportar','error'); return; } var blob=await r.blob(); var url=URL.createObjectURL(blob); var a=document.createElement('a'); a.href=url; a.download='produtos.xlsx'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url); }catch(e){ toast('Erro: '+e.message,'error'); }
  }

  /* ---- CONFIGURAÇÕES ---- */
  async function carregarPropConfig(){
    var root=document.getElementById('prop-config-root'); if(!root) return;
    root.innerHTML='<div class="empty-state"><div class="spinner" style="margin:0 auto"></div></div>';
    await loadCfg();
    try{ window._propBlocos=await _authFetch('GET','/proposta/blocos')||[]; }catch(e){ window._propBlocos=[]; }
    var grupos=window._propGrupos||[], cols=window._propColunas||[], blocos=window._propBlocos||[];
    var gruposHtml=grupos.map(function(g){ return '<span class="prop-chip">'+esc(g)+'<button data-cfgact="del-grupo" data-v="'+esc(g)+'" title="Remover">×</button></span>'; }).join('')||'<span class="text-sm text-muted">nenhum</span>';
    var colsHtml=cols.map(function(c){ return '<span class="prop-chip">'+esc(c.label)+'<button data-cfgact="del-col" data-v="'+esc(c.chave)+'" title="Remover">×</button></span>'; }).join('')||'<span class="text-sm text-muted">nenhuma</span>';
    var blocosHtml=blocos.map(function(b){
      return '<div class="prop-blk"><div style="flex:1"><b>'+esc(b.titulo||b.chave)+'</b> <span class="text-sm text-muted">· '+esc(b.aplica_se_a||'ambos')+(b.padrao?' · padrão':'')+(b.sugerido?' · sugerido':'')+'</span></div><button class="btn btn-sm btn-secondary" data-cfgact="edit-bloco" data-id="'+b.id+'">Editar</button></div>';
    }).join('')||'<span class="text-sm text-muted">nenhum</span>';
    root.innerHTML=
      '<div class="prop-card"><div style="font-weight:600;margin-bottom:6px">Grupos de Produto</div><div style="margin-bottom:8px">'+gruposHtml+'</div><div style="display:flex;gap:6px"><input id="cfg-grupo-novo" class="form-control" placeholder="Novo grupo" style="flex:1"><button class="btn btn-sm btn-primary" data-cfgact="add-grupo">Adicionar</button></div></div>'
      +'<div class="prop-card"><div style="font-weight:600;margin-bottom:4px">Colunas de Produto</div><div class="text-sm text-muted" style="margin-bottom:6px">Obrigatórias: Código · Descrição · NCM · Grupo. Colunas extras:</div><div style="margin-bottom:8px">'+colsHtml+'</div><div style="display:flex;gap:6px"><input id="cfg-col-novo" class="form-control" placeholder="Nome da coluna extra" style="flex:1"><button class="btn btn-sm btn-primary" data-cfgact="add-col">Adicionar</button></div></div>'
      +'<div class="prop-card"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px"><div style="font-weight:600">Blocos de Modelo</div><button class="btn btn-sm btn-secondary" data-cfgact="add-bloco">＋ Novo bloco</button></div>'+blocosHtml+'</div>';
  }
  window.carregarPropConfig=carregarPropConfig;
  function abrirBlocoModal(b){
    b=b||{aplica_se_a:'ambos',conteudo_padrao:{}};
    var descr=(b.conteudo_padrao&&b.conteudo_padrao.texto)||'';
    var ov=ovOpen('<div class="hd"><h3 style="margin:0">'+(b.id?'Editar bloco':'Novo bloco')+'</h3><div style="display:flex;gap:8px"><button class="btn btn-sm btn-secondary" data-cbx="close">Fechar</button><button class="btn btn-sm btn-primary" data-cbx="salvar">💾 Salvar</button></div></div>'
      +'<div class="bd">'
      +'<div style="display:flex;gap:10px;flex-wrap:wrap"><div class="form-group" style="flex:1;min-width:140px"><label class="form-label">Chave</label><input id="cb-chave" class="form-control" value="'+esc(b.chave||'')+'"'+(b.id?' readonly style="background:#f3f4f6"':'')+'></div><div class="form-group" style="flex:2;min-width:160px"><label class="form-label">Título</label><input id="cb-titulo" class="form-control" value="'+esc(b.titulo||'')+'"></div></div>'
      +'<div style="display:flex;gap:14px;flex-wrap:wrap;align-items:flex-end"><div class="form-group" style="flex:1;min-width:140px"><label class="form-label">Aplica-se a</label><select id="cb-aplica" class="form-control"><option'+(b.aplica_se_a==='ambos'?' selected':'')+'>ambos</option><option'+(b.aplica_se_a==='venda'?' selected':'')+'>venda</option><option'+(b.aplica_se_a==='locacao'?' selected':'')+'>locacao</option></select></div><label style="font-size:14px"><input type="checkbox" id="cb-padrao"'+(b.padrao?' checked':'')+'> padrão</label><label style="font-size:14px"><input type="checkbox" id="cb-sugerido"'+(b.sugerido?' checked':'')+'> sugerido</label></div>'
      +'<div class="form-group"><label class="form-label">Descritivo padrão</label><textarea id="cb-desc" class="form-control" rows="5">'+esc(descr)+'</textarea></div>'
      +'</div>');
    ov.addEventListener('click', async function(e){
      if(e.target===ov){ ov.remove(); return; }
      var x=e.target.closest('[data-cbx]'); if(!x) return; var act=x.getAttribute('data-cbx');
      if(act==='close'){ ov.remove(); return; }
      if(act==='salvar'){
        var body={ chave:document.getElementById('cb-chave').value, titulo:document.getElementById('cb-titulo').value, aplica_se_a:document.getElementById('cb-aplica').value, padrao:document.getElementById('cb-padrao').checked, sugerido:document.getElementById('cb-sugerido').checked, conteudo_padrao:{texto:document.getElementById('cb-desc').value} };
        try{ if(b.id) await _authFetch('PATCH','/proposta/blocos/'+b.id,body); else await _authFetch('POST','/proposta/blocos',body); toast('Bloco salvo','success'); ov.remove(); carregarPropConfig(); }catch(err){ toast('Erro: '+err.message,'error'); }
      }
    });
  }

  /* ---- MODELOS ---- */
  async function carregarPropModelos(){
    var root=document.getElementById('prop-modelos-root'); if(!root) return;
    root.innerHTML='<div class="empty-state"><div class="spinner" style="margin:0 auto"></div></div>';
    try{ window._propTpl=await _authFetch('GET','/proposta/templates')||[]; }catch(e){ root.innerHTML='<p style="color:var(--danger)">Erro: '+esc(e.message)+'</p>'; return; }
    var cards=(window._propTpl||[]).map(function(t){
      var blk=(t.config&&t.config.blocos)||[]; var on=blk.filter(function(b){return b.ligado;}).length;
      return '<div class="prop-card"><div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><div><b>'+esc(t.nome)+'</b> <span class="text-sm text-muted">· '+esc(t.tipo)+' · v'+t.versao+'</span><div class="text-sm text-muted">'+on+'/'+blk.length+' blocos ligados</div></div><div style="display:flex;gap:6px"><button class="btn btn-sm btn-secondary" data-pmact="duplicar" data-id="'+t.id+'">Copiar</button><button class="btn btn-sm btn-primary" data-pmact="config" data-id="'+t.id+'">Configurar</button></div></div></div>';
    }).join('');
    root.innerHTML='<div style="display:flex;justify-content:flex-end;margin-bottom:12px"><button class="btn btn-secondary btn-sm" data-pmact="novo">＋ Novo modelo</button></div>'+(cards||'<p class="text-sm text-muted">Nenhum modelo</p>');
  }
  window.carregarPropModelos=carregarPropModelos;
  function abrirModeloModal(tpl){
    tpl=tpl||{tipo:'venda',nome:'',config:{blocos:[],grupos_categorias:[]}};
    var blk=(tpl.config&&tpl.config.blocos)||[];
    var blkHtml=blk.map(function(b,i){ return '<label class="prop-blk"><input type="checkbox" class="pm-blk" data-i="'+i+'"'+(b.ligado?' checked':'')+'> '+esc(b.label||b.chave)+'</label>'; }).join('')||'<p class="text-sm text-muted">Sem blocos neste modelo.</p>';
    var ov=ovOpen('<div class="hd"><h3 style="margin:0">'+(tpl.id?'Configurar modelo':'Novo modelo')+'</h3><div style="display:flex;gap:8px"><button class="btn btn-sm btn-secondary" data-mx="close">Fechar</button><button class="btn btn-sm btn-primary" data-mx="salvar">💾 Salvar</button></div></div>'
      +'<div class="bd">'
      +'<div style="display:flex;gap:10px;flex-wrap:wrap"><div class="form-group" style="flex:2;min-width:180px"><label class="form-label">Nome (interno)</label><input id="pm-nome" class="form-control" value="'+esc(tpl.nome||'')+'"></div><div class="form-group" style="flex:1;min-width:120px"><label class="form-label">Tipo</label><select id="pm-tipo" class="form-control"><option'+(tpl.tipo==='venda'?' selected':'')+'>venda</option><option'+(tpl.tipo==='locacao'?' selected':'')+'>locacao</option></select></div></div>'
      +'<div class="form-group"><label class="form-label">Nome exibido na proposta</label><input id="pm-nomeex" class="form-control" value="'+esc(tpl.nome_exibicao||'')+'"></div>'
      +'<div style="font-weight:600;margin:10px 0 4px">Blocos do modelo (booleanos)</div>'+blkHtml
      +'</div>');
    ov.addEventListener('click', async function(e){
      if(e.target===ov){ ov.remove(); return; }
      var x=e.target.closest('[data-mx]'); if(!x) return; var act=x.getAttribute('data-mx');
      if(act==='close'){ ov.remove(); return; }
      if(act==='salvar'){
        var cfg=JSON.parse(JSON.stringify(tpl.config||{blocos:[],grupos_categorias:[]})); if(!cfg.blocos) cfg.blocos=[];
        ov.querySelectorAll('.pm-blk').forEach(function(cb){ var i=parseInt(cb.getAttribute('data-i')); if(cfg.blocos[i]) cfg.blocos[i].ligado=cb.checked; });
        var body={ nome:document.getElementById('pm-nome').value, nome_exibicao:document.getElementById('pm-nomeex').value, tipo:document.getElementById('pm-tipo').value, config:cfg };
        try{ if(tpl.id) await _authFetch('PATCH','/proposta/templates/'+tpl.id,body); else await _authFetch('POST','/proposta/templates',body); toast('Modelo salvo','success'); ov.remove(); carregarPropModelos(); }catch(err){ toast('Erro: '+err.message,'error'); }
      }
    });
  }

  /* ---- PROPOSTAS ---- */
  function nomeEmpresa(id){ var m=window._propEmp||{}; return m[id]||'—'; }
  function nomePessoa(id){ var m=window._propPes||{}; return m[id]||'—'; }
  async function carregarPropostas(){
    var root=document.getElementById('propostas-root'); if(!root) return;
    root.innerHTML='<div class="empty-state"><div class="spinner" style="margin:0 auto"></div></div>';
    try{
      var lista=await _authFetch('GET','/proposta/propostas')||[];
      var emps=await _authFetch('GET','/prospeccao/empresas')||[];
      var pes=await _authFetch('GET','/prospeccao/pessoas')||[];
      window._propLista=lista; window._propEmpList=emps; window._propPesList=pes;
      window._propEmp={}; emps.forEach(function(x){ window._propEmp[x.id]=x.nome; });
      window._propPes={}; pes.forEach(function(x){ window._propPes[x.id]=x.nome; });
    }catch(e){ root.innerHTML='<p style="color:var(--danger)">Erro: '+esc(e.message)+'</p>'; return; }
    var rows=(window._propLista||[]).map(function(p){
      var stc=p.status==='aceita'?'#16a34a':(p.status==='enviada'?'#2563eb':(p.status==='expirada'?'#dc2626':'#9ca3af'));
      return '<tr><td><a href="#" data-pract="editar" data-id="'+p.id+'" style="color:var(--primary);font-weight:600;text-decoration:none">'+esc(nomeEmpresa(p.empresa_id))+'</a></td><td>'+esc(nomePessoa(p.pessoa_id))+'</td><td>'+esc(p.tipo)+'</td><td><span style="background:'+stc+'22;color:'+stc+';padding:2px 8px;border-radius:10px;font-size:12px;font-weight:600">'+esc(p.status)+'</span></td><td>'+(p.data||'—')+'</td><td style="text-align:center">'+(p.validade_dias||'—')+'</td><td style="text-align:center"><button class="fel-ic" data-pract="editar" data-id="'+p.id+'" title="Editar">✏️</button><button class="fel-ic" data-pract="del" data-id="'+p.id+'" title="Excluir" style="color:var(--danger)">🗑️</button></td></tr>';
    }).join('');
    root.innerHTML='<div style="display:flex;justify-content:flex-end;margin-bottom:12px"><button class="btn btn-primary btn-sm" data-pract="nova">＋ Nova proposta</button></div>'
      +'<table class="tabela-contatos"><thead><tr><th>Cliente</th><th>Contato</th><th>Tipo</th><th>Status</th><th>Data</th><th>Validade</th><th></th></tr></thead><tbody>'+(rows||'<tr><td colspan="7" style="text-align:center;padding:20px;color:var(--text-muted)">Nenhuma proposta</td></tr>')+'</tbody></table>';
  }
  window.carregarPropostas=carregarPropostas;
  async function abrirPropostaModal(prop){
    if(!window._propTpl){ try{ window._propTpl=await _authFetch('GET','/proposta/templates')||[]; }catch(e){} }
    if(!window._propEmpList){ try{ window._propEmpList=await _authFetch('GET','/prospeccao/empresas')||[]; }catch(e){} }
    if(!window._propPesList){ try{ window._propPesList=await _authFetch('GET','/prospeccao/pessoas')||[]; }catch(e){} }
    prop=prop||{status:'rascunho'};
    var tpls=window._propTpl||[], emps=window._propEmpList||[], pes=window._propPesList||[];
    var tplOpts='<option value="">— escolha —</option>'+tpls.map(function(t){ return '<option value="'+t.id+'"'+(prop.template_id===t.id?' selected':'')+'>'+esc(t.nome)+' ('+t.tipo+')</option>'; }).join('');
    var empOpts='<option value="">— cliente —</option>'+emps.map(function(x){ return '<option value="'+x.id+'"'+(prop.empresa_id===x.id?' selected':'')+'>'+esc(x.nome)+'</option>'; }).join('');
    function pessoaOpts(empId,sel){ return '<option value="">— contato —</option>'+pes.filter(function(x){return !empId||x.empresa_id===empId;}).map(function(x){ return '<option value="'+x.id+'"'+(sel===x.id?' selected':'')+'>'+esc(x.nome)+'</option>'; }).join(''); }
    var ov=ovOpen('<div class="hd"><h3 style="margin:0">'+(prop.id?'Editar proposta':'Nova proposta')+'</h3><div style="display:flex;gap:8px"><button class="btn btn-sm btn-secondary" data-rx="close">Fechar</button><button class="btn btn-sm btn-primary" data-rx="salvar">💾 Salvar</button></div></div>'
      +'<div class="bd">'
      +'<div class="form-group"><label class="form-label">Modelo</label><select id="pr-tpl" class="form-control">'+tplOpts+'</select></div>'
      +'<div style="display:flex;gap:10px;flex-wrap:wrap"><div class="form-group" style="flex:1;min-width:180px"><label class="form-label">Cliente (Prospecção)</label><select id="pr-emp" class="form-control">'+empOpts+'</select></div><div class="form-group" style="flex:1;min-width:180px"><label class="form-label">Contato</label><select id="pr-pes" class="form-control">'+pessoaOpts(prop.empresa_id,prop.pessoa_id)+'</select></div></div>'
      +'<div style="display:flex;gap:10px;flex-wrap:wrap"><div class="form-group" style="flex:1;min-width:140px"><label class="form-label">Data</label><input id="pr-data" type="date" class="form-control" value="'+(prop.data||'')+'"></div><div class="form-group" style="flex:1;min-width:120px"><label class="form-label">Validade (dias)</label><input id="pr-val" type="number" class="form-control" value="'+(prop.validade_dias!=null?prop.validade_dias:'')+'"></div><div class="form-group" style="flex:1;min-width:140px"><label class="form-label">Status</label><select id="pr-status" class="form-control">'+['rascunho','pronta','enviada','aceita','expirada'].map(function(s){return '<option'+(prop.status===s?' selected':'')+'>'+s+'</option>';}).join('')+'</select></div></div>'
      +'<p class="text-sm text-muted">O editor completo (itens, margem, cláusulas) vem na próxima fatia. A proposta vai passar a nascer vinculada a um card do Funil.</p>'
      +'</div>');
    ov.addEventListener('change', function(e){ if(e.target.id==='pr-emp'){ var pe=document.getElementById('pr-pes'); if(pe) pe.innerHTML=pessoaOpts(e.target.value,''); } });
    ov.addEventListener('click', async function(e){
      if(e.target===ov){ ov.remove(); return; }
      var x=e.target.closest('[data-rx]'); if(!x) return; var act=x.getAttribute('data-rx');
      if(act==='close'){ ov.remove(); return; }
      if(act==='salvar'){
        var tplId=document.getElementById('pr-tpl').value||null;
        var tpl=tpls.filter(function(t){return t.id===tplId;})[0];
        var tipo=tpl?tpl.tipo:(prop.tipo||'venda');
        var body={ template_id:tplId, tipo:tipo, empresa_id:document.getElementById('pr-emp').value||null, pessoa_id:document.getElementById('pr-pes').value||null, data:document.getElementById('pr-data').value||null, validade_dias:parseInt(document.getElementById('pr-val').value)||null, status:document.getElementById('pr-status').value||'rascunho' };
        if(!prop.id && tpl){ var bl={}; ((tpl.config&&tpl.config.blocos)||[]).forEach(function(b){ bl[b.chave]={ligado:!!b.ligado,versao:1}; }); body.blocos=bl; }
        try{ if(prop.id) await _authFetch('PATCH','/proposta/propostas/'+prop.id,body); else await _authFetch('POST','/proposta/propostas',body); toast('Proposta salva','success'); ov.remove(); carregarPropostas(); }catch(err){ toast('Erro: '+err.message,'error'); }
      }
    });
  }
  window.abrirPropostaModal=abrirPropostaModal;

  if(!window._propBound){
    window._propBound=true;
    document.addEventListener('change', function(e){
      if(e.target && e.target.id==='pp-import' && e.target.files && e.target.files.length){
        var fd=new FormData(); fd.append('arquivo', e.target.files[0]);
        fetch('/api/proposta/produtos/importar',{method:'POST',headers:{'Authorization':'Bearer '+getToken()},body:fd})
          .then(function(r){return r.json();}).then(function(d){ toast('Importados: '+(d.importados||0),'success'); carregarPropProdutos(); })
          .catch(function(){ toast('Erro ao importar','error'); });
      }
    });
    document.addEventListener('click', function(e){
      var pp=e.target.closest && e.target.closest('#prop-produtos-root [data-ppact]');
      if(pp){ e.preventDefault(); var a=pp.getAttribute('data-ppact'), id=pp.getAttribute('data-id');
        if(a==='novo'){ abrirProdModal(null); return; }
        if(a==='exportar'){ exportarProdutos(); return; }
        var pr=(window._propProd||[]).filter(function(x){return x.id===id;})[0];
        if(a==='editar'){ if(pr) abrirProdModal(pr); return; }
        if(a==='del'){ if(confirm('Excluir produto?')){ _authFetch('DELETE','/proposta/produtos/'+id).then(carregarPropProdutos).catch(function(err){toast(err.message,'error');}); } return; } }
      var cf=e.target.closest && e.target.closest('#prop-config-root [data-cfgact]');
      if(cf){ e.preventDefault(); var ca=cf.getAttribute('data-cfgact');
        if(ca==='add-grupo'){ var v=(document.getElementById('cfg-grupo-novo').value||'').trim(); if(!v) return; var arr=(window._propGrupos||[]).slice(); if(arr.indexOf(v)<0) arr.push(v); _authFetch('PUT','/proposta/config/prop_grupos',{valor:arr}).then(carregarPropConfig); return; }
        if(ca==='del-grupo'){ var g=cf.getAttribute('data-v'); var arr=(window._propGrupos||[]).filter(function(x){return x!==g;}); _authFetch('PUT','/proposta/config/prop_grupos',{valor:arr}).then(carregarPropConfig); return; }
        if(ca==='add-col'){ var lb=(document.getElementById('cfg-col-novo').value||'').trim(); if(!lb) return; var ch=lb.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,''); var arr=(window._propColunas||[]).slice(); if(!arr.some(function(x){return x.chave===ch;})) arr.push({chave:ch,label:lb}); _authFetch('PUT','/proposta/config/prop_colunas',{valor:arr}).then(carregarPropConfig); return; }
        if(ca==='del-col'){ var ck=cf.getAttribute('data-v'); var arr=(window._propColunas||[]).filter(function(x){return x.chave!==ck;}); _authFetch('PUT','/proposta/config/prop_colunas',{valor:arr}).then(carregarPropConfig); return; }
        if(ca==='add-bloco'){ abrirBlocoModal(null); return; }
        if(ca==='edit-bloco'){ var b=(window._propBlocos||[]).filter(function(x){return x.id===cf.getAttribute('data-id');})[0]; if(b) abrirBlocoModal(b); return; } }
      var pm=e.target.closest && e.target.closest('#prop-modelos-root [data-pmact]');
      if(pm){ e.preventDefault(); var a2=pm.getAttribute('data-pmact'), id2=pm.getAttribute('data-id');
        if(a2==='novo'){ abrirModeloModal(null); return; }
        var t=(window._propTpl||[]).filter(function(x){return x.id===id2;})[0];
        if(a2==='config'){ if(t) abrirModeloModal(t); return; }
        if(a2==='duplicar'){ var nn=prompt('Nome do novo modelo:', t?(t.nome+' (cópia)'):''); if(nn){ _authFetch('POST','/proposta/templates/'+id2+'/duplicar',{nome:nn}).then(carregarPropModelos).catch(function(err){toast(err.message,'error');}); } return; } }
      var prb=e.target.closest && e.target.closest('#propostas-root [data-pract]');
      if(prb){ e.preventDefault(); var a3=prb.getAttribute('data-pract'), id3=prb.getAttribute('data-id');
        if(a3==='nova'){ abrirPropostaModal(null); return; }
        var p=(window._propLista||[]).filter(function(x){return x.id===id3;})[0];
        if(a3==='editar'){ if(p) abrirPropostaModal(p); return; }
        if(a3==='del'){ if(confirm('Excluir proposta?')){ _authFetch('DELETE','/proposta/propostas/'+id3).then(carregarPropostas).catch(function(err){toast(err.message,'error');}); } return; } }
    });
  }
})();

/* ===== COMERCIAL: Funil / Oportunidades ===== */
(function(){
  var main=document.querySelector('.app-main'); if(!main) return;
  if(!document.getElementById('page-funil')){
    var pg=document.createElement('div'); pg.id='page-funil'; pg.className='page';
    pg.innerHTML='<div class="app-header"><h2>🔻 Funil</h2></div><div class="page-content"><div id="funil-root"></div></div>';
    main.appendChild(pg);
  }
  var CSSID='css-funil'; var old=document.getElementById(CSSID); if(old) old.remove();
  var st=document.createElement('style'); st.id=CSSID;
  st.textContent='#page-funil .page-content{max-width:none;margin:0;padding:12px 16px}'
    +'.fn-board{display:flex;gap:12px;overflow-x:auto;padding-bottom:8px;align-items:flex-start}'
    +'.fn-col{flex:0 0 250px;background:var(--surface-2,#f3f4f6);border-radius:12px;padding:8px;min-height:60px}'
    +'.fn-col-h{font-weight:700;font-size:13px;padding:4px 6px 8px;display:flex;justify-content:space-between;align-items:center}'
    +'.fn-card{background:var(--surface,#fff);border:1px solid var(--border,#e5e7eb);border-radius:10px;padding:8px 10px;margin-bottom:8px}';
  document.head.appendChild(st);

  var TIPOS_INT=[['email','E-mail','#2563eb'],['inmail','In-Mail','#7c3aed'],['whatsapp','WhatsApp','#16a34a'],['telefone','Telefone','#0891b2'],['reuniao','Reunião','#f59e0b'],['linkedin','LinkedIn','#0a66c2'],['nota','Nota','#6b7280']];
  var INT_TABS=[['nota','Nota','📝'],['email','E-mail','✉️'],['whatsapp','WhatsApp','💬'],['telefone','Telefone','📞'],['reuniao','Reunião','🤝']];
  var TIPO_ICON={nota:'📝',email:'✉️',whatsapp:'💬',telefone:'📞',reuniao:'🤝',inmail:'📨',linkedin:'in',sistema:'↪'};
  var MENU1=[['historico','Histórico'],['propostas','Propostas'],['vendas','Vendas'],['pre-venda','Pré Venda'],['anexos','Anexos']];
  var PRE_TABS=[['material','Material'],['engenharia','Engenharia'],['documentos','Documentos'],['tickets','Tickets'],['linha-tempo','Linha do tempo']];
  function tcol(t){ var x=TIPOS_INT.filter(function(z){return z[0]===t;})[0]; return x?x[2]:'#6d28d9'; }
  function esc(s){ return (s==null?'':String(s)).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); }
  function ovOpen(html){ var ov=document.createElement('div'); ov.className='prop-ov'; ov.innerHTML='<div class="prop-mod">'+html+'</div>'; document.body.appendChild(ov); return ov; }
  function v(id){ var el=document.getElementById(id); return el?el.value:''; }
  function hojeISO(){ return new Date(Date.now()-3*3600*1000).toISOString().slice(0,10); }
  function fmtDT(iso){ if(!iso) return ''; var s=(/[Z+]/.test((''+iso).slice(10)))?iso:iso+'Z'; var d=new Date(s); if(isNaN(d)) return iso; d=new Date(d.getTime()-3*3600*1000); function p(n){return ('0'+n).slice(-2);} return p(d.getUTCDate())+'/'+p(d.getUTCMonth()+1)+'/'+d.getUTCFullYear()+' '+p(d.getUTCHours())+':'+p(d.getUTCMinutes()); }
  function fmtD(iso){ if(!iso) return '—'; var a=(''+iso).split('-'); if(a.length<3) return iso; return a[2]+'/'+a[1]+'/'+a[0]; }
  function money(n){ return 'R$ '+(Number(n)||0).toLocaleString('pt-BR',{minimumFractionDigits:0,maximumFractionDigits:0}); }

  async function opConfig(){
    var oc={}; var ks=['op_marcadores','op_origem','op_tipo','op_vendedores'];
    for(var i=0;i<ks.length;i++){ try{ var r=await _authFetch('GET','/proposta/config/'+ks[i]); oc[ks[i]]=(r&&r.valor)||[]; }catch(e){ oc[ks[i]]=[]; } }
    window._opCfg=oc; return oc;
  }
  async function ensureMaps(){
    if(!window._propEmpObj){ try{ var emps=await _authFetch('GET','/prospeccao/empresas')||[]; window._propEmpList=emps; window._propEmp={}; window._propEmpObj={}; emps.forEach(function(x){ window._propEmp[x.id]=x.nome; window._propEmpObj[x.id]=x; }); }catch(e){} }
    if(!window._propPesObj){ try{ var pes=await _authFetch('GET','/prospeccao/pessoas')||[]; window._propPesList=pes; window._propPesObj={}; pes.forEach(function(x){ window._propPesObj[x.id]=x; }); }catch(e){} }
    if(!window._funis){ try{ window._funis=await _authFetch('GET','/proposta/funis')||[]; }catch(e){ window._funis=[]; } }
  }

  /* ---------- BOARD ---------- */
  function taskIcon(o){
    var st=o.tarefa_status||'sem';
    var c={atrasada:'#dc2626',hoje:'#f59e0b',planejada:'#2563eb',sem:'#9ca3af'}[st]||'#9ca3af';
    var tt={atrasada:'Tarefa atrasada',hoje:'Tarefa vence hoje',planejada:'Tarefa planejada',sem:'Sem tarefa planejada'}[st]||'Sem tarefa';
    return '<span title="'+tt+'" style="display:inline-flex;flex:0 0 auto"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="'+c+'" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg></span>';
  }
  function farolTag(f){
    var m={quente:['Quente','#16a34a'],morno:['Morno','#f59e0b'],frio:['Frio','#2563eb']};
    var x=m[f||'frio']||m.frio;
    return '<span style="display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:600;color:'+x[1]+'"><span style="width:11px;height:11px;border-radius:50%;background:'+x[1]+';display:inline-block;flex:0 0 auto"></span>'+x[0]+'</span>';
  }
  function farolDot(f){
    var m={quente:['Quente','#16a34a'],morno:['Morno','#f59e0b'],frio:['Frio','#2563eb']};
    var x=m[f||'frio']||m.frio;
    return '<span title="'+x[0]+'" style="width:14px;height:14px;border-radius:50%;background:'+x[1]+';display:inline-block;flex:0 0 auto"></span>';
  }
  function avatar(nome){
    var ini=((nome||'').trim().charAt(0)||'?').toUpperCase();
    return '<span title="'+esc(nome||'sem vendedor')+'" style="width:22px;height:22px;border-radius:50%;background:#6366f1;color:#fff;display:inline-flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex:0 0 auto">'+esc(ini)+'</span>';
  }
  function opCard(o){
    var emp=(window._propEmp||{})[o.empresa_id]||'';
    var num=o.numero?('#'+String(o.numero).padStart(3,'0')):'';
    var dias=(o.dias_etapa!=null)?(o.dias_etapa+'d'):'';
    var fc=o.forecast||{}; var rev=parseFloat(fc.revenda_hw)||0, serv=parseFloat(fc.servicos)||0, saas=parseFloat(fc.saas_haas)||0;
    var resumo='<div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px;padding-top:6px;border-top:1px solid var(--border,#eee)"><span style="font-weight:700;font-size:12px">'+money(rev+serv)+'</span><span style="font-weight:700;font-size:12px;color:#2563eb">'+money(saas)+'/mês</span></div>';
    return '<div class="fn-card" draggable="true" data-opid="'+o.id+'" data-fnact="detalhe" data-id="'+o.id+'" style="cursor:pointer">'
      +'<div style="display:flex;justify-content:space-between;gap:6px;align-items:flex-start"><span style="font-size:13px;line-height:1.25">'+esc(o.titulo||'(sem título)')+'</span>'+taskIcon(o)+'</div>'
      +(emp?'<div class="text-sm text-muted" style="margin:2px 0">'+esc(emp)+'</div>':'')
      +'<div style="display:flex;align-items:center;gap:6px;margin-top:6px">'+avatar(o.vendedor)+farolDot(o.farol)+'<span style="margin-left:auto;font-size:11px;color:#6b7280">'+dias+'</span></div>'
      +resumo
      +(num?'<div style="text-align:right;font-size:10px;color:#9ca3af;margin-top:2px">'+num+'</div>':'')
    +'</div>';
  }
  async function carregarFunil(){
    window._opDetId=null;
    var root=document.getElementById('funil-root'); if(!root) return;
    root.innerHTML='<div class="empty-state"><div class="spinner" style="margin:0 auto"></div></div>';
    var funis=[]; try{ funis=await _authFetch('GET','/proposta/funis')||[]; }catch(e){ root.innerHTML='<p style="color:var(--danger)">Erro: '+esc(e.message)+'</p>'; return; }
    window._funis=funis;
    if(!funis.length){ root.innerHTML='<p class="text-sm text-muted">Nenhum funil cadastrado. Crie em Configurações.</p>'; return; }
    var fid=window._funilSel||funis[0].id;
    var funil=funis.filter(function(x){return x.id===fid;})[0]||funis[0];
    window._funilSel=funil.id; window._funilAtivo=funil;
    var ops=[]; try{ ops=await _authFetch('GET','/proposta/oportunidades?funil_id='+funil.id)||[]; }catch(e){}
    window._ops=ops;
    await ensureMaps();
    var etapas=funil.etapas||[];
    var sel=funis.length>1?('<select id="fn-sel" class="form-control" style="width:auto;display:inline-block">'+funis.map(function(f){ return '<option value="'+f.id+'"'+(f.id===funil.id?' selected':'')+'>'+esc(f.nome)+'</option>'; }).join('')+'</select>'):('<span style="font-weight:700;font-size:16px">'+esc(funil.nome)+'</span>');
    var colsHtml=etapas.map(function(et){
      var cards=ops.filter(function(o){return o.etapa===et;});
      var tot=0, mens=0; cards.forEach(function(o){ var fc=o.forecast||{}; tot+=(parseFloat(fc.revenda_hw)||0)+(parseFloat(fc.servicos)||0); mens+=(parseFloat(fc.saas_haas)||0); });
      var cardsHtml=cards.map(function(o){ return opCard(o); }).join('');
      return '<div class="fn-col" data-etapa="'+esc(et)+'"><div class="fn-col-h"><div><div>'+esc(et)+'</div><div style="font-size:11px;font-weight:600;color:#6b7280">'+money(tot)+(mens?' · '+money(mens)+'/mês':'')+'</div></div><span class="text-sm text-muted">'+cards.length+'</span></div>'+cardsHtml+'</div>';
    }).join('')||'<p class="text-sm text-muted">Este funil não tem etapas. Configure em Configurações.</p>';
    root.innerHTML='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;gap:8px;flex-wrap:wrap">'+sel+'<button class="btn btn-primary btn-sm" data-fnact="nova">＋ Adicionar Oportunidade</button></div><div class="fn-board">'+colsHtml+'</div>';
  }
  window.carregarFunil=carregarFunil;

  /* ---------- DETALHE ---------- */
  function clienteCol(d,emp,pes){
    function row(l,val){ return '<div style="padding:5px 0;border-bottom:1px solid var(--border,#eee)"><div style="font-size:11px;color:var(--text-muted);text-transform:uppercase">'+l+'</div><div style="font-size:14px">'+(val||'—')+'</div></div>'; }
    var farolLbl={quente:'Quente',morno:'Morno',frio:'Frio'}[d.farol||'frio'];
    return '<div class="prop-card"><div style="font-weight:700;margin-bottom:6px">Cliente & Projeto</div>'
      +row('Empresa',esc(emp.nome||''))+row('CNPJ',esc(emp.cnpj||''))
      +row('Contato',esc(pes.nome||''))+row('Telefone',esc(pes.telefone||''))+row('E-mail',esc(pes.email||''))
      +row('Vendedor',esc(d.vendedor||''))+row('Tipo',esc(d.tipo||''))+row('Origem',esc(d.origem||''))
      +row('Farol',farolTag(d.farol))+row('Próxima tarefa',fmtD(d.data_tarefa))+row('Dias na etapa',(d.dias_etapa!=null?d.dias_etapa+' dias':'—'))
      +'<div style="padding:8px 0 4px;border-top:1px solid var(--border,#eee);margin-top:2px"><div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;margin-bottom:3px">Forecast</div>'
        +'<div style="display:flex;justify-content:space-between;font-size:14px;padding:2px 0"><span>Revenda HW</span><span>'+money(parseFloat((d.forecast||{}).revenda_hw)||0)+'</span></div>'
        +'<div style="display:flex;justify-content:space-between;font-size:14px;padding:2px 0"><span>Serviços</span><span>'+money(parseFloat((d.forecast||{}).servicos)||0)+'</span></div>'
        +'<div style="display:flex;justify-content:space-between;font-size:14px;padding:2px 0"><span>SaaS/HaaS</span><span>'+money(parseFloat((d.forecast||{}).saas_haas)||0)+'/mês</span></div></div>'
      +((d.marcadores&&d.marcadores.length)?'<div style="padding:6px 0">'+d.marcadores.map(function(m){return '<span class="fn-tag">'+esc(m)+'</span>';}).join('')+'</div>':'')
    +'</div>';
  }
  function interacaoPanel(d){
    var ints=d.interacoes||[];
    var tipoSel=window._opIntTipo||'nota';
    var tabs=INT_TABS.map(function(t){ var on=(tipoSel===t[0]); return '<button class="op-int-tab" data-tipo="'+t[0]+'" title="'+t[1]+'" style="border:none;cursor:pointer;padding:5px 11px;font-size:13px;font-weight:600;border-radius:8px;background:'+(on?'#6d28d9':'#ede9fe')+';color:'+(on?'#fff':'#6d28d9')+'">'+t[2]+' '+t[1]+'</button>'; }).join('');
    var cont={}; ints.forEach(function(i){ cont[i.tipo]=(cont[i.tipo]||0)+1; });
    var counters=INT_TABS.filter(function(t){return t[0]!=='nota';}).map(function(t){ return '<span class="prop-chip">'+t[1]+': '+(cont[t[0]]||0)+'</span>'; }).join('');
    var timeline=ints.map(function(i){
      var an=(i.anexos||[]).map(function(u){ return '<a href="'+u+'" target="_blank" style="font-size:12px;color:var(--primary);margin-right:8px">📎 '+esc((''+u).split('/').pop())+'</a>'; }).join('');
      if(i.tipo==='sistema'){
        var mm=(''+(i.texto||'')).match(/de "([^"]*)" para "([^"]*)"/);
        if(mm){ var et=window._detEtapas||[]; var fi=et.indexOf(mm[1]), ti=et.indexOf(mm[2]); var fwd=(ti>=fi); var bc=fwd?'#16a34a':'#dc2626'; var arr=fwd?'→':'←';
          return '<div style="display:flex;justify-content:center;padding:10px 0"><div style="border:2px solid '+bc+';border-radius:10px;padding:8px 14px;text-align:center;max-width:360px"><div style="font-size:13px;font-weight:600">'+esc(mm[1])+' <span style="color:'+bc+';font-size:17px;vertical-align:middle">'+arr+'</span> '+esc(mm[2])+'</div><div style="font-size:11px;color:var(--text-muted)">'+fmtDT(i.data_hora)+(i.usuario?' · '+esc(i.usuario):'')+'</div></div></div>'; }
        return '<div style="display:flex;gap:8px;padding:7px 0;color:var(--text-muted);font-size:13px"><span>↪</span><div>'+esc(i.texto||'')+'<div style="font-size:11px">'+fmtDT(i.data_hora)+(i.usuario?' · '+esc(i.usuario):'')+'</div></div></div>';
      }
      var t=TIPOS_INT.filter(function(x){return x[0]===i.tipo;})[0]||['nota','Nota','#6b7280'];
      var ic=TIPO_ICON[i.tipo]||'•';
      return '<div style="display:flex;gap:8px;padding:8px 0;border-bottom:1px solid var(--border,#eee)"><span style="background:'+t[2]+';color:#fff;border-radius:6px;padding:1px 7px;font-size:11px;font-weight:700;white-space:nowrap;align-self:flex-start">'+ic+' '+t[1]+'</span><div style="flex:1"><div style="font-size:14px;white-space:pre-wrap">'+esc(i.texto||'')+'</div>'+(an?'<div style="margin-top:3px">'+an+'</div>':'')+'<div style="font-size:11px;color:var(--text-muted)">'+fmtDT(i.data_hora)+(i.usuario?' · '+esc(i.usuario):'')+'</div></div></div>';
    }).join('')||'<p class="text-sm text-muted">Nenhuma interação ainda.</p>';
    return '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px">'+tabs+'</div>'
      +'<textarea id="op-int-txt" class="form-control" rows="3" placeholder="Registrar interação, gancho, retorno da conversa..."></textarea>'
      +'<div style="display:flex;align-items:center;gap:10px;margin-top:8px"><button class="btn btn-primary btn-sm" data-fnact="registrar" data-id="'+d.id+'">Registrar</button><label style="font-size:12px;color:var(--text-muted);cursor:pointer;display:inline-flex;align-items:center;gap:4px">📎 Anexar<input type="file" id="op-int-file" style="display:none"></label><span id="op-int-fname" class="text-sm text-muted"></span></div>'
      +(counters?'<div style="margin:12px 0 6px;display:flex;gap:6px;flex-wrap:wrap">'+counters+'</div>':'')
      +'<div style="margin-top:6px">'+timeline+'</div>';
  }
  function preVendaPanel(){
    var stt=window._opPreTab||'material';
    var m2=PRE_TABS.map(function(t){ return '<button class="op-m2" data-m2="'+t[0]+'" style="border:none;background:none;cursor:pointer;padding:6px 10px;font-size:13px;font-weight:600;border-bottom:2px solid '+(stt===t[0]?'#6d28d9':'transparent')+';color:'+(stt===t[0]?'#6d28d9':'var(--text-muted)')+'">'+t[1]+'</button>'; }).join('');
    var lbl=(PRE_TABS.filter(function(x){return x[0]===stt;})[0]||['','?'])[1];
    return '<div style="display:flex;gap:2px;flex-wrap:wrap;border-bottom:1px solid var(--border,#eee);margin-bottom:10px">'+m2+'</div><p class="text-sm text-muted" style="padding:16px 4px">Pré Venda › '+esc(lbl)+' — em construção.</p>';
  }
  function tarefasPanel(d){
    var ts=d.tarefas||[];
    var rows=ts.map(function(t){
      var done=(t.status==='concluida');
      return '<div class="prop-card" style="padding:10px 12px;margin-bottom:8px;'+(done?'opacity:.6':'')+'"><div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start"><div><b style="font-size:14px"><a href="#" data-tkact="abrir" data-id="'+t.id+'" style="color:inherit;text-decoration:none">'+esc(t.titulo||'(sem título)')+'</a></b>'+(done?' <span class="prop-chip" style="background:#dcfce7;color:#16a34a">concluída</span>':'')+(t.repetir_dias?' <span class="text-sm text-muted">🔁 '+t.repetir_dias+'d</span>':'')+(t.data?'<div class="text-sm text-muted">📅 '+fmtD(t.data)+'</div>':'')+'</div><div style="display:flex;gap:4px"><button class="fel-ic" data-tkact="abrir" data-id="'+t.id+'" title="Abrir">↗</button>'+(!done?'<button class="fel-ic" data-tkact="del" data-id="'+t.id+'" title="Excluir" style="color:var(--danger)">🗑️</button>':'')+'</div></div></div>';
    }).join('')||'<p class="text-sm text-muted">Nenhuma tarefa.</p>';
    return '<div style="display:flex;justify-content:flex-end;margin-bottom:8px"><button class="btn btn-primary btn-sm" data-tkact="nova">＋ Nova tarefa</button></div>'+rows;
  }
  async function abrirTarefaModal(tk, oppId){
    var full=tk||{}; if(tk&&tk.id){ try{ full=await _authFetch('GET','/proposta/tarefas/'+tk.id); }catch(e){ full=tk; } }
    var coms=full.comentarios||[]; var done=(full.status==='concluida');
    var ov=document.createElement('div'); ov.className='prop-ov';
    ov.innerHTML='<div class="prop-mod" style="max-width:840px"><div class="hd"><h3 style="margin:0">Tarefa</h3><div style="display:flex;gap:8px"><button class="btn btn-sm btn-secondary" data-tx="close">Fechar</button>'+((full.id&&!done)?'<button class="btn btn-sm" style="background:#16a34a;color:#fff;border:none" data-tx="finalizar">✔ Finalizar tarefa</button>':'')+(!done?'<button class="btn btn-sm btn-primary" data-tx="salvar">💾 Salvar</button>':'')+'</div></div>'
      +'<div class="bd"><div style="display:flex;gap:16px;flex-wrap:wrap">'
        +'<div style="flex:1;min-width:280px">'
          +'<div class="form-group"><label class="form-label">Fazer</label><input id="tk-titulo" class="form-control" value="'+esc(full.titulo||'')+'"'+(done?' disabled':'')+'></div>'
          +'<div class="form-group"><label class="form-label">Descrição</label><textarea id="tk-desc" class="form-control" rows="4" placeholder="Programar interações, cases, retorno..."'+(done?' disabled':'')+'>'+esc(full.descricao||'')+'</textarea></div>'
          +'<div style="display:flex;gap:10px;flex-wrap:wrap"><div class="form-group" style="flex:1;min-width:150px"><label class="form-label">Data</label><input id="tk-data" type="date" class="form-control" value="'+(full.data||'')+'"'+(done?' disabled':'')+'></div><div class="form-group" style="flex:1;min-width:150px"><label class="form-label">Repetir (dias)</label><input id="tk-rep" type="number" min="0" class="form-control" value="'+(full.repetir_dias!=null?full.repetir_dias:'')+'" placeholder="em branco = não repete"'+(done?' disabled':'')+'></div></div>'
          +(done?'<p class="text-sm" style="color:#16a34a;font-weight:600">✔ Concluída em '+fmtDT(full.concluida_em)+'</p>':'')
        +'</div>'
        +'<div style="flex:1;min-width:280px"><div style="font-weight:700;margin-bottom:6px">Comentários da atividade</div>'
          +(full.id?'<div style="display:flex;gap:6px;margin-bottom:10px"><input id="tk-com" class="form-control" placeholder="Novo comentário" style="flex:1"><button class="btn btn-sm btn-primary" data-tx="comentar">Enviar</button></div>':'<p class="text-sm text-muted">Salve a tarefa para comentar.</p>')
          +'<div>'+(coms.map(function(c){ return '<div style="border-bottom:1px solid var(--border,#eee);padding:7px 0"><div style="font-size:14px;white-space:pre-wrap">'+esc(c.texto||'')+'</div><div style="font-size:11px;color:var(--text-muted)">'+fmtDT(c.data_hora)+(c.usuario?' · '+esc(c.usuario):'')+'</div></div>'; }).join('')||'<p class="text-sm text-muted">Sem comentários.</p>')+'</div>'
        +'</div>'
      +'</div></div></div>';
    document.body.appendChild(ov);
    ov.addEventListener('click', async function(e){
      if(e.target===ov){ ov.remove(); return; }
      var x=e.target.closest('[data-tx]'); if(!x) return; var act=x.getAttribute('data-tx');
      if(act==='close'){ ov.remove(); return; }
      if(act==='salvar'){
        var body={ oportunidade_id:oppId||full.oportunidade_id||null, titulo:document.getElementById('tk-titulo').value, descricao:document.getElementById('tk-desc').value, data:document.getElementById('tk-data').value||null, repetir_dias:(document.getElementById('tk-rep').value!==''?parseInt(document.getElementById('tk-rep').value):null) };
        try{ if(full.id) await _authFetch('PATCH','/proposta/tarefas/'+full.id,body); else await _authFetch('POST','/proposta/tarefas',body); toast('Tarefa salva','success'); ov.remove(); if(window._opDetId) abrirOpDetalhe(window._opDetId); }catch(err){ toast('Erro: '+err.message,'error'); }
        return;
      }
      if(act==='comentar'){ var ci=document.getElementById('tk-com'); var txt=(ci&&ci.value||'').trim(); if(!txt) return; try{ await _authFetch('POST','/proposta/tarefas/'+full.id+'/comentarios',{texto:txt}); ov.remove(); abrirTarefaModal({id:full.id}, oppId); }catch(err){ toast('Erro','error'); } return; }
      if(act==='finalizar'){ var oi=document.getElementById('tk-com'); var obs=(oi&&oi.value||'').trim(); if(!confirm('Finalizar a tarefa?'+(full.repetir_dias?' (reabre em '+full.repetir_dias+' dias)':''))) return; try{ await _authFetch('POST','/proposta/tarefas/'+full.id+'/finalizar',{observacao:obs||null}); toast('Tarefa finalizada','success'); ov.remove(); if(window._opDetId) abrirOpDetalhe(window._opDetId); }catch(err){ toast('Erro','error'); } return; }
    });
  }
  function renderDetalhe(){
    var d=window._opDet; if(!d) return;
    var root=document.getElementById('funil-root'); if(!root) return;
    var funil=(window._funis||[]).filter(function(x){return x.id===d.funil_id;})[0]||window._funilAtivo||{etapas:[]};
    var etapas=funil.etapas||[]; var curIdx=etapas.indexOf(d.etapa); window._detEtapas=etapas;
    var emp=(window._propEmpObj||{})[d.empresa_id]||{}; var pes=(window._propPesObj||{})[d.pessoa_id]||{};
    var num=d.numero?('#'+String(d.numero).padStart(3,'0')):'';
    var stepper=etapas.map(function(et,i){
      var cur=(i===curIdx), done=(curIdx>=0&&i<curIdx);
      var bg=cur?'#6d28d9':(done?'#a78bfa':'var(--surface-2,#eef1f5)'); var col=(cur||done)?'#fff':'var(--text-muted,#6b7280)';
      return '<button class="op-step" data-stage="'+esc(et)+'" style="flex:1;min-width:100px;border:none;cursor:pointer;background:'+bg+';color:'+col+';padding:9px 6px;font-size:12px;font-weight:600;border-radius:6px">'+esc(et)+'</button>';
    }).join('');
    var tab=window._opTab||'historico';
    var m1=MENU1.map(function(t){ var on=(tab===t[0]); return '<button class="op-m1" data-m1="'+t[0]+'" style="border:none;cursor:pointer;padding:7px 14px;font-size:13px;font-weight:600;border-radius:8px;background:'+(on?'#6d28d9':'#ede9fe')+';color:'+(on?'#fff':'#6d28d9')+'">'+t[1]+'</button>'; }).join('');
    var content;
    if(tab==='historico'){ var hs=window._opHistSub||'interacao'; var sub=[['interacao','Interação'],['tarefas','Tarefas']].map(function(x){ var on=(hs===x[0]); return '<button class="op-hsub" data-hsub="'+x[0]+'" style="border:none;cursor:pointer;padding:5px 12px;font-size:13px;font-weight:700;border-radius:8px;background:'+(on?'#6d28d9':'#ede9fe')+';color:'+(on?'#fff':'#6d28d9')+'">'+x[1]+'</button>'; }).join(''); content='<div style="display:flex;gap:6px;margin-bottom:10px">'+sub+'</div>'+(hs==='tarefas'?tarefasPanel(d):interacaoPanel(d)); }
    else if(tab==='pre-venda') content=preVendaPanel();
    else content='<p class="text-sm text-muted" style="padding:16px 4px">'+(MENU1.filter(function(x){return x[0]===tab;})[0]||['','?'])[1]+' — em construção.</p>';
    var right='<div class="prop-card"><div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px">'+m1+'</div>'+content+'</div>';
    root.innerHTML=
      '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:10px"><button class="btn btn-sm btn-secondary" data-fnact="voltar">← Voltar ao funil</button><div style="display:flex;gap:6px"><button class="btn btn-sm btn-secondary" data-fnact="editar-det" data-id="'+d.id+'">✏️ Editar</button><button class="btn btn-sm btn-secondary" data-fnact="arquivar" data-id="'+d.id+'">📦 Arquivar</button></div></div>'
      +'<div style="font-size:18px;font-weight:700;margin-bottom:2px">'+esc(d.titulo||'(sem título)')+(num?' <span class="text-sm text-muted">'+num+'</span>':'')+'</div>'
      +'<div class="text-sm text-muted" style="margin-bottom:10px">'+esc(emp.nome||'')+(d.vendedor?' · '+esc(d.vendedor):'')+'</div>'
      +'<div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:16px">'+stepper+'</div>'
      +'<div style="display:flex;gap:16px;flex-wrap:wrap;align-items:flex-start"><div style="flex:0 0 260px;min-width:240px">'+clienteCol(d,emp,pes)+'</div><div style="flex:1;min-width:320px">'+right+'</div></div>';
  }
  async function abrirOpDetalhe(id){
    var root=document.getElementById('funil-root'); if(!root) return;
    root.innerHTML='<div class="empty-state"><div class="spinner" style="margin:0 auto"></div></div>';
    await ensureMaps();
    var d; try{ d=await _authFetch('GET','/proposta/oportunidades/'+id); }catch(e){ root.innerHTML='<p style="color:var(--danger)">Erro: '+esc(e.message)+'</p>'; return; }
    try{ d.tarefas=await _authFetch('GET','/proposta/tarefas?oportunidade_id='+id)||[]; }catch(e){ d.tarefas=[]; }
    window._opDet=d; window._opDetId=id;
    renderDetalhe();
  }
  window.abrirOpDetalhe=abrirOpDetalhe;

  /* ---------- MODAL ---------- */
  async function abrirOpModal(op){
    await ensureMaps();
    var oc=await opConfig();
    op=op||{};
    var funil=window._funilAtivo||((window._funis||[]).filter(function(x){return x.id===op.funil_id;})[0])||{etapas:[]};
    var emps=window._propEmpList||[], pes=window._propPesList||[];
    var empOpts='<option value="">— empresa —</option>'+emps.map(function(x){ return '<option value="'+x.id+'"'+(op.empresa_id===x.id?' selected':'')+'>'+esc(x.nome)+'</option>'; }).join('');
    function pesOpts(empId,seln){ return '<option value="">— contato —</option>'+pes.filter(function(x){return !empId||x.empresa_id===empId;}).map(function(x){ return '<option value="'+x.id+'"'+(seln===x.id?' selected':'')+'>'+esc(x.nome)+'</option>'; }).join(''); }
    function listOpts(arr,val,ph){ return '<option value="">'+ph+'</option>'+(arr||[]).map(function(x){ return '<option'+(val===x?' selected':'')+'>'+esc(x)+'</option>'; }).join(''); }
    var etapaOpts=(funil.etapas||[]).map(function(et){ return '<option'+(op.etapa===et?' selected':'')+'>'+esc(et)+'</option>'; }).join('');
    var farolOpts=[['quente','Quente'],['morno','Morno'],['frio','Frio']].map(function(x){ return '<option value="'+x[0]+'"'+((op.farol||'frio')===x[0]?' selected':'')+'>'+x[1]+'</option>'; }).join('');
    var mkr=oc.op_marcadores||[];
    var mkrHtml=mkr.length?mkr.map(function(m){ var on=(op.marcadores||[]).indexOf(m)>=0; return '<label style="margin:0 12px 4px 0;font-size:13px;display:inline-block"><input type="checkbox" class="op-mkr" value="'+esc(m)+'"'+(on?' checked':'')+'> '+esc(m)+'</label>'; }).join(''):'<span class="text-sm text-muted">Cadastre marcadores em COMERCIAL › Configurações.</span>';
    var ov=ovOpen('<div class="hd"><h3 style="margin:0">'+(op.id?('Oportunidade'+(op.numero?' #'+String(op.numero).padStart(3,"0"):'')):'Nova oportunidade')+'</h3><div style="display:flex;gap:8px"><button class="btn btn-sm btn-secondary" data-ox="close">Fechar</button><button class="btn btn-sm btn-primary" data-ox="salvar">💾 Salvar</button></div></div>'
      +'<div class="bd">'
      +'<div style="display:flex;gap:10px;flex-wrap:wrap"><div class="form-group" style="flex:1;min-width:180px"><label class="form-label">Título</label><input id="op-titulo" class="form-control" value="'+esc(op.titulo||'')+'"></div><div class="form-group" style="flex:1;min-width:180px"><label class="form-label">Empresa</label><select id="op-emp" class="form-control">'+empOpts+'</select></div></div>'
      +'<div style="display:flex;gap:10px;flex-wrap:wrap"><div class="form-group" style="flex:1;min-width:180px"><label class="form-label">Contato</label><select id="op-pes" class="form-control">'+pesOpts(op.empresa_id,op.pessoa_id)+'</select></div><div class="form-group" style="flex:1;min-width:160px"><label class="form-label">Vendedor</label><select id="op-vend" class="form-control">'+listOpts(oc.op_vendedores,op.vendedor,'— vendedor —')+'</select></div></div>'
      +'<div class="form-group"><label class="form-label">Marcadores</label><div>'+mkrHtml+'</div></div>'
      +'<div style="display:flex;gap:10px;flex-wrap:wrap"><div class="form-group" style="flex:1;min-width:130px"><label class="form-label">Origem</label><select id="op-ori" class="form-control">'+listOpts(oc.op_origem,op.origem,'— origem —')+'</select></div><div class="form-group" style="flex:1;min-width:130px"><label class="form-label">Tipo</label><select id="op-tipo" class="form-control">'+listOpts(oc.op_tipo,op.tipo,'— tipo —')+'</select></div><div class="form-group" style="flex:1;min-width:130px"><label class="form-label">Etapa</label><select id="op-etapa" class="form-control">'+etapaOpts+'</select></div></div>'
      +'<div style="display:flex;gap:10px;flex-wrap:wrap"><div class="form-group" style="flex:1;min-width:130px"><label class="form-label">Farol</label><select id="op-farol" class="form-control">'+farolOpts+'</select></div><div class="form-group" style="flex:1;min-width:150px"><label class="form-label">Próxima tarefa</label><input id="op-tarefa" type="date" class="form-control" value="'+(op.data_tarefa||'')+'"></div></div>'
      +'<hr style="margin:12px 0;border:none;border-top:1px solid var(--border)"><div style="font-weight:600;margin-bottom:4px">Forecast (estimativa)</div>'
      +'<div style="display:flex;gap:10px;flex-wrap:wrap"><div class="form-group" style="flex:1;min-width:120px"><label class="form-label">Revenda HW</label><input id="op-fc-rev" type="number" step="0.01" class="form-control" value="'+((op.forecast||{}).revenda_hw!=null?(op.forecast||{}).revenda_hw:'')+'"></div><div class="form-group" style="flex:1;min-width:120px"><label class="form-label">Serviços</label><input id="op-fc-serv" type="number" step="0.01" class="form-control" value="'+((op.forecast||{}).servicos!=null?(op.forecast||{}).servicos:'')+'"></div><div class="form-group" style="flex:1;min-width:120px"><label class="form-label">SaaS/HaaS (mensal)</label><input id="op-fc-saas" type="number" step="0.01" class="form-control" value="'+((op.forecast||{}).saas_haas!=null?(op.forecast||{}).saas_haas:'')+'"></div></div>'
      +'</div>');
    ov.addEventListener('change', function(e){ if(e.target.id==='op-emp'){ var pe=document.getElementById('op-pes'); if(pe) pe.innerHTML=pesOpts(e.target.value,''); } });
    ov.addEventListener('click', async function(e){
      if(e.target===ov){ ov.remove(); return; }
      var x=e.target.closest('[data-ox]'); if(!x) return; var act=x.getAttribute('data-ox');
      if(act==='close'){ ov.remove(); return; }
      if(act==='salvar'){
        var mk=[]; ov.querySelectorAll('.op-mkr:checked').forEach(function(c){ mk.push(c.value); });
        var body={ funil_id:funil.id||op.funil_id, titulo:v('op-titulo'), empresa_id:v('op-emp')||null, pessoa_id:v('op-pes')||null, vendedor:v('op-vend')||null, marcadores:mk, origem:v('op-ori')||null, tipo:v('op-tipo')||null, etapa:v('op-etapa')||((funil.etapas||[])[0]||null), farol:v('op-farol')||'frio', data_tarefa:v('op-tarefa')||null, forecast:{revenda_hw:parseFloat(v('op-fc-rev'))||0, servicos:parseFloat(v('op-fc-serv'))||0, saas_haas:parseFloat(v('op-fc-saas'))||0} };
        try{ var r; if(op.id) r=await _authFetch('PATCH','/proposta/oportunidades/'+op.id,body); else r=await _authFetch('POST','/proposta/oportunidades',body); toast('Oportunidade salva','success'); ov.remove(); if(window._opDetId) abrirOpDetalhe(op.id||(r&&r.id)); else carregarFunil(); }catch(err){ toast('Erro: '+err.message,'error'); }
      }
    });
  }

  /* ---------- Configurações (wrap) ---------- */
  async function renderOpCfg(){
    var root=document.getElementById('prop-config-root'); if(!root) return;
    var oc=await opConfig();
    function chips(k){ return (oc[k]||[]).map(function(val){ return '<span class="prop-chip">'+esc(val)+'<button data-opcfg="del" data-k="'+k+'" data-v="'+esc(val)+'" title="Remover">×</button></span>'; }).join('')||'<span class="text-sm text-muted">nenhum</span>'; }
    function bloco(label,k){ return '<div style="margin-bottom:10px"><div class="text-sm" style="font-weight:600;margin-bottom:4px">'+label+'</div><div style="margin-bottom:6px">'+chips(k)+'</div><div style="display:flex;gap:6px"><input class="form-control op-add-inp" data-k="'+k+'" placeholder="Adicionar" style="flex:1"><button class="btn btn-sm btn-primary" data-opcfg="add" data-k="'+k+'">+</button></div></div>'; }
    var card=document.getElementById('op-cfg-card'); if(card) card.remove();
    card=document.createElement('div'); card.className='prop-card'; card.id='op-cfg-card';
    card.innerHTML='<div style="font-weight:600;margin-bottom:8px">Oportunidade (Funil)</div>'+bloco('Marcadores','op_marcadores')+bloco('Origem','op_origem')+bloco('Tipo','op_tipo')+bloco('Vendedores','op_vendedores');
    root.appendChild(card);
  }
  async function renderFunilCfg(){
    var root=document.getElementById('prop-config-root'); if(!root) return;
    var funis=[]; try{ funis=await _authFetch('GET','/proposta/funis')||[]; }catch(e){}
    window._cfgFunis=funis;
    var old=document.getElementById('funil-cfg-card'); if(old) old.remove();
    var card=document.createElement('div'); card.className='prop-card'; card.id='funil-cfg-card';
    var html='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><div style="font-weight:600">Configurar Funil (etapas)</div><button class="btn btn-sm btn-secondary" data-fcfg="novo-funil">＋ Novo funil</button></div>';
    html+=funis.map(function(f){
      var etHtml=(f.etapas||[]).map(function(et){ return '<span class="prop-chip">'+esc(et)+'<button data-fcfg="del-etapa" data-fid="'+f.id+'" data-v="'+esc(et)+'" title="Remover">×</button></span>'; }).join('')||'<span class="text-sm text-muted">sem etapas</span>';
      return '<div style="border:1px solid var(--border,#eee);border-radius:10px;padding:10px;margin-bottom:8px"><div style="display:flex;gap:6px;align-items:center;margin-bottom:6px"><input class="form-control fcfg-nome" data-fid="'+f.id+'" value="'+esc(f.nome)+'" style="flex:1;font-weight:600"><button class="btn btn-sm btn-secondary" data-fcfg="ren-funil" data-fid="'+f.id+'">Renomear</button><button class="btn btn-sm btn-secondary" data-fcfg="copiar-funil" data-fid="'+f.id+'">Copiar</button></div><div style="margin-bottom:6px">'+etHtml+'</div><div style="display:flex;gap:6px"><input class="form-control fcfg-etapa-inp" data-fid="'+f.id+'" placeholder="Nova etapa" style="flex:1"><button class="btn btn-sm btn-primary" data-fcfg="add-etapa" data-fid="'+f.id+'">+ Etapa</button></div></div>';
    }).join('');
    card.innerHTML=html; root.appendChild(card);
  }
  var _origCfg=window.carregarPropConfig;
  window.carregarPropConfig=async function(){ if(typeof _origCfg==='function') await _origCfg(); await renderOpCfg(); await renderFunilCfg(); };
  function funById(id){ return (window._cfgFunis||[]).filter(function(x){return x.id===id;})[0]; }

  if(!window._funilBound){
    window._funilBound=true;
    document.addEventListener('dragstart', function(e){ var c=e.target.closest&&e.target.closest('.fn-card'); if(c) window._dragOpId=c.getAttribute('data-opid'); });
    document.addEventListener('dragover', function(e){ var col=e.target.closest&&e.target.closest('.fn-col[data-etapa]'); if(col&&window._dragOpId){ e.preventDefault(); } });
    document.addEventListener('drop', function(e){ var col=e.target.closest&&e.target.closest('.fn-col[data-etapa]'); if(col&&window._dragOpId){ e.preventDefault(); var et=col.getAttribute('data-etapa'); _authFetch('PATCH','/proposta/oportunidades/'+window._dragOpId,{etapa:et}).then(carregarFunil).catch(function(err){toast(err.message,'error');}); window._dragOpId=null; } });
    document.addEventListener('change', function(e){
      if(e.target && e.target.id==='fn-sel'){ window._funilSel=e.target.value; carregarFunil(); return; }
      if(e.target && e.target.id==='op-int-file'){ var fn=document.getElementById('op-int-fname'); if(fn) fn.textContent=(e.target.files&&e.target.files[0])?e.target.files[0].name:''; return; }
    });
    document.addEventListener('click', function(e){
      var oc=e.target.closest && e.target.closest('#prop-config-root [data-opcfg]');
      if(oc){ e.preventDefault(); var act=oc.getAttribute('data-opcfg'), k=oc.getAttribute('data-k');
        if(act==='add'){ var inp=oc.parentNode.querySelector('.op-add-inp'); var vv=(inp&&inp.value||'').trim(); if(!vv) return; var arr=((window._opCfg||{})[k]||[]).slice(); if(arr.indexOf(vv)<0) arr.push(vv); _authFetch('PUT','/proposta/config/'+k,{valor:arr}).then(renderOpCfg); return; }
        if(act==='del'){ var vv2=oc.getAttribute('data-v'); var arr=((window._opCfg||{})[k]||[]).filter(function(x){return x!==vv2;}); _authFetch('PUT','/proposta/config/'+k,{valor:arr}).then(renderOpCfg); return; } }
      var fc=e.target.closest && e.target.closest('#prop-config-root [data-fcfg]');
      if(fc){ e.preventDefault(); var fa=fc.getAttribute('data-fcfg'), fid=fc.getAttribute('data-fid');
        if(fa==='novo-funil'){ var nn=prompt('Nome do novo funil:','Novo funil'); if(nn){ _authFetch('POST','/proposta/funis',{nome:nn,etapas:[]}).then(renderFunilCfg); } return; }
        if(fa==='copiar-funil'){ var f=funById(fid); var nn2=prompt('Nome da cópia:', f?(f.nome+' (cópia)'):''); if(nn2){ _authFetch('POST','/proposta/funis/'+fid+'/duplicar',{nome:nn2}).then(renderFunilCfg); } return; }
        if(fa==='ren-funil'){ var inp=document.querySelector('.fcfg-nome[data-fid="'+fid+'"]'); if(inp){ _authFetch('PATCH','/proposta/funis/'+fid,{nome:inp.value}).then(renderFunilCfg); } return; }
        if(fa==='add-etapa'){ var ei=document.querySelector('.fcfg-etapa-inp[data-fid="'+fid+'"]'); var ev=(ei&&ei.value||'').trim(); if(!ev) return; var f2=funById(fid); var et=(f2&&f2.etapas||[]).slice(); if(et.indexOf(ev)<0) et.push(ev); _authFetch('PATCH','/proposta/funis/'+fid,{etapas:et}).then(renderFunilCfg); return; }
        if(fa==='del-etapa'){ var dv=fc.getAttribute('data-v'); var f3=funById(fid); var et2=(f3&&f3.etapas||[]).filter(function(x){return x!==dv;}); _authFetch('PATCH','/proposta/funis/'+fid,{etapas:et2}).then(renderFunilCfg); return; } }
      var m1b=e.target.closest && e.target.closest('#funil-root .op-m1');
      if(m1b){ e.preventDefault(); window._opTab=m1b.getAttribute('data-m1'); renderDetalhe(); return; }
      var m2b=e.target.closest && e.target.closest('#funil-root .op-m2');
      if(m2b){ e.preventDefault(); window._opPreTab=m2b.getAttribute('data-m2'); renderDetalhe(); return; }
      var hsb=e.target.closest && e.target.closest('#funil-root .op-hsub');
      if(hsb){ e.preventDefault(); window._opHistSub=hsb.getAttribute('data-hsub'); renderDetalhe(); return; }
      var tkb=e.target.closest && e.target.closest('#funil-root [data-tkact]');
      if(tkb){ e.preventDefault(); var ta=tkb.getAttribute('data-tkact'), tkid=tkb.getAttribute('data-id');
        if(ta==='nova'){ abrirTarefaModal(null, window._opDetId); return; }
        if(ta==='abrir'){ abrirTarefaModal({id:tkid}, window._opDetId); return; }
        if(ta==='del'){ if(confirm('Excluir tarefa?')){ _authFetch('DELETE','/proposta/tarefas/'+tkid).then(function(){ if(window._opDetId) abrirOpDetalhe(window._opDetId); }).catch(function(err){toast(err.message,'error');}); } return; } }
      var stg=e.target.closest && e.target.closest('#funil-root [data-stage]');
      if(stg){ e.preventDefault(); var etp=stg.getAttribute('data-stage'); var dd=window._opDet; if(dd&&etp!==dd.etapa){ _authFetch('PATCH','/proposta/oportunidades/'+dd.id,{etapa:etp}).then(function(){ abrirOpDetalhe(dd.id); }).catch(function(err){toast(err.message,'error');}); } return; }
      var tab=e.target.closest && e.target.closest('#funil-root .op-int-tab');
      if(tab){ e.preventDefault(); var tx=document.getElementById('op-int-txt'); var val=tx?tx.value:''; window._opIntTipo=tab.getAttribute('data-tipo'); renderDetalhe(); var t2=document.getElementById('op-int-txt'); if(t2){ t2.value=val; t2.focus(); } return; }
      var fb=e.target.closest && e.target.closest('#funil-root [data-fnact]');
      if(fb){ e.preventDefault(); var a=fb.getAttribute('data-fnact'), id=fb.getAttribute('data-id');
        if(a==='nova'){ abrirOpModal(null); return; }
        if(a==='detalhe'){ window._opTab='historico'; abrirOpDetalhe(id); return; }
        if(a==='voltar'){ carregarFunil(); return; }
        if(a==='editar-det'){ abrirOpModal(window._opDet); return; }
        if(a==='arquivar'){ if(confirm('Arquivar esta oportunidade?')){ _authFetch('PATCH','/proposta/oportunidades/'+id,{arquivado:true}).then(function(){ carregarFunil(); }).catch(function(err){toast(err.message,'error');}); } return; }
        if(a==='registrar'){ var t=document.getElementById('op-int-txt'); var txt=(t&&t.value||'').trim(); var fi=document.getElementById('op-int-file'); var file=(fi&&fi.files&&fi.files[0])||null; if(!txt && !file){ toast('Escreva a interação ou anexe um arquivo','error'); return; } var fd=new FormData(); fd.append('tipo', window._opIntTipo||'nota'); fd.append('texto', txt); if(file) fd.append('arquivo', file); fetch('/api/proposta/oportunidades/'+id+'/interacoes',{method:'POST',headers:{'Authorization':'Bearer '+getToken()},body:fd}).then(function(r){ if(!r.ok) throw 0; return r.json(); }).then(function(){ abrirOpDetalhe(id); }).catch(function(){ toast('Erro ao registrar','error'); }); return; } }
    });
  }
})();


/* ===== RECONCILIAÇÃO: blocos de Financeiro do outro chat (Controle financeiro/Cartão/Análise) — sobrescrevem versões anteriores ===== */
/* ===== FINANCEIRO: Finanças Empresa ===== */
(function(){
  if(!document.getElementById('css-fin-empresa')){
    var sfe=document.createElement('style'); sfe.id='css-fin-empresa';
    sfe.textContent='#page-financas-empresa .page-content{max-width:none;margin:0;padding:12px 16px}';
    document.head.appendChild(sfe);
  }
  function esc(s){ return (s==null?'':String(s)).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
  function money(n){ return 'R$ '+(Number(n)||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}); }
  function fmtData(iso){ if(!iso) return '—'; var p=(''+iso).split('-'); return p.length===3?(p[2]+'/'+p[1]+'/'+p[0]):iso; }
  var MET_LABEL={mensal:'Mensal',financiamento:'Financiamento',pontual:'Pontual',compras:'Compras'};
  var MODO_LABEL={dinheiro:'Dinheiro',pix:'Pix',credito:'Cartão Crédito',debito_automatico:'Débito automático',compras:'Compras'};
  var CAT_LABEL={despesa:'Despesa',divida:'Dívida',receita:'Receita',investimento:'Investimento',consumo:'Consumo',assinatura:'Assinatura'};
  var GRUPO_LABEL={pessoal:'👤 Pessoal',empresa:'🏢 Empresa'};
  var RESPONSAVEIS=['Anderson','Sil','Sophia','Casa','A3K'];
  var STATUS_LABEL={pago:'Pago',atrasado:'Atrasado',vencendo:'A vencer',planejado:'Planejado'};
  function stColor(st){ return {pago:'#dcfce7',atrasado:'#fecaca',vencendo:'#fef3c7'}[st]||''; }
  function stTextColor(st){ return {pago:'#15803d',atrasado:'#b91c1c',vencendo:'#92400e'}[st]||'var(--text-muted)'; }
  var _feGrupo='', _feCat='', _feConta='', _feCredor='', _feDescricao='', _feStatus='', _feMesModo='atual', _feMesEscolha='', _feResp='';
  var STATUS_COR={pago:{bg:'#dcfce7',text:'#15803d'},atrasado:{bg:'#fecaca',text:'#b91c1c'},planejado:{bg:'#f1f5f9',text:'#475569'}};
  function _feMesAtivo(){
    if(_feMesModo==='todos') return null;
    if(_feMesModo==='escolha') return _feMesEscolha||null;
    var d=new Date(); return d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2);
  }

  async function carregarFinancasEmpresa(){
    var root=document.getElementById('financas-empresa-root'); if(!root) return;
    root.innerHTML='<div class="empty-state"><div class="spinner" style="margin:0 auto"></div></div>';
    var lista=[];
    try{ lista=await _authFetch('GET','/fin/financas-empresa')||[]; }
    catch(e){ root.innerHTML='<p style="color:var(--danger)">Erro: '+esc(e.message)+'</p>'; return; }
    window._finEmpresa=lista;
    renderFinancasEmpresa();
  }
  window.carregarFinancasEmpresa=carregarFinancasEmpresa;

  function renderFinancasEmpresa(){
    var root=document.getElementById('financas-empresa-root'); if(!root||!window._finEmpresa) return;
    var lista=window._finEmpresa;
    var porGrupo=_feGrupo?lista.filter(function(x){return x.grupo===_feGrupo;}):lista;
    function chipGrupo(v,label){
      var n=v?lista.filter(function(x){return x.grupo===v;}).length:lista.length;
      var ativo=_feGrupo===v;
      return '<button class="btn btn-sm '+(ativo?'btn-primary':'btn-secondary')+'" data-fegrupo="'+v+'">'+label+' ('+n+')</button>';
    }
    function chipCat(v,label){
      var n=v?porGrupo.filter(function(x){return x.categoria===v;}).length:porGrupo.length;
      var ativo=_feCat===v;
      return '<button class="btn btn-sm '+(ativo?'btn-primary':'btn-secondary')+'" data-fecat="'+v+'">'+label+' ('+n+')</button>';
    }
    function chipMes(v,label){
      var ativo=_feMesModo===v;
      return '<button class="btn btn-sm '+(ativo?'btn-primary':'btn-secondary')+'" data-femes="'+v+'">'+label+'</button>';
    }
    function chipResp(v,label){
      var n=v?preDescricao.filter(function(x){return x.responsavel===v;}).length:preDescricao.length;
      var ativo=_feResp===v;
      return '<button class="btn btn-sm '+(ativo?'btn-primary':'btn-secondary')+'" data-feresp="'+v+'">'+label+' ('+n+')</button>';
    }
    var mesEscolhido=_feMesModo==='escolha' && _feMesEscolha;
    var mesInputStyle='padding:6px 10px;border-radius:8px;font-size:13px;border:1px solid '+(mesEscolhido?'var(--primary)':'var(--border)')+';background:'+(mesEscolhido?'var(--primary)':'#fff')+';color:'+(mesEscolhido?'#fff':'var(--text)');
    var preConta=_feCat?porGrupo.filter(function(x){return x.categoria===_feCat;}):porGrupo;
    var mesAtivo=_feMesAtivo();
    if(mesAtivo) preConta=preConta.filter(function(x){return (x.vencimento||'').slice(0,7)===mesAtivo;});
    var preCredor=_feConta?preConta.filter(function(x){return x.conta===_feConta;}):preConta;
    var preDescricao=_feCredor?preCredor.filter(function(x){return x.credor_pagador===_feCredor;}):preCredor;
    var toolbar='<div style="margin-bottom:12px">'
      +'<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:8px">'
        +'<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center"><b class="text-sm" style="display:inline-block;min-width:80px">Tipo conta:</b>'+chipGrupo('','Todos')+chipGrupo('pessoal','👤 Pessoal')+chipGrupo('empresa','🏢 Empresa')+'</div>'
        +'<button class="btn btn-primary btn-sm" data-feact="novo">＋ Novo lançamento</button>'
      +'</div>'
      +'<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:8px"><b class="text-sm" style="display:inline-block;min-width:80px">Categoria:</b>'+chipCat('','Todos')+chipCat('despesa','Despesas')+chipCat('divida','Dívidas')+chipCat('receita','Receitas')+chipCat('investimento','Investimentos')+'</div>'
      +'<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:8px"><b class="text-sm" style="display:inline-block;min-width:80px">Período:</b>'+chipMes('todos','Todos')+chipMes('atual','Mês atual')
        +'<span class="text-sm" style="'+(mesEscolhido?'color:var(--primary);font-weight:600':'')+'">Selecionar o mês</span><input type="month" id="fe-mes-escolha" value="'+esc(_feMesEscolha)+'" style="'+mesInputStyle+'">'
      +'</div>'
      +'<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">'
        +'<select id="fe-conta-filtro" style="padding:6px 10px;border:1px solid var(--border);border-radius:8px;font-size:13px">'
          +'<option value="">Todas as contas</option>'
          +Array.from(new Set(preConta.map(function(x){return x.conta;}).filter(Boolean))).sort().map(function(c){return '<option value="'+esc(c)+'"'+(_feConta===c?' selected':'')+'>'+esc(c)+'</option>';}).join('')
        +'</select>'
        +'<select id="fe-credor-filtro" style="padding:6px 10px;border:1px solid var(--border);border-radius:8px;font-size:13px">'
          +'<option value="">Todos os credores/pagadores</option>'
          +Array.from(new Set(preCredor.map(function(x){return x.credor_pagador;}).filter(Boolean))).sort().map(function(c){return '<option value="'+esc(c)+'"'+(_feCredor===c?' selected':'')+'>'+esc(c)+'</option>';}).join('')
        +'</select>'
        +'<select id="fe-descricao-filtro" style="padding:6px 10px;border:1px solid var(--border);border-radius:8px;font-size:13px">'
          +'<option value="">Todas as descrições</option>'
          +Array.from(new Set(preDescricao.map(function(x){return x.descricao;}).filter(Boolean))).sort().map(function(c){return '<option value="'+esc(c)+'"'+(_feDescricao===c?' selected':'')+'>'+esc(c)+'</option>';}).join('')
        +'</select>'
        +'<button class="btn btn-sm btn-secondary" data-feact="limpar-filtros">Limpar filtros</button>'
      +'</div>'
      +'<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:8px"><b class="text-sm" style="display:inline-block;min-width:80px">Responsável:</b>'+chipResp('','Todos')+RESPONSAVEIS.map(function(r){return chipResp(r,r);}).join('')+'</div>'
    +'</div>';
    var filtr=preDescricao;
    if(_feDescricao) filtr=filtr.filter(function(x){return x.descricao===_feDescricao;});
    if(_feResp) filtr=filtr.filter(function(x){return x.responsavel===_feResp;});
    var preStatus=filtr;
    function cardStatus(v,label){
      var col=STATUS_COR[v]||{bg:'#e2e8f0',text:'var(--text)'};
      var base=v?preStatus.filter(function(x){return v==='planejado'?(x.status==='planejado'||x.status==='vencendo'):x.status===v;}):preStatus;
      var total=base.reduce(function(s,x){var vf=(x.valor_final!=null?x.valor_final:x.valor);return s+(vf||0);},0);
      var ativo=_feStatus===v;
      return '<button data-festatus="'+v+'" style="flex:1;min-width:150px;text-align:left;border:2px solid '+(ativo?col.text:'transparent')+';background:'+col.bg+';color:'+col.text+';padding:10px 14px;border-radius:10px;cursor:pointer">'
        +'<div style="font-size:12px;font-weight:600;opacity:.85">'+label+' ('+base.length+')</div>'
        +'<div style="font-weight:700;font-size:16px">'+money(total)+'</div>'
      +'</button>';
    }
    var farol='<div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:12px">'+cardStatus('','Todos')+cardStatus('planejado','Planejado')+cardStatus('atrasado','Atrasado')+cardStatus('pago','Pago')+'</div>';
    if(_feStatus) filtr=filtr.filter(function(x){return _feStatus==='planejado'?(x.status==='planejado'||x.status==='vencendo'):x.status===_feStatus;});
    filtr=filtr.slice().sort(function(a,b){return (a.vencimento||'').localeCompare(b.vencimento||'');});
    var rows=filtr.map(function(p){
      var parc=(p.total_parcelas&&p.total_parcelas>1)?(p.numero+'/'+p.total_parcelas):'—';
      var bg=stColor(p.status);
      var vf=(p.valor_final!=null?p.valor_final:p.valor);
      var vfCor=vf===p.valor?'inherit':(vf<p.valor?'#15803d':'#b91c1c');
      return '<tr style="background:'+(bg||'transparent')+'">'
        +'<td>'+(p.grupo?(GRUPO_LABEL[p.grupo]||p.grupo):'—')+'</td>'
        +'<td>'+(p.categoria?(CAT_LABEL[p.categoria]||p.categoria):'—')+'</td>'
        +'<td>'+esc(p.responsavel||'—')+'</td>'
        +'<td>'+esc(p.conta||'—')+'</td>'
        +'<td>'+esc(p.descricao||'—')+'</td>'
        +'<td>'+esc(p.credor_pagador||'—')+'</td>'
        +'<td>'+(MET_LABEL[p.metodo]||p.metodo)+'</td>'
        +'<td>'+(p.modo_pagamento?(MODO_LABEL[p.modo_pagamento]||p.modo_pagamento):'—')+'</td>'
        +'<td style="text-align:center">'+parc+'</td>'
        +'<td>'+fmtData(p.vencimento)+'</td>'
        +'<td style="text-align:right;font-weight:600">'+money(p.valor)+'</td>'
        +'<td style="text-align:right;font-weight:600;color:'+vfCor+'">'+money(vf)+'</td>'
        +'<td><span style="font-weight:600;color:'+stTextColor(p.status)+'">'+(STATUS_LABEL[p.status]||p.status)+'</span></td>'
        +'<td style="text-align:center;white-space:nowrap"><span style="display:inline-flex;align-items:center;gap:16px">'
          +'<button class="fel-ic" data-feact="detalhe" data-id="'+p.id+'" title="Detalhes, observação e anexos">👁'+((p.anexos&&p.anexos.length)?'<sup>'+p.anexos.length+'</sup>':'')+'</button>'
          +'<button class="fel-ic" data-feact="editar" data-id="'+p.id+'" title="Editar">✏️</button>'
          +'<button class="fel-ic" data-feact="excluir-parcela" data-id="'+p.id+'" title="Excluir esta parcela" style="color:var(--danger)">🗑️</button>'
        +'</span></td></tr>';
    }).join('');
    var head='<thead><tr><th>Grupo</th><th>Categoria</th><th>Responsável</th><th>Conta</th><th>Descrição</th><th>Credor/Pagador</th><th>Pagamento</th><th>Modo Pagamento</th><th>Parcela</th><th>Vencimento</th><th style="text-align:right">Valor</th><th style="text-align:right">Valor Final</th><th>Status</th><th></th></tr></thead>';
    root.innerHTML=toolbar+farol+'<table class="tabela-contatos">'+head+'<tbody>'+(rows||'<tr><td colspan="14" style="text-align:center;padding:20px;color:var(--text-muted)">Nenhum registro</td></tr>')+'</tbody></table>';
  }

  function labelData(metodo){ return metodo==='financiamento'?'Data de início':'Data de pagamento'; }

  function abrirFinNovoModal(){
    var ov=document.getElementById('fe-modal'); if(ov) ov.remove();
    ov=document.createElement('div'); ov.id='fe-modal';
    ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;display:flex;align-items:flex-start;justify-content:center;padding:16px;overflow:auto';
    document.body.appendChild(ov);
    function fechar(){ ov.remove(); }
    function lerCampos(){
      return {
        grupo: document.getElementById('fe-grupo').value,
        categoria: document.getElementById('fe-categoria').value,
        responsavel: document.getElementById('fe-responsavel').value,
        metodo: document.getElementById('fe-metodo').value,
        conta: document.getElementById('fe-conta').value,
        descricao: document.getElementById('fe-descricao').value,
        credor: document.getElementById('fe-credor').value,
        valor: document.getElementById('fe-valor').value,
        data: document.getElementById('fe-data').value,
        parcelas: document.getElementById('fe-parcelas') ? document.getElementById('fe-parcelas').value : '',
        modo: document.getElementById('fe-modo').value
      };
    }
    function render(v){
      v=v||{};
      var metodo=v.metodo||'pontual', categoria=v.categoria||(_feCat||'despesa'), grupoAtual=v.grupo||(_feGrupo||'empresa');
      var catOpts=['despesa','divida','receita','investimento'].map(function(c){return '<option value="'+c+'"'+(c===categoria?' selected':'')+'>'+CAT_LABEL[c]+'</option>';}).join('');
      var grupoOpts=['pessoal','empresa'].map(function(g){return '<option value="'+g+'"'+(g===grupoAtual?' selected':'')+'>'+GRUPO_LABEL[g]+'</option>';}).join('');
      var respOpts='<option value="">— não definido —</option>'+RESPONSAVEIS.map(function(r){return '<option value="'+r+'"'+(v.responsavel===r?' selected':'')+'>'+r+'</option>';}).join('');
      var modoOpts=['','dinheiro','pix','credito','debito_automatico','compras'].map(function(m){return '<option value="'+m+'"'+((v.modo||'')===m?' selected':'')+'>'+(m?MODO_LABEL[m]:'— definir depois —')+'</option>';}).join('');
      ov.innerHTML='<div style="background:#fff;border-radius:12px;max-width:560px;width:100%;max-height:92vh;display:flex;flex-direction:column">'
        +'<div style="flex-shrink:0;border-bottom:1px solid var(--border);padding:12px 18px;display:flex;justify-content:space-between;align-items:center"><h3 style="margin:0">Novo lançamento</h3><div style="display:flex;align-items:center;gap:8px">'
          +'<button class="btn btn-sm btn-secondary" data-x="salvar" title="Salvar" style="padding:6px 10px">💾</button>'
          +'<button class="btn btn-sm" data-x="close" title="Fechar" style="background:transparent;border:none;color:var(--danger);font-weight:700;font-size:16px;line-height:1;padding:6px 8px">✕</button>'
        +'</div></div>'
        +'<div style="overflow:auto;padding:18px">'
        +'<div style="display:flex;gap:10px;flex-wrap:wrap">'
          +'<div class="form-group" style="flex:1;min-width:130px"><label class="form-label">Grupo</label><select id="fe-grupo" class="form-control">'+grupoOpts+'</select></div>'
          +'<div class="form-group" style="flex:1;min-width:150px"><label class="form-label">Categoria</label><select id="fe-categoria" class="form-control">'+catOpts+'</select></div>'
          +'<div class="form-group" style="flex:1;min-width:150px"><label class="form-label">Pagamento</label><select id="fe-metodo" class="form-control"><option value="pontual"'+(metodo==='pontual'?' selected':'')+'>Pontual</option><option value="mensal"'+(metodo==='mensal'?' selected':'')+'>Mensal</option><option value="financiamento"'+(metodo==='financiamento'?' selected':'')+'>Financiamento</option></select></div>'
        +'</div>'
        +'<div class="form-group"><label class="form-label">Conta</label><input id="fe-conta" class="form-control" value="'+esc(v.conta||'')+'"></div>'
        +'<div class="form-group"><label class="form-label">Responsável</label><select id="fe-responsavel" class="form-control">'+respOpts+'</select></div>'
        +'<div class="form-group"><label class="form-label">Descrição</label><input id="fe-descricao" class="form-control" value="'+esc(v.descricao||'')+'"></div>'
        +'<div style="display:flex;gap:10px;flex-wrap:wrap">'
          +'<div class="form-group" style="flex:1;min-width:160px"><label class="form-label">Credor/Pagador</label><input id="fe-credor" class="form-control" value="'+esc(v.credor||'')+'"></div>'
          +'<div class="form-group" style="flex:1;min-width:120px"><label class="form-label">Valor</label><input id="fe-valor" type="number" step="0.01" class="form-control" value="'+esc(v.valor||'')+'"></div>'
        +'</div>'
        +'<div style="display:flex;gap:10px;flex-wrap:wrap">'
          +'<div class="form-group" style="flex:1;min-width:160px"><label class="form-label">'+labelData(metodo)+'</label><input id="fe-data" type="date" class="form-control" value="'+esc(v.data||'')+'"></div>'
          +(metodo==='financiamento'?'<div class="form-group" style="flex:1;min-width:140px"><label class="form-label">Nº de parcelas</label><input id="fe-parcelas" type="number" min="1" class="form-control" value="'+esc(v.parcelas||'')+'"></div>':'')
        +'</div>'
        +'<div class="form-group"><label class="form-label">Modo de pagamento</label><select id="fe-modo" class="form-control">'+modoOpts+'</select></div>'
        +(metodo==='mensal'?'<p class="text-sm text-muted">Serão geradas 12 parcelas mensais a partir da data informada, mesmo dia dos meses seguintes.</p>':'')
        +(metodo==='financiamento'?'<p class="text-sm text-muted">As datas de vencimento de cada parcela podem ser ajustadas depois, individualmente.</p>':'')
        +'</div></div>';
    }
    ov.addEventListener('click', async function(e){
      if(e.target===ov){ fechar(); return; }
      var x=e.target.closest('[data-x]'); if(!x) return; var act=x.getAttribute('data-x');
      if(act==='close') fechar();
      else if(act==='salvar'){
        var metodo=document.getElementById('fe-metodo').value;
        var numParcelas=metodo==='financiamento'?(parseInt(document.getElementById('fe-parcelas').value)||0):null;
        if(metodo==='financiamento' && !numParcelas){ toast('Informe o número de parcelas','error'); return; }
        var dataInicio=document.getElementById('fe-data').value;
        if(!dataInicio){ toast('Informe a data','error'); return; }
        var payload={
          grupo: document.getElementById('fe-grupo').value,
          categoria: document.getElementById('fe-categoria').value,
          responsavel: document.getElementById('fe-responsavel').value||null,
          metodo: metodo,
          conta: document.getElementById('fe-conta').value||null,
          descricao: document.getElementById('fe-descricao').value||null,
          credor_pagador: document.getElementById('fe-credor').value||null,
          valor: parseFloat(document.getElementById('fe-valor').value)||0,
          data_inicio: dataInicio,
          numero_parcelas: numParcelas,
          modo_pagamento: document.getElementById('fe-modo').value||null
        };
        try{ await _authFetch('POST','/fin/financas-empresa',payload); toast('Lançamento criado','success'); fechar(); carregarFinancasEmpresa(); }
        catch(err){ toast('Erro: '+err.message,'error'); }
      }
    });
    ov.addEventListener('change', function(e){
      if(e.target.id==='fe-metodo'){ render(lerCampos()); }
    });
    render();
  }

  function abrirFinEditModal(parcela){
    var ov=document.getElementById('fe-edit-modal'); if(ov) ov.remove();
    ov=document.createElement('div'); ov.id='fe-edit-modal';
    ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;display:flex;align-items:flex-start;justify-content:center;padding:16px;overflow:auto';
    document.body.appendChild(ov);
    var state=JSON.parse(JSON.stringify(parcela));
    function fechar(){ ov.remove(); carregarFinancasEmpresa(); }
    function jurosDescontoHtml(){
      if(!state.pago_em) return '';
      var jr=state.juros!=null?state.juros:0, ds=state.desconto!=null?state.desconto:0;
      var base=parseFloat(state.valor)||0;
      var totalFinal=base+(parseFloat(jr)||0)-(parseFloat(ds)||0);
      return '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:8px">'
        +'<div class="form-group" style="flex:1;min-width:110px"><label class="form-label">Juros (+)</label><input id="fee-juros" type="number" step="0.01" min="0" class="form-control" value="'+jr+'"></div>'
        +'<div class="form-group" style="flex:1;min-width:110px"><label class="form-label">Desconto (−)</label><input id="fee-desconto" type="number" step="0.01" min="0" class="form-control" value="'+ds+'"></div>'
        +'</div><div id="fee-total-final" class="text-sm" style="font-weight:600;margin-top:2px">Novo valor total: '+money(totalFinal)+'</div>';
    }
    function render(){
      var pagoInfo=state.pago_em?('<div class="text-sm" style="color:#15803d;margin-top:4px">Pago em '+fmtData(state.pago_em)+'</div>'):'';
      var anexos=(state.anexos||[]);
      var anexosHtml=anexos.length
        ? anexos.map(function(u){ return '<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px"><a href="'+esc(u)+'" target="_blank" style="color:var(--primary);font-size:13px">📎 '+esc(u.split('/').pop())+'</a><button class="btn btn-sm btn-secondary fee-del-anexo" data-url="'+esc(u)+'" style="color:var(--danger);padding:2px 6px">×</button></div>'; }).join('')
        : '<div class="text-sm text-muted" style="margin-bottom:6px">Nenhum arquivo anexado</div>';
      ov.innerHTML='<div style="background:#fff;border-radius:12px;max-width:560px;width:100%;max-height:92vh;display:flex;flex-direction:column">'
        +'<div style="flex-shrink:0;border-bottom:1px solid var(--border);padding:12px 18px;display:flex;justify-content:space-between;align-items:center"><h3 style="margin:0">Editar lançamento</h3><div style="display:flex;align-items:center;gap:8px">'
          +'<button class="btn btn-sm btn-success" data-x="toggle-pago">'+(state.pago_em?'✓ Pago':'Pago')+'</button>'
          +'<button class="btn btn-sm btn-secondary" data-x="salvar" title="Salvar" style="padding:6px 10px">💾</button>'
          +'<button class="btn btn-sm" data-x="close" title="Fechar" style="background:transparent;border:none;color:var(--danger);font-weight:700;font-size:16px;line-height:1;padding:6px 8px">✕</button>'
        +'</div></div>'
        +'<div style="overflow:auto;padding:18px">'
        +'<div style="display:flex;gap:10px;flex-wrap:wrap">'
          +'<div class="form-group" style="flex:1;min-width:130px"><label class="form-label">Grupo</label><select id="fee-grupo" class="form-control">'
            +['','pessoal','empresa'].map(function(g){ return '<option value="'+g+'"'+(state.grupo===g?' selected':'')+'>'+(g?GRUPO_LABEL[g]:'— não definido —')+'</option>'; }).join('')
          +'</select></div>'
          +'<div class="form-group" style="flex:1;min-width:150px"><label class="form-label">Categoria</label><select id="fee-categoria" class="form-control">'
            +['despesa','divida','receita','investimento'].map(function(c){ return '<option value="'+c+'"'+(state.categoria===c?' selected':'')+'>'+CAT_LABEL[c]+'</option>'; }).join('')
          +'</select></div>'
        +'</div>'
        +'<div class="form-group"><label class="form-label">Conta</label><input id="fee-conta" class="form-control" value="'+esc(state.conta||'')+'"></div>'
        +'<div class="form-group"><label class="form-label">Responsável</label><select id="fee-responsavel" class="form-control">'
          +'<option value="">— não definido —</option>'+RESPONSAVEIS.map(function(r){ return '<option value="'+r+'"'+(state.responsavel===r?' selected':'')+'>'+r+'</option>'; }).join('')
        +'</select></div>'
        +'<div class="form-group"><label class="form-label">Descrição</label><input id="fee-descricao" class="form-control" value="'+esc(state.descricao||'')+'"></div>'
        +'<div class="form-group"><label class="form-label">Credor/Pagador</label><input id="fee-credor" class="form-control" value="'+esc(state.credor_pagador||'')+'"></div>'
        +'<div style="display:flex;gap:10px;flex-wrap:wrap">'
          +'<div class="form-group" style="flex:1;min-width:150px"><label class="form-label">Vencimento'+(state.total_parcelas>1?' (parcela '+state.numero+'/'+state.total_parcelas+')':'')+'</label><input id="fee-vencimento" type="date" class="form-control" value="'+esc(state.vencimento||'')+'"></div>'
          +'<div class="form-group" style="flex:1;min-width:120px"><label class="form-label">Valor</label><input id="fee-valor" type="number" step="0.01" class="form-control" value="'+(state.valor!=null?state.valor:'')+'"></div>'
        +'</div>'
        +'<div class="form-group"><label class="form-label">Modo de pagamento</label><select id="fee-modo" class="form-control">'
          +['','dinheiro','pix','credito','debito_automatico','compras'].map(function(m){ return '<option value="'+m+'"'+(state.modo_pagamento===m?' selected':'')+'>'+(m?MODO_LABEL[m]:'— não definido —')+'</option>'; }).join('')
        +'</select></div>'
        +(state.pago_em?('<div class="form-group" id="fee-pago-box">'+pagoInfo+jurosDescontoHtml()+'</div>'):'')
        +'<div class="form-group"><label class="form-label">Observação</label><textarea id="fee-obs" class="form-control" rows="3">'+esc(state.observacao||'')+'</textarea></div>'
        +'<hr style="margin:12px 0;border:none;border-top:1px solid var(--border)">'
        +'<label class="form-label">Arquivos (fatura, comprovante, etc — foto ou PDF)</label>'+anexosHtml+'<input type="file" id="fee-anexo" accept="image/*,.pdf" multiple>'
        +'</div></div>';
    }
    ov.addEventListener('click', async function(e){
      if(e.target===ov){ fechar(); return; }
      var da=e.target.closest('.fee-del-anexo'); if(da){
        try{ var r=await _authFetch('DELETE','/fin/financas-empresa/parcelas/'+state.id+'/anexo',{url:da.getAttribute('data-url')}); state.anexos=r.anexos; render(); }
        catch(err){ toast(err.message,'error'); }
        return;
      }
      var x=e.target.closest('[data-x]'); if(!x) return; var act=x.getAttribute('data-x');
      if(act==='close') fechar();
      else if(act==='toggle-pago'){
        if(state.pago_em){ state.pago_em=null; }
        else { state.pago_em=new Date().toISOString().slice(0,10); if(state.juros==null) state.juros=0; if(state.desconto==null) state.desconto=0; }
        render();
      }
      else if(act==='salvar'){
        try{
          var grupoSel=document.getElementById('fee-grupo').value;
          if(!grupoSel){ toast('Selecione o Grupo (Pessoal ou Empresa)','error'); return; }
          await _authFetch('PATCH','/fin/financas-empresa/lancamentos/'+state.lancamento_id,{
            grupo: grupoSel,
            categoria: document.getElementById('fee-categoria').value,
            conta: document.getElementById('fee-conta').value||null,
            responsavel: document.getElementById('fee-responsavel').value||null,
            descricao: document.getElementById('fee-descricao').value||null,
            credor_pagador: document.getElementById('fee-credor').value||null
          });
          var patchParcela={
            vencimento: document.getElementById('fee-vencimento').value,
            valor: parseFloat(document.getElementById('fee-valor').value)||0,
            pago_em: state.pago_em||null,
            modo_pagamento: document.getElementById('fee-modo').value||null,
            observacao: document.getElementById('fee-obs').value||null
          };
          if(state.pago_em){
            var jEl=document.getElementById('fee-juros'), dEl=document.getElementById('fee-desconto');
            patchParcela.juros=jEl?Math.max(0,parseFloat(jEl.value)||0):0;
            patchParcela.desconto=dEl?Math.max(0,parseFloat(dEl.value)||0):0;
          }
          await _authFetch('PATCH','/fin/financas-empresa/parcelas/'+state.id,patchParcela);
          toast('Salvo','success'); fechar();
        }catch(err){ toast('Erro: '+err.message,'error'); }
      }
    });
    ov.addEventListener('input', function(e){
      if(e.target.id==='fee-juros'||e.target.id==='fee-desconto'){
        if(parseFloat(e.target.value)<0) e.target.value='0';
      }
      if(e.target.id==='fee-juros'||e.target.id==='fee-desconto'||e.target.id==='fee-valor'){
        var jr=Math.max(0,parseFloat((document.getElementById('fee-juros')||{}).value)||0);
        var ds=Math.max(0,parseFloat((document.getElementById('fee-desconto')||{}).value)||0);
        var base=parseFloat(document.getElementById('fee-valor').value)||0;
        var tot=document.getElementById('fee-total-final'); if(tot) tot.textContent='Novo valor total: '+money(base+jr-ds);
      }
    });
    ov.addEventListener('change', async function(e){
      var f=e.target.closest('#fee-anexo'); if(f && f.files && f.files.length){
        for(var i=0;i<f.files.length;i++){
          var fd=new FormData(); fd.append('arquivo',f.files[i]);
          try{
            var r=await fetch('/api/fin/financas-empresa/parcelas/'+state.id+'/anexo',{method:'POST',headers:{'Authorization':'Bearer '+getToken()},body:fd});
            var data=await r.json();
            if(r.ok){ state.anexos=data.anexos; } else { toast('Erro anexo: '+(data.detail||r.status),'error'); }
          }catch(err){ toast('Falha no anexo: '+err.message,'error'); }
        }
        toast('Arquivo(s) anexado(s)','success'); render();
      }
    });
    render();
  }

  function abrirFinDetalheModal(parcela){
    var ov=document.getElementById('fe-detalhe-modal'); if(ov) ov.remove();
    ov=document.createElement('div'); ov.id='fe-detalhe-modal';
    ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;display:flex;align-items:flex-start;justify-content:center;padding:16px;overflow:auto';
    document.body.appendChild(ov);
    var state=parcela;
    function fechar(){ ov.remove(); }
    function linha(label,val){ return '<div style="display:flex;justify-content:space-between;padding:3px 0;border-bottom:1px solid var(--border)"><span class="text-sm text-muted">'+label+'</span><span style="font-weight:600">'+val+'</span></div>'; }
    var resumo=linha('Valor original',money(state.valor))
      +(state.juros?linha('Juros',money(state.juros)):'')
      +(state.desconto?linha('Desconto','−'+money(state.desconto)):'')
      +linha('Valor final',money((parseFloat(state.valor)||0)+(parseFloat(state.juros)||0)-(parseFloat(state.desconto)||0)))
      +linha('Status',STATUS_LABEL[state.status]||state.status)
      +(state.pago_em?linha('Pago em',fmtData(state.pago_em)):'')
      +(state.modo_pagamento?linha('Modo de pagamento',MODO_LABEL[state.modo_pagamento]||state.modo_pagamento):'');
    var anexos=(state.anexos||[]);
    var anexosHtml=anexos.length
      ? anexos.map(function(u){ return '<div style="margin-bottom:4px"><a href="'+esc(u)+'" target="_blank" style="color:var(--primary);font-size:13px">📎 '+esc(u.split('/').pop())+' (visualizar/baixar)</a></div>'; }).join('')
      : '<div class="text-sm text-muted">Nenhum arquivo anexado</div>';
    ov.innerHTML='<div style="background:#fff;border-radius:12px;max-width:560px;width:100%;max-height:92vh;display:flex;flex-direction:column">'
      +'<div style="flex-shrink:0;border-bottom:1px solid var(--border);padding:12px 18px;display:flex;justify-content:space-between;align-items:center"><h3 style="margin:0">Detalhes — '+esc(state.conta||'lançamento')+'</h3><button class="btn btn-sm" data-x="close" title="Fechar" style="background:transparent;border:none;color:var(--danger);font-weight:700;font-size:16px;line-height:1;padding:6px 8px">✕</button></div>'
      +'<div style="overflow:auto;padding:18px">'
      +'<div class="card mb-4" style="border:1px solid var(--border);border-radius:8px;padding:10px 12px">'+resumo+'</div>'
      +'<div class="form-group"><label class="form-label">Observação</label><div class="text-sm" style="white-space:pre-wrap">'+(state.observacao?esc(state.observacao):'<span class="text-muted">Nenhuma observação</span>')+'</div></div>'
      +'<hr style="margin:12px 0;border:none;border-top:1px solid var(--border)">'
      +'<label class="form-label">Arquivos</label>'+anexosHtml
      +'</div></div>';
    ov.addEventListener('click', function(e){
      if(e.target===ov){ fechar(); return; }
      var x=e.target.closest('[data-x]'); if(x && x.getAttribute('data-x')==='close') fechar();
    });
  }

  if(!window._feBound){
    window._feBound=true;
    document.addEventListener('click', function(e){
      var chipGrupoBtn=e.target.closest && e.target.closest('#financas-empresa-root [data-fegrupo]'); if(chipGrupoBtn){ _feGrupo=chipGrupoBtn.getAttribute('data-fegrupo'); renderFinancasEmpresa(); return; }
      var chipBtn=e.target.closest && e.target.closest('#financas-empresa-root [data-fecat]'); if(chipBtn){ _feCat=chipBtn.getAttribute('data-fecat'); renderFinancasEmpresa(); return; }
      var chipMesBtn=e.target.closest && e.target.closest('#financas-empresa-root [data-femes]'); if(chipMesBtn){ _feMesModo=chipMesBtn.getAttribute('data-femes'); renderFinancasEmpresa(); return; }
      var chipRespBtn=e.target.closest && e.target.closest('#financas-empresa-root [data-feresp]'); if(chipRespBtn){ _feResp=chipRespBtn.getAttribute('data-feresp'); renderFinancasEmpresa(); return; }
      var cardStatusBtn=e.target.closest && e.target.closest('#financas-empresa-root [data-festatus]'); if(cardStatusBtn){ var vv=cardStatusBtn.getAttribute('data-festatus'); _feStatus=(_feStatus===vv)?'':vv; renderFinancasEmpresa(); return; }
      var b=e.target.closest && e.target.closest('#financas-empresa-root [data-feact]'); if(b){
        var act=b.getAttribute('data-feact'), id=b.getAttribute('data-id');
        if(act==='novo'){ abrirFinNovoModal(); return; }
        if(act==='editar'){ var p=(window._finEmpresa||[]).filter(function(x){return x.id===id;})[0]; if(p) abrirFinEditModal(p); return; }
        if(act==='detalhe'){ var pd=(window._finEmpresa||[]).filter(function(x){return x.id===id;})[0]; if(pd) abrirFinDetalheModal(pd); return; }
        if(act==='excluir-parcela'){ if(confirm('Excluir esta parcela?')){ _authFetch('DELETE','/fin/financas-empresa/parcelas/'+id).then(carregarFinancasEmpresa).catch(function(err){toast(err.message,'error');}); } return; }
        if(act==='limpar-filtros'){ _feGrupo=''; _feCat=''; _feConta=''; _feCredor=''; _feDescricao=''; _feStatus=''; _feMesModo='todos'; _feMesEscolha=''; _feResp=''; renderFinancasEmpresa(); return; }
      }
    });
    document.addEventListener('change', function(e){
      var me=e.target.closest && e.target.closest('#fe-mes-escolha'); if(me){ _feMesEscolha=me.value; _feMesModo='escolha'; renderFinancasEmpresa(); }
      var cf=e.target.closest && e.target.closest('#fe-conta-filtro'); if(cf){ _feConta=cf.value; renderFinancasEmpresa(); }
      var crf=e.target.closest && e.target.closest('#fe-credor-filtro'); if(crf){ _feCredor=crf.value; renderFinancasEmpresa(); }
      var dsf=e.target.closest && e.target.closest('#fe-descricao-filtro'); if(dsf){ _feDescricao=dsf.value; renderFinancasEmpresa(); }
    });
    document.addEventListener('click', function(e){
      var b=e.target.closest && e.target.closest('[data-page="financas-empresa"]');
      if(b){ setTimeout(function(){ if(typeof carregarFinancasEmpresa==='function') carregarFinancasEmpresa(); }, 50); }
    });
  }
})();

/* ===== FINANCEIRO: Cartão de Crédito ===== */
(function(){
  if(!document.getElementById('css-fin-cartao')){
    var sfc=document.createElement('style'); sfc.id='css-fin-cartao';
    sfc.textContent='#page-financas-pessoais .page-content{max-width:none;margin:0;padding:12px 16px}';
    document.head.appendChild(sfc);
  }
  function esc(s){ return (s==null?'':String(s)).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
  function money(n){ return 'R$ '+(Number(n)||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}); }
  function fmtData(iso){ if(!iso) return '—'; var p=(''+iso).split('-'); return p.length===3?(p[2]+'/'+p[1]+'/'+p[0]):iso; }
  var CARTOES=[['pix','Pix'],['dinheiro','Dinheiro'],['debito','Débito'],['nubank_gesser','Nubank Gesser'],['santander','Santander'],['mercado_pago','Mercado Pago'],['nubank_sil','Nubank Sil'],['caixa','Caixa']];
  var CARTOES_REAIS=[['nubank_gesser','Nubank Gesser'],['santander','Santander'],['mercado_pago','Mercado Pago'],['nubank_sil','Nubank Sil'],['caixa','Caixa']];
  var CARTAO_LABEL={}; CARTOES.forEach(function(c){ CARTAO_LABEL[c[0]]=c[1]; });
  var METODO_PG_LABEL={cartao:'Cartão',dinheiro:'Dinheiro',pix:'Pix',debito:'Débito'};
  var MET_LABEL={avista:'À vista',parcelado:'Parcelado',recorrente:'Recorrente'};
  var CAT_LABEL={despesa:'Despesa',divida:'Dívida',receita:'Receita',investimento:'Investimento',consumo:'Consumo',assinatura:'Assinatura'};
  var GRUPO_LABEL={pessoal:'Pessoal',empresa:'Empresa'};
  var RESPONSAVEIS=['Anderson','Sil','Sophia','Casa','A3K'];
  var _ccGrupo='', _ccCat='', _ccConta='', _ccMesModo='atual', _ccMesEscolha='', _ccMetodoPg='', _ccFormaPg='', _ccResp='';
  function _ccMesAtivo(){
    if(_ccMesModo==='todos') return null;
    if(_ccMesModo==='escolha') return _ccMesEscolha||null;
    var d=new Date(); return d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2);
  }

  async function carregarFinancasCartao(){
    var root=document.getElementById('financas-pessoais-root'); if(!root) return;
    root.innerHTML='<div class="empty-state"><div class="spinner" style="margin:0 auto"></div></div>';
    var resumo=[], lista=[];
    try{
      resumo=await _authFetch('GET','/fin/financas-cartao/resumo')||[];
      lista=await _authFetch('GET','/fin/financas-cartao')||[];
    }catch(e){ root.innerHTML='<p style="color:var(--danger)">Erro: '+esc(e.message)+'</p>'; return; }
    window._ccResumo=resumo; window._ccLista=lista;
    renderFinancasCartao();
  }
  window.carregarFinancasCartao=carregarFinancasCartao;

  function renderResumo(){
    var resumo=window._ccResumo||[];
    return '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px">'+resumo.map(function(r){
      return '<div class="card" style="flex:1;min-width:160px;border:1px solid var(--border);border-radius:10px;padding:12px">'
        +'<div style="font-weight:700;margin-bottom:2px">'+esc(r.nome)+'</div>'
        +'<div class="text-sm text-muted" style="margin-bottom:6px">Fatura '+fmtData(r.vencimento_fatura)+'</div>'
        +'<div style="font-weight:700">Total: '+money(r.total)+'</div>'
      +'</div>';
    }).join('')+'</div>';
  }

  function renderFinancasCartao(){
    var root=document.getElementById('financas-pessoais-root'); if(!root||!window._ccLista) return;
    var lista=window._ccLista;
    var porMetPg=_ccMetodoPg?lista.filter(function(x){return x.metodo_pg===_ccMetodoPg;}):lista;
    var porFormaPg=_ccFormaPg?porMetPg.filter(function(x){return x.metodo===_ccFormaPg;}):porMetPg;
    var porGrupo=_ccGrupo?porFormaPg.filter(function(x){return x.grupo===_ccGrupo;}):porFormaPg;
    function chipMetodoPg(v,label){
      var n=v?lista.filter(function(x){return x.metodo_pg===v;}).length:lista.length;
      var ativo=_ccMetodoPg===v;
      return '<button class="btn btn-sm '+(ativo?'btn-primary':'btn-secondary')+'" data-ccmetpg="'+v+'">'+label+' ('+n+')</button>';
    }
    function chipFormaPg(v,label){
      var n=v?porMetPg.filter(function(x){return x.metodo===v;}).length:porMetPg.length;
      var ativo=_ccFormaPg===v;
      return '<button class="btn btn-sm '+(ativo?'btn-primary':'btn-secondary')+'" data-ccformapg="'+v+'">'+label+' ('+n+')</button>';
    }
    function chipGrupo(v,label){
      var n=v?porFormaPg.filter(function(x){return x.grupo===v;}).length:porFormaPg.length;
      var ativo=_ccGrupo===v;
      return '<button class="btn btn-sm '+(ativo?'btn-primary':'btn-secondary')+'" data-ccgrupo="'+v+'">'+label+' ('+n+')</button>';
    }
    function chipCat(v,label){
      var n=v?porGrupo.filter(function(x){return x.categoria===v;}).length:porGrupo.length;
      var ativo=_ccCat===v;
      return '<button class="btn btn-sm '+(ativo?'btn-primary':'btn-secondary')+'" data-cccat="'+v+'">'+label+' ('+n+')</button>';
    }
    function chipMes(v,label){
      var ativo=_ccMesModo===v;
      return '<button class="btn btn-sm '+(ativo?'btn-primary':'btn-secondary')+'" data-ccmes="'+v+'">'+label+'</button>';
    }
    function chipResp(v,label){
      var n=v?lista.filter(function(x){return x.responsavel===v;}).length:lista.length;
      var ativo=_ccResp===v;
      return '<button class="btn btn-sm '+(ativo?'btn-primary':'btn-secondary')+'" data-ccresp="'+v+'">'+label+' ('+n+')</button>';
    }
    var toolbar='<div style="margin-bottom:12px">'
      +'<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:8px">'
        +'<div style="display:flex;gap:6px;flex-wrap:wrap">'+chipGrupo('','Todos')+chipGrupo('pessoal','Pessoal')+chipGrupo('empresa','Empresa')+'</div>'
        +'<button class="btn btn-primary btn-sm" data-ccact="novo">＋ Nova compra</button>'
      +'</div>'
      +'<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px">'+chipCat('','Todos')+chipCat('despesa','Despesas')+chipCat('consumo','Consumo')+chipCat('assinatura','Assinatura')+'</div>'
      +'<div style="display:flex;gap:18px;flex-wrap:wrap;align-items:center;margin-bottom:8px">'
        +'<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center"><b class="text-sm" style="display:inline-block;min-width:90px">Método PG:</b>'+chipMetodoPg('','Todos')+chipMetodoPg('cartao','Cartão')+chipMetodoPg('dinheiro','Dinheiro')+chipMetodoPg('pix','Pix')+chipMetodoPg('debito','Débito')+'</div>'
        +'<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center"><b class="text-sm" style="display:inline-block;min-width:80px">Forma PG:</b>'+chipFormaPg('','Todos')+chipFormaPg('avista','À vista')+chipFormaPg('parcelado','Parcelado')+chipFormaPg('recorrente','Recorrente')+'</div>'
      +'</div>'
      +'<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center">'+chipMes('atual','Fatura do mês atual')+chipMes('todos','Todas as faturas')+'<input type="month" id="cc-mes-escolha" value="'+esc(_ccMesEscolha)+'" style="padding:4px 6px;border:1px solid var(--border);border-radius:8px;font-size:13px">'
        +'<select id="cc-conta-filtro" style="padding:4px 6px;border:1px solid var(--border);border-radius:8px;font-size:13px">'
          +'<option value="">Todas as contas</option>'
          +Array.from(new Set(lista.map(function(x){return x.conta;}).filter(Boolean))).sort().map(function(c){return '<option value="'+esc(c)+'"'+(_ccConta===c?' selected':'')+'>'+esc(c)+'</option>';}).join('')
        +'</select>'
      +'</div>'
      +'<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:8px"><b class="text-sm" style="display:inline-block;min-width:80px">Responsável:</b>'+chipResp('','Todos')+RESPONSAVEIS.map(function(r){return chipResp(r,r);}).join('')+'</div>'
    +'</div>';
    var filtr=_ccCat?porGrupo.filter(function(x){return x.categoria===_ccCat;}):porGrupo;
    var mesAtivo=_ccMesAtivo();
    if(mesAtivo) filtr=filtr.filter(function(x){return (x.vencimento_fatura||'').slice(0,7)===mesAtivo;});
    if(_ccConta) filtr=filtr.filter(function(x){return x.conta===_ccConta;});
    if(_ccResp) filtr=filtr.filter(function(x){return x.responsavel===_ccResp;});
    filtr=filtr.slice().sort(function(a,b){return (a.data_compra||'').localeCompare(b.data_compra||'');});
    var rows=filtr.map(function(p){
      var parc=(p.total_parcelas&&p.total_parcelas>1)?(p.numero+'/'+p.total_parcelas):'—';
      return '<tr>'
        +'<td>'+(p.grupo?(GRUPO_LABEL[p.grupo]||p.grupo):'—')+'</td>'
        +'<td>'+(p.categoria?(CAT_LABEL[p.categoria]||p.categoria):'—')+'</td>'
        +'<td>'+esc(p.responsavel||'—')+'</td>'
        +'<td>'+(CARTAO_LABEL[p.cartao]||p.cartao||'—')+'</td>'
        +'<td>'+(MET_LABEL[p.metodo]||p.metodo)+'</td>'
        +'<td style="text-align:center">'+parc+'</td>'
        +'<td>'+esc(p.conta||'—')+'</td>'
        +'<td>'+esc(p.sub_conta||'—')+'</td>'
        +'<td>'+esc(p.descricao||'—')+'</td>'
        +'<td>'+esc(p.credor_pagador||'—')+'</td>'
        +'<td>'+fmtData(p.data_compra)+'</td>'
        +'<td style="text-align:right;font-weight:600">'+money(p.valor)+'</td>'
        +'<td>'+fmtData(p.vencimento_fatura)+'</td>'
        +'<td style="text-align:center;white-space:nowrap"><span style="display:inline-flex;align-items:center;gap:16px">'
          +'<button class="fel-ic" data-ccact="detalhe" data-id="'+p.id+'" title="Detalhes, observação e anexos">👁'+((p.anexos&&p.anexos.length)?'<sup>'+p.anexos.length+'</sup>':'')+'</button>'
          +'<button class="fel-ic" data-ccact="editar" data-id="'+p.id+'" title="Editar">✏️</button>'
          +'<button class="fel-ic" data-ccact="excluir-parcela" data-id="'+p.id+'" title="Excluir esta parcela" style="color:var(--danger)">🗑️</button>'
        +'</span></td></tr>';
    }).join('');
    var head='<thead><tr><th>Grupo</th><th>Categoria</th><th>Responsável</th><th>Meio PG</th><th>Forma PG</th><th>Parcela</th><th>Conta</th><th>Sub Conta</th><th>Descrição</th><th>Credor/Pagador</th><th>Compra</th><th style="text-align:right">Valor</th><th>Vencimento Fatura</th><th></th></tr></thead>';
    root.innerHTML=renderResumo()+toolbar+'<table class="tabela-contatos">'+head+'<tbody>'+(rows||'<tr><td colspan="14" style="text-align:center;padding:20px;color:var(--text-muted)">Nenhuma compra</td></tr>')+'</tbody></table>';
  }

  function labelCartaoOpts(sel){
    return CARTOES_REAIS.map(function(c){return '<option value="'+c[0]+'"'+(c[0]===sel?' selected':'')+'>'+c[1]+'</option>';}).join('');
  }

  function abrirCcNovoModal(){
    var ov=document.getElementById('cc-modal'); if(ov) ov.remove();
    ov=document.createElement('div'); ov.id='cc-modal';
    ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;display:flex;align-items:flex-start;justify-content:center;padding:16px;overflow:auto';
    document.body.appendChild(ov);
    function fechar(){ ov.remove(); }
    function lerParcelasAtuais(){
      var arr=[], i=0, el;
      while((el=document.getElementById('cc-parc-'+i))){ arr.push(el.value); i++; }
      return arr;
    }
    function splitParcelas(total,n){
      total=parseFloat(total)||0; n=parseInt(n)||1;
      var base=Math.floor((total/n)*100)/100;
      var arr=[]; for(var i=0;i<n;i++) arr.push(base);
      var soma=Math.round(base*n*100)/100;
      var resto=Math.round((total-soma)*100)/100;
      arr[n-1]=Math.round((arr[n-1]+resto)*100)/100;
      return arr;
    }
    function atualizarSomaParcelas(){
      var el=document.getElementById('cc-parc-soma'); if(!el) return;
      var vals=lerParcelasAtuais().map(function(v){return parseFloat(v)||0;});
      var soma=vals.reduce(function(a,b){return a+b;},0);
      var compra=parseFloat(document.getElementById('cc-valor').value)||0;
      var dif=Math.round((compra-soma)*100)/100;
      el.innerHTML='Soma das parcelas: '+money(soma)+(dif!==0?(' · <span style="color:#b91c1c">diferença de '+money(Math.abs(dif))+' em relação à compra</span>'):' · confere com a compra ✓');
    }
    function renderLinhasParcelas(qtd, valoresExistentes){
      var box=document.getElementById('cc-parcelas-rows'); if(!box) return;
      if(!qtd){ box.innerHTML=''; return; }
      var vals=(valoresExistentes && valoresExistentes.length===qtd) ? valoresExistentes : splitParcelas(document.getElementById('cc-valor').value, qtd);
      var html='<label class="form-label">Valor de cada parcela</label><div style="display:flex;flex-wrap:wrap;gap:8px">';
      for(var i=0;i<qtd;i++){
        html+='<div style="flex:1;min-width:90px"><label class="text-sm text-muted">Parc. '+(i+1)+'/'+qtd+'</label><input id="cc-parc-'+i+'" type="number" step="0.01" class="form-control cc-parc-input" value="'+(vals[i]!=null?vals[i]:'')+'"></div>';
      }
      html+='</div><div id="cc-parc-soma" class="text-sm text-muted" style="margin-top:4px"></div>';
      box.innerHTML=html;
      atualizarSomaParcelas();
    }
    function lerCampos(){
      var cartaoEl=document.getElementById('cc-cartao');
      return {
        grupo: document.getElementById('cc-grupo').value,
        metodoPg: document.getElementById('cc-metodopg').value,
        cartao: cartaoEl?cartaoEl.value:'',
        categoria: document.getElementById('cc-categoria').value,
        metodo: document.getElementById('cc-metodo').value,
        conta: document.getElementById('cc-conta').value,
        subConta: document.getElementById('cc-sub-conta').value,
        descricao: document.getElementById('cc-descricao').value,
        responsavel: document.getElementById('cc-responsavel').value,
        credor: document.getElementById('cc-credor').value,
        valor: document.getElementById('cc-valor').value,
        data: document.getElementById('cc-data').value,
        parcelas: document.getElementById('cc-parcelas') ? document.getElementById('cc-parcelas').value : '',
        parcelasValores: lerParcelasAtuais()
      };
    }
    function render(v){
      v=v||{};
      var metodo=v.metodo||'avista', categoria=v.categoria||(_ccCat||'despesa'), grupoAtual=v.grupo||(_ccGrupo||'empresa');
      var metodoPg=v.metodoPg||'cartao';
      var qtd=metodo==='parcelado'?(parseInt(v.parcelas)||0):0;
      var catOpts=['despesa','consumo','assinatura'].map(function(c){return '<option value="'+c+'"'+(c===categoria?' selected':'')+'>'+CAT_LABEL[c]+'</option>';}).join('');
      var grupoOpts=['pessoal','empresa'].map(function(g){return '<option value="'+g+'"'+(g===grupoAtual?' selected':'')+'>'+GRUPO_LABEL[g]+'</option>';}).join('');
      var metodoPgOpts=['cartao','dinheiro','pix','debito'].map(function(m){return '<option value="'+m+'"'+(m===metodoPg?' selected':'')+'>'+METODO_PG_LABEL[m]+'</option>';}).join('');
      var respOpts='<option value="">— não definido —</option>'+RESPONSAVEIS.map(function(r){return '<option value="'+r+'"'+(v.responsavel===r?' selected':'')+'>'+r+'</option>';}).join('');
      ov.innerHTML='<div style="background:#fff;border-radius:12px;max-width:560px;width:100%;max-height:92vh;display:flex;flex-direction:column">'
        +'<div style="flex-shrink:0;border-bottom:1px solid var(--border);padding:12px 18px;display:flex;justify-content:space-between;align-items:center"><h3 style="margin:0">Nova compra</h3><div style="display:flex;align-items:center;gap:8px">'
          +'<button class="btn btn-sm btn-secondary" data-x="salvar" title="Salvar" style="padding:6px 10px">💾</button>'
          +'<button class="btn btn-sm" data-x="close" title="Fechar" style="background:transparent;border:none;color:var(--danger);font-weight:700;font-size:16px;line-height:1;padding:6px 8px">✕</button>'
        +'</div></div>'
        +'<div style="overflow:auto;padding:18px">'
        +'<div style="display:flex;gap:10px;flex-wrap:wrap">'
          +'<div class="form-group" style="flex:1;min-width:130px"><label class="form-label">Grupo</label><select id="cc-grupo" class="form-control">'+grupoOpts+'</select></div>'
          +'<div class="form-group" style="flex:1;min-width:150px"><label class="form-label">Método PG</label><select id="cc-metodopg" class="form-control">'+metodoPgOpts+'</select></div>'
        +'</div>'
        +(metodoPg==='cartao'?'<div class="form-group"><label class="form-label">Cartão</label><select id="cc-cartao" class="form-control">'+labelCartaoOpts(v.cartao)+'</select></div>':'')
        +'<div style="display:flex;gap:10px;flex-wrap:wrap">'
          +'<div class="form-group" style="flex:1;min-width:150px"><label class="form-label">Categoria</label><select id="cc-categoria" class="form-control">'+catOpts+'</select></div>'
          +'<div class="form-group" style="flex:1;min-width:150px"><label class="form-label">Forma PG</label><select id="cc-metodo" class="form-control"><option value="avista"'+(metodo==='avista'?' selected':'')+'>À vista</option><option value="parcelado"'+(metodo==='parcelado'?' selected':'')+'>Parcelado</option><option value="recorrente"'+(metodo==='recorrente'?' selected':'')+'>Recorrente</option></select></div>'
        +'</div>'
        +'<div style="display:flex;gap:10px;flex-wrap:wrap">'
          +'<div class="form-group" style="flex:1;min-width:160px"><label class="form-label">Conta</label><input id="cc-conta" class="form-control" value="'+esc(v.conta||'')+'"></div>'
          +'<div class="form-group" style="flex:1;min-width:160px"><label class="form-label">Sub Conta</label><input id="cc-sub-conta" class="form-control" value="'+esc(v.subConta||'')+'"></div>'
        +'</div>'
        +'<div class="form-group"><label class="form-label">Descrição</label><input id="cc-descricao" class="form-control" value="'+esc(v.descricao||'')+'"></div>'
        +'<div class="form-group"><label class="form-label">Responsável</label><select id="cc-responsavel" class="form-control">'+respOpts+'</select></div>'
        +'<div style="display:flex;gap:10px;flex-wrap:wrap">'
          +'<div class="form-group" style="flex:1;min-width:160px"><label class="form-label">Credor/Pagador</label><input id="cc-credor" class="form-control" value="'+esc(v.credor||'')+'"></div>'
          +'<div class="form-group" style="flex:1;min-width:120px"><label class="form-label">Valor da compra</label><input id="cc-valor" type="number" step="0.01" class="form-control" value="'+esc(v.valor||'')+'"></div>'
        +'</div>'
        +'<div style="display:flex;gap:10px;flex-wrap:wrap">'
          +'<div class="form-group" style="flex:1;min-width:160px"><label class="form-label">Data da compra</label><input id="cc-data" type="date" class="form-control" value="'+esc(v.data||'')+'"></div>'
          +(metodo==='parcelado'?'<div class="form-group" style="flex:1;min-width:140px"><label class="form-label">Nº de parcelas</label><input id="cc-parcelas" type="number" min="1" class="form-control" value="'+esc(v.parcelas||'')+'"></div>':'')
        +'</div>'
        +(metodo==='parcelado'?'<div id="cc-parcelas-rows" class="form-group"></div>':'')
        +'</div></div>';
      if(metodo==='parcelado' && qtd) renderLinhasParcelas(qtd, v.parcelasValores);
    }
    ov.addEventListener('click', async function(e){
      if(e.target===ov){ fechar(); return; }
      var x=e.target.closest('[data-x]'); if(!x) return; var act=x.getAttribute('data-x');
      if(act==='close') fechar();
      else if(act==='salvar'){
        var metodo=document.getElementById('cc-metodo').value;
        var metodoPg=document.getElementById('cc-metodopg').value;
        var numParcelas=metodo==='parcelado'?(parseInt(document.getElementById('cc-parcelas').value)||0):null;
        if(metodo==='parcelado' && !numParcelas){ toast('Informe o número de parcelas','error'); return; }
        var dataCompra=document.getElementById('cc-data').value;
        if(!dataCompra){ toast('Informe a data da compra','error'); return; }
        var cartaoEl=document.getElementById('cc-cartao');
        var payload={
          grupo: document.getElementById('cc-grupo').value,
          categoria: document.getElementById('cc-categoria').value,
          metodo_pg: metodoPg,
          cartao: metodoPg==='cartao'?(cartaoEl?cartaoEl.value:''):metodoPg,
          metodo: metodo,
          conta: document.getElementById('cc-conta').value||null,
          sub_conta: document.getElementById('cc-sub-conta').value||null,
          descricao: document.getElementById('cc-descricao').value||null,
          responsavel: document.getElementById('cc-responsavel').value||null,
          credor_pagador: document.getElementById('cc-credor').value||null,
          valor: parseFloat(document.getElementById('cc-valor').value)||0,
          data_compra: dataCompra,
          numero_parcelas: numParcelas
        };
        if(metodo==='parcelado'){
          payload.valores_parcelas=lerParcelasAtuais().map(function(v){return parseFloat(v)||0;});
        }
        try{ await _authFetch('POST','/fin/financas-cartao',payload); toast('Compra registrada','success'); fechar(); carregarFinancasCartao(); }
        catch(err){ toast('Erro: '+err.message,'error'); }
      }
    });
    ov.addEventListener('change', function(e){
      if(e.target.id==='cc-metodo' || e.target.id==='cc-parcelas' || e.target.id==='cc-metodopg'){ render(lerCampos()); }
      else if(e.target.id==='cc-valor'){ var c=lerCampos(); c.parcelasValores=null; render(c); }
    });
    ov.addEventListener('input', function(e){
      if(e.target.classList && e.target.classList.contains('cc-parc-input')){ atualizarSomaParcelas(); }
    });
    render();
  }

  function abrirCcEditModal(parcela){
    var ov=document.getElementById('cc-edit-modal'); if(ov) ov.remove();
    ov=document.createElement('div'); ov.id='cc-edit-modal';
    ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;display:flex;align-items:flex-start;justify-content:center;padding:16px;overflow:auto';
    document.body.appendChild(ov);
    var state=JSON.parse(JSON.stringify(parcela));
    function fechar(){ ov.remove(); carregarFinancasCartao(); }
    function render(){
      var anexos=(state.anexos||[]);
      var metodoPg=state.metodo_pg||'cartao';
      var anexosHtml=anexos.length
        ? anexos.map(function(u){ return '<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px"><a href="'+esc(u)+'" target="_blank" style="color:var(--primary);font-size:13px">📎 '+esc(u.split('/').pop())+'</a><button class="btn btn-sm btn-secondary cce-del-anexo" data-url="'+esc(u)+'" style="color:var(--danger);padding:2px 6px">×</button></div>'; }).join('')
        : '<div class="text-sm text-muted" style="margin-bottom:6px">Nenhum arquivo anexado</div>';
      ov.innerHTML='<div style="background:#fff;border-radius:12px;max-width:560px;width:100%;max-height:92vh;display:flex;flex-direction:column">'
        +'<div style="flex-shrink:0;border-bottom:1px solid var(--border);padding:12px 18px;display:flex;justify-content:space-between;align-items:center"><h3 style="margin:0">Editar compra</h3><div style="display:flex;align-items:center;gap:8px">'
          +'<button class="btn btn-sm btn-secondary" data-x="salvar" title="Salvar" style="padding:6px 10px">💾</button>'
          +'<button class="btn btn-sm" data-x="close" title="Fechar" style="background:transparent;border:none;color:var(--danger);font-weight:700;font-size:16px;line-height:1;padding:6px 8px">✕</button>'
        +'</div></div>'
        +'<div style="overflow:auto;padding:18px">'
        +'<div style="display:flex;gap:10px;flex-wrap:wrap">'
          +'<div class="form-group" style="flex:1;min-width:130px"><label class="form-label">Grupo</label><select id="cce-grupo" class="form-control">'
            +['pessoal','empresa'].map(function(g){ return '<option value="'+g+'"'+(state.grupo===g?' selected':'')+'>'+GRUPO_LABEL[g]+'</option>'; }).join('')
          +'</select></div>'
          +'<div class="form-group" style="flex:1;min-width:150px"><label class="form-label">Método PG</label><select id="cce-metodopg" class="form-control">'
            +['cartao','dinheiro','pix','debito'].map(function(m){ return '<option value="'+m+'"'+(metodoPg===m?' selected':'')+'>'+METODO_PG_LABEL[m]+'</option>'; }).join('')
          +'</select></div>'
        +'</div>'
        +(metodoPg==='cartao'?'<div class="form-group"><label class="form-label">Cartão</label><select id="cce-cartao" class="form-control">'+labelCartaoOpts(state.cartao)+'</select></div>':'')
        +'<div class="form-group"><label class="form-label">Categoria</label><select id="cce-categoria" class="form-control">'
          +['despesa','consumo','assinatura'].map(function(c){ return '<option value="'+c+'"'+(state.categoria===c?' selected':'')+'>'+CAT_LABEL[c]+'</option>'; }).join('')
        +'</select></div>'
        +'<div style="display:flex;gap:10px;flex-wrap:wrap">'
          +'<div class="form-group" style="flex:1;min-width:160px"><label class="form-label">Conta</label><input id="cce-conta" class="form-control" value="'+esc(state.conta||'')+'"></div>'
          +'<div class="form-group" style="flex:1;min-width:160px"><label class="form-label">Sub Conta</label><input id="cce-sub-conta" class="form-control" value="'+esc(state.sub_conta||'')+'"></div>'
        +'</div>'
        +'<div class="form-group"><label class="form-label">Descrição</label><input id="cce-descricao" class="form-control" value="'+esc(state.descricao||'')+'"></div>'
        +'<div class="form-group"><label class="form-label">Responsável</label><select id="cce-responsavel" class="form-control">'
          +'<option value="">— não definido —</option>'+RESPONSAVEIS.map(function(r){ return '<option value="'+r+'"'+(state.responsavel===r?' selected':'')+'>'+r+'</option>'; }).join('')
        +'</select></div>'
        +'<div class="form-group"><label class="form-label">Credor/Pagador</label><input id="cce-credor" class="form-control" value="'+esc(state.credor_pagador||'')+'"></div>'
        +'<div style="display:flex;gap:10px;flex-wrap:wrap">'
          +'<div class="form-group" style="flex:1;min-width:150px"><label class="form-label">Data da compra</label><input id="cce-data" type="date" class="form-control" value="'+esc(state.data_compra||'')+'"></div>'
          +'<div class="form-group" style="flex:1;min-width:120px"><label class="form-label">Valor'+(state.total_parcelas>1?' (parcela '+state.numero+'/'+state.total_parcelas+')':'')+'</label><input id="cce-valor" type="number" step="0.01" class="form-control" value="'+(state.valor!=null?state.valor:'')+'"></div>'
        +'</div>'
        +'<div class="text-sm text-muted" style="margin:-4px 0 10px">Vencimento da fatura calculado: <b>'+fmtData(state.vencimento_fatura)+'</b></div>'
        +'<div class="form-group"><label class="form-label">Observação</label><textarea id="cce-obs" class="form-control" rows="3">'+esc(state.observacao||'')+'</textarea></div>'
        +'<hr style="margin:12px 0;border:none;border-top:1px solid var(--border)">'
        +'<label class="form-label">Arquivos (nota fiscal, comprovante, etc — foto ou PDF)</label>'+anexosHtml+'<input type="file" id="cce-anexo" accept="image/*,.pdf" multiple>'
        +'</div></div>';
    }
    ov.addEventListener('click', async function(e){
      if(e.target===ov){ fechar(); return; }
      var da=e.target.closest('.cce-del-anexo'); if(da){
        try{ var r=await _authFetch('DELETE','/fin/financas-cartao/parcelas/'+state.id+'/anexo',{url:da.getAttribute('data-url')}); state.anexos=r.anexos; render(); }
        catch(err){ toast(err.message,'error'); }
        return;
      }
      var x=e.target.closest('[data-x]'); if(!x) return; var act=x.getAttribute('data-x');
      if(act==='close') fechar();
      else if(act==='salvar'){
        try{
          var metodoPgSel=document.getElementById('cce-metodopg').value;
          var cartaoEl=document.getElementById('cce-cartao');
          await _authFetch('PATCH','/fin/financas-cartao/lancamentos/'+state.lancamento_id,{
            grupo: document.getElementById('cce-grupo').value,
            categoria: document.getElementById('cce-categoria').value,
            metodo_pg: metodoPgSel,
            cartao: metodoPgSel==='cartao'?(cartaoEl?cartaoEl.value:''):metodoPgSel,
            conta: document.getElementById('cce-conta').value||null,
            sub_conta: document.getElementById('cce-sub-conta').value||null,
            descricao: document.getElementById('cce-descricao').value||null,
            responsavel: document.getElementById('cce-responsavel').value||null,
            credor_pagador: document.getElementById('cce-credor').value||null,
            data_compra: document.getElementById('cce-data').value
          });
          await _authFetch('PATCH','/fin/financas-cartao/parcelas/'+state.id,{
            valor: parseFloat(document.getElementById('cce-valor').value)||0,
            observacao: document.getElementById('cce-obs').value||null
          });
          toast('Salvo','success'); fechar();
        }catch(err){ toast('Erro: '+err.message,'error'); }
      }
    });
    ov.addEventListener('change', async function(e){
      if(e.target.id==='cce-metodopg'){ state.metodo_pg=e.target.value; render(); return; }
      var f=e.target.closest('#cce-anexo'); if(f && f.files && f.files.length){
        for(var i=0;i<f.files.length;i++){
          var fd=new FormData(); fd.append('arquivo',f.files[i]);
          try{
            var r=await fetch('/api/fin/financas-cartao/parcelas/'+state.id+'/anexo',{method:'POST',headers:{'Authorization':'Bearer '+getToken()},body:fd});
            var data=await r.json();
            if(r.ok){ state.anexos=data.anexos; } else { toast('Erro anexo: '+(data.detail||r.status),'error'); }
          }catch(err){ toast('Falha no anexo: '+err.message,'error'); }
        }
        toast('Arquivo(s) anexado(s)','success'); render();
      }
    });
    render();
  }

  function abrirCcDetalheModal(parcela){
    var ov=document.getElementById('cc-detalhe-modal'); if(ov) ov.remove();
    ov=document.createElement('div'); ov.id='cc-detalhe-modal';
    ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;display:flex;align-items:flex-start;justify-content:center;padding:16px;overflow:auto';
    document.body.appendChild(ov);
    var state=parcela;
    function fechar(){ ov.remove(); }
    function linha(label,val){ return '<div style="display:flex;justify-content:space-between;padding:3px 0;border-bottom:1px solid var(--border)"><span class="text-sm text-muted">'+label+'</span><span style="font-weight:600">'+val+'</span></div>'; }
    var resumo=linha('Cartão',CARTAO_LABEL[state.cartao]||state.cartao)
      +linha('Valor',money(state.valor))
      +linha('Compra',fmtData(state.data_compra))
      +linha('Vencimento da fatura',fmtData(state.vencimento_fatura))
      +(state.total_parcelas>1?linha('Parcela',state.numero+'/'+state.total_parcelas):'');
    var anexos=(state.anexos||[]);
    var anexosHtml=anexos.length
      ? anexos.map(function(u){ return '<div style="margin-bottom:4px"><a href="'+esc(u)+'" target="_blank" style="color:var(--primary);font-size:13px">📎 '+esc(u.split('/').pop())+' (visualizar/baixar)</a></div>'; }).join('')
      : '<div class="text-sm text-muted">Nenhum arquivo anexado</div>';
    ov.innerHTML='<div style="background:#fff;border-radius:12px;max-width:560px;width:100%;max-height:92vh;display:flex;flex-direction:column">'
      +'<div style="flex-shrink:0;border-bottom:1px solid var(--border);padding:12px 18px;display:flex;justify-content:space-between;align-items:center"><h3 style="margin:0">Detalhes — '+esc(state.conta||'compra')+'</h3><button class="btn btn-sm" data-x="close" title="Fechar" style="background:transparent;border:none;color:var(--danger);font-weight:700;font-size:16px;line-height:1;padding:6px 8px">✕</button></div>'
      +'<div style="overflow:auto;padding:18px">'
      +'<div class="card mb-4" style="border:1px solid var(--border);border-radius:8px;padding:10px 12px">'+resumo+'</div>'
      +'<div class="form-group"><label class="form-label">Observação</label><div class="text-sm" style="white-space:pre-wrap">'+(state.observacao?esc(state.observacao):'<span class="text-muted">Nenhuma observação</span>')+'</div></div>'
      +'<hr style="margin:12px 0;border:none;border-top:1px solid var(--border)">'
      +'<label class="form-label">Arquivos</label>'+anexosHtml
      +'</div></div>';
    ov.addEventListener('click', function(e){
      if(e.target===ov){ fechar(); return; }
      var x=e.target.closest('[data-x]'); if(x && x.getAttribute('data-x')==='close') fechar();
    });
  }

  if(!window._ccBound){
    window._ccBound=true;
    document.addEventListener('click', function(e){
      var chipMetPgBtn=e.target.closest && e.target.closest('#financas-pessoais-root [data-ccmetpg]'); if(chipMetPgBtn){ _ccMetodoPg=chipMetPgBtn.getAttribute('data-ccmetpg'); renderFinancasCartao(); return; }
      var chipFormaPgBtn=e.target.closest && e.target.closest('#financas-pessoais-root [data-ccformapg]'); if(chipFormaPgBtn){ _ccFormaPg=chipFormaPgBtn.getAttribute('data-ccformapg'); renderFinancasCartao(); return; }
      var chipRespBtn=e.target.closest && e.target.closest('#financas-pessoais-root [data-ccresp]'); if(chipRespBtn){ _ccResp=chipRespBtn.getAttribute('data-ccresp'); renderFinancasCartao(); return; }
      var chipGrupoBtn=e.target.closest && e.target.closest('#financas-pessoais-root [data-ccgrupo]'); if(chipGrupoBtn){ _ccGrupo=chipGrupoBtn.getAttribute('data-ccgrupo'); renderFinancasCartao(); return; }
      var chipCatBtn=e.target.closest && e.target.closest('#financas-pessoais-root [data-cccat]'); if(chipCatBtn){ _ccCat=chipCatBtn.getAttribute('data-cccat'); renderFinancasCartao(); return; }
      var chipMesBtn=e.target.closest && e.target.closest('#financas-pessoais-root [data-ccmes]'); if(chipMesBtn){ _ccMesModo=chipMesBtn.getAttribute('data-ccmes'); renderFinancasCartao(); return; }
      var b=e.target.closest && e.target.closest('#financas-pessoais-root [data-ccact]'); if(b){
        var act=b.getAttribute('data-ccact'), id=b.getAttribute('data-id');
        if(act==='novo'){ abrirCcNovoModal(); return; }
        if(act==='editar'){ var p=(window._ccLista||[]).filter(function(x){return x.id===id;})[0]; if(p) abrirCcEditModal(p); return; }
        if(act==='detalhe'){ var pd=(window._ccLista||[]).filter(function(x){return x.id===id;})[0]; if(pd) abrirCcDetalheModal(pd); return; }
        if(act==='excluir-parcela'){ if(confirm('Excluir esta parcela?')){ _authFetch('DELETE','/fin/financas-cartao/parcelas/'+id).then(carregarFinancasCartao).catch(function(err){toast(err.message,'error');}); } return; }
      }
    });
    document.addEventListener('change', function(e){
      var me=e.target.closest && e.target.closest('#cc-mes-escolha'); if(me){ _ccMesEscolha=me.value; _ccMesModo='escolha'; renderFinancasCartao(); }
      var cf=e.target.closest && e.target.closest('#cc-conta-filtro'); if(cf){ _ccConta=cf.value; renderFinancasCartao(); }
    });
    document.addEventListener('click', function(e){
      var b=e.target.closest && e.target.closest('[data-page="financas-pessoais"]');
      if(b){ setTimeout(function(){ if(typeof carregarFinancasCartao==='function') carregarFinancasCartao(); }, 50); }
    });
  }
})();


/* ===== FINANCEIRO: Análise Financeira ===== */
(function(){
  if(!document.getElementById('css-af')){
    var saf=document.createElement('style'); saf.id='css-af';
    saf.textContent='#page-analise-financeira .page-content{max-width:none;margin:0;padding:12px 16px}';
    document.head.appendChild(saf);
  }
  function esc(s){ return (s==null?'':String(s)).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
  function money(n){ return 'R$ '+(Number(n)||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}); }
  var CATS=['despesa','divida','receita','investimento','consumo','assinatura'];
  var CAT_LABEL={despesa:'Despesas',divida:'Dívidas',receita:'Receitas',investimento:'Investimento',consumo:'Consumo',assinatura:'Assinatura'};
  var CAT_COLOR={despesa:'#ef4444',divida:'#f97316',receita:'#22c55e',investimento:'#3b82f6',consumo:'#a855f7',assinatura:'#0ea5e9'};
  var GRUPO_LABEL={pessoal:'Pessoal',empresa:'Empresa'};
  var RESPONSAVEIS=['Anderson','Sil','Sophia','Casa','A3K'];
  var PALETA_CONTAS=['#3b82f6','#ef4444','#f59e0b','#8b5cf6','#14b8a6','#ec4899','#84cc16','#f97316','#06b6d4','#a855f7','#64748b','#eab308'];
  var METODO_PG_LABEL={cartao:'Cartão',dinheiro:'Dinheiro',pix:'Pix',debito:'Débito'};
  var METODO_PG_COR={cartao:'#3b82f6',dinheiro:'#22c55e',pix:'#a855f7',debito:'#f59e0b'};
  var MESES=['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  var _afAno=new Date().getFullYear(), _afGrupo='', _afCat='', _afResp='', _afParetoMes=null, _afParetoResp=null, _afParetoConta=null, _afGastoCat='';
  var _afComprasAno=new Date().getFullYear(), _afComprasResp='', _afComprasMetodoPg=null;

  async function carregarAnaliseFinanceira(){
    var root=document.getElementById('analise-financeira-root'); if(!root) return;
    root.innerHTML='<div class="empty-state"><div class="spinner" style="margin:0 auto"></div></div>';
    try{
      window._afLista=await _authFetch('GET','/fin/financas-empresa')||[];
      window._afComprasLista=await _authFetch('GET','/fin/financas-cartao')||[];
    }
    catch(e){ root.innerHTML='<p style="color:var(--danger)">Erro: '+esc(e.message)+'</p>'; return; }
    renderAnaliseFinanceira();
  }
  window.carregarAnaliseFinanceira=carregarAnaliseFinanceira;

  function soma(arr){ return arr.reduce(function(s,x){return s+(x.valor_final!=null?x.valor_final:(x.valor||0));},0); }

  function eixoGradeSvg(axisMax, leftAxisW, topPad, chartH, svgW, rightPad){
    var marcas={};
    for(var g=0; g<=axisMax; g+=2000) marcas[g]=true;
    for(var g2=0; g2<=axisMax; g2+=5000) marcas[g2]=true;
    var linhas='';
    Object.keys(marcas).map(Number).sort(function(a,b){return a-b;}).forEach(function(g3){
      var yy=topPad+chartH-(g3/axisMax)*chartH, major=(g3%5000===0);
      linhas+='<line x1="'+leftAxisW+'" x2="'+(svgW-rightPad)+'" y1="'+yy+'" y2="'+yy+'" stroke="'+(major?'#2563eb':'#cbd5e1')+'" stroke-width="'+(major?'1.3':'1')+'"'+(major?'':' stroke-dasharray="3,3"')+'/>';
      linhas+='<text x="'+(leftAxisW-6)+'" y="'+(yy+3)+'" text-anchor="end" font-size="'+(major?'9':'8')+'" font-weight="'+(major?'700':'400')+'" fill="'+(major?'#2563eb':'#94a3b8')+'">'+(g3>=1000?(g3/1000)+'k':g3)+'</text>';
    });
    return linhas;
  }

  function construirGraficoMensalSvg(porMes, axisMax){
    var barW=17, innerGap=2, groupW=3*barW+2*innerGap, monthGap=17, leftAxisW=44, topPad=14, chartH=168, bottomLabelH=20, rightPad=10;
    var svgW=leftAxisW+12*groupW+11*monthGap+rightPad;
    var svgH=topPad+chartH+bottomLabelH;
    var linhas=eixoGradeSvg(axisMax, leftAxisW, topPad, chartH, svgW, rightPad);
    var barras='';
    var cores=[['red','#ef4444'],['gray','#cbd5e1'],['green','#22c55e']];
    porMes.forEach(function(m,i){
      var x0=leftAxisW+i*(groupW+monthGap);
      cores.forEach(function(c,ci){
        var v=m[c[0]];
        var h=Math.max(1,(v/axisMax)*chartH);
        var xb=x0+ci*(barW+innerGap);
        var yb=topPad+chartH-h;
        barras+='<rect x="'+xb+'" y="'+yb+'" width="'+barW+'" height="'+h+'" fill="'+c[1]+'" rx="2"><title>'+money(v)+'</title></rect>';
      });
      barras+='<text x="'+(x0+groupW/2)+'" y="'+(topPad+chartH+14)+'" text-anchor="middle" font-size="10" fill="#64748b">'+MESES[i]+'</text>';
    });
    return '<svg viewBox="0 0 '+svgW+' '+svgH+'" width="'+svgW+'" height="'+svgH+'" style="display:block">'+linhas+barras+'</svg>';
  }

  function construirGraficoDespesaReceitaSvg(porMesDR, axisMax){
    var barW=30, monthGap=26, leftAxisW=44, topPad=14, chartH=168, bottomLabelH=20, rightPad=10;
    var groupW=barW;
    var svgW=leftAxisW+12*groupW+11*monthGap+rightPad;
    var svgH=topPad+chartH+bottomLabelH;
    function y(v){ return topPad+chartH-(v/axisMax)*chartH; }
    var linhas=eixoGradeSvg(axisMax, leftAxisW, topPad, chartH, svgW, rightPad);
    var barras='', pontos=[];
    porMesDR.forEach(function(m,i){
      var x0=leftAxisW+i*(groupW+monthGap);
      var h=Math.max(1,(m.despesa/axisMax)*chartH);
      var yb=topPad+chartH-h;
      barras+='<rect x="'+x0+'" y="'+yb+'" width="'+barW+'" height="'+h+'" fill="#ef4444" rx="2"><title>Despesa: '+money(m.despesa)+'</title></rect>';
      barras+='<text x="'+(x0+groupW/2)+'" y="'+(topPad+chartH+14)+'" text-anchor="middle" font-size="10" fill="#64748b">'+MESES[i]+'</text>';
      pontos.push({x:x0+groupW/2, y:y(m.receita), v:m.receita});
    });
    var linhaReceita='<polyline points="'+pontos.map(function(p){return p.x+','+p.y;}).join(' ')+'" fill="none" stroke="#22c55e" stroke-width="2.5"/>';
    var circulos=pontos.map(function(p){ return '<circle cx="'+p.x+'" cy="'+p.y+'" r="3.5" fill="#22c55e"><title>Receita: '+money(p.v)+'</title></circle>'; }).join('');
    return '<svg viewBox="0 0 '+svgW+' '+svgH+'" width="'+svgW+'" height="'+svgH+'" style="display:block">'+linhas+barras+linhaReceita+circulos+'</svg>';
  }

  function construirGraficoEmpilhadoDespesaDividaSvg(porMesEmp, axisMax){
    var barW=30, monthGap=26, leftAxisW=44, topPad=14, chartH=168, bottomLabelH=20, rightPad=10;
    var groupW=barW;
    var svgW=leftAxisW+12*groupW+11*monthGap+rightPad;
    var svgH=topPad+chartH+bottomLabelH;
    function y(v){ return topPad+chartH-(v/axisMax)*chartH; }
    var linhas=eixoGradeSvg(axisMax, leftAxisW, topPad, chartH, svgW, rightPad);
    var barras='', pontos=[];
    porMesEmp.forEach(function(m,i){
      var x0=leftAxisW+i*(groupW+monthGap);
      var hDespesa=Math.max(0,(m.despesa/axisMax)*chartH);
      var hDivida=Math.max(0,(m.divida/axisMax)*chartH);
      var yDespesa=topPad+chartH-hDespesa;
      var yDivida=yDespesa-hDivida;
      barras+='<rect x="'+x0+'" y="'+yDespesa+'" width="'+barW+'" height="'+hDespesa+'" fill="#3b82f6" rx="1"><title>Despesa: '+money(m.despesa)+'</title></rect>';
      barras+='<rect x="'+x0+'" y="'+yDivida+'" width="'+barW+'" height="'+hDivida+'" fill="#ef4444" rx="1"><title>Dívida: '+money(m.divida)+'</title></rect>';
      barras+='<text x="'+(x0+groupW/2)+'" y="'+(topPad+chartH+14)+'" text-anchor="middle" font-size="10" fill="#64748b">'+MESES[i]+'</text>';
      pontos.push({x:x0+groupW/2, y:y(m.receita), v:m.receita});
    });
    var linhaReceita='<polyline points="'+pontos.map(function(p){return p.x+','+p.y;}).join(' ')+'" fill="none" stroke="#22c55e" stroke-width="2.5"/>';
    var circulos=pontos.map(function(p){ return '<circle cx="'+p.x+'" cy="'+p.y+'" r="3.5" fill="#22c55e"><title>Receita: '+money(p.v)+'</title></circle>'; }).join('');
    return '<svg viewBox="0 0 '+svgW+' '+svgH+'" width="'+svgW+'" height="'+svgH+'" style="display:block">'+linhas+barras+linhaReceita+circulos+'</svg>';
  }

  function construirGraficoEmpilhadoPorContaSvg(porMesConta, contas, coresPorConta, axisMax, clicavel, selecionado){
    var barW=30, monthGap=26, leftAxisW=44, topPad=14, chartH=168, bottomLabelH=20, rightPad=10;
    var groupW=barW;
    var svgW=leftAxisW+12*groupW+11*monthGap+rightPad;
    var svgH=topPad+chartH+bottomLabelH;
    var linhas=eixoGradeSvg(axisMax, leftAxisW, topPad, chartH, svgW, rightPad);
    var barras='';
    porMesConta.forEach(function(mapa,i){
      var x0=leftAxisW+i*(groupW+monthGap);
      var mesAtivo=clicavel && selecionado && selecionado.mes===(i+1);
      barras+='<g>';
      var yAcum=topPad+chartH;
      contas.forEach(function(conta){
        var v=mapa[conta]||0;
        var h=Math.max(0,(v/axisMax)*chartH);
        var yb=yAcum-h;
        if(v>0){
          var segAtivo=mesAtivo && selecionado.chave===conta;
          var attrs=clicavel?(' data-mespareto="'+(i+1)+'" data-campopareto="'+esc(conta)+'" style="cursor:pointer"'):'';
          barras+='<rect x="'+x0+'" y="'+yb+'" width="'+barW+'" height="'+h+'" fill="'+coresPorConta[conta]+'" rx="1" stroke="'+(segAtivo?'#111827':'none')+'" stroke-width="'+(segAtivo?'2':'0')+'"'+attrs+'><title>'+esc(conta)+': '+money(v)+'</title></rect>';
        }
        yAcum=yb;
      });
      barras+='<text x="'+(x0+groupW/2)+'" y="'+(topPad+chartH+14)+'" text-anchor="middle" font-size="10" font-weight="'+(mesAtivo?'700':'400')+'" fill="'+(mesAtivo?'#2563eb':'#64748b')+'">'+MESES[i]+'</text>';
      barras+='</g>';
    });
    return '<svg viewBox="0 0 '+svgW+' '+svgH+'" width="'+svgW+'" height="'+svgH+'" style="display:block">'+linhas+barras+'</svg>';
  }

  function legendaContas(contas, coresPorConta){
    if(!contas.length) return '<div class="text-sm text-muted" style="margin-bottom:12px">Nenhuma conta no período/filtro atual</div>';
    return '<div style="display:flex;gap:10px;flex-wrap:wrap;font-size:12px;color:var(--text-muted);margin-bottom:12px">'+contas.map(function(c){
      return '<span><span style="display:inline-block;width:10px;height:10px;background:'+coresPorConta[c]+';border-radius:2px;margin-right:4px"></span>'+esc(c)+'</span>';
    }).join('')+'</div>';
  }

  function itensParetoPorConta(doAnoCat, mesNum, responsavelSel){
    var doMes=doAnoCat.filter(function(x){
      return parseInt((x.vencimento||'0-0').slice(5,7),10)===mesNum && (x.responsavel||'—')===responsavelSel;
    });
    var porConta={};
    doMes.forEach(function(x){
      var c=x.conta||'—';
      porConta[c]=(porConta[c]||0)+(x.valor_final!=null?x.valor_final:(x.valor||0));
    });
    return Object.keys(porConta).map(function(c){ return {label:c, valor:porConta[c]}; })
      .filter(function(x){return x.valor>0;})
      .sort(function(a,b){return b.valor-a.valor;});
  }

  function itensPorDescricao(doAnoCat, mesNum, responsavelSel, contaSel){
    var doMes=doAnoCat.filter(function(x){
      return parseInt((x.vencimento||'0-0').slice(5,7),10)===mesNum && (x.responsavel||'—')===responsavelSel && (x.conta||'—')===contaSel;
    });
    var porDesc={};
    doMes.forEach(function(x){
      var d=x.descricao||x.credor_pagador||'Sem descrição';
      porDesc[d]=(porDesc[d]||0)+(x.valor_final!=null?x.valor_final:(x.valor||0));
    });
    return Object.keys(porDesc).map(function(d){ return {label:d, valor:porDesc[d]}; })
      .filter(function(x){return x.valor>0;})
      .sort(function(a,b){return b.valor-a.valor;});
  }

  function construirPizzaSvg(itens, cores, raio, atributoClique){
    var total=itens.reduce(function(s,x){return s+x.valor;},0)||1;
    var cx=raio, cy=raio;
    function chaveDe(item){ return item.chave!=null?item.chave:item.label; }
    if(itens.length===1){
      var attrsUnica=atributoClique?(' data-'+atributoClique+'="'+esc(chaveDe(itens[0]))+'" style="cursor:pointer"'):'';
      return '<svg viewBox="0 0 '+(raio*2)+' '+(raio*2)+'" width="'+(raio*2)+'" height="'+(raio*2)+'"><circle cx="'+cx+'" cy="'+cy+'" r="'+raio+'" fill="'+cores[chaveDe(itens[0])]+'"'+attrsUnica+'><title>'+esc(itens[0].label)+': '+money(itens[0].valor)+' (100%)</title></circle></svg>';
    }
    var anguloAtual=-90, fatias='';
    itens.forEach(function(item){
      var pct=item.valor/total;
      var anguloFim=anguloAtual+pct*360;
      var x1=cx+raio*Math.cos(anguloAtual*Math.PI/180), y1=cy+raio*Math.sin(anguloAtual*Math.PI/180);
      var x2=cx+raio*Math.cos(anguloFim*Math.PI/180), y2=cy+raio*Math.sin(anguloFim*Math.PI/180);
      var largeArc=(anguloFim-anguloAtual)>180?1:0;
      var d='M'+cx+','+cy+' L'+x1+','+y1+' A'+raio+','+raio+' 0 '+largeArc+' 1 '+x2+','+y2+' Z';
      var attrs=atributoClique?(' data-'+atributoClique+'="'+esc(chaveDe(item))+'" style="cursor:pointer"'):'';
      fatias+='<path d="'+d+'" fill="'+cores[chaveDe(item)]+'"'+attrs+'><title>'+esc(item.label)+': '+money(item.valor)+' ('+(pct*100).toFixed(1)+'%)</title></path>';
      anguloAtual=anguloFim;
    });
    return '<svg viewBox="0 0 '+(raio*2)+' '+(raio*2)+'" width="'+(raio*2)+'" height="'+(raio*2)+'">'+fatias+'</svg>';
  }

  function legendaPizza(itens, cores){
    if(!itens.length) return '<div class="text-sm text-muted">Sem dados</div>';
    var total=itens.reduce(function(s,x){return s+x.valor;},0)||1;
    return '<div style="font-size:11px;color:var(--text-muted);max-width:170px">'+itens.map(function(it){
      var pct=(it.valor/total*100).toFixed(1);
      var chave=it.chave!=null?it.chave:it.label;
      return '<div style="display:flex;align-items:center;gap:4px;margin-bottom:3px"><span style="width:8px;height:8px;border-radius:50%;background:'+cores[chave]+';display:inline-block;flex-shrink:0"></span><span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+esc(it.label)+'</span><span style="margin-left:auto;flex-shrink:0">'+pct+'%</span></div>';
    }).join('')+'</div>';
  }

  function construirGraficoParetoSvg(itens){
    var barW=22, gap=6, leftPad=4, topPad=14, chartH=168, bottomPad=6, rightAxisW=34;
    var n=Math.max(itens.length,1);
    var chartAreaW=n*(barW+gap)-gap;
    var svgW=leftPad+chartAreaW+rightAxisW;
    var svgH=topPad+chartH+bottomPad;
    var maxV=Math.max(1, itens.length?itens[0].valor:1);
    var total=itens.reduce(function(s,x){return s+x.valor;},0)||1;
    var linhas='';
    [0,25,50,75,100].forEach(function(p){
      var yy=topPad+chartH-(p/100)*chartH;
      linhas+='<line x1="'+leftPad+'" x2="'+(leftPad+chartAreaW)+'" y1="'+yy+'" y2="'+yy+'" stroke="#e2e8f0" stroke-width="1" stroke-dasharray="3,3"/>';
      linhas+='<text x="'+(leftPad+chartAreaW+6)+'" y="'+(yy+3)+'" font-size="9" fill="#94a3b8">'+p+'%</text>';
    });
    var barras='', pontos=[], acumulado=0;
    itens.forEach(function(item,i){
      acumulado+=item.valor;
      var pct=acumulado/total*100;
      var x=leftPad+i*(barW+gap);
      var h=Math.max(1,(item.valor/maxV)*chartH);
      var yb=topPad+chartH-h;
      barras+='<rect x="'+x+'" y="'+yb+'" width="'+barW+'" height="'+h+'" fill="#3b82f6" rx="1"><title>'+esc(item.label)+': '+money(item.valor)+' ('+pct.toFixed(1)+'% acum.)</title></rect>';
      barras+='<text x="'+(x+barW/2)+'" y="'+(topPad+chartH+13)+'" text-anchor="middle" font-size="8" fill="#64748b">'+esc((item.label||'').slice(0,8))+'</text>';
      pontos.push({x:x+barW/2, y:topPad+chartH-(pct/100)*chartH});
    });
    var linha=pontos.length>1?('<polyline points="'+pontos.map(function(p){return p.x+','+p.y;}).join(' ')+'" fill="none" stroke="#f59e0b" stroke-width="2"/>'):'';
    var circulos=pontos.map(function(p){return '<circle cx="'+p.x+'" cy="'+p.y+'" r="2.5" fill="#f59e0b"/>';}).join('');
    return '<svg viewBox="0 0 '+svgW+' '+svgH+'" width="'+svgW+'" height="'+svgH+'" style="display:block">'+linhas+barras+linha+circulos+'</svg>';
  }

  function renderAnaliseFinanceira(){
    var root=document.getElementById('analise-financeira-root'); if(!root||!window._afLista) return;
    var lista=window._afLista;
    var hoje=new Date();
    var anoAtualReal=hoje.getFullYear(), mesAtualReal=hoje.getMonth()+1;
    var hojeStr=hoje.getFullYear()+'-'+('0'+(hoje.getMonth()+1)).slice(-2)+'-'+('0'+hoje.getDate()).slice(-2);
    var mesAtualStr=hoje.getFullYear()+'-'+('0'+(hoje.getMonth()+1)).slice(-2);

    var anosSet={}; anosSet[anoAtualReal]=true;
    lista.forEach(function(x){ var a=parseInt((x.vencimento||'').slice(0,4),10); if(a) anosSet[a]=true; });
    var anos=Object.keys(anosSet).map(Number).sort(function(a,b){return a-b;});

    function chipAno(v){
      var ativo=_afAno===v;
      return '<button class="btn btn-sm '+(ativo?'btn-primary':'btn-secondary')+'" data-afano="'+v+'">'+v+'</button>';
    }
    function chipGrupo(v,label){
      var ativo=_afGrupo===v;
      return '<button class="btn btn-sm '+(ativo?'btn-primary':'btn-secondary')+'" data-afgrupo="'+v+'">'+label+'</button>';
    }
    function chipCat(v,label){
      var ativo=_afCat===v;
      return '<button class="btn btn-sm '+(ativo?'btn-primary':'btn-secondary')+'" data-afcat="'+v+'">'+label+'</button>';
    }
    function chipResp(v,label){
      var ativo=_afResp===v;
      return '<button class="btn btn-sm '+(ativo?'btn-primary':'btn-secondary')+'" data-afresp="'+v+'">'+label+'</button>';
    }
    var filtros='<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-bottom:8px"><b class="text-sm" style="display:inline-block;min-width:80px">Tipo conta:</b>'+chipGrupo('','Todos')+chipGrupo('pessoal',GRUPO_LABEL.pessoal)+chipGrupo('empresa',GRUPO_LABEL.empresa)+'</div>'
      +'<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-bottom:8px"><b class="text-sm" style="display:inline-block;min-width:80px">Categoria:</b>'+chipCat('','Todos')+CATS.map(function(c){return chipCat(c,CAT_LABEL[c]);}).join('')+'</div>'
      +'<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-bottom:8px"><b class="text-sm" style="display:inline-block;min-width:80px">Responsável:</b>'+chipResp('','Todos')+RESPONSAVEIS.map(function(r){return chipResp(r,r);}).join('')+'</div>'
      +'<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-bottom:16px"><b class="text-sm" style="display:inline-block;min-width:80px">Período:</b>'+anos.map(chipAno).join('')+'</div>';

    var porGrupo=_afGrupo?lista.filter(function(x){return x.grupo===_afGrupo;}):lista;
    var porCat=_afCat?porGrupo.filter(function(x){return x.categoria===_afCat;}):porGrupo;
    var porFiltrado=_afResp?porCat.filter(function(x){return x.responsavel===_afResp;}):porCat;
    var porAno=porFiltrado.filter(function(x){return (x.vencimento||'').slice(0,4)===String(_afAno);});

    var tilesHtml='<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;margin-bottom:20px">'+CATS.map(function(c){
      var doAno=porAno.filter(function(x){return x.categoria===c;});
      var grande=soma(doAno);
      var doTudo=porFiltrado.filter(function(x){return x.categoria===c;});
      var doMes=doTudo.filter(function(x){return (x.vencimento||'').slice(0,7)===mesAtualStr;});
      var valorMes=soma(doMes);
      var valorBaixo;
      if(c==='receita'){ valorBaixo=grande; }
      else{
        var forward=doTudo.filter(function(x){return !x.pago_em && (x.vencimento||'')>=hojeStr;});
        valorBaixo=soma(forward);
      }
      return '<div class="card" style="border:1px solid var(--border);border-radius:10px;padding:14px">'
        +'<div style="font-size:12px;font-weight:700;color:'+CAT_COLOR[c]+';text-transform:uppercase;margin-bottom:6px">'+CAT_LABEL[c]+'</div>'
        +'<div style="display:flex;justify-content:space-between;align-items:flex-end;gap:8px">'
          +'<div style="font-size:22px;font-weight:800">'+money(grande)+'</div>'
          +'<div style="text-align:right;white-space:nowrap">'
            +'<div class="text-sm text-muted">Mês: <b>'+money(valorMes)+'</b></div>'
            +'<div class="text-sm text-muted">'+(c==='receita'?'Total':'Em aberto')+': <b>'+money(valorBaixo)+'</b></div>'
          +'</div>'
        +'</div>'
      +'</div>';
    }).join('')+'</div>';

    var porMes=MESES.map(function(_,i){
      var mesNum=i+1;
      var doMes=porAno.filter(function(x){return parseInt((x.vencimento||'0-0').slice(5,7),10)===mesNum;});
      return {
        gray: soma(doMes.filter(function(x){return x.status==='planejado'||x.status==='vencendo';})),
        green: soma(doMes.filter(function(x){return x.status==='pago';})),
        red: soma(doMes.filter(function(x){return x.status==='atrasado';}))
      };
    });
    var maxVal=Math.max(1, Math.max.apply(null, porMes.map(function(m){return Math.max(m.gray,m.green,m.red);})));
    var axisMax=Math.ceil(Math.max(maxVal,5000)/2000)*2000;
    var graficoSvg=construirGraficoMensalSvg(porMes, axisMax);

    var porMesDR=MESES.map(function(_,i){
      var mesNum=i+1;
      var doMes=porAno.filter(function(x){return parseInt((x.vencimento||'0-0').slice(5,7),10)===mesNum;});
      return {
        despesa: soma(doMes.filter(function(x){return x.categoria==='despesa';})),
        receita: soma(doMes.filter(function(x){return x.categoria==='receita';}))
      };
    });
    var maxValDR=Math.max(1, Math.max.apply(null, porMesDR.map(function(m){return Math.max(m.despesa,m.receita);})));
    var axisMaxDR=Math.ceil(Math.max(maxValDR,5000)/2000)*2000;
    var graficoDRSvg=construirGraficoDespesaReceitaSvg(porMesDR, axisMaxDR);
    var graficoDRHtml='<div class="card" style="border:1px solid var(--border);border-radius:10px;padding:16px;margin-bottom:20px">'
      +'<div style="font-weight:700;margin-bottom:4px">Despesas x Receita — '+_afAno+'</div>'
      +'<div style="display:flex;gap:14px;font-size:12px;color:var(--text-muted);margin-bottom:12px">'
        +'<span><span style="display:inline-block;width:10px;height:10px;background:#ef4444;border-radius:2px;margin-right:4px"></span>Despesas</span>'
        +'<span><span style="display:inline-block;width:16px;height:2px;background:#22c55e;vertical-align:middle;margin-right:4px"></span>Receita</span>'
      +'</div>'
      +'<div style="overflow-x:auto;padding-bottom:6px">'+graficoDRSvg+'</div>'
    +'</div>';

    var graficoHtml='<div class="card" style="border:1px solid var(--border);border-radius:10px;padding:16px;margin-bottom:20px">'
      +'<div style="font-weight:700;margin-bottom:4px">Planejado x Pago x Em aberto — '+_afAno+'</div>'
      +'<div style="display:flex;gap:14px;font-size:12px;color:var(--text-muted);margin-bottom:12px">'
        +'<span><span style="display:inline-block;width:10px;height:10px;background:#ef4444;border-radius:2px;margin-right:4px"></span>Atrasado</span>'
        +'<span><span style="display:inline-block;width:10px;height:10px;background:#cbd5e1;border-radius:2px;margin-right:4px"></span>Planejado</span>'
        +'<span><span style="display:inline-block;width:10px;height:10px;background:#22c55e;border-radius:2px;margin-right:4px"></span>Pago</span>'
      +'</div>'
      +'<div style="overflow-x:auto;padding-bottom:6px">'+graficoSvg+'</div>'
      +'</div>';

    var porMesEmpilhado=MESES.map(function(_,i){
      var mesNum=i+1;
      var doMes=porAno.filter(function(x){return parseInt((x.vencimento||'0-0').slice(5,7),10)===mesNum;});
      return {
        despesa: soma(doMes.filter(function(x){return x.categoria==='despesa';})),
        divida: soma(doMes.filter(function(x){return x.categoria==='divida';})),
        receita: soma(doMes.filter(function(x){return x.categoria==='receita';}))
      };
    });
    var maxValEmp=Math.max(1, Math.max.apply(null, porMesEmpilhado.map(function(m){return Math.max(m.despesa+m.divida, m.receita);})));
    var axisMaxEmp=Math.ceil(Math.max(maxValEmp,5000)/2000)*2000;
    var graficoEmpSvg=construirGraficoEmpilhadoDespesaDividaSvg(porMesEmpilhado, axisMaxEmp);
    var graficoEmpilhadoHtml='<div class="card" style="border:1px solid var(--border);border-radius:10px;padding:16px;margin-bottom:20px">'
      +'<div style="font-weight:700;margin-bottom:4px">Despesa + Dívida (empilhado) x Receita — '+_afAno+'</div>'
      +'<div style="display:flex;gap:14px;font-size:12px;color:var(--text-muted);margin-bottom:12px">'
        +'<span><span style="display:inline-block;width:10px;height:10px;background:#3b82f6;border-radius:2px;margin-right:4px"></span>Despesa</span>'
        +'<span><span style="display:inline-block;width:10px;height:10px;background:#ef4444;border-radius:2px;margin-right:4px"></span>Dívida</span>'
        +'<span><span style="display:inline-block;width:16px;height:2px;background:#22c55e;vertical-align:middle;margin-right:4px"></span>Receita</span>'
      +'</div>'
      +'<div style="overflow-x:auto;padding-bottom:6px">'+graficoEmpSvg+'</div>'
    +'</div>';

    function graficoPorContaHtml(categorias, titulo, campo, paretoHabilitado, filtroExtraHtml){
      var doAnoCat=porAno.filter(function(x){return categorias.indexOf(x.categoria)!==-1;});
      var chaves=Array.from(new Set(doAnoCat.map(function(x){return x[campo]||'—';}))).sort();
      var cores={}; chaves.forEach(function(c,i){ cores[c]=PALETA_CONTAS[i%PALETA_CONTAS.length]; });
      var porMesChave=MESES.map(function(_,i){
        var mesNum=i+1;
        var doMes=doAnoCat.filter(function(x){return parseInt((x.vencimento||'0-0').slice(5,7),10)===mesNum;});
        var mapa={};
        chaves.forEach(function(c){ mapa[c]=soma(doMes.filter(function(x){return (x[campo]||'—')===c;})); });
        return mapa;
      });
      var maxValChave=Math.max(1, Math.max.apply(null, porMesChave.map(function(mapa){ return chaves.reduce(function(s,c){return s+(mapa[c]||0);},0); })));
      var axisMaxChave=Math.ceil(Math.max(maxValChave,5000)/2000)*2000;
      var selecionado=(paretoHabilitado && _afParetoMes && _afParetoResp)?{mes:_afParetoMes, chave:_afParetoResp}:null;
      var svg=construirGraficoEmpilhadoPorContaSvg(porMesChave, chaves, cores, axisMaxChave, !!paretoHabilitado, selecionado);
      var painelPareto='';
      if(paretoHabilitado && _afParetoMes && _afParetoResp){
        var itensPareto=itensParetoPorConta(doAnoCat, _afParetoMes, _afParetoResp);
        var coresPareto={}; itensPareto.forEach(function(it,i){ coresPareto[it.label]=PALETA_CONTAS[i%PALETA_CONTAS.length]; });
        var pizza1=itensPareto.length?construirPizzaSvg(itensPareto, coresPareto, 70, 'fatiaconta'):'';

        var painelNivel2='';
        if(_afParetoConta){
          var itensDesc=itensPorDescricao(doAnoCat, _afParetoMes, _afParetoResp, _afParetoConta);
          var coresDesc={}; itensDesc.forEach(function(it,i){ coresDesc[it.label]=PALETA_CONTAS[i%PALETA_CONTAS.length]; });
          painelNivel2='<div style="border-left:1px solid var(--border);padding-left:16px">'
            +'<b class="text-sm" style="display:block;margin-bottom:6px">'+esc(_afParetoConta)+'</b>'
            +(itensDesc.length?('<div style="display:flex;gap:10px;align-items:flex-start">'+construirPizzaSvg(itensDesc, coresDesc, 70, null)+legendaPizza(itensDesc, coresDesc)+'</div>'):'<div class="text-sm text-muted">Sem lançamentos</div>')
          +'</div>';
        }

        painelPareto='<div style="flex:1;min-width:260px;border-left:1px solid var(--border);padding-left:16px">'
          +'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><b class="text-sm">'+esc(_afParetoResp)+' — '+MESES[_afParetoMes-1]+'/'+_afAno+'</b><button class="fel-ic" data-afparetoclose="1" title="Fechar">✕</button></div>'
          +(itensPareto.length
            ?('<div style="display:flex;gap:16px;flex-wrap:wrap;align-items:flex-start">'
                +'<div style="display:flex;gap:10px;align-items:flex-start"><span class="text-sm text-muted" style="align-self:center">clique numa fatia →</span>'+pizza1+legendaPizza(itensPareto, coresPareto)+'</div>'
                +painelNivel2
              +'</div>')
            :'<div class="text-sm text-muted">Sem despesas nesse mês/responsável</div>')
        +'</div>';
      }
      return '<div class="card" style="border:1px solid var(--border);border-radius:10px;padding:16px;margin-bottom:20px">'
        +'<div style="font-weight:700;margin-bottom:8px">'+titulo+' — '+_afAno+(paretoHabilitado?' <span class="text-sm text-muted" style="font-weight:400">(clique num bloco do gráfico pra ver a pizza por conta)</span>':'')+'</div>'
        +(filtroExtraHtml||'')
        +legendaContas(chaves, cores)
        +'<div style="display:flex;gap:16px;flex-wrap:wrap;align-items:flex-start">'
          +'<div style="overflow-x:auto;padding-bottom:6px">'+svg+'</div>'
          +painelPareto
        +'</div>'
      +'</div>';
    }
    var graficoDividaContaHtml=graficoPorContaHtml(['divida'],'Dívida por Conta','conta', false);

    function chipGastoCat(v,label){
      var ativo=_afGastoCat===v;
      return '<button class="btn btn-sm '+(ativo?'btn-primary':'btn-secondary')+'" data-afgastocat="'+v+'">'+label+'</button>';
    }
    var filtroGastoHtml='<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-bottom:12px">'+chipGastoCat('','Todos')+chipGastoCat('despesa','Despesas')+chipGastoCat('divida','Dívidas')+'</div>';
    var categoriasGasto=_afGastoCat?[_afGastoCat]:['despesa','divida'];
    var tituloGasto=_afGastoCat==='despesa'?'Despesas por Responsável':(_afGastoCat==='divida'?'Dívidas por Responsável':'Todos os gastos por Responsável');
    var graficoDespesaContaHtml=graficoPorContaHtml(categoriasGasto, tituloGasto,'responsavel', true, filtroGastoHtml);

    var inicioJanela=anoAtualReal+'-'+('0'+mesAtualReal).slice(-2)+'-01';
    var fimJanela=_afAno+'-12-31';
    var janela=porFiltrado.filter(function(x){return (x.vencimento||'')>=inicioJanela && (x.vencimento||'')<=fimJanela;});
    var porCat=CATS.map(function(c){ return {cat:c, total: soma(janela.filter(function(x){return x.categoria===c;}))}; });
    var totalGeral=porCat.reduce(function(s,x){return s+x.total;},0);
    var acc=0;
    var stops=porCat.filter(function(x){return x.total>0;}).map(function(x){
      var pct=totalGeral>0?(x.total/totalGeral*100):0;
      var de=acc, ate=acc+pct; acc=ate;
      return CAT_COLOR[x.cat]+' '+de.toFixed(2)+'% '+ate.toFixed(2)+'%';
    }).join(', ');
    var pizzaHtml='<div class="card" style="border:1px solid var(--border);border-radius:10px;padding:16px;display:flex;gap:24px;flex-wrap:wrap;align-items:center">'
      +'<div style="width:180px;height:180px;border-radius:50%;flex-shrink:0;background:'+(stops?('conic-gradient('+stops+')'):'#e5e7eb')+'"></div>'
      +'<div>'
        +'<div style="font-weight:700;margin-bottom:8px">Categorias — mês atual até dez/'+_afAno+'</div>'
        +porCat.map(function(x){
          var pct=totalGeral>0?(x.total/totalGeral*100):0;
          return '<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;font-size:13px"><span style="width:10px;height:10px;border-radius:50%;background:'+CAT_COLOR[x.cat]+';display:inline-block"></span>'+CAT_LABEL[x.cat]+' — '+money(x.total)+' ('+pct.toFixed(1)+'%)</div>';
        }).join('')
      +'</div></div>';

    var comprasLista=window._afComprasLista||[];
    var anosComprasSet={}; anosComprasSet[anoAtualReal]=true;
    comprasLista.forEach(function(x){ var a=parseInt((x.vencimento_fatura||'').slice(0,4),10); if(a) anosComprasSet[a]=true; });
    var anosCompras=Object.keys(anosComprasSet).map(Number).sort(function(a,b){return a-b;});
    function chipComprasAno(v){
      var ativo=_afComprasAno===v;
      return '<button class="btn btn-sm '+(ativo?'btn-primary':'btn-secondary')+'" data-afcompano="'+v+'">'+v+'</button>';
    }
    function chipComprasResp(v,label){
      var ativo=_afComprasResp===v;
      return '<button class="btn btn-sm '+(ativo?'btn-primary':'btn-secondary')+'" data-afcompresp="'+v+'">'+label+'</button>';
    }
    var filtrosComprasHtml='<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-bottom:8px"><b class="text-sm" style="display:inline-block;min-width:80px">Responsável:</b>'+chipComprasResp('','Todos')+RESPONSAVEIS.map(function(r){return chipComprasResp(r,r);}).join('')+'</div>'
      +'<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-bottom:16px"><b class="text-sm" style="display:inline-block;min-width:80px">Período:</b>'+anosCompras.map(chipComprasAno).join('')+'</div>';

    var porAnoCompras=comprasLista.filter(function(x){return (x.vencimento_fatura||'').slice(0,4)===String(_afComprasAno);});
    var porFiltradoCompras=_afComprasResp?porAnoCompras.filter(function(x){return x.responsavel===_afComprasResp;}):porAnoCompras;

    var porMetodoPgMapa={};
    porFiltradoCompras.forEach(function(x){
      var m=x.metodo_pg||'—';
      porMetodoPgMapa[m]=(porMetodoPgMapa[m]||0)+(x.valor||0);
    });
    var itensMetodoPg=Object.keys(porMetodoPgMapa).map(function(m){ return {label:(METODO_PG_LABEL[m]||m), chave:m, valor:porMetodoPgMapa[m]}; })
      .filter(function(x){return x.valor>0;}).sort(function(a,b){return b.valor-a.valor;});
    var coresMetodoPg={}; itensMetodoPg.forEach(function(it){ coresMetodoPg[it.chave]=METODO_PG_COR[it.chave]||'#64748b'; });

    var painelParetoSubconta='';
    if(_afComprasMetodoPg){
      var doMetodo=porFiltradoCompras.filter(function(x){return (x.metodo_pg||'—')===_afComprasMetodoPg;});
      var porSubConta={};
      doMetodo.forEach(function(x){
        var sc=x.sub_conta||'—';
        porSubConta[sc]=(porSubConta[sc]||0)+(x.valor||0);
      });
      var itensSubConta=Object.keys(porSubConta).map(function(sc){ return {label:sc, valor:porSubConta[sc]}; })
        .filter(function(x){return x.valor>0;}).sort(function(a,b){return b.valor-a.valor;});
      painelParetoSubconta='<div style="flex:1;min-width:280px;border-left:1px solid var(--border);padding-left:16px">'
        +'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><b class="text-sm">Pareto por Sub Conta — '+esc(METODO_PG_LABEL[_afComprasMetodoPg]||_afComprasMetodoPg)+'</b><button class="fel-ic" data-afcompclose="1" title="Fechar">✕</button></div>'
        +(itensSubConta.length?('<div style="overflow-x:auto">'+construirGraficoParetoSvg(itensSubConta)+'</div>'):'<div class="text-sm text-muted">Sem lançamentos</div>')
      +'</div>';
    }

    var graficoComprasHtml='<div class="card" style="border:1px solid var(--border);border-radius:10px;padding:16px;margin-bottom:20px">'
      +'<div style="font-weight:700;margin-bottom:8px">Compras por Método PG — '+_afComprasAno+' <span class="text-sm text-muted" style="font-weight:400">(clique numa fatia pra ver o Pareto por Sub Conta)</span></div>'
      +'<div style="display:flex;gap:16px;flex-wrap:wrap;align-items:flex-start">'
        +(itensMetodoPg.length
          ?('<div style="display:flex;gap:10px;align-items:flex-start">'+construirPizzaSvg(itensMetodoPg, coresMetodoPg, 70, 'afcompmetodo')+legendaPizza(itensMetodoPg, coresMetodoPg)+'</div>')
          :'<div class="text-sm text-muted">Nenhuma compra no período/filtro atual</div>')
        +painelParetoSubconta
      +'</div>'
    +'</div>';

    var MET_LABEL_COMPRAS={avista:'À vista',parcelado:'Parcelado',recorrente:'Recorrente'};
    var MET_COR_COMPRAS={avista:'#3b82f6',parcelado:'#f59e0b',recorrente:'#8b5cf6'};
    var porFormaPgMapa={};
    porFiltradoCompras.forEach(function(x){
      var m=x.metodo||'—';
      porFormaPgMapa[m]=(porFormaPgMapa[m]||0)+(x.valor||0);
    });
    var itensFormaPg=Object.keys(porFormaPgMapa).map(function(m){ return {label:(MET_LABEL_COMPRAS[m]||m), chave:m, valor:porFormaPgMapa[m]}; })
      .filter(function(x){return x.valor>0;}).sort(function(a,b){return b.valor-a.valor;});
    var ordemFormaPg=itensFormaPg.map(function(it){ return it.label; });
    var coresPorFormaLabel={}; itensFormaPg.forEach(function(it){ coresPorFormaLabel[it.label]=MET_COR_COMPRAS[it.chave]||'#64748b'; });
    var porMesFormaPg=MESES.map(function(_,i){
      var mesNum=i+1;
      var doMes=porFiltradoCompras.filter(function(x){return parseInt((x.vencimento_fatura||'0-0').slice(5,7),10)===mesNum;});
      var mapa={};
      ordemFormaPg.forEach(function(l){ mapa[l]=0; });
      doMes.forEach(function(x){
        var l=MET_LABEL_COMPRAS[x.metodo]||x.metodo||'—';
        mapa[l]=(mapa[l]||0)+(x.valor||0);
      });
      return mapa;
    });
    var maxValFormaMes=Math.max(1, Math.max.apply(null, porMesFormaPg.map(function(mapa){ return ordemFormaPg.reduce(function(s,l){return s+(mapa[l]||0);},0); })));
    var axisMaxFormaMes=Math.ceil(Math.max(maxValFormaMes,5000)/2000)*2000;
    var svgFormaMes=ordemFormaPg.length?construirGraficoEmpilhadoPorContaSvg(porMesFormaPg, ordemFormaPg, coresPorFormaLabel, axisMaxFormaMes, false, null):'';
    var graficoComprasMesHtml='<div class="card" style="border:1px solid var(--border);border-radius:10px;padding:16px;margin-bottom:20px">'
      +'<div style="font-weight:700;margin-bottom:8px">Compras por mês — Forma PG — '+_afComprasAno+' <span class="text-sm text-muted" style="font-weight:400">(maior valor no total do período fica embaixo)</span></div>'
      +filtrosComprasHtml
      +(ordemFormaPg.length
        ?(legendaContas(ordemFormaPg, coresPorFormaLabel)+'<div style="overflow-x:auto;padding-bottom:6px">'+svgFormaMes+'</div>')
        :'<div class="text-sm text-muted">Nenhuma compra no período/filtro atual</div>')
    +'</div>';

    /* pizzaHtml calculado mas oculto por enquanto (a pedido) — reativar somando "+pizzaHtml" abaixo quando for usar de novo */
    root.innerHTML=filtros+tilesHtml+graficoDRHtml+graficoHtml+graficoEmpilhadoHtml+graficoDividaContaHtml+graficoDespesaContaHtml+graficoComprasMesHtml+graficoComprasHtml;
  }

  if(!window._afBound){
    window._afBound=true;
    document.addEventListener('click', function(e){
      var a=e.target.closest && e.target.closest('#analise-financeira-root [data-afano]'); if(a){ _afAno=parseInt(a.getAttribute('data-afano'),10); renderAnaliseFinanceira(); return; }
      var g=e.target.closest && e.target.closest('#analise-financeira-root [data-afgrupo]'); if(g){ _afGrupo=g.getAttribute('data-afgrupo'); renderAnaliseFinanceira(); return; }
      var c=e.target.closest && e.target.closest('#analise-financeira-root [data-afcat]'); if(c){ _afCat=c.getAttribute('data-afcat'); renderAnaliseFinanceira(); return; }
      var r=e.target.closest && e.target.closest('#analise-financeira-root [data-afresp]'); if(r){ _afResp=r.getAttribute('data-afresp'); renderAnaliseFinanceira(); return; }
      var mp=e.target.closest && e.target.closest('#analise-financeira-root [data-mespareto]'); if(mp){
        var mes=parseInt(mp.getAttribute('data-mespareto'),10), chave=mp.getAttribute('data-campopareto');
        if(_afParetoMes===mes && _afParetoResp===chave){ _afParetoMes=null; _afParetoResp=null; }
        else { _afParetoMes=mes; _afParetoResp=chave; }
        _afParetoConta=null;
        renderAnaliseFinanceira(); return;
      }
      var fc=e.target.closest && e.target.closest('#analise-financeira-root [data-fatiaconta]'); if(fc){
        var conta=fc.getAttribute('data-fatiaconta');
        _afParetoConta=(_afParetoConta===conta)?null:conta;
        renderAnaliseFinanceira(); return;
      }
      var pc=e.target.closest && e.target.closest('#analise-financeira-root [data-afparetoclose]'); if(pc){ _afParetoMes=null; _afParetoResp=null; _afParetoConta=null; renderAnaliseFinanceira(); return; }
      var gc=e.target.closest && e.target.closest('#analise-financeira-root [data-afgastocat]'); if(gc){ _afGastoCat=gc.getAttribute('data-afgastocat'); _afParetoMes=null; _afParetoResp=null; _afParetoConta=null; renderAnaliseFinanceira(); return; }
      var ca=e.target.closest && e.target.closest('#analise-financeira-root [data-afcompano]'); if(ca){ _afComprasAno=parseInt(ca.getAttribute('data-afcompano'),10); _afComprasMetodoPg=null; renderAnaliseFinanceira(); return; }
      var cr=e.target.closest && e.target.closest('#analise-financeira-root [data-afcompresp]'); if(cr){ _afComprasResp=cr.getAttribute('data-afcompresp'); _afComprasMetodoPg=null; renderAnaliseFinanceira(); return; }
      var cm=e.target.closest && e.target.closest('#analise-financeira-root [data-afcompmetodo]'); if(cm){
        var mchave=cm.getAttribute('data-afcompmetodo');
        _afComprasMetodoPg=(_afComprasMetodoPg===mchave)?null:mchave;
        renderAnaliseFinanceira(); return;
      }
      var cc=e.target.closest && e.target.closest('#analise-financeira-root [data-afcompclose]'); if(cc){ _afComprasMetodoPg=null; renderAnaliseFinanceira(); return; }
    });
    document.addEventListener('click', function(e){
      var b=e.target.closest && e.target.closest('[data-page="analise-financeira"]');
      if(b){ setTimeout(function(){ if(typeof carregarAnaliseFinanceira==='function') carregarAnaliseFinanceira(); }, 50); }
    });
  }
})();



/* ===== TEMA: cores de formulário (Configurações) — classe .tema-form por módulo ===== */
(function(){
  var DEF={form_bg:'#DFE5E6',form_border:'#0C2340',form_field:'#FFFFFF'};
  function aplicarTema(t){
    t=t||{};
    var bg=t.form_bg||DEF.form_bg, bd=t.form_border||DEF.form_border, fl=t.form_field||DEF.form_field;
    var r=document.documentElement.style;
    r.setProperty('--tema-form-bg',bg); r.setProperty('--tema-form-border',bd); r.setProperty('--tema-form-field',fl);
    var css=document.getElementById('tema-css');
    if(!css){ css=document.createElement('style'); css.id='tema-css'; document.head.appendChild(css); }
    css.textContent='.tema-form{background:var(--tema-form-bg)!important}'
      +'.tema-form .form-control,.tema-form input:not([type=checkbox]):not([type=radio]):not([type=color]),.tema-form select,.tema-form textarea{background:var(--tema-form-field)!important;border:1px solid var(--tema-form-border)!important}'
      +'.tema-form .form-label{color:var(--tema-form-border)!important}'
      +'.tema-form hr{border-top:1px solid var(--tema-form-border)!important;border-bottom:none!important}'
      +'.tema-form table th,.tema-form table td{border-color:var(--tema-form-border)!important}';
  }
  window.aplicarTema=aplicarTema;
  window._temaAtual={};
  aplicarTema(DEF); // aplica padrão já (mantém CSS vars válidas)
  async function carregarTema(){
    try{ var c=await _authFetch('GET','/configuracoes/tema'); window._temaAtual=(c&&c.valor)||{}; aplicarTema(window._temaAtual); }catch(e){}
  }
  if(typeof _authFetch==='function') setTimeout(carregarTema,300);

  function val(id){ var el=document.getElementById(id); return el?el.value:''; }
  function readTema(){ return {form_bg:val('tema-bg')||DEF.form_bg, form_border:val('tema-border')||DEF.form_border, form_field:val('tema-field')||DEF.form_field}; }

  function montarTemaConfig(){
    var pc=document.querySelector('#page-configuracoes .page-content'); if(!pc) return;
    if(document.getElementById('tema-config-card')) return;
    var t={form_bg:DEF.form_bg,form_border:DEF.form_border,form_field:DEF.form_field};
    var s=window._temaAtual||{}; if(s.form_bg)t.form_bg=s.form_bg; if(s.form_border)t.form_border=s.form_border; if(s.form_field)t.form_field=s.form_field;
    var card=document.createElement('div'); card.className='card mb-4'; card.id='tema-config-card';
    card.innerHTML='<div class="card-body">'
      +'<p class="section-title">Tema de Formulários</p>'
      +'<div style="display:flex;gap:24px;flex-wrap:wrap;align-items:flex-start">'
        +'<div style="min-width:230px">'
          +'<label class="form-label" style="display:block;margin-bottom:2px">Fundo do formulário</label><input type="color" id="tema-bg" value="'+t.form_bg+'" style="width:56px;height:32px;vertical-align:middle;padding:0;border:1px solid #ccc;border-radius:6px"> <span id="tema-bg-hex" class="text-sm text-muted">'+t.form_bg+'</span>'
          +'<label class="form-label" style="display:block;margin:12px 0 2px">Borda / linhas</label><input type="color" id="tema-border" value="'+t.form_border+'" style="width:56px;height:32px;vertical-align:middle;padding:0;border:1px solid #ccc;border-radius:6px"> <span id="tema-border-hex" class="text-sm text-muted">'+t.form_border+'</span>'
          +'<label class="form-label" style="display:block;margin:12px 0 2px">Preenchimento do campo</label><input type="color" id="tema-field" value="'+t.form_field+'" style="width:56px;height:32px;vertical-align:middle;padding:0;border:1px solid #ccc;border-radius:6px"> <span id="tema-field-hex" class="text-sm text-muted">'+t.form_field+'</span>'
          +'<div style="margin-top:16px;display:flex;gap:8px"><button class="btn btn-sm btn-primary" data-tema="salvar">💾 Salvar</button><button class="btn btn-sm btn-secondary" data-tema="reset">Restaurar padrão</button></div>'
          +'<p class="text-sm text-muted" style="margin-top:8px">As cores aplicam <b>ao vivo</b> enquanto você escolhe. "Salvar" grava e mantém. (Aplicado por ora na Precificação; estenderemos a cada módulo.)</p>'
        +'</div>'
        +'<div style="flex:1;min-width:250px"><label class="form-label" style="display:block;margin-bottom:6px">Prévia</label>'
          +'<div class="tema-form" style="border-radius:10px;padding:14px;border:1px solid var(--tema-form-border)">'
            +'<div class="form-group"><label class="form-label">Campo de exemplo</label><input class="form-control" value="Texto de exemplo"></div>'
            +'<hr style="margin:10px 0">'
            +'<div class="form-group" style="margin-bottom:0"><label class="form-label">Seleção</label><select class="form-control"><option>Opção 1</option><option>Opção 2</option></select></div>'
          +'</div>'
        +'</div>'
      +'</div></div>';
    pc.appendChild(card);
  }
  window.montarTemaConfig=montarTemaConfig;

  if(!window._temaBound){
    window._temaBound=true;
    document.addEventListener('click', function(e){
      if(e.target.closest && e.target.closest('[data-page="configuracoes"]')){ setTimeout(montarTemaConfig,150); setTimeout(montarTemaConfig,500); }
      var b=e.target.closest && e.target.closest('#tema-config-card [data-tema]');
      if(b){ var act=b.getAttribute('data-tema');
        if(act==='salvar'){ var t=readTema(); _authFetch('PUT','/configuracoes/tema',{chave:'tema',valor:t}).then(function(){ window._temaAtual=t; aplicarTema(t); if(typeof toast==='function') toast('Tema salvo','success'); }).catch(function(){ if(typeof toast==='function') toast('Erro ao salvar','error'); }); return; }
        if(act==='reset'){ ['bg','border','field'].forEach(function(k){ var i=document.getElementById('tema-'+k); var h=document.getElementById('tema-'+k+'-hex'); var dv=DEF['form_'+(k==='bg'?'bg':(k==='border'?'border':'field'))]; if(i)i.value=dv; if(h)h.textContent=dv; }); aplicarTema(DEF); return; } }
    });
    document.addEventListener('input', function(e){
      if(e.target && e.target.type==='color' && e.target.closest && e.target.closest('#tema-config-card')){
        var hex=document.getElementById(e.target.id+'-hex'); if(hex) hex.textContent=e.target.value;
        aplicarTema(readTema());
      }
    });
    if(document.querySelector('#page-configuracoes.active')) setTimeout(montarTemaConfig,150);
  }
})();

/* ===== COMERCIAL: hub Vendas (Vendas+Comissão+Forecast unificados) — barra fixa de botões ===== */
(function(){
  var SUBS=[['vendas','💰 Vendas'],['comissao','🧮 Comissão'],['forecast','📈 Forecast']];

  var css=document.createElement('style'); css.id='css-vh';
  css.textContent=''
    +'.vh-bar{order:-1;display:flex;gap:6px;flex:1}'
    +'.vh-bar button{flex:1;border:2px solid transparent;background:var(--surface-2);border-radius:8px;padding:8px 6px;font-size:13px;font-weight:600;cursor:pointer;color:var(--text);white-space:nowrap}'
    +'.vh-bar button:hover{background:var(--border)}'
    +'.vh-bar button.on{border-color:var(--primary);color:var(--primary);background:var(--primary-light)}';
  document.head.appendChild(css);

  function barHtml(activeId){
    return SUBS.map(function(s){ return '<button type="button" data-vh="'+s[0]+'" class="'+(s[0]===activeId?'on':'')+'">'+s[1]+'</button>'; }).join('');
  }

  function montarHeader(pageId){
    var pg=document.getElementById('page-'+pageId); if(!pg) return;
    var head=pg.querySelector('.app-header'); if(!head) return;
    var h2=head.querySelector('h2'); if(h2) h2.style.display='none';
    var bar=head.querySelector('.vh-bar');
    if(!bar){ bar=document.createElement('div'); bar.className='vh-bar'; head.insertBefore(bar, head.firstChild); }
    bar.innerHTML=barHtml(pageId);
  }

  function irPara(id){
    if(id==='vendas'){ navegarPara('vendas'); if(typeof carregarVendas==='function') carregarVendas(); }
    else if(id==='forecast'){ navegarPara('forecast'); if(typeof carregarForecast==='function') carregarForecast(); }
    else if(id==='comissao'){ navegarPara('comissao'); if(typeof carregarComissao==='function') carregarComissao(); }
    var navVendas=document.querySelector('.desktop-nav-item[data-page="vendas"]'); if(navVendas) navVendas.classList.add('active');
    document.querySelectorAll('.vh-bar').forEach(function(b){ b.innerHTML=barHtml(id); });
  }

  function ensure(){ SUBS.forEach(function(s){ montarHeader(s[0]); }); }
  ensure();
  [300,1000,2500].forEach(function(ms){ setTimeout(ensure, ms); });

  document.addEventListener('click', function(e){
    var it=e.target.closest && e.target.closest('.vh-bar [data-vh]');
    if(it){ irPara(it.getAttribute('data-vh')); return; }
  });
})();

/* ===== Persistência de página: F5/recarregar mantém a página atual, sem piscar o Início =====
   mostrarApp() já deixa a página certa .active ANTES de exibir #app (sem flash); aqui só:
   1) guardamos qual foi o último item clicado, e
   2) refazemos esse clique (com retentativas) pra carregar os dados e destacar o menu certo. */
(function(){
  var CHAVE='sgc_pagina_atual';

  document.addEventListener('click', function(e){
    var b=e.target.closest && (e.target.closest('.desktop-nav-item[data-page]')||e.target.closest('.tab-item[data-page]'));
    if(b){ var id=b.getAttribute('data-page'); if(id && id!=='cadastro') localStorage.setItem(CHAVE, id); return; }
    var vh=e.target.closest && e.target.closest('.vh-bar [data-vh]');
    if(vh){ localStorage.setItem(CHAVE, vh.getAttribute('data-vh')); }
  });

  window.restaurarPaginaAtual=function(alvo){
    if(!alvo || alvo==='dashboard') return;
    var tentativas=0;
    (function tick(){
      tentativas++;
      var btn=document.querySelector('.desktop-nav-item[data-page="'+alvo+'"]') || document.querySelector('.tab-item[data-page="'+alvo+'"]');
      if(btn){ btn.click(); return; }
      var vh=document.querySelector('.vh-bar [data-vh="'+alvo+'"]');
      if(vh){ vh.click(); return; }
      if(tentativas<15){ setTimeout(tick,300); return; }
    })();
  };

  if(typeof logout==='function'){
    var _logoutPrev=logout;
    logout=function(){ localStorage.removeItem(CHAVE); return _logoutPrev.apply(this,arguments); };
  }
})();
