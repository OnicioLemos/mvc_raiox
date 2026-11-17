// Painel do Raio-X (roda no navegador). Ferramenta didática, fora do MVC do app.
(function () {
  const CORES = {
    ROTA: '#a78bfa',
    CONTROLLER: '#60a5fa',
    MODEL: '#4ade80',
    BANCO: '#fbbf24',
    VIEW: '#f472b6',
    REDIRECT: '#f472b6',
    JSON: '#f472b6',
    ERRO: '#f87171',
  };
  const CHAVE = 'raiox-aberto';
  let requisicoes = [];
  let selecionada = null;
  let abertas = new Set();
  let timer = null;

  function el(tag, attrs = {}, ...filhos) {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'class') n.className = v;
      else if (k === 'style') n.setAttribute('style', v);
      else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v);
    }
    for (const f of filhos.flat()) if (f !== null && f !== undefined) n.append(f);
    return n;
  }
  const json = (v) => JSON.stringify(v, null, 2);

  const botao = el('button', { class: 'rx-botao', title: 'Mostra por quais camadas cada requisição passou' }, '🩻 Raio-X');
  const lista = el('div', { class: 'rx-lista' });
  const detalhe = el('div', { class: 'rx-detalhe' });
  const legenda = el(
    'div',
    { class: 'rx-legenda' },
    ['ROTA', 'CONTROLLER', 'MODEL', 'BANCO', 'VIEW'].map((c) => el('span', { style: `background:${CORES[c]}` }, c)),
  );
  const painel = el(
    'aside',
    { class: 'rx-painel' },
    el(
      'div',
      { class: 'rx-topo' },
      el('strong', {}, '🩻 Raio-X MVC'),
      el('button', { onclick: limpar }, 'Limpar'),
      el('button', { onclick: alternar }, 'Fechar ✕'),
    ),
    legenda,
    el('div', { class: 'rx-corpo' }, lista, detalhe),
  );

  document.body.append(botao, painel);
  botao.addEventListener('click', alternar);

  function alternar() {
    const aberto = painel.classList.toggle('aberto');
    try { sessionStorage.setItem(CHAVE, aberto ? '1' : '0'); } catch {}
    if (aberto) { carregar(); timer = setInterval(carregar, 1500); }
    else clearInterval(timer);
  }

  async function carregar() {
    try {
      const r = await fetch('/raiox/api/requisicoes');
      requisicoes = await r.json();
      if (!selecionada || !requisicoes.some((q) => q.id === selecionada)) {
        // por padrão, mostra a requisição que gerou a página atual (ou a mais recente)
        const atual = requisicoes.find((q) => q.url === location.pathname + location.search && q.metodo === 'GET');
        selecionada = (atual || requisicoes[0] || {}).id ?? null;
      }
      desenhar();
    } catch (e) {
      detalhe.textContent = 'Não foi possível ler o raio-X: ' + e.message;
    }
  }

  async function limpar() {
    await fetch('/raiox/api/limpar', { method: 'POST' });
    selecionada = null;
    carregar();
  }

  function desenhar() {
    lista.replaceChildren(
      ...(requisicoes.length
        ? requisicoes.map((q) =>
            el(
              'div',
              {
                class: 'rx-req' + (q.id === selecionada ? ' sel' : ''),
                onclick: () => { selecionada = q.id; abertas = new Set(); desenhar(); },
              },
              el('span', { class: 'rx-metodo ' + q.metodo }, q.metodo),
              el('span', { class: 'rx-url', title: q.url }, q.url),
              el('span', { class: 'rx-status e' + String(q.status || '')[0] }, q.status ?? '…'),
              el('span', { class: 'rx-ms' }, q.duracaoMs != null ? q.duracaoMs + ' ms' : ''),
            ),
          )
        : [el('div', { class: 'rx-vazio' }, 'Nenhuma requisição ainda. Navegue pelo app.')]),
    );

    const q = requisicoes.find((r) => r.id === selecionada);
    if (!q) { detalhe.replaceChildren(el('div', { class: 'rx-vazio' }, 'Selecione uma requisição.')); return; }

    const scroll = detalhe.scrollTop;
    detalhe.replaceChildren(
      el('div', { style: 'margin-bottom:10px;color:#94a3b8' },
        `${q.metodo} ${q.url} · ${q.etapas.length} etapa(s) · clique numa etapa para ver o código`),
      ...q.etapas.map((e) => desenharEtapa(q, e)),
    );
    detalhe.scrollTop = scroll;
  }

  function desenharEtapa(q, e) {
    const chave = q.id + ':' + e.ordem;
    const info = el('div', { class: 'rx-info' });
    if (e.arquivo) info.append(el('h4', {}, 'Arquivo'), el('div', { class: 'rx-arquivo' }, e.arquivo + (e.linha ? ':' + e.linha : '')));
    if (e.codigo) info.append(el('h4', {}, e.camada === 'VIEW' ? 'Template' : 'Código'), el('pre', {}, e.codigo));
    if (e.entrada !== undefined) info.append(el('h4', {}, rotuloEntrada(e.camada)), el('pre', {}, json(e.entrada)));
    if (e.sql) e.sql.forEach((s, i) => info.append(
      el('h4', {}, `SQL ${e.sql.length > 1 ? i + 1 : ''} gerado pelo Prisma`),
      el('pre', {}, s.consulta + (s.parametros && s.parametros.length ? '\n\n-- parâmetros: ' + JSON.stringify(s.parametros) : '')),
    ));
    if (e.saida !== undefined) info.append(el('h4', {}, 'Retorno'), el('pre', {}, json(e.saida)));

    const box = el(
      'div',
      { class: 'rx-etapa' + (abertas.has(chave) ? ' aberta' : ''), style: `--cor:${CORES[e.camada] || '#94a3b8'};margin-left:${(e.nivel || 0) * 22}px` },
      el('header', {
        onclick: () => {
          abertas.has(chave) ? abertas.delete(chave) : abertas.add(chave);
          box.classList.toggle('aberta');
        },
      },
        el('span', { class: 'rx-camada' }, e.camada),
        el('span', { class: 'rx-titulo' }, e.titulo || ''),
        el('span', { class: 'rx-tempo' }, e.duracaoMs != null ? e.duracaoMs + ' ms' : '+' + e.ms + ' ms'),
      ),
      e.erro ? el('div', { class: 'rx-erro' }, '⚠ ' + e.erro) : null,
      info,
    );
    return box;
  }

  function rotuloEntrada(camada) {
    return {
      CONTROLLER: 'Dados da requisição (params, query, body)',
      MODEL: 'Argumentos recebidos',
      BANCO: 'Argumentos do Prisma',
      VIEW: 'Variáveis enviadas para a view',
      REDIRECT: 'Destino',
      JSON: 'Corpo da resposta',
    }[camada] || 'Entrada';
  }

  try { if (sessionStorage.getItem(CHAVE) === '1') alternar(); } catch {}
})();
