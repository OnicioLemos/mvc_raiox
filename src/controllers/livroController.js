// CONTROLLER de Livro: recebe a requisição, chama o model e escolhe a resposta.
// O controller não acessa o banco diretamente e não tem regra de negócio.
const livroModel = require('../models/livroModel');
const RegraDeNegocioError = require('../models/RegraDeNegocioError');

async function listar(req, res) {
  const livros = await livroModel.listarTodos();
  res.render('livros/index', { livros, erro: null, form: {} });
}

async function criar(req, res) {
  const { titulo, autor, ano } = req.body;
  try {
    await livroModel.criar({ titulo, autor, ano });
    res.redirect('/livros');
  } catch (erro) {
    if (!(erro instanceof RegraDeNegocioError)) throw erro;
    const livros = await livroModel.listarTodos();
    res.status(422).render('livros/index', { livros, erro: erro.message, form: req.body });
  }
}

async function excluir(req, res) {
  await livroModel.excluir(Number(req.params.id));
  res.redirect('/livros');
}

module.exports = { listar, criar, excluir };
