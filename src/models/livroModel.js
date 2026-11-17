// MODEL de Livro: regras e acesso ao banco relacionados a livros.
// O model não sabe nada de HTTP (req/res) nem de HTML.
const prisma = require('../lib/prisma');
const RegraDeNegocioError = require('./RegraDeNegocioError');

async function listarTodos() {
  const livros = await prisma.livro.findMany({
    orderBy: { titulo: 'asc' },
    include: { emprestimos: { where: { dataDevolucao: null } } },
  });
  return livros.map((livro) => ({
    id: livro.id,
    titulo: livro.titulo,
    autor: livro.autor,
    ano: livro.ano,
    disponivel: livro.emprestimos.length === 0,
  }));
}

async function listarDisponiveis() {
  return prisma.livro.findMany({
    where: { emprestimos: { none: { dataDevolucao: null } } },
    orderBy: { titulo: 'asc' },
  });
}

async function criar({ titulo, autor, ano }) {
  if (!titulo || !titulo.trim()) throw new RegraDeNegocioError('O título é obrigatório.');
  if (!autor || !autor.trim()) throw new RegraDeNegocioError('O autor é obrigatório.');

  return prisma.livro.create({
    data: {
      titulo: titulo.trim(),
      autor: autor.trim(),
      ano: ano ? Number(ano) : null,
    },
  });
}

async function excluir(id) {
  return prisma.livro.delete({ where: { id } });
}

module.exports = { listarTodos, listarDisponiveis, criar, excluir };
