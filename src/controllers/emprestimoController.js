// CONTROLLER de Empréstimo.
// Repare que nenhuma regra (limite, livro já emprestado) está aqui: elas ficam no model.
const emprestimoModel = require('../models/emprestimoModel');
const livroModel = require('../models/livroModel');
const alunoModel = require('../models/alunoModel');
const RegraDeNegocioError = require('../models/RegraDeNegocioError');

async function listar(req, res) {
  const emprestimos = await emprestimoModel.listarTodos();
  const livrosDisponiveis = await livroModel.listarDisponiveis();
  const alunos = await alunoModel.listarTodos();
  res.render('emprestimos/index', { emprestimos, livrosDisponiveis, alunos, erro: null });
}

async function criar(req, res) {
  const livroId = Number(req.body.livroId);
  const alunoId = Number(req.body.alunoId);
  try {
    await emprestimoModel.criar({ livroId, alunoId });
    res.redirect('/emprestimos');
  } catch (erro) {
    if (!(erro instanceof RegraDeNegocioError)) throw erro;
    const emprestimos = await emprestimoModel.listarTodos();
    const livrosDisponiveis = await livroModel.listarDisponiveis();
    const alunos = await alunoModel.listarTodos();
    res.status(422).render('emprestimos/index', { emprestimos, livrosDisponiveis, alunos, erro: erro.message });
  }
}

async function devolver(req, res) {
  await emprestimoModel.devolver(Number(req.params.id));
  res.redirect('/emprestimos');
}

module.exports = { listar, criar, devolver };
