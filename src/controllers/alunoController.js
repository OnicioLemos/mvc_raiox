// CONTROLLER de Aluno.
const alunoModel = require('../models/alunoModel');
const RegraDeNegocioError = require('../models/RegraDeNegocioError');

async function listar(req, res) {
  const alunos = await alunoModel.listarTodos();
  res.render('alunos/index', { alunos, erro: null, form: {} });
}

async function criar(req, res) {
  const { nome, matricula } = req.body;
  try {
    await alunoModel.criar({ nome, matricula });
    res.redirect('/alunos');
  } catch (erro) {
    if (!(erro instanceof RegraDeNegocioError)) throw erro;
    const alunos = await alunoModel.listarTodos();
    res.status(422).render('alunos/index', { alunos, erro: erro.message, form: req.body });
  }
}

async function excluir(req, res) {
  await alunoModel.excluir(Number(req.params.id));
  res.redirect('/alunos');
}

module.exports = { listar, criar, excluir };
