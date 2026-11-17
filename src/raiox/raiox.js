// ============================================================================
//  RAIO-X  — ferramenta didática. NÃO faz parte da arquitetura MVC do app.
//
//  Registra, para cada requisição, por quais camadas ela passou:
//  ROTA → CONTROLLER → MODEL → BANCO → VIEW / REDIRECT / JSON
//
//  Como funciona:
//  - Um middleware abre um "registro" por requisição (AsyncLocalStorage
//    mantém esse registro disponível em todo o caminho assíncrono).
//  - As funções exportadas pelos arquivos de controllers/ e models/ são
//    "envolvidas" por uma função que anota a chamada antes de executá-la.
//  - O Prisma é observado com uma extensão ($extends) e com o log de queries.
//  - res.render, res.redirect e res.json são observados para saber a resposta.
//
//  Para desligar: RAIOX=off no .env
// ============================================================================
const fs = require('node:fs');
const path = require('node:path');
const express = require('express');
const { AsyncLocalStorage } = require('node:async_hooks');

const contexto = new AsyncLocalStorage();
const RAIZ = path.resolve(__dirname, '..', '..');
const LIMITE_HISTORICO = 40;
const historico = [];
let proximoId = 1;
let etapaBancoAtual = null;

const ligado = (process.env.RAIOX || 'on').toLowerCase() !== 'off';

// ---------------------------------------------------------------- utilidades
function relativo(arquivo) {
  return path.relative(RAIZ, arquivo).split(path.sep).join('/');
}

function lerArquivo(arquivo) {
  try {
    return fs.readFileSync(arquivo, 'utf8');
  } catch {
    return null;
  }
}

function numeroDaLinha(conteudo, trecho) {
  if (!conteudo || !trecho) return null;
  const pos = conteudo.indexOf(trecho);
  if (pos < 0) return null;
  return conteudo.slice(0, pos).split('\n').length;
}

// Converte qualquer valor em algo seguro para JSON e corta listas longas.
function resumir(valor, profundidade = 0) {
  if (valor === undefined) return undefined;
  if (valor === null || typeof valor !== 'object') {
    if (typeof valor === 'bigint') return valor.toString();
    if (typeof valor === 'function') return `[função ${valor.name || 'anônima'}]`;
    return valor;
  }
  if (valor instanceof Date) return valor.toISOString();
  if (profundidade > 4) return '…';
  if (Array.isArray(valor)) {
    const itens = valor.slice(0, 5).map((v) => resumir(v, profundidade + 1));
    if (valor.length > 5) itens.push(`… mais ${valor.length - 5} item(ns) (total ${valor.length})`);
    return itens;
  }
  const saida = {};
  for (const [chave, v] of Object.entries(valor)) saida[chave] = resumir(v, profundidade + 1);
  return saida;
}

function registrar(camada, dados, nivel) {
  const ctx = contexto.getStore();
  if (!ctx) return null;
  const etapa = {
    ordem: ctx.registro.etapas.length + 1,
    camada,
    nivel: nivel ?? ctx.nivel,
    ms: Date.now() - ctx.registro.inicio,
    ...dados,
  };
  ctx.registro.etapas.push(etapa);
  return etapa;
}

// ------------------------------------------------------------- ROTA (Express)
function registrarRota(req) {
  const ctx = contexto.getStore();
  if (!ctx || ctx.registro.rotaRegistrada || !req || !req.route) return;
  ctx.registro.rotaRegistrada = true;

  const metodo = req.method.toLowerCase();
  const nomeArquivo = req.baseUrl ? `${req.baseUrl.split('/').filter(Boolean).pop()}.routes.js` : 'index.js';
  const arquivo = path.join(RAIZ, 'src', 'routes', nomeArquivo);
  const conteudo = lerArquivo(arquivo);
  let codigo = null;
  let linha = null;
  if (conteudo) {
    const linhas = conteudo.split('\n');
    const idx = linhas.findIndex((l) => l.includes(`.${metodo}('${req.route.path}'`));
    if (idx >= 0) {
      codigo = linhas[idx].trim();
      linha = idx + 1;
    }
  }
  registrar(
    'ROTA',
    {
      titulo: `${req.method} ${req.baseUrl}${req.route.path === '/' ? '' : req.route.path}`,
      arquivo: conteudo ? relativo(arquivo) : null,
      linha,
      codigo,
    },
    0,
  );
}

// ------------------------------------------- envolver controllers e models
function envolver(camada, arquivo, nome, funcaoOriginal) {
  const codigo = funcaoOriginal.toString();
  const linha = numeroDaLinha(lerArquivo(arquivo), codigo);
  const arquivoRel = relativo(arquivo);

  const envolvida = function (...args) {
    const ctx = contexto.getStore();
    if (!ctx) return funcaoOriginal.apply(this, args);

    let entrada;
    if (camada === 'CONTROLLER') {
      const [req] = args;
      registrarRota(req);
      entrada = resumir({ params: req.params, query: req.query, body: req.body });
    } else {
      entrada = resumir(args);
    }

    const etapa = registrar(camada, {
      titulo: `${path.basename(arquivo, '.js')}.${nome}()`,
      arquivo: arquivoRel,
      linha,
      codigo,
      entrada,
    });
    const inicio = Date.now();
    const concluir = (resultado) => {
      etapa.duracaoMs = Date.now() - inicio;
      if (camada === 'MODEL') etapa.saida = resumir(resultado);
      return resultado;
    };
    const falhar = (erro) => {
      etapa.duracaoMs = Date.now() - inicio;
      etapa.erro = `${erro.name}: ${erro.message}`;
      throw erro;
    };

    return contexto.run({ registro: ctx.registro, nivel: ctx.nivel + 1 }, () => {
      try {
        const resultado = funcaoOriginal.apply(this, args);
        if (resultado && typeof resultado.then === 'function') return resultado.then(concluir, falhar);
        return concluir(resultado);
      } catch (erro) {
        return falhar(erro);
      }
    });
  };
  Object.defineProperty(envolvida, 'name', { value: nome });
  return envolvida;
}

function ehClasse(fn) {
  return /^class[\s{]/.test(Function.prototype.toString.call(fn));
}

function instrumentarPasta(pasta, camada) {
  if (!fs.existsSync(pasta)) return;
  for (const item of fs.readdirSync(pasta, { withFileTypes: true })) {
    const caminho = path.join(pasta, item.name);
    if (item.isDirectory()) {
      instrumentarPasta(caminho, camada);
      continue;
    }
    if (!item.name.endsWith('.js')) continue;
    const modulo = require(caminho);
    if (!modulo || typeof modulo !== 'object') continue;
    for (const [nome, valor] of Object.entries(modulo)) {
      if (typeof valor === 'function' && !ehClasse(valor)) {
        modulo[nome] = envolver(camada, caminho, nome, valor);
      }
    }
  }
}

// ------------------------------------------------------------------- BANCO
function observarPrisma(prisma) {
  if (!ligado) return prisma;

  prisma.$on('query', (evento) => {
    if (!etapaBancoAtual) return;
    etapaBancoAtual.sql = etapaBancoAtual.sql || [];
    let parametros = evento.params;
    try {
      parametros = JSON.parse(evento.params);
    } catch {
      /* mantém como texto */
    }
    etapaBancoAtual.sql.push({ consulta: evento.query, parametros, duracaoMs: evento.duration });
  });

  return prisma.$extends({
    name: 'raiox',
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          const etapa = registrar('BANCO', {
            titulo: `prisma.${model.charAt(0).toLowerCase()}${model.slice(1)}.${operation}()`,
            entrada: resumir(args),
          });
          if (!etapa) return query(args);
          const inicio = Date.now();
          etapaBancoAtual = etapa;
          try {
            const resultado = await query(args);
            etapa.duracaoMs = Date.now() - inicio;
            etapa.saida = resumir(resultado);
            return resultado;
          } catch (erro) {
            etapa.erro = erro.message;
            throw erro;
          } finally {
            // o log de query do Prisma chega logo depois; espera um instante
            setTimeout(() => {
              if (etapaBancoAtual === etapa) etapaBancoAtual = null;
            }, 50);
          }
        },
      },
    },
  });
}

// --------------------------------------------- middleware por requisição
function middleware(req, res, next) {
  const ignorar = ['/raiox', '/css', '/js', '/img', '/favicon.ico', '/.well-known'];
  if (ignorar.some((p) => req.path.startsWith(p))) return next();

  const registro = {
    id: proximoId++,
    metodo: req.method,
    url: req.originalUrl,
    horario: new Date().toISOString(),
    inicio: Date.now(),
    status: null,
    duracaoMs: null,
    etapas: [],
  };
  historico.unshift(registro);
  if (historico.length > LIMITE_HISTORICO) historico.pop();

  const render = res.render.bind(res);
  res.render = (view, locais, ...resto) => {
    const arquivo = path.join(req.app.get('views'), `${view}.ejs`);
    registrar(
      'VIEW',
      {
        titulo: `${view}.ejs`,
        arquivo: relativo(arquivo),
        codigo: lerArquivo(arquivo),
        entrada: resumir(locais || {}),
      },
      0,
    );
    return render(view, locais, ...resto);
  };

  const redirect = res.redirect.bind(res);
  res.redirect = (...args) => {
    registrar('REDIRECT', { titulo: `redirect → ${args[args.length - 1]}`, entrada: { para: args[args.length - 1] } }, 0);
    return redirect(...args);
  };

  const json = res.json.bind(res);
  res.json = (corpo) => {
    registrar('JSON', { titulo: 'res.json()', entrada: resumir(corpo) }, 0);
    return json(corpo);
  };

  res.on('finish', () => {
    registro.status = res.statusCode;
    registro.duracaoMs = Date.now() - registro.inicio;
  });

  contexto.run({ registro, nivel: 0 }, next);
}

// Erros inesperados também aparecem no raio-X.
function tratadorDeErros(erro, req, res, next) {
  registrar('ERRO', { titulo: `${erro.name}: ${erro.message}`, codigo: erro.stack }, 0);
  if (res.headersSent) return next(erro);
  res.status(500).send(`<pre>Erro inesperado: ${String(erro.message).replace(/</g, '&lt;')}</pre>`);
}

// ------------------------------------------------------------------ ativar
function ativar(app, { controllers, models }) {
  if (!ligado) return;

  // arquivos do painel (botão + janela lateral)
  app.use('/raiox/static', express.static(path.join(__dirname, 'public')));

  // dados do painel
  app.get('/raiox/api/requisicoes', (req, res) => {
    res.set('Cache-Control', 'no-store');
    res.json(historico.map(({ inicio, rotaRegistrada, ...r }) => r));
  });
  app.post('/raiox/api/limpar', (req, res) => {
    historico.length = 0;
    res.json({ ok: true });
  });

  // a ordem importa: instrumentar antes de as rotas carregarem os controllers
  instrumentarPasta(models, 'MODEL');
  instrumentarPasta(controllers, 'CONTROLLER');

  app.use(middleware);
  app.locals.raioxLigado = true;
}

module.exports = { ativar, observarPrisma, tratadorDeErros };
